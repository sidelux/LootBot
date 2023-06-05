// Gestisce la parte della logica dedicata agli oggetti (LootItems)
const model = require("../model/DB_managers/specific/players");
const utils = require("../utility/utils");
const error_views = require("../views/errors");

module.exports = {
    main_info: get_player_info
}

async function player_main_info(telegram_user_id) {
    let raw_infos = await model.player_info(telegram_user_id);

    if (utils.isNully(raw_infos) || !Array.isArray(raw_infos) || raw_infos.length < 1) {
        return false;
    } else {
        return raw_infos[0];
    }
}

async function get_player_info(telegram_user_id) {
    let player_info = await player_main_info(telegram_user_id);

    if (player_info == false) {
        return {
            esit: false,
            message_text: `${error_views.str.title}\n${error_views.print(error_views.str.players.load_mainInfo, telegram_user_id)}, ${error_views.str.contact_admin}`
        }
    }
    return {
        esit: true,
        player_info: player_info
    }
}