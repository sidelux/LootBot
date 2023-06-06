// Le stringhe per gli errori.
const strings = {
    title: "*Woops!*\n\n",
    contact_admin: "se il problema persiste considera di contattare l'amministratore",
    master_craftsman: {
        craft_line: "`▸ Errore generando la linea craft per {#}`"
    },
    players: {
        load_mainInfo: `▸ Errore caricando player_main_info per account_id: {#}`,
        load_craftsman_info: `▸ Errore accedendo alle preferenze craft per account_id: {#}`,
        load_equipInfo: `▸ Errore caricando player_info per account_id: {#}`,

    },
    items: {
        load_allItems: `▸ Errore nel caricamento in ram della lista oggetti. Le funzioni di craft non sono disponibili`,
        load_needed:  `▸ Errore nel caricamento in ram dei necessari per l'oggetto {#}`,
        load_equipInfo: `▸ Errore cercando le informazioni per l'oggetto equipaggiabile {#}`,

    },
    inventory: {
        update_items: `▸ (oggetti) Errore nel aggiornamento del database per:\n{#}`,
        load_fullInventory: `▸ Errore nel caricamento dello zaino completo per l'utente {#}`,
        load_equip: `▸ Errore nel caricamento dell'equipaggiamento per l'utente {#}`,
        item_quantity: `▸ Errore nella variabile di ingresso item_quantity\n{#}`
    },
    database: {
        closing: '▸ Errore durante la chiusura della connessione al database:',
        query: '▸ Errore durante la query: {#}'
    }
}

module.exports = {
    // Funzione per stampare un messaggio, sostituendone {#} con una variabile
    print: (error_message, variable) => typeof variable !== "undefined" ? error_message.split("{#}").join(variable.split("_").join("\\_")) : error_message, // sostituisce a {#} la variabile in ingresso
    // Funzione per generare una stringa a partire dagli elementi di un oggetto (da passare come variabile a print) 
    flatted_function_paparameters: (array) => array.map(obj => { 
        return Object.entries(obj).map(([key, value]) => `> ${key}: ${value}\n`);
      }).flat().join(""),
    str: strings // oggetto con le stringhe, divise per categoria
}