// Questo modulo gestisce la risposta a messaggi del bot (quindi dalla chat privata)


let handlers_register = [ // I moduli che vogliono intercettare un messaggio in risposta, dichiarano qui una lista di "triggers" (array) a cui si registrano
    // Gli handler sono funzioni che accettano in ingresso il messaggio originale E il messaggio in risposta come parametri separati 
    
    {
        triggers: ["Lista commissione"] ,
        handler: require("./specific/master_craftsman").replyDispatcher
    },
]


// In base a titolo (prima linea del messaggio originale) cerca un handler in handlers_register e delega la risposta.
// La funzione può restituire un oggetto response o false
module.exports.manage = async (message) => {
    if (typeof message.reply_to_message.text == "string" ){
        for (let tmp in handlers_register) {
            const { handler, triggers } = handlers_register[tmp];
            const message_title = message.reply_to_message.text.split("\n")[0];
            if (triggers.some(trigger => message_title.toLowerCase().match(trigger.toLowerCase()) )) {
                // Trovato un gestore che gestisce l'input: Sto!
                return (await handler(message.reply_to_message, message));
            }
        }
    } 

    return(false)
}