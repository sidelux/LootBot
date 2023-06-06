// Gestisce la parte della logica dedicata agli oggetti (LootItems)
const model = require("../model/DB_managers/specific/players");


module.exports = {
    player_full_infos: model.player_info,
    increase_player_craft_point: model.increase_player_craft_point,
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



async function set_player_money(new_ammount, telegram_user_id) {
    if (new_ammount == 0 || isNaN(parseInt(new_ammount)) ) {
        return false;
    }
    let set_result = await model.update_player_money(parseInt(new_ammount), telegram_user_id, model.types.money.set);
    console.log(set_result);
    return set_result;
}


async function decrease_player_money(decrease_ammount, telegram_user_id) {
    if (decrease_ammount == 0 || isNaN(parseInt(decrease_ammount)) ) {
        return false;
    }
    let set_result = await model.update_player_money(parseInt(decrease_ammount), telegram_user_id, model.types.money.decrease);
    console.log(set_result);
    return set_result;
}


async function increase_player_money(increase_ammount, telegram_user_id) {
    if (increase_ammount == 0 || isNaN(parseInt(increase_ammount)) ) {
        return false;
    }
    let set_result = await model.update_player_money(parseInt(increase_ammount), telegram_user_id, model.types.money.increase);
    console.log(set_result);
    return set_result;
}