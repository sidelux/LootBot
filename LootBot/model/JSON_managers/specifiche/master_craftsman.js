// Questo modulo gestisce la lettura e la scrittura del file craftsman_info.json
// Per ogni utente esiste una cartella (nominata secondo il suo telegram_user_id). (questo perche possa ospitare anche altre cose, oltre a craftsman_info.json (idealmente si potrebbe mirare qui gran parte della persistenza, lasciando sul database solo quello che ha senso mettere in relazione))

const json_model = require("../json_model");
const craftsman_file_name = "craftsman_info.json";

module.exports = {
    has_list: has_list,
    get_craftsman_info: get_craftsman_info,
    update_craftsman_info: update_craftsman_info,
    template: {
        craftman_info: {
            query_random_char: "", // Usato per limitare l'uso di user_bot (rendendo le query meno prevedibile)
            preserve_crafted: true,
            is_new: true,
            censure_view: false,
            current_rarity: "NC",
            current_prefix: "",
            current_message_id: -1,
            ban_until: -1,      // se diverso da -1 conserva il Date.time() fino a quando il Mastro Artigiano non sarà disponibile
            
            stats: {
                total_loops: 0,
                total_pc: 0,
                total_craft_cost: 0,
                total_crafted_items: 0,
                total_base_items_used: 0

            },

            items_list: [],     // Array di (item_id, quantity)
            controll: {
                target_items_list: [],
                loops: 0,
                controll_date: -1,
                craft_point: 0,
                craft_cost: 0,
                missing_baseItems: [],
                used_items: {
                    base: [],
                    crafted: []
                },
                skipped: [],
            }
        }
    },
    new_query_random_char: () => String.fromCharCode(65 + Math.floor(Math.random() * 26))
};


// Funzione per controllare se un file esiste
async function has_list(telegram_user_id) {
    return await json_model.exists(telegram_user_id, craftsman_file_name);
}

// Funzione per leggere il contenuto di un file JSON
async function get_craftsman_info(telegram_user_id) {
    return await json_model.read(telegram_user_id.toString(), craftsman_file_name); // restituisce false o craftsman_info
}

// Funzione per scrivere il contenuto in un file JSON
async function update_craftsman_info(telegram_user_id, new_craftsman_info) {
    return await json_model.write(telegram_user_id.toString(), craftsman_file_name, new_craftsman_info);
}

