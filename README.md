# Rugby Match Manager - Importazione lista gara FIR

La PWA importa PDF testuali esportati dal portale FIR, mostra un controllo dei dati e crea la partita con i soli giocatori della lista gara.

## Avvio PC
1. Estrarre lo ZIP.
2. Aprire la cartella.
3. Nella barra di Esplora file scrivere `cmd` e premere Invio.
4. Digitare `python -m http.server 8080`.
5. Aprire `http://localhost:8080`.

## Importazione
Aprire Partita, premere Importa PDF FIR, selezionare il PDF, controllare i dati e premere Conferma e crea partita.

## Anagrafica societaria Excel
Aprire Rose e premere Importa Excel. Il file incluso `Modello_Rose_Under.xlsx` contiene un foglio per categoria. I giocatori sono collegati tramite Cartellino FIR. L'importazione PDF FIR crea la lista gara senza sostituire le altre categorie.

## Estrazione Excel FIR con nominativo unico
L'importatore riconosce anche le colonne `Nominativo`, `Cognome Nome`, `Cognome,Nome`, `Atleta`, `Giocatore` e `Tesserato`. Un valore come `ROSSI,MARIO` viene separato automaticamente in Cognome `ROSSI` e Nome `MARIO`. I nomi composti restano nel campo Nome. Se manca la virgola, la riga viene importata con lo stato `Nominativo da controllare`.
