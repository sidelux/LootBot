const db = require("../db");
const utils = require("../../../utility/utils");
const query_types = {
    money: {
        set: "SET",
        increase: "INCREASE",
        decrease: "DECREASE"
    }
}



module.exports = {
    player_info: load_player_info,
    team_id: get_player_team_id,
    player_abilities: player_abilities,
    update_player_money: update_player_money,
    increase_player_craft_point: increase_player_craft_point,

    assault: {
        get_player_place: get_player_assault_place,
        get_phase: get_player_assault_phase,
        get_upgrade_items: get_player_assault_upgrade_items
    },
    smuggler: {
        get_current_offert: get_current_offert
    },


    types: query_types
}





// Scheda giocatore
async function load_player_info(telegram_id) {
    return new Promise(async function (player_main_info_res) {
        if (typeof telegram_id != "string" && isNaN(telegram_id)){
            return player_main_info_res({
                esit: false,
                error_text: db.error_messages.print(db.error_messages.str.players.bad_input, telegram_id)
            });
        }

        let parsed_input = isNaN(telegram_id) ? telegram_id.trim() : parseInt(telegram_id);
        let player_full_infos;

        if (typeof parsed_input == "string"){
            player_full_infos = await db.query(db.queries.players.full_info_from_nickname(parsed_input));
        } else {
            player_full_infos = await db.query(db.queries.players.full_info(parsed_input));
        }

        if (player_full_infos == false ||
            utils.isNully(player_full_infos) ||
            !Array.isArray(player_full_infos) ||
            player_full_infos.length < 1) {
            return player_main_info_res({
                esit: false,
                error_text: db.error_messages.print(db.error_messages.str.players.load_mainInfo, telegram_id)
            });
        }
        return player_main_info_res({
            esit: true,
            results: player_full_infos[0]
        });
    });
}

// Id del team giocatore
async function get_player_team_id(player_id) {
    return new Promise(async function (player_main_info_res) {
        let player_team_id = await db.query(db.queries.players.team_id(player_id));

        if (player_team_id == false ||
            utils.isNully(player_team_id) ||
            !Array.isArray(player_team_id) ||
            player_team_id.length <= 0) {
            return player_main_info_res({
                esit: false,
                error_text: db.error_messages.print(db.error_messages.str.players.load_teamId, `${player_id}`)
            });
        }
        return player_main_info_res({
            esit: true,
            results: player_team_id[0].team_id
        });
    });
}

// Talenti del giocatore
async function player_abilities(player_id){
    let player_abilities = await db.query(db.queries.players.player_abilities(player_id));

    if (player_abilities == false ||
        utils.isNully(player_abilities) ||
        !Array.isArray(player_abilities) ||
        player_abilities.length <= 0) {
        return ({
            esit: false,
            error_text: db.error_messages.print(db.error_messages.str.players.load_abilities, `${player_id}`)
        });
    }
    return ({
        esit: true,
        results: player_abilities
    });
}

// Postazione in assalto per un giocatore
async function get_player_assault_place(player_id) {
    return new Promise(async function (player_main_info_res) {
        let player_assault_place = await db.query(db.queries.assault.place(player_id));

        if (player_assault_place == false ||
            utils.isNully(player_assault_place) ||
            !Array.isArray(player_assault_place) ||
            player_assault_place.length <= 0) {
            return player_main_info_res({
                esit: false,
            });
        }
        return player_main_info_res({
            esit: true,
            results: player_assault_place[0].place_id
        });
    });
}

// Fase corrente in assalto
async function get_player_assault_phase(team_id) {
    return new Promise(async function (player_main_info_res) {
        let player_assault_phase = await db.query(db.queries.assault.phase(team_id));

        if (player_assault_phase == false ||
            utils.isNully(player_assault_phase) ||
            !Array.isArray(player_assault_phase) ||
            player_assault_phase.length <= 0) {
            return player_main_info_res({
                esit: false,
            });
        }
        return player_main_info_res({
            esit: true,
            results: player_assault_phase[0].phase
        });
    });
}

// Oggetti richiesti per potenziamento di una postazione
async function get_player_assault_upgrade_items(team_id, place_id) {
    return new Promise(async function (player_main_info_res) {
        let player_assault_upgrade_items = await db.query(db.queries.assault.upgrade_items(team_id, place_id));

        if (player_assault_upgrade_items == false ||
            utils.isNully(player_assault_upgrade_items) ||
            !Array.isArray(player_assault_upgrade_items)
            ){
            return player_main_info_res({
                esit: false,
                results: []
            });
        }
        return player_main_info_res({
            esit: true,
            results: player_assault_upgrade_items
        });
    });
}

// oggetto/i richiesti dal contrabbandiere
async function get_current_offert(player_id){
    let player_current_offert = await db.query(db.queries.smuggler.current_offert(player_id));

    if (player_current_offert == false ||
        utils.isNully(player_current_offert) ||
        !Array.isArray(player_current_offert)
        ){
        return ({
            esit: false,
            results: []
        });
    }
    return ({
        esit: true,
        results: player_current_offert
    });
}

async function update_player_money(ammount, telegram_user_id, type) {
    return new Promise(async function (money_update_res) {

        // controllo che 
        let query_function;
        switch (type) {
            case query_types.money.set: {
                query_function = db.queries.players.set_player_money
                break
            }
            case query_types.money.increase: {
                query_function = db.queries.players.increase_player_money
                break
            }
            case query_types.money.decrease: {
                query_function = db.queries.players.decrease_player_money
                break
            }
        }
        if (query_function) {
            let money_update = await db.query(query_function(ammount, telegram_user_id));

            if (!money_update) {
                return money_update_res({
                    esit: false,
                });
            }
            return money_update_res({
                esit: true,
                results: money_update
            });


        }

        return {
            esit: false
        }
    });
}

async function increase_player_craft_point(increase_ammount, telegram_user_id) {
    return new Promise(async function (increase_craft_point_res) {
        let increase_res = await db.query(db.queries.players.increase_player_craft_point(increase_ammount, telegram_user_id));

        if (!increase_res) {
            return increase_craft_point_res({
                esit: false,
            });
        }
        return increase_craft_point_res({
            esit: true,
            results: increase_res
        });
    })
}
