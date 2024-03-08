// Questo modulo gestisce la risposta a messaggi del bot (quindi dalla chat privata)
//

let handlers_register = [ // I moduli che vogliono intercettare un messaggio in risposta, dichiarano qui una lista di "triggers" (array) a cui si registrano
    // Gli handler sono funzioni che accettano in ingresso il messaggio originale E il messaggio in risposta come parametri separati 
    {
        triggers: ["Lista commissione"] ,
        handler: require("./specific/master_craftsman").replyDispatcher
    },
]


// In base a titolo.. cerca un handler in handlers_register e delega la risposta.
// La funzione può restituire un oggetto response o nulla
module.exports.manage = async (message) => {

    for (let tmp in handlers_register) {
        const { handler, triggers } = handlers_register[tmp];
        if (triggers.some(trigger => input.toLowerCase().match(trigger.toLowerCase()) )) {
            // Trovato un gestore che gestisce l'input: Sto!
            return handler(input);
        }
    }

}