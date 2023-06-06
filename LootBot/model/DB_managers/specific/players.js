const db = require("../db");
const utils = require("../../../utility/utils");


module.exports = {
    player_info: load_player_info,
}

async function load_player_info(player_id) {
    return new Promise(async function (player_main_info_res) {
        let player_full_infos = await db.query(db.queries.players.full_info(player_id));
        
        if (player_full_infos == false  ||
            utils.isNully(player_full_infos)    ||
            !Array.isArray(player_full_infos)   ||
            player_full_infos.length < 1) {
            return player_main_info_res({
                esit: false,
                error_text: db.error_messages.print(db.error_messages.str.players.load_equipInfo, player_id)
            });
        }
        return player_main_info_res({
            esit: true,
            results: player_full_infos[0]
        });
    });
}



async function load_player_info(player_id) {
    return new Promise(async function (player_main_info_res) {
        let player_full_infos = await db.query(db.queries.players.full_info(player_id));
        
        if (player_full_infos == false  ||
            utils.isNully(player_full_infos)    ||
            !Array.isArray(player_full_infos)   ||
            player_full_infos.length < 1) {
            return player_main_info_res({
                esit: false,
                error_text: db.error_messages.print(db.error_messages.str.players.load_equipInfo, player_id)
            });
        }
        return player_main_info_res({
            esit: true,
            results: player_full_infos[0]
        });
    });
}