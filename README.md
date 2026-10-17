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

## Fogli Excel generici
Se il foglio si chiama Dati, Foglio1, Sheet1, Elenco, Tesserati o Anagrafica, i giocatori vengono importati nella categoria selezionata nell'app prima dell'importazione. Per il file Seniores, selezionare Seniores nella schermata Partita e poi importare da Rose.


## Versione 7
Formato Excel FIR reale: CODICE, COGNOME NOME, CATEGORIA, DATA NASCITA, NOME TUTORE. La colonna CATEGORIA distribuisce automaticamente i tesserati in Seniores, Under 18, Under 16, Under 14 e altre categorie Under. Il PDF lista gara completa numero maglia, ruolo, documento, titolare/panchina e indicatori gara collegando il giocatore tramite cartellino FIR.
