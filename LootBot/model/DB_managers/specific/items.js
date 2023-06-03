const db = require("../db.js");



module.exports = {
    loadAllItems: loadAllItems,
    load_neededOf: load_neededOf,
}



async function loadAllItems() {

    return new Promise(async function (loadAllItems_res) {

        let results = await db.query(db.queries.items.allItems());
        if (results == false) {
            console.error(db.error_messages.print(db.error_messages.str.items.load_allItems));
            return loadAllItems_res(false);
        }
        return loadAllItems_res(results);
    });
}

// carica gli oggetti necessari per un creato
async function load_neededOf(id_oggetto) {
    return new Promise(async function (needed_res) {
        let results = await db.query(db.queries.items.needed(id_oggetto));
        if (results == false) {
            console.error(db.error_messages.print(db.error_messages.str.items.load_needed), id_oggetto);
            return needed_res(false);
        }
        return needed_res(results[0]);

    });
}