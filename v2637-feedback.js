'use strict';
(function(){
  let busyDepth=0;
  function ensureBusy(){
    let el=document.querySelector('#v2637Busy');
    if(el)return el;
    document.body.insertAdjacentHTML('beforeend','<div id="v2637Busy" class="v2637-busy" hidden role="status" aria-live="polite"><div class="v2637-busy-card"><span class="v2637-spinner" aria-hidden="true"></span><strong id="v2637BusyText">Elaborazione in corso...</strong><small>Attendi, non premere nuovamente.</small></div></div>');
    return document.querySelector('#v2637Busy');
  }
  function showBusy(text){
    busyDepth++;
    const el=ensureBusy();
    el.querySelector('#v2637BusyText').textContent=text||'Elaborazione in corso...';
    el.hidden=false;
    document.documentElement.classList.add('v2637-is-busy');
  }
  function hideBusy(){
    busyDepth=Math.max(0,busyDepth-1);
    if(busyDepth)return;
    const el=document.querySelector('#v2637Busy');
    if(el)el.hidden=true;
    document.documentElement.classList.remove('v2637-is-busy');
  }
  const paint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  async function withBusy(text,fn){showBusy(text);await paint();try{return await fn()}finally{hideBusy()}}

  const originalHome=window.importHomePdf;
  if(typeof originalHome==='function') window.importHomePdf=async e=>withBusy('Lettura lista FIR della squadra...',()=>originalHome(e));
  const originalAway=window.importAwayPdf;
  if(typeof originalAway==='function') window.importAwayPdf=async e=>withBusy('Lettura lista FIR avversaria...',()=>originalAway(e));
  const originalOcr=window.ocrAway;
  if(typeof originalOcr==='function') window.ocrAway=async e=>withBusy('Analisi immagine e riconoscimento giocatori...',()=>originalOcr(e));

  function enhanceFinishModal(root){
    if(!root||root.dataset.v2637Ready)return;
    root.dataset.v2637Ready='1';
    const buttons=root.querySelectorAll('#confirmFinish,[data-status]');
    buttons.forEach(btn=>{
      const original=btn.onclick;
      if(typeof original!=='function')return;
      btn.onclick=null;
      btn.addEventListener('click',async ev=>{
        ev.preventDefault();
        if(btn.disabled)return;
        btn.disabled=true;
        const old=btn.textContent;
        btn.textContent='SALVATAGGIO...';
        await withBusy('Salvataggio partita e aggiornamento storico...',async()=>{
          await paint();
          original.call(btn,ev);
        });
        if(document.contains(btn)){btn.disabled=false;btn.textContent=old}
      },{once:true});
    });
  }
  const observer=new MutationObserver(records=>{
    for(const record of records) for(const node of record.addedNodes){
      if(node.nodeType!==1)continue;
      if(node.matches?.('#finishMatchModal,#v2635Finish')) enhanceFinishModal(node);
      node.querySelectorAll?.('#finishMatchModal,#v2635Finish').forEach(enhanceFinishModal);
    }
  });
  observer.observe(document.body,{childList:true,subtree:true});

  document.addEventListener('change',e=>{
    if(e.target?.matches('input[type="file"]')&&e.target.files?.length){
      const label=e.target.closest('label');
      if(label){label.classList.add('v2637-selected');setTimeout(()=>label.classList.remove('v2637-selected'),1200)}
    }
  },true);

  window.RUGBY_BUSY={show:showBusy,hide:hideBusy,run:withBusy};
  // Ogni riapertura parte da Preparazione partita. La bozza resta disponibile nella scheda Live.
  try{page='setup';setup();document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.p==='setup'))}catch(err){console.warn('Avvio Preparazione partita non applicato',err)}
})();
