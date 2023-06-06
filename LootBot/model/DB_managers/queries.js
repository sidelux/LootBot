// le query verso il database
// Online dicono di non farlo, di non creare query in questo modo e di usare ? . Ma è impossibile che gli input di queste funzioni siano compromessi. O no? 

const tables_util = require("./specific/db_config")
const tables_names = tables_util.tables;
const tables_structs = tables_util.structures;

module.exports = {
    tables_structs: tables_structs,
    tables_names: tables_names,
    players: {
        full_info: player_full_info,

        //Soldi
        set_player_money: set_player_money,
        increase_player_money: increase_player_money,
        decrease_player_money: decrease_player_money,

        // PC
        increase_player_craft_point: increase_player_craft_point
    },
    items: {
        allItems: allItems,
        needed: items_neededFor,
    },
    inventories: {
        complete: complete_inventoriOf, // GET di Zaino completo
        item: inventory_item_infos, // item_infos di un oggetto nello zaino (quantità, durabilità…)
        
        update_items_quantity: update_items_quantity, // Su un array [player_Id, item_Id, new_quantity]

        player_equip: inventory_equip, // GET di Equipaggiamento completo
        equip_item_info: inventory_equip_item_info, // GET di oggetto {tables_structs.players.equip_item_info} per un item_id

        update_equip_item_durability: update_equip_item_durability // aggiorna la scadenza di un oggetto

    }
}

// ****************************************************************************   SELECT

// PLAYERS
function player_full_info (telegram_user_id) {
    return `SELECT  ${tables_structs.printObject(tables_structs.players.main_info)} FROM ${tables_names.players} WHERE ${tables_structs.players.telegram_id} = ${telegram_user_id}`;
}

function inventory_equip(player_id){
    return `SELECT ${tables_structs.printObject(tables_structs.players.equip_info)} FROM ${tables_names.players} WHERE ${tables_structs.players.key} = ${player_id}`;
}

function inventory_equip_item_info(item_id){ 
    // SELECT weapon_id, weapon2_id, weapon3_id FROM player WHERE id = 
    return `SELECT ${tables_structs.printObject(tables_structs.players.equip_item_info)} FROM ${tables_names.items} WHERE ${tables_structs.items.key} = ${item_id}`;
}

// ITEMS
function allItems() {
    return `SELECT * FROM ${tables_names.items}`
}

function items_neededFor (item_id) {
    return `SELECT ${tables_structs.printObject(tables_structs.craft.needed)} FROM ${tables_names.craft} WHERE ${tables_structs.craft.key} = ${item_id}`;
}

// INVENTORY
function inventory_item_infos(item_id, player_id) {
    return `SELECT * FROM ${tables_names.inventory} WHERE ${tables_structs.inventory.item_id} = ${item_id} AND ${tables_structs.inventory.player_id} = ${player_id}`;
}

function complete_inventoriOf(player_id){
    return `SELECT * FROM ${tables_names.inventory} WHERE ${tables_structs.inventory.player_id} = ${player_id}`;
}

// ****************************************************************************   UPDATE

// PLAYERS
function increase_player_money(increase_ammount, telegram_user_id){
    let query = `UPDATE ${tables_names.players} SET ${tables_structs.players.main_info.money} = ${increase_ammount}`;
    query += ` WHERE ${tables_structs.players.main_info.account_id} = ${telegram_user_id}`;

    return query;
}

function decrease_player_money(decrease_ammount, telegram_user_id){
    let query = `UPDATE ${tables_names.players} SET ${tables_structs.players.main_info.money} =`;
    query += ` GREATEST( ${tables_structs.players.main_info.money} - ${decrease_ammount}, 0)`;
    query += ` WHERE ${tables_structs.players.main_info.account_id} = ${telegram_user_id}`;

    return query;
}


function set_player_money(new_ammount, telegram_user_id){
    let query = `UPDATE ${tables_names.players} SET ${tables_structs.players.main_info.money} = ${new_ammount}`;
    query += ` WHERE ${tables_structs.players.main_info.account_id} = ${telegram_user_id}`;

    return query;
}


function  increase_player_craft_point(increase_ammount, telegram_user_id){
    let query = `UPDATE ${tables_names.players} SET`;
    query += ` ${tables_structs.players.craft.craft_point} = ${tables_structs.players.craft.craft_point} + ${increase_ammount},`;
    query += ` ${tables_structs.players.craft.daily_pint} = ${tables_structs.players.craft.daily_pint} + ${increase_ammount},`;
    query += ` ${tables_structs.players.craft.weekly_point} = ${tables_structs.players.craft.weekly_point} + ${increase_ammount}`;
    query += ` WHERE ${tables_structs.players.main_info.account_id} = ${telegram_user_id}`;

    return query;
}

// INVENTORY
function reduce_item_quantity(updates_array){ // in ingresso, updates_array è un array di [playerId, itemId, reduce_quantity]
    let query = `INSERT INTO ${tables_names.inventory}  (${tables_structs.inventory.player_id},  ${tables_structs.inventory.item_id}, ${tables_structs.inventory.quantity}) `;
    query += `VALUES ? ON DUPLICATE KEY UPDATE ${tables_structs.inventory.quantity} = GREATEST(${tables_structs.inventory.quantity} - VALUES(${tables_structs.inventory.quantity}), 0)`
    return query;
}

function increment_item_quantity(updates_array){ // in ingresso, updates_array è un array di [player_Id, item_Id, reduce_quantity]
    let query = `INSERT INTO ${tables_names.inventory}  (${tables_structs.inventory.player_id},  ${tables_structs.inventory.item_id}, ${tables_structs.inventory.quantity}) `;
    query += `VALUES ? ON DUPLICATE KEY UPDATE ${tables_structs.inventory.quantity} = ${tables_structs.inventory.quantity} + VALUES(${tables_structs.inventory.quantity})`
    return query;
}

function update_items_quantity(){ // in ingresso, updates_array è un array di [player_Id, item_Id, new_quantity]
    let query = `INSERT INTO ${tables_names.inventory}  (${tables_structs.inventory.player_id},  ${tables_structs.inventory.item_id}, ${tables_structs.inventory.quantity}) `;
    query += `VALUES ? ON DUPLICATE KEY UPDATE ${tables_structs.inventory.quantity} = VALUES(${tables_structs.inventory.quantity})`
    return query;
}

function update_equip_item_durability(item_id, player_id, new_durability, max_durability= -1){
    let query = `UPDATE ${tables_names.inventory} SET ${tables_structs.inventory.durability} = ${new_durability}`
    if(max_durability != -1){
        query += `, ${tables_structs.inventory.max_durability} = ${max_durability}`
    }
    query += `WHERE ${tables_structs.inventory.player_id} = ${player_id} AND ${tables_structs.inventory.item_id} = ${item_id}`
    return query
}
