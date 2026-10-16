const KEY = 'rugby-fir-v1';

let S = JSON.parse(
  localStorage.getItem(KEY) ||
  '{"setup":{"home":"BRIXIA","away":"Ospiti","date":"","category":"Under 18"},"rosters":{},"matches":[],"fir":null,"draft":null}'
);

let page = 'setup';
let tick;
const app = document.querySelector('#app');

const save = () => localStorage.setItem(KEY, JSON.stringify(S));
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));
const uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now() + '';
const fmt = x => String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0');

function norm(x) {
  return String(x ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function availableCategories() {
  const categories = Object.keys(S.rosters || {})
    .filter(category => norm(category) !== 'istruzioni')
    .filter(category => category.trim() !== '');

  if (S.setup.category && !categories.some(category => norm(category) === norm(S.setup.category))) {
    categories.push(S.setup.category);
  }

  return categories.sort((a, b) => a.localeCompare(b, 'it', { numeric: true }));
}

function categoryOptions(selectedCategory) {
  const categories = availableCategories();
  if (!categories.length) {
    return '<option value="Under 18">Under 18</option>';
  }

  return categories.map(category => `
    <option value="${esc(category)}" ${norm(category) === norm(selectedCategory) ? 'selected' : ''}>
      ${esc(category)}
    </option>
  `).join('');
}

function findPlayerByFirCard(firCard) {
  const wantedCard = String(firCard ?? '').trim();
  if (!wantedCard) return null;

  for (const [category, players] of Object.entries(S.rosters || {})) {
    const player = (players || []).find(item => String(item.firCard ?? '').trim() === wantedCard);
    if (player) return { player, category };
  }
  return null;
}

function isOutOfQuota(matchCategory, rosterCategory) {
  return norm(matchCategory) === 'under18' && norm(rosterCategory) === 'seniores';
}

function enrichFirLineup(players, matchCategory) {
  return players.map(pdfPlayer => {
    const found = findPlayerByFirCard(pdfPlayer.firCard);

    if (!found) {
      return {
        ...pdfPlayer,
        categoryAnagrafica: '',
        foundInRoster: false,
        fuoriQuota: false
      };
    }

    return {
      ...found.player,
      id: pdfPlayer.id || found.player.id || uid(),
      number: pdfPlayer.number || found.player.number || '',
      role: pdfPlayer.role || found.player.role || '',
      status: pdfPlayer.status || 'Convocato',
      flags: pdfPlayer.flags || [],
      document: pdfPlayer.document || found.player.document || '',
      categoryAnagrafica: found.category,
      foundInRoster: true,
      fuoriQuota: isOutOfQuota(matchCategory, found.category)
    };
  });
}

function toast(t) {
  const e = document.querySelector('#toast');
  e.textContent = t;
  e.classList.add('show');
  setTimeout(() => e.classList.remove('show'), 2200);
}

function go(p) {
  page = p;
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  render();
}

document.querySelectorAll('nav button').forEach(b => b.onclick = () => go(b.dataset.p));

function render() {
  clearInterval(tick);
  ({ setup, match, roster, history }[page])();
}

function setup() {
  const s = S.setup;
  app.innerHTML = `
    <h1>Nuova partita</h1>
    <section class="card">
      <h2>Importa lista gara FIR</h2>
      <p class="help">Seleziona il PDF testuale esportato dal portale FIR. Il file viene elaborato solo sul dispositivo.</p>
      <label class="btn">Importa PDF FIR<input id="pdf" type="file" accept="application/pdf" hidden></label>
    </section>
    ${S.fir ? preview() : ''}
    <section class="card grid two">
      <label>Data<input id="date" type="date" value="${esc(s.date)}"></label>
      <label>Categoria della partita<select id="category">${categoryOptions(s.category)}</select></label>
      <label>Squadra mia<input id="home" value="${esc(s.home)}"></label>
      <label>Squadra ospite<input id="away" value="${esc(s.away)}"></label>
    </section>
    <button id="manual" class="btn full">Apri tabellone</button>
  `;

  document.querySelector('#pdf').onchange = readPdf;
  ['date', 'category', 'home', 'away'].forEach(k => {
    document.querySelector('#' + k).onchange = event => {
      S.setup[k] = event.target.value;
      save();
    };
  });
  document.querySelector('#manual').onclick = () => {
    newMatch();
    go('match');
  };

  const confirm = document.querySelector('#confirmFir');
  if (confirm) confirm.onclick = confirmFir;
}

async function readPdf(ev) {
  const f = ev.target.files[0];
  if (!f) return;

  try {
    const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const c = await (await pdf.getPage(i)).getTextContent();
      text += ' ' + c.items.map(x => x.str).join(' ');
    }
    S.fir = parseFir(text.replace(/\s+/g, ' ').trim(), f.name);
    save();
    toast(`${S.fir.players.length} giocatori rilevati`);
    setup();
  } catch (err) {
    console.error(err);
    toast('PDF non leggibile o non testuale');
  }
}

function parseFir(t, file) {
  const gara = (t.match(/Alla Gara\s+(.+?)\s+del Campionato/i) || [])[1] || '';
  const date = (t.match(/si gioca il\s+(\d{2}\/\d{2}\/\d{4})/i) || [])[1] || '';
  const hour = (t.match(/alle ore\s+(\d{1,2}:\d{2})/i) || [])[1] || '';
  const field = (t.match(/sul campo\s+(.+?)\s+N\. Maglia/i) || [])[1] || '';
  const category = (t.match(/del Campionato\s+(.+?)\s+che si gioca/i) || [])[1] || '';
  const society = (t.match(/Società\s+\d+\s+-\s+(.+?)\s+-\s+Sq/i) || [])[1] || '';
  const start = t.indexOf('N. Maglia');
  const end = t.indexOf('Sostituzioni');
  const block = t.slice(start, end > start ? end : undefined);
  const benchAt = block.indexOf('Giocatori in panchina');
  const re = /(\d{1,2})\s+([A-Z0-9]{1,3})\s+([A-ZÀ-Ž' ]+,[A-ZÀ-Ž' ]+(?:\s+\((?:C|V|1L)\))*)\s+(\d{5,7})\s+(\d{2}\/\d{2}\/\d{4})\s+([A-Z0-9]+)/g;
  const players = [];
  let m;

  while ((m = re.exec(block))) {
    let raw = m[3].trim();
    const flags = [...raw.matchAll(/\((C|V|1L)\)/g)].map(x => x[1]);
    raw = raw.replace(/\s*\((?:C|V|1L)\)/g, '').trim();
    const [surname, ...names] = raw.split(',');
    players.push({
      id: uid(),
      number: m[1],
      role: m[2],
      surname: surname.trim(),
      name: names.join(',').trim(),
      firCard: m[4],
      birth: m[5],
      document: m[6],
      status: m.index > benchAt && benchAt >= 0 ? 'Panchina' : 'Titolare',
      flags
    });
  }

  const parts = gara.split('-');
  return {
    file, gara, category, date, hour, field, society,
    home: society || parts.at(-1) || '',
    away: parts[0] || '',
    players,
    raw: t
  };
}

function preview() {
  const f = S.fir;
  return `
    <section class="card preview">
      <div class="row">
        <div>
          <h2>Controllo lista gara</h2>
          <p class="help">${esc(f.gara)} · ${esc(f.date)} ${esc(f.hour)} · ${esc(f.category)}</p>
        </div>
        <span class="pill">${f.players.length} giocatori</span>
      </div>
      <p><b>Campo:</b> ${esc(f.field)}</p>
      <table>
        <thead><tr><th>Maglia</th><th>Ruolo</th><th>Giocatore</th><th>Tessera FIR</th><th>Nascita</th><th>Documento</th><th>Stato</th></tr></thead>
        <tbody>${f.players.map(p => `
          <tr class="${p.status === 'Titolare' ? 'starter' : 'bench'}">
            <td>${esc(p.number)}</td><td>${esc(p.role)}</td><td>${esc(p.surname)} ${esc(p.name)}</td>
            <td>${esc(p.firCard)}</td><td>${esc(p.birth)}</td><td>${esc(p.document)}</td><td>${esc(p.status)}</td>
          </tr>
        `).join('')}</tbody>
      </table>
      <button id="confirmFir" class="btn full">Conferma e crea partita</button>
    </section>
  `;
}

function confirmFir() {
  const f = S.fir;
  const date = f.date ? f.date.split('/').reverse().join('-') : S.setup.date;
  const matchCategory = S.setup.category || f.category || 'Under 18';

  S.setup = {
    ...S.setup,
    date,
    category: matchCategory,
    home: f.home || S.setup.home,
    away: f.away || S.setup.away
  };

  const lineup = enrichFirLineup(f.players, matchCategory);
  const notFound = lineup.filter(player => !player.foundInRoster);
  const outOfQuota = lineup.filter(player => player.fuoriQuota);

  newMatch(lineup);
  save();

  if (outOfQuota.length > 8) {
    alert(`ATTENZIONE\n\nSono stati individuati ${outOfQuota.length} giocatori fuori quota nella partita ${matchCategory}.\n\nIl limite configurato è 8. Verificare la lista gara.`);
  } else if (notFound.length) {
    alert(`Controllo anagrafica\n\n${notFound.length} giocatori della lista FIR non sono stati trovati nell'anagrafica societaria tramite il numero di cartellino.\n\nI giocatori rimangono comunque disponibili per la partita.`);
  } else if (outOfQuota.length) {
    toast(`Fuori quota rilevati: ${outOfQuota.length} / 8`);
  } else {
    toast('Lista FIR verificata con l’anagrafica');
  }

  go('match');
}

function newMatch(lineup = []) {
  S.draft = {
    id: uid(),
    setup: { ...S.setup },
    lineup,
    score: { home: 0, away: 0 },
    period: 1,
    seconds: 0,
    running: false,
    started: 0,
    events: []
  };
  save();
}

function secs() {
  const d = S.draft;
  return d.seconds + (d.running ? Math.floor((Date.now() - d.started) / 1000) : 0);
}

function match() {
  if (!S.draft) newMatch();
  const d = S.draft;
  const s = d.setup;

  app.innerHTML = `
    <section class="card timer">
      <button id="period" class="outline">T${d.period}</button>
      <div id="clock" class="clock">${fmt(secs())}</div>
      <button id="play" class="btn">${d.running ? 'Ⅱ' : '▶'}</button>
    </section>
    <div class="teams">${team('home', s.home, d.score.home)}${team('away', s.away, d.score.away)}</div>
    <section class="card">
      <b>Eventi</b>
      ${d.events.map(x => `<div class="event"><span>${esc(x.team)}: ${esc(x.label)} ${esc(x.player)}</span><span>T${x.period} ${fmt(x.second)}</span></div>`).join('')}
    </section>
    <div class="actions"><button id="undo" class="outline">Annulla</button><button id="finish" class="btn">Salva partita</button></div>
  `;

  document.querySelector('#play').onclick = () => {
    if (d.running) {
      d.seconds = secs();
      d.running = false;
    } else {
      d.running = true;
      d.started = Date.now();
    }
    save();
    match();
  };

  document.querySelector('#period').onclick = () => {
    d.running = false;
    d.seconds = 0;
    d.period = d.period === 1 ? 2 : 1;
    save();
    match();
  };

  document.querySelectorAll('[data-act]').forEach(b => b.onclick = () => eventAdd(b.dataset.side, b.dataset.act, +b.dataset.p));
  document.querySelector('#undo').onclick = () => {
    const x = d.events.shift();
    if (x) d.score[x.side] -= x.points;
    save();
    match();
  };
  document.querySelector('#finish').onclick = () => {
    d.running = false;
    S.matches.unshift(d);
    S.draft = null;
    save();
    go('history');
  };

  if (d.running) tick = setInterval(() => document.querySelector('#clock').textContent = fmt(secs()), 500);
}

function team(side, name, score) {
  return `
    <section class="card team ${side === 'away' ? 'away' : ''}">
      <h3>${esc(name)}</h3>
      <div class="score">${score}</div>
      <div class="buttons">
        ${[['Meta +5', 5], ['Trasf. +2', 2], ['Puniz. +3', 3], ['Drop +3', 3], ['Giallo', 0], ['Rosso', 0]].map(a =>
          `<button data-act="${a[0]}" data-side="${side}" data-p="${a[1]}">${a[0]}</button>`
        ).join('')}
      </div>
    </section>
  `;
}

function eventAdd(side, label, points) {
  const d = S.draft;
  const a = { side, label, points };
  if (side === 'away') return commit(a, null);

  const ps = d.lineup.length ? d.lineup : (S.rosters[d.setup.category] || []);
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal"><div class="modalbox">
      <h2>${esc(label)}</h2>
      <div class="players">${ps.map(p => `
        <button data-pl="${p.id}"><b>#${esc(p.number)}</b> ${esc(p.name)} ${esc(p.surname)}
          <small style="display:block">${esc(p.status || '')}${p.fuoriQuota ? ' · Fuori quota' : ''}</small>
        </button>
      `).join('')}</div>
      <button id="none" class="btn full">Senza giocatore</button>
    </div></div>
  `);

  document.querySelector('#none').onclick = () => {
    document.querySelector('.modal').remove();
    commit(a, null);
  };
  document.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => {
    const p = ps.find(x => x.id === b.dataset.pl);
    document.querySelector('.modal').remove();
    commit(a, p);
  });
}

function commit(a, p) {
  const d = S.draft;
  d.score[a.side] += a.points;
  d.events.unshift({
    id: uid(),
    ...a,
    team: a.side === 'home' ? d.setup.home : d.setup.away,
    player: p ? `#${p.number} ${p.name} ${p.surname}` : '',
    period: d.period,
    second: secs()
  });
  save();
  match();
}

function roster() {
  const ps = S.rosters[S.setup.category] || [];
  app.innerHTML = `
    <h1>Anagrafica societaria</h1>
    <section class="card">
      <label>Categoria visualizzata<select id="rosterCategory">${categoryOptions(S.setup.category)}</select></label>
    </section>
    <section class="card">
      <div class="actions">
        <label class="btn">Importa Excel<input id="excelRoster" type="file" accept=".xlsx,.xls" hidden></label>
        <button id="exportRoster" class="outline">Esporta Excel</button>
      </div>
      <p class="help">Il file Excel può contenere un foglio per categoria. Il PDF FIR crea invece la lista della singola gara.</p>
    </section>
    <h2>Rosa ${esc(S.setup.category)}</h2>
    ${ps.map(p => `
      <section class="card row">
        <div>
          <b>#${esc(p.number || '-')} ${esc(p.surname)} ${esc(p.name)}</b>
          <small style="display:block">${esc(p.role || '')} · FIR ${esc(p.firCard || 'mancante')} · ${esc(p.birth || p.year || '')}</small>
        </div>
        <span class="pill">${esc(p.status || 'Rosa')}</span>
      </section>
    `).join('') || '<section class="card help">Nessun giocatore. Importare il file Excel societario.</section>'}
  `;

  document.querySelector('#excelRoster').onchange = importRosterExcel;
  document.querySelector('#exportRoster').onclick = exportRosterExcel;
  document.querySelector('#rosterCategory').onchange = event => {
    S.setup.category = event.target.value;
    save();
    roster();
  };
}

function excelDate(v) {
  if (!v) return '';
  const m = String(v).match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  return m ? `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}` : String(v);
}

function fieldByNames(row, names) {
  const keys = Object.keys(row);
  const wanted = names.map(norm);
  const key = keys.find(k => wanted.includes(norm(k)));
  return key === undefined ? '' : row[key];
}

function splitFirName(row) {
  const surname = String(fieldByNames(row, ['Cognome']) || '').trim();
  const name = String(fieldByNames(row, ['Nome']) || '').trim();
  if (surname || name) return { surname, name, review: false };

  const full = String(fieldByNames(row, ['Cognome Nome', 'Cognome,Nome', 'Nominativo', 'Atleta', 'Giocatore', 'Tesserato']) || '').trim();
  if (!full) return { surname: '', name: '', review: false };
  const comma = full.indexOf(',');
  if (comma >= 0) return { surname: full.slice(0, comma).trim(), name: full.slice(comma + 1).trim(), review: false };
  return { surname: full, name: '', review: true };
}

async function importRosterExcel(ev) {
  const file = ev.target.files[0];
  if (!file) return;

  try {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    let added = 0;
    let updated = 0;
    let reviews = 0;

    wb.SheetNames.forEach(sn => {
      if (norm(sn) === 'istruzioni') return;
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: '', raw: false });
      if (!rows.length) return;

      const cat = sn.trim();
      S.rosters[cat] = S.rosters[cat] || [];

      rows.forEach(r => {
        const person = splitFirName(r);
        const fir = String(fieldByNames(r, ['Cartellino FIR', 'Tessera FIR', 'Numero tessera', 'N. Tessera', 'Tesserino']) || '').trim();
        const found = fir ? S.rosters[cat].find(x => String(x.firCard) === fir) : null;
        const obj = {
          id: found?.id || uid(),
          categoryAnagrafica: cat,
          number: fieldByNames(r, ['Numero', 'N. Maglia', 'Maglia']) || '',
          surname: person.surname,
          name: person.name,
          year: fieldByNames(r, ['Anno', 'Anno nascita']) || '',
          role: fieldByNames(r, ['Ruolo']) || '',
          firCard: fir,
          birth: excelDate(fieldByNames(r, ['Data di nascita', 'Nascita']) || ''),
          medicalExpiry: excelDate(fieldByNames(r, ['Scadenza visita medica', 'Visita medica']) || ''),
          contact: fieldByNames(r, ['Contatto famiglia', 'Contatto']) || '',
          notes: fieldByNames(r, ['Note']) || '',
          present: String(fieldByNames(r, ['Presente']) || 'SI').toUpperCase() !== 'NO',
          status: person.review ? 'Nominativo da controllare' : 'Rosa'
        };

        if (person.review) reviews++;
        if (found) {
          Object.assign(found, obj);
          updated++;
        } else if (obj.surname || obj.name) {
          S.rosters[cat].push(obj);
          added++;
        }
      });
    });

    save();
    toast(`${added} aggiunti, ${updated} aggiornati${reviews ? ', ' + reviews + ' da controllare' : ''}`);
    roster();
  } catch (err) {
    console.error(err);
    toast('File Excel non riconosciuto');
  }
}

function exportRosterExcel() {
  const cat = S.setup.category;
  const ps = S.rosters[cat] || [];
  const wb = XLSX.utils.book_new();
  const rows = ps.map(p => ({
    Numero: p.number,
    Cognome: p.surname,
    Nome: p.name,
    Anno: p.year || '',
    Ruolo: p.role || '',
    'Cartellino FIR': p.firCard || '',
    'Data di nascita': p.birth || '',
    'Scadenza visita medica': p.medicalExpiry || '',
    'Contatto famiglia': p.contact || '',
    Note: p.notes || '',
    Presente: p.present === false ? 'NO' : 'SI'
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), cat.slice(0, 31));
  XLSX.writeFile(wb, 'Rosa_' + cat.replaceAll(' ', '_') + '.xlsx');
}

function history() {
  app.innerHTML = `
    <h1>Storico</h1>
    ${S.matches.map(m => `
      <section class="card">
        <b>${esc(m.setup.home)} ${m.score.home} - ${m.score.away} ${esc(m.setup.away)}</b>
        <p>${esc(m.setup.date)} · ${m.events.length} eventi</p>
      </section>
    `).join('') || '<section class="card help">Nessuna partita salvata.</section>'}
  `;
}

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('service-worker.js'));
}

render();
