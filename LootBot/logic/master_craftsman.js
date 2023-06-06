const model = require("../model/JSON_managers/specifiche/master_craftsman");
const error_views = require("../views/errors");

const utils = require("../utility/utils"); 

const craft_logics = require("./craft");                      // Logica per i craft
const item_logics = require("./items");
const inventory_logics = require("./inventory");
const player_logics = require("./players");


module.exports = {
    get_craftsman_info: get_craftsman_info,
    update_craftsman_info: update_craftsman_info,

    clear_craftsman_info: clear_craftsman_info,
    list_total_quantity: list_total_quantity,
    add_item_to_items_list: add_item_to_items_list,
    generate_query_random_char: generate_query_random_char,
    validate_items_list_forReborn: validate_items_list_forReborn,

    item_infos_forList: item_infos_forList,

    pleyer_info_controll: pleyer_info_controll,
    pleyer_inventory_controll: pleyer_inventory_controll,


    validate_can_proceed: validate_can_proceed,
    craft_line_controll: craft_line_controll,
    commit_craft: commit_craft,
    craftman_info_craftUpdate: craftman_info_craftUpdate,


    // Vista
    craf_line_error: craf_line_error,
    item_infos: item_infos,
    get_craftables_ofRarity: get_craftables_ofRarity,
    sort_items_fromRarity: sort_items_fromRarity,
    get_craftables_forRebor: get_craftables_forRebor,
    get_craftable_subset_fromPrefixes: get_craftable_subset_fromPrefixes,
    get_craftable_array_groupedPrefixes: get_craftable_array_groupedPrefixes,
    get_prefixes_ofRarity: get_prefixes_ofRarity,
    is_craftable_rarity: is_craftable_rarity,
    avaible_rarities: avaible_rarities
}

// Funzione pubblica per creare una nuova lista craft. (se ne esiste già una, sara sovrascritta)
async function new_craftsman_info(telegram_user_id) {
    let craftman_info = model.template.craftman_info;
    craftman_info.query_random_char = model.new_query_random_char();
    return await model.update_craftsman_info(telegram_user_id, craftman_info);
}

// Espone il contenuto di ../sources/players/telegram_user_id/craftsman_info.json 
async function get_craftsman_info(telegram_user_id) {
    let craftsman_info = await model.get_craftsman_info(telegram_user_id);
    if (craftsman_info == false) { // potrebbe pur essere che non sia stato mai creato…
        craftsman_info = await new_craftsman_info(telegram_user_id);
        if (craftsman_info == false) { // niente.. proprio non si riesce ad accedervi. Male!
            return {
                esit: false,
                message_text: `${error_views.str.title}\n${error_views.print(error_views.str.players.load_craftsman_info, telegram_user_id)}, ${error_views.str.contact_admin}`
            };
        }
    }
    return {
        esit: true,
        craftsman_info: craftsman_info
    };
}

// Aggiorna il file json locale
async function update_craftsman_info(telegram_user_id, new_craftsman_info) {
    return await model.update_craftsman_info(telegram_user_id, new_craftsman_info);
}

// Esegue il conteggio di quantity in items_list
function list_total_quantity(items_list) {
    if (!items_list || items_list.length < 1) {
        return 0;
    }

    return items_list.reduce((total, item_info) => (total + parseInt(item_info.quantity)), 0);
}

// Aggiunge in maniera controllata un id oggetto alla lista item_list 
function add_item_to_items_list(item_id, item_list) {
    for (let i = 0; i < item_list.length; i++) {
        if (item_list[i].id == item_id) {
            item_list[i].quantity = parseInt(item_list[i].quantity) + 1;
            return item_list[i].quantity;
        }
    }

    item_list.push({
        id: item_id,
        quantity: 1
    });
    return 1;

}

// Reset di craftsman_info
function clear_craftsman_info(craftsman_info) {
    console.log(craftsman_info);

    craftsman_info.query_random_char = generate_query_random_char();
    craftsman_info.items_list = [];

    craftsman_info.controll.controll_date = -1;
    craftsman_info.controll.craft_point = 0;
    craftsman_info.controll.craft_cost = 0;
    craftsman_info.controll.missing_baseItems = [];
    craftsman_info.controll.used_items = { base: [], crafted: [] };
    craftsman_info.controll.skipped = [];
}

// Se restituisce qualche cosa e non un array vuoto, allora la validazione non è passata
function validate_items_list_forReborn(items_list, player_reborn) {
    let available_craftables = get_craftables_forRebor(player_reborn);
    return items_list.filter((item) => !available_craftables.some((item_info) => item_info.id === parseInt(item.id)));
}

// Funzione usata per firmare la query di aggiunta oggetto in lista (una misura anti userbot)
function generate_query_random_char() {
    return String.fromCharCode(65 + Math.floor(Math.random() * 26))
}





// Per la vista

function craf_line_error(items_list, player_id) {
    let parameters = [{ player_id: player_id }, ...items_list,];
    return `${error_views.str.title} ${error_views.print(error_views.str.master_craftsman.craft_line, error_views.flatted_function_paparameters(parameters))}\n${error_views.str.contact_admin}
}`
}

// item può essere o un oggetto {id, quantità} o solo una stringa|intero (itemID)
function item_infos(item) {
    return item_logics.item_infos(item.id ? item.id : parseInt(item));
}

function get_craftables_forRebor(player_reborn) {
    return item_logics.all_craftables_forReborn((isNaN(parseInt(player_reborn)) ? 1 : parseInt(player_reborn)));
}

// Partendo da una lista di {id, quantity}
function item_infos_forList(list) {
    return list.map((item) => {
        let item_info = item_infos(item);
        if (item.quantity) {
            item_info.quantity = item.quantity;
        }
        return item_info;
    });
}

// Estrae da craftable_array gli oggetti che iniziano per uno dei caratteri di prefixes_array
function get_craftable_subset_fromPrefixes(prefixes_array, craftables_array) {
    return craftables_array.map(item_info => ({ name: item_info.name, id: item_info.id })).filter(item => prefixes_array.indexOf(item.name.charAt(0).toUpperCase()) >= 0).sort((a, b) => a.name.localeCompare(b.name));
}

// restituisce un array delle iniziali usate per i creati nell'array craftable_array
// come get_craftable_array_prefixes, ma raggruppa le lettere (prefissi) con pochi elementi (fixed_minimum)
function get_craftable_array_groupedPrefixes(craftable_array) {
    let indexes_array = get_craftable_array_prefixes(craftable_array);

    let grouped_prefixes = [];

    let fixed_maximum = 8;
    let fixed_minimum = 4;
    let fixed_absolute_maximum = 10;



    let tmp_occurrences_counter = 0;
    let tmp_prew_occurrences = 0;
    let tmp_group_string = '';


    for (let i = 0; i < indexes_array.length; i++) {
        let currentIndex = indexes_array[i];
        let occurrences = craftable_array.filter(item_info => item_info.name.charAt(0).toUpperCase() === currentIndex).length;

        tmp_occurrences_counter += occurrences;
        tmp_group_string += currentIndex;

        if (tmp_occurrences_counter >= fixed_maximum || i === indexes_array.length - 1) {
            if (grouped_prefixes.length === 0) {
                grouped_prefixes.push(tmp_group_string);
            } else {
                if (i === indexes_array.length - 1 &&
                    occurrences < fixed_minimum &&
                    tmp_prew_occurrences + occurrences <= fixed_absolute_maximum + fixed_minimum
                ) {
                    grouped_prefixes[grouped_prefixes.length - 1] += tmp_group_string;
                } else {
                    tmp_prew_occurrences = occurrences;
                    grouped_prefixes.push(tmp_group_string);
                }
            }
            tmp_group_string = '';
            tmp_occurrences_counter = 0;
        }
    }

    return grouped_prefixes;
}

// restituisce un array delle iniziali usate per i creati nell'array craftable_array
function get_craftable_array_prefixes(craftable_array) {
    return craftable_array
        .map(item => item.name.charAt(0).toUpperCase())
        .filter((initials, index, arr) => arr.indexOf(initials) === index)
        .sort();
}

function get_craftables_ofRarity(item_rarity, player_reborn) {
    return item_logics.craftables_ofRarity(item_rarity, player_reborn);
}

function sort_items_fromRarity_accessory(item1, item2, rarityOrder) {
    let rarity1 = item1.rarity;
    let rarity2 = item2.rarity;

    if (rarityOrder[rarity1] < rarityOrder[rarity2]) {
        return -1;
    } else if (rarityOrder[rarity1] > rarityOrder[rarity2]) {
        return 1;
    } else {
        // Se la rarità è la stessa, ordina per nome, volendo si può aggiungere qui sopra anche per total_quantity
        let quantity1 = item1.quantity ? item1.quantity : item1.total_quantity;
        let quantity2 = item2.quantity ? item2.quantity : item2.total_quantity;

        if (quantity1 < quantity2) {
            return 1;
        } else if (quantity1 > quantity2) {
            return -1;
        } else {
            let name1 = item1.name.toLowerCase();
            let name2 = item2.name.toLowerCase();

            if (name1 < name2) {
                return -1;
            } else if (name1 > name2) {
                return 1;
            } else {
                return 0;
            }
        }


    }
}

function sort_items_fromRarity(items_list) {
    let rarityOrder = {
        C: 0,
        NC: 1,
        R: 2,
        UR: 3,
        L: 4,
        E: 5,
        UE: 6,
        X: 7,
        U: 8,
        S: 9,
    };
    return items_list.sort((a, b) => sort_items_fromRarity_accessory(a, b, rarityOrder))
}

function get_prefixes_ofRarity(item_rarity, player_reborn = false) {
    let craftables_array = get_craftables_ofRarity(item_rarity, player_reborn);
    return get_craftable_array_groupedPrefixes(craftables_array);
}

function is_craftable_rarity(item_rarity) {
    return (item_logics.get_all_craftable_rarity().indexOf(item_rarity) >= 0);
}

function avaible_rarities(player_reborn) {
    return item_logics.get_all_craftable_rarity(player_reborn);
}




function validate_can_proceed(craft_line, player_info) {
    return (
        parseInt(craft_line.craft_cost) < utils.player_max_money &&                // forse in questo caso la lista andrebbe semplicemente stralciata...
        parseInt(craft_line.craft_cost) <= player_info.money &&
        craft_line.missing_baseItems.length <= 0 &&
        (craft_line.used_items.base.length + craft_line.used_items.crafted.length) > 0
    );
}

async function craft_line_controll(player_info, craftsman_info, player_inventory) {
    let response = {
        has_error: false,
        is_incompleate: false,
        is_too_expensive: false,
        craft_line
    }

    let craft_line = await  craft_logics.full_line_craft(craftsman_info.items_list, player_inventory, craftsman_info.preserve_crafted);
    
    if (utils.isNully(craft_line) || craft_line.loops <= 0 || craft_line.used_items.base.length <= 0 || craft_line.skipped.length > 0) { // La linea craft non è stata generata correttamente...
        response.has_error = true;
    } else if (craft_line.loops > craft_logics.fixed_max_loops) {
        response.is_incompleate = true;
        clear_craftsman_info(craftsman_info);
        await update_craftsman_info(player_info.account_id, craftsman_info);
    } else if (parseInt(craft_line.craft_cost) > utils.player_max_money) {
        response.is_incompleate = true;
        clear_craftsman_info(craftsman_info);
        await update_craftsman_info(player_info.account_id, craftsman_info);
    }

    response.craft_line= craft_line;
    return response;
}


function craftman_info_craftUpdate(craftsman_info, craft_line, message_id) {
    let target_items_list = [];
    craftsman_info.items_list.forEach((item) => {
        let item_info = item_logics.item_infos(item.id);
        if (item_info) {
            target_items_list.push({ id: item.id, total_quantity: item.quantity, rarity: item_info.rarity });
        }
    })
    craftsman_info.query_random_char = generate_query_random_char();
    craftsman_info.current_message_id = message_id;
    craftsman_info.controll = {
        target_items_list: target_items_list,
        controll_date: Date.now(),
        loops: craft_line.loops,
        craft_point: craft_line.craft_point,
        craft_cost: craft_line.craft_cost,
        missing_baseItems: craft_line.missing_baseItems,
        used_items: {
            base: craft_line.used_items.base,
            crafted: craft_line.used_items.crafted
        },
        skipped: [],
    }

}

// Tutti i controlli del caso... infondo agli if la query sul database
async function commit_craft(craftsman_info, player_info) {
    let response = {
        money_controll: false,
        load_controll: false,
        used_items_controll: true,
        target_items_controll: true,
    }

    let craft_report = {
        craft_cost: craftsman_info.controll.craft_cost,
        craft_gained_pc: craftsman_info.controll.craft_point,
        used_items: [],
        crafted_items: []
    };
    let update_array = [];                                                                                             // [player_Id, item_Id, new_quantity]
    let player_inventory_controll;
    let player_inventory;
    let all_used_items;

    // controllo su gruzzolo, le informazioni di player_info sono già aggiornate
    response.money_controll = (!isNaN(craftsman_info.controll.craft_cost) && player_info.money > parseInt(craftsman_info.controll.craft_cost))

    // Carico zaino
    player_inventory_controll = await inventory_logics.complete(player_info.id);
    response.load_controll = player_inventory_controll.esit
    if (!(response.load_controll && response.money_controll)) {
        return response;
    }

    player_inventory = player_inventory_controll.player_inventory;                                                                       // lo zaino fresco fresco
    all_used_items = [...craftsman_info.controll.used_items.base, ...craftsman_info.controll.used_items.crafted];

    // QUANTITÀ DECREMENTATE: per ogni oggetto usato controllo che inventory.quantity >= a used_item.total_quantity (e che ci sia ancora...)
    for (used_item of all_used_items) {
        let inventory_item = inventory_logics.hasItem(used_item.id, player_inventory);

        if (!inventory_item.has_item || inventory_item.quantity < parseInt(used_item.total_quantity)) {
            console.log(used_item);
            console.log(inventory_item);

            response.used_items_controll = false;
            break;
        } else {
            let new_quantity = (inventory_item.quantity - parseInt(used_item.total_quantity));
            update_array.push([player_info.id, used_item.id, new_quantity]);
            craft_report.used_items.push({item_id: used_item.id, new_quantity: new_quantity, after_craft_quantity: used_item.total_quantity})
        }
    };
    if (!response.used_items_controll) {
        return response;
    }

    // QUANTITÀ INCREMENTATE: per ogni oggetto creato controllo che quantity <= cap(rarity)    
    for (target_item of craftsman_info.controll.target_items_list) {
        let already_in_list_index = update_array.findIndex((item) => (item[1] == target_item.id));
        let new_quantity = 0;

        if (already_in_list_index >= 0) {
            new_quantity = update_array[already_in_list_index][2] + parseInt(target_item.total_quantity);
            // Controllo sul cap oggetti
            let cap_check = inventory_logics.inventory_cap().cap_check(target_item.rarity, new_quantity);
            if (!cap_check) {
                response.target_items_controll = false;
                break;
            }
            update_array[already_in_list_index][2] = new_quantity
        } else {
            let inventory_item = inventory_logics.hasItem(target_item.id, player_inventory);
            new_quantity = (inventory_item.quantity + parseInt(target_item.total_quantity));
            update_array.push([player_info.id, target_item.id, new_quantity]);
        }

        craft_report.crafted_items.push({item_id: target_item.id, new_quantity: new_quantity, after_craft_quantity: target_item.total_quantity})

    };

    if (!response.target_items_controll) {
        return response;
    }


    response.craft_report = craft_report;
    response.update_quantity = await inventory_logics.update_items_quantityOf([update_array]);


    return response;
}


//Carico playerinfo
async function pleyer_info_controll(telegram_user_id) {
    return await player_logics.player_full_infos(telegram_user_id)
}

//Carico player_inventory
async function pleyer_inventory_controll(player_id) {
    return await inventory_logics.complete(player_id);
}



