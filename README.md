# Loot Game Bot - Telegram Bot

Il primo gamebot di Telegram creato da Edoardo Cortese con più di 33.000 registrazioni disponibile dal 2016.

Il bot utilizza il modulo "node-telegram-bot-api" per interagire con le Api di Telegram, un database MySql per memorizzare i dati e Node Js per essere eseguito.

## Codice

Il codice è ora accessibile a tutti, questa decisione è stata presa con lo scopo di risolvere più velocemente i problemi o aggiungere funzionalità al bot in modo tale che chiunque possa contribuirne al miglioramento.

Il codice è stato scritto ormai nel lontano 2016, quando il creatore era alle prime armi con Node Js, di conseguenza è logico trovare molte righe e metodi di lavoro non appropriati o non aggiornati.

Per installarlo nel proprio ambiente è necessario procedere secondo i seguenti passi:
- Il file config va rinominato rimuovendo la parte dopo il trattino basso, inserendo tutti i token dei bot necessari per quanto riguarda le funzionalità che si vogliono utilizzare. E' per esempio possibile anche solo utilizzare quelli del bot principale (Loot Game Bot) e quelli del bot di supporto (Loot Plus Bot) ignorando gli altri. Inoltre va inserito il proprio id telegram.
- Importare la struttura del database in un ambiente MySql.
- E' consigliato utilizzare un gestore di processi come PM2 per far partire i vari bot.

## Contributi

Per contribuire è possibile creare PR direttamente tramite Github oppure contattare direttamente @fenix45 su Telegram.

Prima di creare una richiesta è bene verificare che il codice sia funzionante e valido e si riesca a innestare bene nel bilanciamento del gioco.

## Autori

* **Edoardo Cortese** - *Programmazione* - [fenix45](http://telegram.me/fenix45)
* **Emanuele Finiguerra** - *Analisi e bilanciamenti* - [LastSoldier95](http://telegram.me/LastSoldier95)
* **Dario Emerson** - Fix e migliorie
* **@Delooo** - Mob generator

## Licenza

Questo progetto è sotto licenza GNU AGPLv3 - leggi la [documentazione](https://choosealicense.com/licenses/agpl-3.0/) per ulteriori dettagli.
