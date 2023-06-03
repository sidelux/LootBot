// Gestisce la parte della logica dedicata agli oggetti (LootItems)


const model = require("../model/DB_managers/specific/items");                   // Il modello che cura l'interazione con il database (per le specifiche su LootItems)
const utils = require("../utility/utils");                                      // Le utilità

let lootItems_array = [];                                                       // L'oggetto che custodisce [LootItems], caricato in ram all'avvio del bot (evita tutte le chiamate alla tabella item e craft)

module.exports = {
    lootItems_array: lootItems_array.slice(),                                   // restituisce una copia di lootItems (avrà vita solo per la chiamata)
    init: load_in_ram,                                                          // Inizzializza il modulo caricando gli oggetti da item e craft

    // ******** Funzioni generiche
    item_infos: item_infos_fromID,


    // ******** Funzioni oggetti creati
    all_craftables_forReborn: all_craftables_forReborn,
    craftables_ofRarity: craftables_list_fromRarity,                            // restituisce tutti i creabili di una rarità
    craftables_ofRarities: craftables_list_fromRarities,
    get_craftable_array_groupedIndexes: get_craftable_array_groupedIndexes,                   // restituisce un array con le iniziali usate nei creati
    get_all_craftable_rarity: get_all_craftable_rarity,


    // ******** Funzioni per il Craft
    craftItemInfo_FromItemId: craft_item_info_From,                                   //  craft_item_info usato nella logica del craft (l'oggetto item_info in [allItems_array], semplificato)

}

// ******** INIT
// L'init di oggetti va chiamato all'avvio del bot (carica in ram l'albero oggetti, così che l'accesso sia piu rapido)
async function load_in_ram() {
    try {

        let inizio = Date.now();                                                // rimuovi: solo per test iniziale
        let db_items = await model.loadAllItems();

        if (db_items === false) {
            return;
        }

        await normalize_itemsRawData(db_items, lootItems_array);                // carica i necessari dalla tabella craft
        console.log(`> Tempo items.init -> ${Date.now() - inizio}ms`);

        return lootItems_array.length;
    }
    catch (error) {
        console.error(error)
    }
}

// Funzione usata nell'inizializzazione del modulo:   
// Normalizza ed effetivamente inizializza l'array pubblico lootItems
async function normalize_itemsRawData(raw_data, target_array) {
    console.log("Normalizzo... ");                                              // log. rimuovi: solo per test iniziale

    if (!utils.isNully(raw_data)) {                                             // grazie furins
        for (let i = 0; i < raw_data.length; i++) {

            if (raw_data[i][utils.db_structures.items.craftable] === 1) {                                  // per i creabili calcolo ed aggiungo:
                let item_info = craftInfo_fromRarity(raw_data[i][utils.db_structures.items.rarity]);       // > costo craft e pc
                raw_data[i].craft_pnt = item_info.craft_pnt;
                raw_data[i].craft_cost = item_info.craft_cost;

                let craft_needed_materials = await model.load_neededOf(raw_data[i][utils.db_structures.items.key]);      // oggetti necessari

                if (craft_needed_materials === false || typeof craft_needed_materials === "undefined") {
                    raw_data[i].isSterile = true;
                } else {                                                                      // estrapolo l'oggetto e lo normalizzo 
                    raw_data[i].isSterile = false;
                    raw_data[i].needed = [                                                    // i parseInt è da abbastanza paranoico :(
                        parseInt(craft_needed_materials[utils.db_structures.craft.needed[1]]),
                        parseInt(craft_needed_materials[utils.db_structures.craft.needed[2]]),
                        parseInt(craft_needed_materials[utils.db_structures.craft.needed[3]])
                    ];
                }
            }

            target_array.push(raw_data[i]);                                     // Aggiungo a target_array
        }
        return true;
    }
    return false;
}


// ******** ACCESSORIE GENERICHE

function item_infos_fromID(item_id){
   return lootItems_array.find((item) => (item.id == item_id));
}




// ******** ACCESSORIE CRAFTABLE = 1

function all_craftables(){
    return lootItems_array.filter(item => item.craftable === 1);
}

function all_craftables_forReborn(player_reborn) {
    return lootItems_array.filter((item) => (item.craftable == 1 && item.reborn <= parseInt(player_reborn)));
  }

// I creati di una rarità, se reborn è specificato il filtro si estende alla rinascita
function craftables_list_fromRarity(item_rarity, player_reborn = false) {
    return lootItems_array.filter((item) => player_reborn === false ? (item.craftable == 1 && item.rarity == item_rarity) : item.craftable == 1 && item.rarity == item_rarity && item.reborn <= parseInt(player_reborn));
  }
  
// I creati, ma da un array di rarità
function craftables_list_fromRarities(rarity_array) {
    return lootItems_array.filter((item) => (item.craftable == 1 && rarity_array.indexOf(item.rarity) >= 0));
}

// Estrae da craftable_array gli oggetti che iniziano per prefix
function get_craftable_subset_fromPrefix(prefix, craftable_array){
    return craftable_array.map(item_info => ({name: item_info.name, id: item_info.id})).filter(item => item.name.toUpperCase().startsWith(prefix.toUpperCase()) ).sort();
}


// restituisce un array delle iniziali usate per i creati nell'array craftable_array
function get_craftable_array_prefixes(craftable_array) {
    const initialsArray = [];

    for (let i = 0; i < craftable_array.length; i++) {
        const initials = craftable_array[i].name.charAt(0).toUpperCase();
        if (initialsArray.indexOf(initials) === -1) {
            initialsArray.push(initials);
        }
    }

    return initialsArray.sort();
}

// restituisce un array delle iniziali usate per i creati nell'array craftable_array
// come get_craftable_array_prefixes, ma raggruppa le lettere (prefissi) con pochi elementi (fixed_minimum)
function get_craftable_array_groupedIndexes(craftable_array) {
    let fixed_minimum = 5;
    let indexes_array = get_craftable_array_prefixes(craftable_array);
    const groupedIndexes = [];
    let count = 0;
    let group = '';
  
    for (let i = 0; i < indexes_array.length; i++) {
      const currentIndex = indexes_array[i];
      const occurrences = craftable_array.reduce((occurrences_counter, item_info) => {
        if (item_info.name.charAt(0).toUpperCase() === currentIndex) {
          occurrences_counter++;
        }
        return occurrences_counter;
      }, 0);
  
      count += occurrences;
      group += currentIndex;
  
      if (count >= fixed_minimum || i === indexes_array.length - 1) {
        groupedIndexes.push(group);
        group = '';
        count = 0;
      }
    }
  
    return groupedIndexes;
  }


// Restituisce l'array delle rarità che hanno almeno un creabile
function get_all_craftable_rarity(player_reborn= false) {
    const filteredItems = player_reborn == false ? all_craftables() : all_craftables_forReborn(player_reborn);
    const raritiesArray = filteredItems.map(item => item.rarity);
    const uniqueRarities = raritiesArray.filter((rarity, index) => raritiesArray.indexOf(rarity) === index);
    return uniqueRarities;
}







// ******** ACCESSORIE CRAFT

// Restituisce craft_cost e craft_pnt in funzione di rarity
function craftInfo_fromRarity(rarity) {
    switch (rarity) {
        case "NC": {
            return ({ craft_cost: 2000, craft_pnt: 0 });
        } case "R": {
            return ({ craft_cost: 3000, craft_pnt: 1 });
        } case "UR": {
            return ({ craft_cost: 5000, craft_pnt: 2 });
        } case "L": {
            return ({ craft_cost: 7500, craft_pnt: 3 });
        } case "E": {
            return ({ craft_cost: 10000, craft_pnt: 5 });
        } case "UE": {
            return ({ craft_cost: 100000, craft_pnt: 25 });
        } case "U": {
            return ({ craft_cost: 250000, craft_pnt: 35 });
        } case "X": {
            return ({ craft_cost: 1000000, craft_pnt: 50 });
        } case "S": {
            return ({ craft_cost: 50000, craft_pnt: 15 });
        } default: {
            return ({ craft_cost: 0, craft_pnt: 0 });
        }
    }
}

// L'oggetto item usato per il full_line_craft
function craft_item_info_From(itemID) {
    const full_item_info = lootItems_array.find((item) => item.id === parseInt(itemID));

    if (!full_item_info) {
        return null; // Restituisce null se l'oggetto non è presente nell'array lootItems_array
    }

    const craft_item_info = {
        id: full_item_info.id,
        name: full_item_info.name,
        rarity: full_item_info.rarity,
        craftable: full_item_info.craftable,
        craft_pnt: full_item_info.craft_pnt,
        craft_cost: full_item_info.craft_cost,
        total_quantity: 1,
        needed: Array.isArray(full_item_info.needed) && full_item_info.needed.length === 3 ? full_item_info.needed : [],

    }

    return craft_item_info
}