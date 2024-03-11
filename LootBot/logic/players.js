// Gestisce la parte della logica dedicata agli oggetti (LootItems)
const model = require("../model/DB_managers/specific/players");


module.exports = {
    player_full_infos: model.player_info,
    player_teamId: model.team_id,
    player_abilities: model.player_abilities,
    increase_player_craft_point: model.increase_player_craft_point,
    assault: {
        infos: player_assault_infos,
        items_needed: player_assoult_upgrade_items,
    },
    smuggler: {
        current_offert: player_smuggler_current_offert,
    },
    money: {
        set: set_player_money,
        decrease: decrease_player_money,
        increase: increase_player_money,
    }
}

// Se ci fossero da unire dei dati o da confrontarli o da aggiornarli altrove... 
// o se ci fosse da fare qualche calcolo... 
// Potrebbero stare qui tutte funzioni specifiche per la logica del giocatore  ...ma al momento non me ne vengono, ed 
// è sufficente che esponga le funzioni del suo model


// controlla se il giocatore ha un team in assalto, nel giorno della preparazione, in una postazione.
async function player_assault_infos(player_id){
    let result = {
        team_id: -1,
        assault_phase: -1,
        assault_place: -1,
    }
    
    let player_team_id = await model.team_id(player_id);
    if (player_team_id.esit == true){
        result.team_id = player_team_id.results;
        let player_place = await model.assault.get_player_place(player_id);
        if (player_place.esit == true){
            result.assault_place = player_place.results;
            let assault_phase = await model.assault.get_phase(result.team_id)
            if (assault_phase.esit == true){
                result.assault_phase = assault_phase.results;
            }
        }
    }
    return result;
}

// gli oggetti richiesti per il potenziamento di una postazione
async function player_assoult_upgrade_items(team_id, place_id){
    return await model.assault.get_upgrade_items(team_id, place_id);
}

// il/gli oggetti richiesti dal contrabbandiere
async function player_smuggler_current_offert(player_id){
    return await model.smuggler.get_current_offert(player_id);
}



async function set_player_money(new_ammount, telegram_user_id) {
    if (new_ammount == 0 || isNaN(parseInt(new_ammount)) ) {
        return false;
    }
    let set_result = await model.update_player_money(parseInt(new_ammount), telegram_user_id, model.types.money.set);
    return set_result;
}


async function decrease_player_money(decrease_ammount, telegram_user_id) {
    if (decrease_ammount == 0 || isNaN(parseInt(decrease_ammount)) ) {
        return false;
    }
    let set_result = await model.update_player_money(parseInt(decrease_ammount), telegram_user_id, model.types.money.decrease);
    return set_result;
}


async function increase_player_money(increase_ammount, telegram_user_id) {
    if (increase_ammount == 0 || isNaN(parseInt(increase_ammount)) ) {
        return false;
    }
    let set_result = await model.update_player_money(parseInt(increase_ammount), telegram_user_id, model.types.money.increase);
    return set_result;
}