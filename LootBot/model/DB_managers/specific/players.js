const db = require("../db");


module.exports = {
    player_info: load_player_info,
}

async function load_player_info(telegram_user_id) {
    return new Promise(async function (player_main_info_res) {
        let results = await db.query(db.queries.players.full_info(telegram_user_id));
        
        if (results == false) {
            console.error(db.error_messages.print(db.error_messages.str.players.load_equipInfo), telegram_user_id);
            return player_main_info_res(false);
        }
        return player_main_info_res(results);
    });
}