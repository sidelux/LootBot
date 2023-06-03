// Gestisce la parte della logica dedicata al craft di oggetti (LootItems)


const items_controller = require("./items");
const inventory_controller = require("./inventory");
const utils = require("../utility/utils");                                      // Le utilità

const fixed_max_loops = 80000;                                                   // Numero massimo di iterazioni sulla linea craft. (nel caso venga raggiunto la linea craft è solo parziale)

module.exports = {
    full_line_craft: full_line_craft, // Funzione pubblica per l'analisti della linea craft di un array di LootItems
    fixed_max_loops: fixed_max_loops
}




/*  full_line_craft
    ingresso:
            toCraft_array: array di {id, quantity}
            player_inventory: lo zaino dell'utente
            preserve_crafted: un booleano. Se true non verranno consumati creati dallo zaino.
    output: risposta {…}
    > La funzione richiama process_recoursiveCraft per il calcolo dell'output        
*/
async function full_line_craft(toCraft_array, player_inventory, preserve_crafted) {
    // TODO (??) <- (loops, skipped used_items.ids)response andrebbero messi in un oggetto separato (?) 

    let response = {
        craft_point: 0,                                                            // Somma dei PC legit <- È usato per l'output
        craft_cost: 0,                                                             // Costo in edollari (legit) <- È usato per l'output
        missing_baseItems: [],                                                     // array di oggetti items.craftInfo <- È usato per l'output
        used_items: {                                                              // ? Opzionale
            ids: [],                                                               // array di ID oggetto <- È usato internamente per un controllo piu rapido
            base: [],                                                              // array di oggetti item_craftInfo <- È usato per l'output
            crafted: []                                                            // array di oggetti item_craftInfo <- È usato per l'output
        },
        loops: 0,                                                                  // Intero, contatore sul numero di ripetizioni (o craft x1)   <- Può essere usato per limitare l'utimlizzo della funzione multicraft
        skipped: [],                                                                // Array con gli itemId che non è stato possibile processare. Idealmente è sempre vuoto
    }



    let flatten_toCraftIDs_array = process_toCraftArray(toCraft_array);             // preparo array degli id dei creati da realizzare
    let process_startDate = Date.now();                                             // per il log qui sotto
    process_recoursiveCraft(flatten_toCraftIDs_array, player_inventory, preserve_crafted, response);
    console.log(`> Linea craft generata in ${Date.now() - process_startDate}ms`);   // log di test... non c'è ancora una classe log (test, errori…)

    check_if_is_partial(response);

    return response; // in response c'è tutto…
}

// Accessoria di full_line_craft() -> Restituisce un array degli id degli oggetti da creare ((id ripetuto N-volte la quantità))
function process_toCraftArray(toCraft_array) {
    let array_risultato = [];
    for (let i = 0; i < toCraft_array.length; i++) {
        for (let j = 0; j < toCraft_array[i].quantity; j++) {
            array_risultato.push(toCraft_array[i].id);
        }
    }
    return array_risultato;
}



/* process_recoursiveCraft
    la funzione utilizza la lista degli oggetti allItems confrontandola con quella dello zaino_utente 
    ingresso:
            currDeep_array: array degli ID-oggetto nel livello di profondità (inizialmente il root_items.childIds_array)
*/
function process_recoursiveCraft(currdeep_array, player_inventory, preserve_zaino, response) {
    let nextdeep_array = [];
    // L'array della prossima chiamata a questa funzione. viene popolato (eventualmente) in craft_logic()

    currdeep_array.forEach((item_id) => {                                                                // Scorro la lista di id del livello attuale
        response.loops++;                                                                                // Incremento il contatore di loops
        let tmp_item = items_controller.craftItemInfo_FromItemId(item_id);                               // L'oggetto per (id)
        if (utils.isNully(tmp_item)) {                                                                    // Aggiorna l'array skipped (Male!)
            response.skipped.push(item_id);
        } else {                                                                                         // Passa il controllo alla logica del craft
            let fromInventory_item = inventory_controller.hasItem(item_id, player_inventory);            // controllo di oggetto nello zaino utente (la quantità è sempre quella assoluta e può essere 0)
            craft_logic(tmp_item, fromInventory_item, nextdeep_array, preserve_zaino, response);
        }
    });



    // Continuare con il loop o fermarsi? Dipende da craft_can_continue e cosa c'è in nextdeep_array… 
    if (craft_can_continue(response) && nextdeep_array.length > 0) {                                                                         // Ci sono id di oggetti ancora da valutare
        return process_recoursiveCraft(nextdeep_array, player_inventory, preserve_zaino, response);          // Il ciclo ricomincia
    } else {
        return true;                                                                                         // Fine! (La funzione non restituisce nulla. Ha aggiornato durante i sui cicli i valori in response…)
    }

}

// la logica del craft (che viente riflessa nell'oggetto response).
function craft_logic(item, fromInventory_item, nextdeep_array, preserve_zaino, response) {

    if (item.craftable == 1 && preserve_zaino == true) {                                                      // Se è un creato e preserve_zaino == true passo i necessari al prossimo livello
        update_craft(item, nextdeep_array, response);                                                         // Manda ad accessoria (nextdeep_array e response vengono aggiornati)
    } else if (response.used_items.ids.indexOf(item.id) < 0) {                                                // L'oggetto NON è già tra quelli utilizzati fino a questo momento
        craft_logic_newUsed(item, fromInventory_item, nextdeep_array, response);
    } else {                                                                                                  // È gia tra i consumati. 
        craft_logic_alreadyUsed(item, fromInventory_item, nextdeep_array, response);
    }

}

// Accessoria di craft_logic() ->  gestisce la logica per oggetti (base o creati) usati per la prima volta all'interno della linea
function craft_logic_newUsed(item, fromInventory_item, nextdeep_array, response) {
    // Per gli oggetti base eseguo sempre il controllo sullo zaino
    if (item.craftable == 0) {
        if (fromInventory_item.has_iteml == false) {                                         // se non è presente aggiorno la lista dei base mancanti
            add_item_inList(response.missing_baseItems, item);
        } else {                                                                            // se è presente 
            add_item_inList(response.used_items.base, item);                                // aggiorno la lista dei consumati (base)
            response.used_items.ids.push(item.id);                                               // aggiorno la lista degli id (consumati)
        }
    } else {                                                                                // se l'oggetto è un creato (e l'utilizzo di creati dallo zaino è abilitato)
        if (fromInventory_item.has_iteml == false || fromInventory_item.quantity < 1) {      // Non è presente o quantità insufficente 
            update_craft(item, nextdeep_array, response);                                   // -> aggiungo i necessari al prossimo livello ed aggiorno i contatori in response
        } else {                                                                            // Aggiorno la lista degli oggetti usati.
            add_item_inList(response.used_items.crafted, item);
            response.used_items.ids.push(item.id);                                               // ... ora anche :)
        }

    }
}

// Accessoria di craft_logic() ->  gestisce la logica per oggetti (base o creati) GIÀ usati all'interno della linea
function craft_logic_alreadyUsed(item, fromInventory_item, nextdeep_array, response) {
    // Per gli oggetti base
    if (item.craftable == 0) {                                                              // NON possono arrivare oggetti base non presenti nello zaino (vedi sopra)
        let used_item = response.used_items.base.filter((i_item) => i_item.id == item.id)[0];        // l'oggetto usato (base) in questione
        // controllo contro la quantità nello zaino
        if ((used_item.total_quantity + 1) > fromInventory_item.quantity) {
            add_item_inList(response.missing_baseItems, item);                             // Quantità insufficente, aggiorno lista dei necessari
        } else {
            add_item_inList(response.used_items.base, item);                                // Quantità sufficente, aggiorno lista dei consumati (base)
        }
    } else { // Per i creati
        let used_item = response.used_items.crafted.filter((i_item) => i_item.id == item.id)[0];     // l'oggetto usato (creato) in questione

        if ((used_item.total_quantity + 1) < fromInventory_item.quantity) {                 // Se la quantità nello zaino non è sufficente, aggiungo i necessari per il creato al nextdeep_arra
            update_craft(item, nextdeep_array, response);
        } else {                                                                            // Altrimenti aggiorno la lista dei consumati (creati)
            add_item_inList(response.used_items.crafted, item);
        }

    }
}

// Accessoria di craft_logic() -> Prima della push() su una generica [lista] controlla se oggetto è presente (nella [lista]) (e nel caso aggiorna la quantità con +1 (senza push) )
function add_item_inList(list, item) {
    for (let i = 0; i < list.length; i++) {
        if (list[i].id == item.id) {
            list[i].total_quantity++;
            return;
        }
    }
    list.push(item);
    return;
}

// Accessoria di craft_logic() -> Inserisce i necessari per il creato in nextdeep_array ed aggiorna i contatori di response (craft_pnt, craft_cost)
function update_craft(item, nextdeep_array, response) {
    response.craft_point += item.craft_pnt;
    response.craft_cost += item.craft_cost;
    nextdeep_array.push(...item.needed);
}

// Funzione utilizabile per fermare una linea craft in base ai dati contenuti in response
// ad esempio valutando il numero del contatore loops o se il numero di copie di oggetti base supera "config.items_cap" (<- NOTA: al momento non esiste un oggetto che rappresenti globalmente il cap al numero di copie di un oggetto)
function craft_can_continue(response) {
    return response.loops <= fixed_max_loops; // Attualmente il controllo è solo su fixed_max_loops
}

function check_if_is_partial(response){
    if (response.loops >= fixed_max_loops){
        response = {
            partial: response,
          };
    }
}