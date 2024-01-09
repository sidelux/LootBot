// Le informazioni sui combattimenti sono conservate in LootBot/sources/necro_descent/Combacts
// Le informazioni sulle istanze (altari e dedali) sono conservate in LootBot/sources/necro_descent/MansionsAltars

/*


*/

const json_model = require("../json_model");
const path = require('path');
const altar_dir = path.join(path.dirname(require.main.filename), '/LootBot/sources/necro_descent/MansionsAltars/');
const instance_file = (team_id) => { return "altar-$.json".replace('$', `${team_id}`) };

module.exports = {
    has_altar: has_altar,
    get_instance_info: get_instance_info,
    update_instance_info: update_instance_info,
    altar_template: () => {
        return {
            stats: {
                total_attempts: 0,                              // conteggio dei tentativi (uno ogni nuova generazione del labirinto)
                total_sacrifices: 0,                            // in numero di oggetti
                total_sacrifices_value: 0,                      // in valore per oggetti sacrificati
            },
            current_altar: {                                    // Se sacrifices_required_value - sacrifices_value > 0 -> bottone per eseguire sacrifici, altrimenti bottone per accedere al dedalo…
                sacrifices_required_value: Math.floor(Math.random() * 500) + 500,
                sacrifices_value: 0,
                unworthy_sacrifices: 0,                         // I sacrifici di oggetti di rarità <= R 
                worthy_players_ids: [],                          // solo i giocatori che hanno fatto almeno un sacrificio possono accedere al dedalo…
            },
            current_maze: {
                creation_date: Date.now(),                      // Data di creazione
                gate_opening_date: -1,                          // Momento di apertura del passaggio (su cui è calcolato il crollo)
                entry_room: -1,
                deads: 0,                                       // contatore delle morti (mob+boss+nd_players)
                final_chest: [],                                // Tutti gli oggetti che possono essere trovati nell'ultima stanza (dopo il boss)
                nd_players: [],                                 // Lista dei giocatori (oggetto nd_player)                
                maze: [],                                       // Mappa del labirinto
            }
        }
    }
};


// Funzione per controllare se un file esiste
async function has_altar(team_id) {
    const filePath = path.join(altar_dir, instance_file(team_id));

    return await json_model.check(filePath);
}

// Funzione per leggere il contenuto di un file JSON
async function get_instance_info(account_id, team_id) {
    const filePath = path.join(altar_dir, instance_file(team_id));

    return await json_model.readAndLockJSON(filePath, account_id); // restituisce false o instance_info
}

// Funzione per scrivere il contenuto in un file JSON
async function update_instance_info(team_id, new_instance_info) {
    const filePath = path.join(altar_dir, instance_file(team_id));
    
    //Libero l'istanza
    delete new_instance_info.locked_by;
    delete new_instance_info.lock_date;

    return await json_model.write(altar_dir, filePath, new_instance_info);
}



