// Gestisce la parte della logica dedicata agli oggetti (LootItems)
const model = require("../model/DB_managers/specific/players");
const utils = require("../utility/utils");
const error_views = require("../views/errors");

module.exports = {
    player_full_infos: model.player_info,                // Se ci fosse da unire dei dati o da confrontarli o da aggiornarli altrove... ma al momento è sufficente esporre la funzione del model
    money: {
        update: update_player_money,
        decrease: decrease_player_money,
        increase: increase_player_money,
    }
}



async function update_player_money() {
    // controllo che 
}


async function decrease_player_money() {
    // controllo che 
}


async function increase_player_money() {
    // controllo che 
}