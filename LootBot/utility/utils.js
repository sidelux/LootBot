
/* Questo modulo ospita:
 funzioni di utilità generiche 
 struttura database e query (quest'ultima con funzione formatter)
*/ 
const master_craftsman_utils = require("./specifics/master_craftsman")

// In questo oggetto è tenuta traccia delle strutture nelle tabelle del database
const db_structures = {
    players:{
        telegram_id: "account_id",
        main_info: {
            account_id: "account_id",
            id: "id",
            nickname: "nickname",
            gender: "gender",
            reborn: "reborn",
            money: "money",
            exp: "exp",
        },
        craft: {
            craft_point: "craft_count",
            weekly_point: "craft_week",
            daily_pint: "craft_day",
        },
        dungeon_info: {},
        cave_info: {},
        mission_info: {},
        maps_info: {},
        equip_info: {  // Primo esempio
            sword: "weapon_id",
            armor: "weapon2_id",
            shield: "weapon3_id"
        },
        equip_item_info: { // Primo esempio
            rarity: "rarity",
            sword_power: "power",
            armor_power: "power_armor",
            shield_power: "power_shield"
        }
    },
    items: {
        key: "id",
        name: "name",
        rarity: "rarity",
        craftable: "craftable",
    },
    inventory: {
        player_id: "player_id",
        item_id: "item_id",
        quantity: "quantity",
        durability: "durability",
        max_durability: "durability_max",
    },
    craft: {
        needed: {
            1: "material_1",
            2: "material_2",
            3: "material_3"
        },
        key: "material_result"
    },
    printObject: (object) => Object.values(object).join(", ")
}

// In questo oggetto è tenuta traccia dei percorsi delle query. (e passandolo a generate_callback_rute è possibile generarli)
const query_tree = {
    /*
        template:
        key: {
                stmp: "keyname",
                
            },
    */

    // Questo oggetto va astratto in un modulo dedicato... ma si dovrebbe trovare una soluzione per i nomi duplicati che non sia l'attuale (e poco efficace) sistema di (ultimo, primo)
    // Così come è non è scalabile... :(
    master_craftsman: master_craftsman_utils.query_tree
}

// In last_rute l'ultimo stmp della query. In sub_tree l'albero su cui fare la ricerca <- puo essere l'intero query_tree o solo una parte (ad esempio query_tree.mastercraftsman.menu) 
function generate_callback_rute(last_rute, sub_tree) {
    const callback_full_rute = [];
    findIn_query_tree(sub_tree, [], last_rute, callback_full_rute);
    return callback_full_rute.length > 1 ? callback_full_rute.join(":") : callback_full_rute[0];
}

// Funzione ricorsiva accessoria di generate_callback_rute
function findIn_query_tree(node, tmp_line, rute_string, full_rute) {
    if (node.hasOwnProperty("stmp")) {
        tmp_line.push(node.stmp);
        if (node.stmp === rute_string)
            full_rute.push(...tmp_line);
    }

    for (const chiave in node) {
        if (typeof node[chiave] === 'object')
            findIn_query_tree(node[chiave], tmp_line, rute_string, full_rute);
    }

    if (tmp_line.length > 0)
        tmp_line.pop();
}

const query_structure = {
    generate_callback_rute: generate_callback_rute,
    query_tree: query_tree
}




// ACCESSORIE GENERALI

// vera solo per value === null
function isNull  (value) {return  typeof value === "object" && !value};

// vera se value ===  null o undefined
function isNully  (value) {return  isNull(value) || typeof value === 'undefined'};

module.exports = {
    db_structures: db_structures,
    query_structure: query_structure,
    isNull: isNull,
    isNully: isNully,
    simple_number_formatter: (number) => number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),
    player_max_money: 1000000000,                                                                           // qui perche non saprei dove metterlo :(
    master_craftsman_cost_multiplier: 3,
}