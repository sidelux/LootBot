3.06.2023, nrc


# Loot Game Bot - Una proposta di struttura modulare

Questa è una proposta, e riconsosco che abbia dei limiti e sia ancora in una fase embrionale.
Probabilmente ancora non è adatta ad ospitare la logica di lootBot.js in maniera salabile ed ordinata, ma credo possa essere un buon punto di partenza.

Seguono dei "paradigmi"

## ./model/
Nel model va solo e solamente la comunicazione con la persistenza (al momento database e file json(novità) )

DB_managers
- Il modulo db.js si occupa di creare la connessione ed esporre il metodo di query. Non dovrebbe far altro
- il modulo queries.js ospita le stringhe delle query (come funzioni). <- Può decisamente essere migliorato!
- ./specifics ospita le db_config (che eredita da config ed espone le strutture delle tabelle) e tutti i moduli dei modles specifici 
- modles specifici: sono quelli che andranno pian piano aggiornati (e ne serviranno di nuovi). È importante specificare che questi moduli si liiteranno a dichiarare delle funzioni, eseguire le query specifiche e restituire i risultati in alto. STOP!

JSON_managers
Il concetto è lo stesso che per il database. La pratica piu semplice.
json_model contiene le funzione di verifica file, lettura ed aggiornamento. 
Nei modelli specifici si dichiarano i percorsi e le funzioni specifiche.

Nota sul return dei modelli specifici:
È bene che a questo livello le funzioni seguano una logica uniforme:
I return devono essere del tipo object {(boolean)esit, (string)message_text ? || result ?}
esit verrà verificato dal livello superiore (logic)
message_text è opzionale, conterrà eventuali messaggi (tipicamente d'errore)
result è opzionale, può contenere oggetti, array... dipende dalla logica piu in alto

## ./logics/
I moduli in questa sottocartella si occupano di definire funzioni piu o meno complesse, ma limitandosi ad usare il proprio model specifico o interagendo con altri moduli in logics. 
Se si occupano di messaggi, come per i models, si occupano di messaggi di errore o altrimenti fanno riferimento alla propria view (../views/specifics). 
le funzioni che espongono, se asincrone, devono rispettare la logica del ritorno dei models ({(boolean)esit, (string)message_text ? || result ?})

## ./message_managers/
Quelli in /specifics sono il middelware tra lootBot.js (che idealmente si occuperà solo di smistare i messaggi e le query ricevute verso i message_managers) e ./utility/bot_response
Possono accedere alle logiche specifiche (dove possono avere una diretta controparte) e alla loro vista specifica
Si occupano quindi di formare messaggi e query, utilizzando le funzioni offerte dalle logics.

In views_util sono definite costanti di accesso comune, come il menu dei bottoni 

Nota sul return dei modelli specifici:
È fondamentale che a questo livello le funzioni seguano una logica uniforme:
i return devono essere del tipo {query ?, toSend ?, toEdit ?, toDelete ?, sendObject ?, sendFile ?} o un array di questo oggetto.


## ./sources/
È la directory pronta ad ospitare la persistenza in json di model specifici.
Per il momento comprende ./players al cui interno ogni giocatore ha una cartella dedicata. -> sarebbe il posto dove spostare pian piano parte della struttura della tabella player, ad esempio

## ./utility/
Oltre a config e utils (il file configurazione e un modulo di utilità generiche) qui è ospitato bot_response: un modulo in grado di occuparsi della risposta a query, dell'invio di file e della modifica o invio di messaggi (con controllo sulla lunghezza del testo ed eventuale divisione in piu messaggi)

in specifics sono definite delle strutture specifiche accessorie ad un message_manager, come ad esempio l'albero query

## ./views/
in strings.js possono essere definite le funzioni di manipolazione stringhe (come l'inserimento o la lettura di variabili).
Un modulo generico errors.js raccoglie le stringhe di errore generalmente usate a livello di logics e models (dunque non serve che ognuno ne abbia di specifici). 
In /specifics invece sono raccolti i moduli con le stringhe usate per formulare messaggi nei message_managers.
È bene notare che (ad esclusione che le stringhe verso l'utente devono tutte essere raggruppate qui).

Al momento non ha senso starsi ad occupare di dividere ulteriormente questa sottocartella per le regioni linguistiche:
ci sono moltissime cose preliinari, forse irrealizzabili. Ma se mai i tempi dovessero venire maturi, con questa struttura l'implementazione della localizzazione sarà possibile!

