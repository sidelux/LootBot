const db = require("../db");

module.exports = {
    complete: get_complete_inventoryOf,
    items: {
        update_quantities_Of: update_quantities_Of,
    },
    equip: {
        complete: get_equipOf, // Equipaggiamento completo {sword, armor, shield}
        item_infos: get_itemInfos_fromInventoryOf, // quantità, durabilità e durabilità massima di un oggetto nello zaino
        //equipitem_info: get_equipInfo_ofItem, // questa funzione è sostituita da get_itemPowerInfo() del controller inventory (che esegue la ricerca sull'array in ram) 
        equipitem_updateDurability: update_equipItem_durability
    }
}

// GETS

// Lo zaino completo per player_lootId
async function get_complete_inventoryOf(player_lootId) {
    return new Promise(async function (complete_inventory) {
        let results = await db.query(db.queries.inventories.complete(player_lootId));
        if (results === false) {
            return complete_inventory({
                esit: false,
                message_text: db.error_messages.print(db.error_messages.str.inventory.load_fullInventory, player_lootId)
            });
        }

        return complete_inventory({
            esit: true,
            player_inventory: results
        }); // 
    });
}

async function update_quantities_Of(update_array) { // [player_Id, item_Id, new_quantity]
    return new Promise(async function (quantities_update) {
        let results = await db.query(db.queries.inventories.update_items_quantity(), update_array);
        if (results === false) {
            return quantities_update({
                esit: false,
                message_text: db.error_messages.print(db.error_messages.str.inventory.update_items, update_array)
            });
        }

        return quantities_update({
            esit: true,
            update_in: results.affectedRows ? results.affectedRows : 0
        }); // 
    });
}

// SETS

//*************************************************************************************************************
// Qelle che seguono sono funzioni di test, un tentativo di porting attualmente in pausa…

// quantity durability, max_durability di un oggetto nello zaino di player_lootId
async function get_itemInfos_fromInventoryOf(player_lootId, item_id) {
    return new Promise(async function (complete_inventory) {
        let results = await db.query(db.queries.inventories.item(item_id, player_lootId));
        if (results == false) {
            console.error(db.error_messages.print(db.error_messages.str.inventory.load_fullInventory, player_lootId));
            return complete_inventory(false);
        }

        return complete_inventory({
            quantity: results[0][db.queries.tables_structs.inventory.quantity],
            durability: results[0][db.queries.tables_structs.inventory.durability],
            max_durability: results[0][db.queries.tables_structs.inventory.max_durability],
        }); // 
    });
}

// L'equipaggiamento di player_lootId (restituisce {sword, armor, shield})
async function get_equipOf(player_lootId) {
    return new Promise(async function (equip_res) {
        

        let results = await db.query(db.queries.inventories.player_equip(player_lootId));
        if (results == false || results.len) {
            console.error(db.error_messages.print(db.error_messages.str.inventory.load_equip, player_lootId));
            return equip_res(false);
        }

        response.esit = true;
        response.equip = {
            sword: results[0][db.queries.tables_structs.players.equip_info.sword],
            armor: results[0][db.queries.tables_structs.players.equip_info.armor],
            shield: results[0][db.queries.tables_structs.players.equip_info.shield],
        }

        return equip_res(results[0]); // 
    });
}

//  {sword_power, power_armor, power_shield, rarity} di un ogetto equipaggiabile
async function get_equipInfo_ofItem(item_id) {
    return new Promise(async function (equipItem_info_res) {
        let results = await db.query(db.queries.inventories.equip_item_info(item_id));
        if (results == false) {
            console.error(db.error_messages.print(db.error_messages.str.items.load_equipInfo, item_id));
            return equipItem_info_res(false);
        }

        return equipItem_info_res({
            sword_power: results[0][db.queries.tables_structs.players.equip_item_info.sword_power],
            armor_power: results[0][db.queries.tables_structs.players.equip_item_info.shield_power],
            shield_power: results[0][db.queries.tables_structs.players.equip_item_info.shield_power],
        }); // 
    });
}

// UPDATES

async function update_equipItem_durability(item_id, player_lootId, durability, max_durability = -1) {
    return new Promise(async function (update_durability_res) {
        let results = await db.query(db.queries.inventories.update_equip_item_durability(item_id, player_lootId, durability, max_durability));
        if (results == false) {
            console.error(db.error_messages.print(db.error_messages.str.inventory.load_equip, player_lootId));
            return update_durability_res(false);
        }
        return update_durability_res(true); // 
    });
}
