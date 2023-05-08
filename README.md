# Loot Game Bot - Telegram Bot

Il primo gamebot di Telegram creato da Edoardo Cortese con più di 33.000 registrazioni disponibile dal 2016.

Il bot utilizza il modulo "node-telegram-bot-api" per interagire con le Api di Telegram, un database MySql per memorizzare i dati e Node Js per essere eseguito.

## Codice

Il codice è ora accessibile a tutti, questa decisione è stata presa con lo scopo di risolvere più velocemente i problemi o aggiungere funzionalità al bot in modo tale che chiunque possa contribuirne al miglioramento.

Il codice è stato scritto ormai nel lontano 2016, quando il creatore era alle prime armi con Node Js, di conseguenza è logico trovare molte righe e metodi di lavoro non appropriati o non aggiornati.

Per avviarlo nel proprio ambiente è necessario procedere secondo i seguenti passi:
- Installare i pacchetti node con il comando npm install.
- Il file config va rinominato rimuovendo la parte dopo il trattino basso, inserendo tutti i token dei bot necessari per quanto riguarda le funzionalità che si vogliono utilizzare. È per esempio possibile anche solo utilizzare quelli del bot principale (Loot Game Bot) e quelli del bot di supporto (Loot Plus Bot) ignorando gli altri. I dettagli sono presenti direttamente nel file, come commenti.
- Dopo di che bisogna importare la struttura del database in un ambiente MySql.
- Infine è necessario configurare nginx come proxy utilizzando il file di configurazione fornito, aggiungendo un certificato valido ed una chiave.
- È consigliato utilizzare un gestore di processi come PM2 per far partire i vari bot.

È presente anche la LootBotApi accessibile via web nella [relativa repository](https://github.com/sidelux/LootBotApi).
Per installarla è necessario anche in questo caso rinominare e modificare il file config.js, specificare validi certificati ssl e poi avviarlo come gli altri script.

È bene tenere in conto che il bot non è mai stato testato in questo stato con 0 giocatori registrati, potrebbe avere comportamenti inattesi.

## Contributi

Per contribuire è possibile creare PR direttamente tramite Github oppure contattare direttamente @fenix45 su Telegram, seguendo queste indicazioni:
- Esegui il fork del progetto
- Crea il tuo branch con un nome parlante
- Esegui il commit delle modifiche
- Esegui push
- Apri una Pull Request dettagliando le modifiche effettuate

Prima di creare una richiesta è bene verificare che il codice sia funzionante e valido e si riesca a innestare bene nel bilanciamento del gioco.

## TODO

Ci sono vari interventi che ho pensato di apportare ma per mancanza di tempo o risorse non sono mai riuscito ad avviare:
- [x] Predisposizione per l'open source
- [x] Automazione completa della gestione degli eventi e della globale
- [ ] Divisione del codice in moduli/file
- [ ] Aggiunta periodica delle nuove funzionalità sulla base dei suggerimenti della community tramite i contributi degli altri sviluppatori
- [ ] Bilanciamento generale che nel tempo ha portato ad inflazione e rottura di molte meccaniche del gioco
- [ ] Aggiunta del supporto al multi lingua (principalmente l'inglese)

I contributi a questi interventi avranno maggior priorità rispetto alle altre modifiche.

## Issue

Per segnalare eventuali problemi al codice non è necessario per forza modificare il codice, è anche possibile creare una richiesta Issue rispettando l'apposito template per indicare con più dettagli possibili quali errori si riscontrano.
Io o qualcun'altro provvederemo a risolvere il problema o commentare con maggiori indicazioni.

## Autori

* **Edoardo Cortese** - *Programmazione* - [fenix45](http://telegram.me/fenix45)
* **Emanuele Finiguerra** - *Analisi e bilanciamenti* - [LastSoldier95](http://telegram.me/LastSoldier95)
* **Dario Emerson** - Fix e migliorie strutturali
* **@Delooo** - Mob generator

## Licenza

Questo progetto è sotto licenza GNU AGPLv3 - leggi la [documentazione](https://choosealicense.com/licenses/agpl-3.0/) per ulteriori dettagli.
