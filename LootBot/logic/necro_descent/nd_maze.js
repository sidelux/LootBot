// Logica del dedalo (generazione e navigazione)
const nd_view = require("../../views/specific/necro_descent");    // Modulo per le stringhe specifiche 
const room_types = { // sono stati utili per cercare di definire questa generate_maze(). Ma alla fine dei conti si potrebbe riscrivere senza usarli (e lasciando il compito completamente a generate_room() ) 
    COMBATTIMENTO: 1,
    AVANZAMENTO_DIRETTO: 2,
    MALUS: 3,
    BONUS: 4,
    STANZA_FINALE: 5,
};

module.exports = {
    new_maze: new_maze,

    // ND_PLAYER
    get_ndplayer: find_player_in_maze,

    //STANZE
    get_room: find_room_in_maze,
    get_gates: find_facing_gates,

    // DIREZIONI
    random_direction: random_direction,
    relative_facing: relative_facing,
    get_relative: relative_gateN,

}

// Generato un labirinto se ne calcolano la stanza iniziale e la difficoltà, dunque si definiscono i premi
// maze_difficulty a questo stadio indica semplicemente il numero di porte minime per trovare la stanza finale (partendo da starting_room).
// (maze_difficulty verrà effettivamente calcolato e normalizzato in nd_logic (che chiama questa funzione))
function new_maze() {
    //const maze = generate_maze();
    const [starting_room, maze_difficulty] = find_starting_room(maze, maze.length);
    // TODO qui si deve riempire la final_chest tenendo conto di new_maze.maze_difficulty

    // genero una "stanza del rumore"
    generate_noise_rooms(maze);

    // genero una "scia dell oore"
    generate_odor_trail(maze);

    // genero una "scia di reperti"
    generate_finds_trail(maze);

    // genero "il fiume"
    //generate_theRiver(maze);


    return {
        starting_room_id: starting_room,
        maze_difficulty: maze_difficulty,
        maze: maze
    }

}




// ******* FUNZIONI DI NAVIGAZIONE NEL LABIRINTO (ATTENZIONE: restituiscono dei riferimenti agli oggetti nell'istanza passata in ingresso. Non copie dei valori)

// Restituisce una stanza (room_id) del labirinto
function find_room_in_maze(in_maze, room_id) {
    const room = in_maze.find(room => room.id === room_id);

    return {
        esit: room !== undefined,
        room
    };
}

// Restituisce la scheda nd_player in instance_info
function find_player_in_maze(maze, account_id) {
    const nd_player = maze.nd_players.find(nd_player => nd_player.account_id === account_id);

    return {
        esit: nd_player !== undefined,
        nd_player
    };
}

//  Mostra i passaggi/tunnel di una stanza nel labirinto
function find_facing_gates(room, direction) {
    const feacing = room.gates.filter(gate => gate.direction === direction.toLowerCase());

    return {
        esit: feacing.length > 0,
        gates: feacing
    };
}

// Data una direzione restituisce un array ordinato ("contestualizzato")
function relative_facing(facing_direction) {
    const relative_direction = nd_view.maze.relative_direction;
    return relative_direction[facing_direction];
}


















// *********************        ALGORITMI



// ******* UTILITARIE 

// Funzione accessoria per un elemento casuale in un array
const array_get_random_element = (array) => array[Math.floor(Math.random() * array.length)];
const array_get_random_index = (array) => Math.floor(Math.random() * array.length);


// Data una stanza, restituisce un targetRoom_id casuale. (targetRoom_id è l'id di un gates in una room. (room.gates.id) )
const random_targetRoom_id = (room) => room.gates[Math.floor(Math.random() * room.gates.length)].id;

// Aggiunge l'attributo is_special all'oggetto room
function mark_special_room(room) {
    room.type = nd_view.maze.room_types.special;
}

// Restituisce una stanza (casuale, non speciale) del labirinto
function find_notspecialroom_in_maze(in_maze) {
    const room = in_maze.find(room => (room.type != nd_view.maze.room_types.special));

    return {
        esit: room !== undefined,
        room
    };
}

// Restituisce una direzione casuale (nord, sud, est, ovest)
function random_direction() {
    return nd_view.maze.global_directions[Math.floor(Math.random() * nd_view.maze.global_directions.length)];
}
















// **************                      DEDALO NEWTONIANO (tirato in ballo un artista, tirati in ballo tutti… :) )
/* L'idea:
   // Quello newtoniano è un grafo strutturato (con struttura!)
    // Il labirinto è un grafo di oggetti rooms (stanze) collegati da gates (passaggi) (gate è una proprietà dell'oggetto room. gate.id punta ad un room.id)
    // Il labirinto consiste in N-livelli (stanze dello stesso livello condividono level_deep, che aumenta con N)

    // ogni livello è collegato ad altri due (level_deep +-1) da al piu (M - N)rooms.gate (sepre meno collegamenti al crescere di level_deep)
    // ogni livello ha (K - (M - N))rooms (sempre meno stanze al crescere di level_deep)
    // con K >> M >> N, definiti in range in fase di inizzializazione. O forse partendo da k?
    // Escluso level_deep == 0 (primo livello) i livelli possono contenere "isole" (non necessariamente tutte le stanze sono collegate da un percorso)

    // i livelli sono di tipo_livello: cunicolo (tutte le stanze sono cunicoli) o corridoio (piccole stanze) (altro? volendo se ne potrebbero aggiungere…)
    // A prescindere dal tipo_livello, in ogni livello c'è almeno una "stanza principale" (al piu (K - (M - N))/N).

    // Per generare un livello-cunicolo:
    // i passaggi tra le stanze sono di tipo_gate 4 (cunicoli) o tipo_gate 5/6 (cunicolo in salita/discesa) o (raramente?) 0 (porte)
    // -passaggi_principali: Si generana 1 ramo (collegamento lineare tra stanze dello stesso livello)
    // si generano m-stanzelaterali (collegamenti tra 3/7-stanzecieche in cui solo una ha un collegamento con una stanza nel ramo)
    // "stanza principale": la stanza-coda di ogni subramo-stanzelaterali è stanza speciale (di tipo_stanza 4 (vicolo cieco))
    // (solo) testa e coda del ramo principale sono collegati a due stanze di diversi (o stesso?) livello-corridoio (tipo_gate 5/6/7 in base al confronto tra level_deep)

    // Per generare un livello-corridoio:
    // i passaggi tra le stanze sono di tipo_gate 1 (passaggi) o 0 (porte)
    // -passaggi_principali: Si generano L-rami (collegamento lineare tra stanze dello stesso livello)   (isole)
    // -passaggi_secondari: Si generano k-tracce (collegamento casuale tra stanze dello stesso livello)
    // si generano m-stanzelaterali (collegamenti tra 3/7-stanzecieche in cui solo una ha un collegamento con una stanza in un ramo)
    // "stanze principali": si estraggono tipo_stanza 0 (invalicabile) nelle stanzelaterali, e tipo_stanza 1/2/3/4/5 nei rami (scrigno, npc_craft, npc_healt, npc_energy, npc_ability)
    // Ad (M - N) stanze (scelte casualmente) si collegeranno (M - N) stanze in un altro livello-corridoio (passaggi tra livello-corridoio)
    // i passaggi tra livello-corridoio sono di tipo_gate 2/3 (passaggio in salita/discesa) in base al confronto tra level_deep)
*/
function newtonian_maze() {
    let final_maze = []; // L'oggetto da restituire

    // Definizione dei range (magari da fare …in range!!)
    const levels_count_range = { min: 3, max: 7 };
    const branches_range = { tunnel: { min: 5, max: 20 }, passages: { min: 10, max: 30 } };
    const level_deep_range = { min: 0, max: 10 };

    const maze_levels = generate_maze_levels(levels_count_range, branches_range.tunnel, branches_range.passages, level_deep_range);
    apply_levels_connection(maze_levels, generate_levels_connection(maze_levels))

    // Aggiungo tutto al labirinto da restituire…
    for (let level_type in maze_levels) {
        const levels = maze_levels[level_type];
        for (let level of levels) {
            final_maze = [...final_maze, ...level];
        }
    }

    return final_maze;
}


// ******* ACCESSORIE NEWTONIANO

// funzione per generare un livello di tipo passaggio
function generate_passage_level(used_ids, level_deep, branch_length) {
    const level_type = nd_view.maze.branch_types.tunnes;
    const fixed_max_islands = 3;
    const islands_counter = 1 + Math.floor(Math.random() * fixed_max_islands)
    const dead_ends_counter = fixed_max_islands + Math.floor(Math.random() * branch_length); // si puo fare decisamente di meglio

    let passage_level = [];
    let dead_ends = [];
    let main_branch = []; //generate_branch(used_ids, level_type, level_deep, branch_length);
    let first_rooms = []; //main_branch[0];
    let last_rooms = []; //main_branch[main_branch.length - 1];

    // genero i main_branch e riempio first_rooms e last_rooms
    for (let i = 0; i < islands_counter; i++) {
        const curr_branch = generate_branch(used_ids, level_type, level_deep, Math.floor(branch_length / islands_counter));
        first_rooms.push(curr_branch[0]);
        last_rooms.push(curr_branch[curr_branch.length]);
        main_branch.push(curr_branch);

        // vicoli ciechi
        if (dead_ends.length <= dead_ends_counter) {
            let dead_end_length = 1 + Math.floor(Math.random() * (1 + Math.floor(curr_branch.length / 2)));         // sono lunghi, al massimo, un terzo di curr_branch+1
            dead_ends.push(generate_branch(used_ids, level_type, level_deep, dead_end_length));
        }
    }


    let main_branch_flattened = main_branch.reduce((acc, branch) => acc.concat(branch), []);


    // ...e tutte le stanze del main_branch nel passage_level
    passage_level.push(...main_branch_flattened);


    // collego le teste dei vicoli a stanze casuali nel main_branch
    // ...e aggiorno il room_type delle code dei vicoli ciechi
    // ...e inserisco le stanze formate nel passage_level
    dead_ends.forEach(dead_end => {
        let starting_room = dead_end[0];
        let final_room = dead_end[dead_end.length - 1];
        let random_main_branch_room = array_get_random_element(main_branch_flattened);
        generate_nodes_link(starting_room, random_main_branch_room, level_type);

        final_room.description = set_node_description_dna(final_room.type); // Aggiorno il testo coerentemente con il type

        passage_level = [...passage_level, ...dead_end];
    });

    // definisco le stanze speciali
    for (let i = 0; i < islands_counter; i++) {
        let random_main_branch_room = array_get_random_element(main_branch);
        random_main_branch_room.type = nd_view.maze.room_types.special
        random_main_branch_room.description = set_node_description_dna(random_main_branch_room.type); // Aggiorno il testo coerentemente con il type

    }


    return {
        level: passage_level,
        first_rooms,
        last_rooms
    }
}

// funzione per generare un livello di tipo cunicolo
function generate_narrow_level(used_ids, level_deep, branch_length) {
    const level_type = nd_view.maze.branch_types.tunnes;
    const dead_ends_counter = Math.max(1, Math.floor(branch_length / 3));
    let narrow_level = [];
    let dead_ends = [];
    let main_branch = generate_branch(used_ids, level_type, level_deep, branch_length);
    let first_room = main_branch[0];
    let last_room = main_branch[main_branch.length - 1];
    // Volendo si potrebbero evitare vicoli che partono dalla stessa stanza con un array di controllo... ma anche no!

    // creo i vicoli ciechi
    for (let i = 0; i < dead_ends_counter; i++) {
        let dead_end_length = 1 + Math.floor(Math.random() * (1 + Math.floor(branch_length / 2)));         // sono lunghi, al massimo, la metà di branch_length+1
        dead_ends.push(generate_branch(used_ids, level_type, level_deep, dead_end_length));
    }

    // collego le teste dei vicoli a stanze casuali nel main_branch
    // ...e aggiorno il room_type delle code dei vicoli ciechi
    // ...e inserisco le stanze formate nel narrow_level
    narrow_level.push(...main_branch); // prima il main_branch
    dead_ends.forEach(dead_end => {
        let starting_room = dead_end[0];
        let final_room = dead_end[dead_end.length - 1];
        let random_main_branch_room = array_get_random_element(main_branch);
        generate_nodes_link(starting_room, random_main_branch_room, level_type);
        final_room.type = nd_view.maze.room_types.blind;
        final_room.description = set_node_description_dna(final_room.type); // Aggiorno il testo coerentemente con il type

        narrow_level = [...narrow_level, ...dead_end];
    });

    return {
        level: narrow_level,
        first_room,
        last_room
    }
}

// Funzione per generare un ramo (o traccia) ()
function generate_branch(node_type, branch_length, node_dimension, level_deep, used_ids) {
    console.log("Ramo %s di lunghezza %d (livello:%d)", (node_type, branch_length, level_deep));
    // Il ramo è una catena di oggetti node: Esepio: A.room.id = 1, A.room.links.id = B.room.id
    // ...che condividono gli attributi di node_type

    let last_directions = []; // Array delle ultime due direzioni nella generazione del ramo. Per evitare la generazione di anelli chiusi
    let branch_node_description = generate_node_description(false); // Definisco gli attributi di description in base a node_type (1/2/3 -> tunnel, passage, way)



    let branch = [];

    for (let index = 0; index < branch_length; index++) {
        // Definizione della direzione
        const gate_direction = determinate_gate_pseudorandom_direction(last_directions);

        // generazione di nodo e collegamenti
        let node = generate_new_node(used_ids, level_deep, node_type, node_dimension, branch_node_description);
        let node_link = generate_new_link(gate_direction, 3, array_get_random_element(used_ids), level_deep);


        node.links.push(node_link); // assegno i collegamenti al nodo
        branch.push(node); // Inserimento in lista

        // Aggiorno l'array interno
        if (last_directions.length >= 2) { last_directions.shift(); } // Rimuove il primo elemento
        last_directions.push(gate_direction);
    }
    return branch;

}

// Mappa delle connessioni tra gli elementi in levels (che sono rami: passaggi o tunnel)
function generate_levels_connection(levels) {
    const connectionsMap = [];

    // Collegamenti tra livelli di tipo passaggio
    // passages[i].level è un array
    for (let i = 0; i < levels.passages.length - 1; i++) {
        const current_island = array_get_random_element(levels.passages[i]);
        const nextPassageLevel = levels.passages[i + 1];

        // Definire le connessioni tra i livelli di tipo passaggio


        connectionsMap.push({ from: currentPassageLevel.last_rooms.length - 1, to: nextPassageLevel.first_rooms[0] });
    }

    // Collegamenti tra livelli di tipo tunnel e passaggi
    for (let i = 0; i < levels.tunnels.length; i++) {
        const currentTunnelLevel = levels.tunnels[i];
        const nearestPassage = levels.passages[Math.min(i, levels.passages.length - 1)];

        // Definire le connessioni tra i livelli di tipo tunnel e passaggi
        const connections = [
            { from: currentTunnelLevel.last_room, to: nearestPassage.first_rooms[0] }
            // Aggiungi altre connessioni in base alla logica del tuo gioco
        ];

        connectionsMap.push({ level: currentTunnelLevel.name, connections });
    }

    return connectionsMap;
}

// Crea i collegamenti tra le stanze 
function apply_levels_connection(connections_map) {
    for (let connection of connections_map) {
        // Applicare la connessione
        generate_nodes_link(connection.from, connection.to, fromLevel.type);
    }
}

function generate_maze_levels(levels_count_range, tunnel_branches_range, passage_branches_range, level_deep_range) {
    const levels = { tunnels: [], passages: [] };
    // Definisco il numero totale fra tunnel e passaggi (N)
    const instance_complexity = Math.floor(Math.random() * (levels_count_range.max - levels_count_range.min + 1)) + levels_count_range.min;
    let used_ids = [];

    // Genero N-livelli
    for (let i = 0; i < instance_complexity; i++) {
        // Definisco la "profondità" del livello
        const level_deep = Math.floor(Math.random() * (level_deep_range.max - level_deep_range.min + 1)) + level_deep_range.min;

        let branchLength;
        if (Math.random() <= 0.26) { // cuniculi
            branchLength = Math.floor(Math.random() * (tunnel_branches_range.max - tunnel_branches_range.min + 1)) + tunnel_branches_range.min;
            levels.tunnels.push(generate_narrow_level(used_ids, level_deep, branchLength));
        } else { // passaggi
            branchLength = Math.floor(Math.random() * (passage_branches_range.max - passage_branches_range.min + 1)) + passage_branches_range.min;
            levels.passages.push(generate_passage_level(used_ids, level_deep, branchLength));
        }
    }

    return levels;
}

// Funzione per collegare due nodi (confrontando node.level_deep) 
function generate_nodes_link(from_node, to_node) {
    const link_type = array_get_random_element([0, 1]);
    const first_gate_direction = determinate_gate_pseudorandom_direction([]);
    const second_gate_direction = relative_facing(first_gate_direction)[1]; // la direzione opposta...
    const link_description = generate_new_link(first_gate_direction, link_type, to_node.id).description;
    const first_link = generate_new_link(first_gate_direction, link_type, to_node.id, to_node.level_deep);
    const second_link = generate_new_link(second_gate_direction, link_type, from_node.id, from_node.level_deep);
    first_link.description = link_description;
    second_link.description = link_description;

    from_node.gates.push(first_link, second_link);
}

// Crea un id per un nodo (unico, non usato) e aggiorna used_ids
function manage_node_id(used_ids) {
    // il massimo room.id attualmente presente nelle stanze
    const maxId = used_ids.reduce((max, used) => (used > max ? used : max), 0);

    // Genera un nuovo ID incrementando il massimo ID di 1
    const newId = maxId + 1;

    // controllo un po paranoico, ma anche no
    const isUnique = used_ids.every(room => room.id !== newId);

    // Se il nuovo ID è unico lo restituisco (aggiornando used_ids); altrimenti, genera un nuovo ID in modo ricorsivo
    if (isUnique) {
        used_ids.push(parseInt(newId));
        return newId;
    } else {
        return manage_node_id(used_ids); // Chiama nuovamente la funzione per generare un nuovo ID
    }
}

// Scheletro di un nodo
const generate_new_node = (used_ids, node_level_deep, node_type, node_dimension, node_description) => {
    return {
        id: manage_node_id(used_ids),
        level_deep: node_level_deep,
        type: node_type, // tipo della stanza
        room_nd_players: [], // Aggiornato da update_room_nd_players(account_id) <- giocatori nella stanza,             ?, tipo di oggetto: (account_id, message_id, nd_player_state)
        duel_id: -1,  //                                                                                                i combattimenti sono gestiti in un file a parte ../sources/necro_descent/Combacts/duel_id.js

        dimension: node_dimension,
        description: node_description,
        room_clues: [], // set_room_clues(type)                             <- descrizioni aggiuntive (intuizioni),      ?, tipo di oggetti: (vocazione, descrizione)
        items: [], // Aggiornato da update_room_items(account_id, item_id)  <- Oggetti per terra,                        ?, tipo di oggetto: (account_id, item_id, quantity)
        chests: [], // set_room_chests(type)                                <- Scrigni,                                  ?, tipo odi oggetto: items                         (solo per room_types.BONUS)
        npc: [], // set_room_npcs(type)                                     <- aiutanti,                                 ?, tipo di oggetto: nd_npc                         (solo per room_types.BONUS)
        traps: [], // set_room_traps(type)                                  <- trappole e malus,                         ?, tipo di oggetto: nd_trap                        (solo per room_types.MALUS)
        mobs: [], // set_room_mobs(type)                                    <- i nemici nascosti nella stanza,           ?, tipo di oggetto: nd_mob                         (solo per room_types.COMBATTIMENTO)
        links: [], // Aggiornato da update_room_gates()                     <- Collegamenti ad altre stanze,      almeno 1, tipi di oggetto: room_gate                      (visibili solo quelle in facing_direction)
    }
}

// Scheletro di un collegamento
const generate_new_link = (link_direction, link_type, target_node_id, target_node_level_deep) => {
    return {
        target_id: target_node_id, // id del nodo collegato
        target_level_deep: target_node_level_deep, // level_deep del nodo collegato
        direction: link_direction, // direzione (nord, est, sud, ovest)
        type: link_type, // tipo di collegamento
        is_locked: false, // di default i collegamenti sono aperti
        description: generate_link_description(link_type)
    }
};

// Descrizione di un nodo
const generate_node_description = (is_blind = false) => {
    let descriptions = nd_view.maze.nodes.node_description;
    let description = {
        walls: array_get_random_index(descriptions.walls),
        ceeling: {
            type: array_get_random_index(descriptions.ceeling.types),
            ornament: array_get_random_index(descriptions.ceeling.ornaments)
        },
        light: {
            sources: array_get_random_index(descriptions.light.sources),
            colors: array_get_random_index(descriptions.light.colors)
        }
    }
    if (is_blind){
        description.light.sources = -1 ;
    }
    return description

}

// Descrizione di un collegamento
const generate_link_description = (link_type) => {
    let link_descriptions = nd_view.maze.nodes.gate_descriptions;

    let link_description = {
        false_gate: false,
        type: array_get_random_index(link_descriptions.types),
        dimension: array_get_random_index(link_descriptions.dimensions),
        ornament: array_get_random_index(link_descriptions.ornament),
        surrounding: array_get_random_index(link_descriptions.surrounding),
    };
    if (link_type >= 2) {
        link_description.false_gate = true;
    }

    return link_description;

}

// Una direzione casuale, ma non troppo (si può decisamente migliorare)
const determinate_gate_pseudorandom_direction = (last_directions) => {
    const directions_cycle = nd_view.maze.global_directions.concat(nd_view.maze.global_directions); // creo un ciclo chiuso

    // Converto gli array delle direzioni in una stringa per facilitare il controllo
    const directions_string = directions_cycle.join('-');
    const last_directions_string = last_directions.join("-")
    let casual_direction;

    if (last_directions.length < 2 || !directions_string.includes(last_directions_string)) {
        casual_direction = random_direction();
    } else {
        let not_so_casual_direction_set = directions_cycle.filter(direction => !last_directions.includes(direction))
        casual_direction = array_get_random_element(not_so_casual_direction_set);
    }
    return casual_direction;
}


















// **************                      DEDALO ESCHERIANO (il primo algoritmo che ho definito...) 
// molto difficile da navigare, perche contempla cose del tipo: (sud)A -> B, (sud)B -> A
// Inizialmente ho ricercato questa cosa e ne ero affascinato ma.... 
// (forse il concept potrebbe essere usato per generare solo "qualche" stanza-escheriana…)
function escherian_maze() {
    const maze = [];



    let roomId_index = 1;

    // *******      Funzione per assegnare un ID univoco a ciascuna stanza
    const set_roomId = () => {
        return roomId_index++;
    };


    const generate_room_description = (room_type) => {
        if (room_type == room_types.STANZA_FINALE) { // La stanza finale ha una descrizione a parte

        } else { // Sei/Siete in…
            const room_dimension = array_get_random_element(nd_view.maze.room_descriptions.room_dimension);
            const walls = array_get_random_element(nd_view.maze.room_descriptions.walls);
            const ceiling_dimension = array_get_random_element(nd_view.maze.room_descriptions.ceiling_dimension);
            const ceiling_ornaments = Math.random() < 0.75 ? " " + array_get_random_element(nd_view.maze.room_descriptions.ceiling_ornaments) : ''

            const light_source = array_get_random_element(nd_view.maze.room_descriptions.light_source);
            const light_color = array_get_random_element(nd_view.maze.room_descriptions.light_color);


            let description = `${nd_view.maze.room_descriptions.room_dimension_prefix} ${room_dimension}`;
            description += ` ${nd_view.maze.room_descriptions.walls_prefix} ${walls}`;
            description += `${nd_view.maze.room_descriptions.celing_prefix} ${ceiling_dimension} `;
            description += `${nd_view.maze.room_descriptions.ceiling_ornaments_prefix}${ceiling_ornaments}. `;
            description += `${light_source} ${light_color}`;

            return description;
        }
    }

    // era qui

    // *******   Scheletro di room, funzione per generare una stanza con un tipo specifico
    const generate_room = room_type => {
        // TODO:
        // qui andranno riempite le stanze (in base a type) (oggetti, mob, scrigni, trappole, npc)
        // …e generate le descrizioni delle stanze (pareti, soffitti, pavimenti... ) -                                  FATTO! 
        // …e generate le "clue" per le stanze (ulteriori descrizioni in base a vocazione*) (*ed altri attributi?)
        return {
            id: set_roomId(),
            type: room_type,
            description: generate_room_description(room_type),
            room_clues: [], // Lista di oggetti(vocazione, descrizione)
            room_nd_players: [], // giocatori nella stanza,  sempre visibili, tipo di oggetto: (account_id, message_id, nd_player_state)
            players_message_ids: [], // Lista di oggetti(account_id, message_id)
            duel_id: -1,  // i combattimenti sono gestiti in un file a parte ../sources/necro_descent/Combacts/duel_id.js
            gates: [], // Collegamenti ad altre stanze, (visibili solo quelle in current_direction)
            items: [], // Oggetti per terra,  sempre visibili ("A terra: Nx oggetto1\nMx oggetto2…")
            chests: [], // Scrigni (solo per room_types.BONUS),  sempre visibili
            npc: [], // Vari, (solo per room_types.BONUS), sempre visibili
            traps: [], // Varie, (solo per room_types.MALUS), attivate da algoritmo
            mobs: [], // i nemici nascosti nella stanza (solo per room_types.COMBATTIMENTO), attivati da algoritmo
        };
    };



    // Se prendessi la briga di sbarazzarmi di room_types tutto il codice da qui in poi potrebbe essere decisamente semplificato, ottenendo gli stessi risultati.

    // L'idea di roomOccurrences è gestire la distribuzione dei diversi tipi, in maniera da avere labirinti equiparabili (in malus e bonus). Ma potrebbe fare tutto generate_room 
    // Ma tra generateRooms e has_sufficient_occurrences… (!) Uff... funziona, ma è davvero macchinosa. Abbastanza inguardabile…
    const roomOccurrences = {
        [room_types.COMBATTIMENTO]: Math.floor(Math.random() * 6) + 9,
        [room_types.AVANZAMENTO_DIRETTO]: Math.floor(Math.random() * 10) + 10,
        [room_types.MALUS]: Math.floor(Math.random() * 4) + 6,
        [room_types.BONUS]: Math.floor(Math.random() * 4) + 6,
        [room_types.STANZA_FINALE]: 1,
    };

    // funzione per controllare che in maze ci siano n-stanze del tipo in ingresso
    const has_sufficient_occurrences = in_type => {
        const count = maze.filter(stanza => stanza.type === in_type).length;
        return count >= roomOccurrences[in_type];
    };

    // Funzione generica di aggiunta di una stanza al labirinto
    const generateRooms = type => {
        while (!has_sufficient_occurrences(type)) {
            const new_room = generate_room(type);
            maze.push(new_room);
        }
    };

    // *******      Generazione effettiva delle stanze tramite la generica generateRooms seguendo roomOccurrences
    Object.keys(roomOccurrences).forEach(type => {
        // La stanza finale dovrebbe essere remota. Dunque (per prevenire che generate_roomGates() crei troppi collegamenti verso di essa) viene prima generata qualunquealtrastanza
        if (type !== room_types.STANZA_FINALE) {
            generateRooms(type); // Per ogni stanza la push deve essere eseguita roomOccurrences-volte
        } else {
            const stanzeFinale = generate_room(type);
            maze.push(stanzeFinale);
        }
    });


    // *******      Connessioni tra le stanze (porte o gates)
    maze.forEach(room => {
        if (!Array.isArray(room.gates))
            room.gates = escherian_gates(room, maze); // Crea le porte della stanza
        else {
            room.gates.concat(escherian_gates(room, maze)); // Aggiunge le porte alla stanza
        }
    });


    //stanze orfane. Può capitare... (cucciole…)
    while (maze.some(room => room.gates.length === 0)) {
        const nogate_room = maze.find(room => room.gates.length === 0);
        nogate_room.gates = escherian_gates(nogate_room, maze);
    }


    return maze;
}

// *******      Funzione per generare le porte di una stanza (si occupa anche del corrispettivo nella stanza di arrivo)
function escherian_gates(current_room, maze) {
    const gate_types = [
        1, // CUNICOLO
        2, // SALITA
        3, // DISCESA
        4, // PASSAGGIO
        5, // PORTONE
    ];

    const room_gatesN = current_room.gates.length;
    let new_gates_maximum = Math.floor(Math.random() * (Math.max(0, (4 - room_gatesN)))) + 1;
    if (current_room.type == room_types.STANZA_FINALE) {
        new_gates_maximum = 2;
    }
    const new_room_gates = [];

    // Funzione per ottenere la direzione opposta
    const opposite_direction = of_direction => relative_facing(of_direction)[1];

    // Questa non credo serva piu... non credo serva piu nanche type... bah!
    const opposite_gate_type = (gate_type) => {
        switch (gate_type) {
            case 1:
                return gate_types.filter(value => value === 1 || value === 4)[Math.floor(Math.random() * 2)];
            case 2:
                return 3;
            case 3:
                return 2;
            case 4:
                return gate_types.filter(value => value === 1 || value === 4)[Math.floor(Math.random() * 2)];
            default: // portone
                return gate_types[Math.floor(Math.random() * gate_types.length)];
        }
    };

    const generate_gate_description = (gate_type) => {
        let this_gate_name = "";
        let mirror_gate_name = "";
        let first_part = "";
        let second_part = "";

        switch (gate_type) {
            case 1: { // CUNICOLO
                this_gate_name = nd_view.maze.gate_descriptions.tunnel.name;
                mirror_gate_name = Math.floor(Math.random() * 5) > 3 ? nd_view.maze.gate_descriptions.passage.name : nd_view.maze.gate_descriptions.tunnel.name;

                first_part = array_get_random_element(nd_view.maze.gate_descriptions.tunnel.optional_smell);
                first_part += array_get_random_element(nd_view.maze.gate_descriptions.tunnel.attribute);
                second_part = array_get_random_element(nd_view.maze.gate_descriptions.tunnel.optional_attribute);
                break;
            }
            case 2: { // SALITA
                this_gate_name = `${nd_view.maze.gate_descriptions.passage.name} ${nd_view.maze.gate_descriptions.passage.uphill}`;
                mirror_gate_name = `${nd_view.maze.gate_descriptions.passage.name} ${nd_view.maze.gate_descriptions.passage.downhill}`;

                first_part = array_get_random_element(nd_view.maze.gate_descriptions.passage.optional_condition);
                first_part += array_get_random_element(nd_view.maze.gate_descriptions.passage.condition);
                second_part = array_get_random_element(nd_view.maze.gate_descriptions.passage.optional_inside) + " ";
                second_part += array_get_random_element(nd_view.maze.gate_descriptions.passage.inside);
                break;
            }
            case 3: { // DISCESA
                this_gate_name = `${nd_view.maze.gate_descriptions.passage.name} ${nd_view.maze.gate_descriptions.passage.downhill}`;
                mirror_gate_name = `${nd_view.maze.gate_descriptions.passage.name} ${nd_view.maze.gate_descriptions.passage.uphill}`;

                first_part = array_get_random_element(nd_view.maze.gate_descriptions.passage.optional_condition);
                first_part += array_get_random_element(nd_view.maze.gate_descriptions.passage.condition);
                second_part = array_get_random_element(nd_view.maze.gate_descriptions.passage.optional_inside) + " ";
                second_part += array_get_random_element(nd_view.maze.gate_descriptions.passage.inside);
                break;
            }
            case 4: { // PASSAGGIO
                this_gate_name = `${nd_view.maze.gate_descriptions.passage.name}`;
                mirror_gate_name = Math.floor(Math.random() * 5) > 3 ? nd_view.maze.gate_descriptions.tunnel.name : nd_view.maze.gate_descriptions.passage.name;

                first_part = array_get_random_element(nd_view.maze.gate_descriptions.passage.optional_condition);
                first_part += array_get_random_element(nd_view.maze.gate_descriptions.passage.condition);
                second_part = array_get_random_element(nd_view.maze.gate_descriptions.passage.optional_inside) + " ";
                second_part += array_get_random_element(nd_view.maze.gate_descriptions.passage.inside);
                break;
            }
            case 5: { // PORTONE
                this_gate_name = `${nd_view.maze.gate_descriptions.door.name}`;
                mirror_gate_name = `${nd_view.maze.gate_descriptions.door.name}`;

                first_part = array_get_random_element(nd_view.maze.gate_descriptions.door.attribute);
                second_part = array_get_random_element(nd_view.maze.gate_descriptions.door.optional_attribute);
                second_part += array_get_random_element(nd_view.maze.gate_descriptions.door.material);
                break;
            }
        }


        return {
            this_gate: `${first_part} ${this_gate_name} ${second_part}`,
            mirror_gate: `${first_part} ${mirror_gate_name} ${second_part}`
        };

    }

    // Funzione per creare una stanza
    const create_gate = (current_room, gate_direction, gate_type, target_room) => {
        if (
            target_room !== current_room &&
            !new_room_gates.find(p => p.id === target_room.id && p.direction === gate_direction) &&
            !current_room.gates.find(p => p.direction === gate_direction)
        ) {
            if (!Array.isArray(target_room.gates)) {
                target_room.gates = [];
            }
            let gate_descriptions = generate_gate_description(gate_type);
            current_room.gates.push({ id: target_room.id, direction: gate_direction, type: gate_type, description: gate_descriptions.this_gate });
            target_room.gates.push({ id: current_room.id, direction: opposite_direction(gate_direction), type: opposite_gate_type(gate_type), description: gate_descriptions.mirror_gate });


            new_room_gates.push({ id: target_room.id, direction: gate_direction });
            return true;
        }
        return false;
    };

    // conta le connessioni dirette verso la stanza finale
    const final_room_pathN = () => {
        return maze.filter(room => room.type === room_types.STANZA_FINALE)[0].gates.length
    };


    // Cerco di indirizzare il collegaento verso le stanze ancora orfane o con pochi collegaenti (escludo la finale, ma non servirebbe (è gia esclusa))
    const new_target_room = () => {
        const unused_rooms = maze.filter(room => room.type != room_types.STANZA_FINALE && room.id !== current_room.id && !current_room.gates.find(p => p.id === room.id));
        const possible_connections = unused_rooms.length > 0 ? unused_rooms : maze;
        return possible_connections[Math.floor(Math.random() * possible_connections.length)];
    };

    // Aggiungo new_gates_maximum-porte alla stanza
    for (let i = 0; i < new_gates_maximum; i++) {
        let stanzaCasuale = new_target_room();

        // Evita connessioni dirette con la stanza finale se già connessa a 2 stanze
        if (stanzaCasuale.type === room_types.STANZA_FINALE && final_room_pathN() > 2) {
            // Se la stanza casuale è la stanza finale e ha già una connessione, si salta (sperando in un vicolo cieco.)
        } else if (stanzaCasuale.gates.length <= 2) {
            create_gate(current_room, random_direction(), gate_types[Math.floor(Math.random() * gate_types.length)], stanzaCasuale);
        } else { // La stanzaCasuale ha già tante porte, riproviamo...
            i--;
        }
    }

    return new_room_gates;

}


// È una funzione decisamente migliorabile, serve a trovare la stanza di partenza (che è quella con la distanza massima verso STANZAFINALE)
function find_starting_room(maze, finalRoom_id) {
    // Trova la stanza finale
    const final_room = maze.find(room => room.id === finalRoom_id);

    // Inizializza un array di distanze per ogni stanza
    const distances = {};
    maze.forEach(room => {
        distances[room.id] = maze.length + 1; // Imposta distanza massima per ogni stanza
    });

    // Inizializza la coda per la BFS
    const queue = [];
    queue.push(final_room);
    distances[final_room.id] = 0;

    // BFS per calcolare le distanze
    while (queue.length > 0) {
        const current_room = queue.shift();

        current_room.gates.forEach(gate => {
            const linked_room = maze.find(room => room.id === gate.id);
            if (distances[linked_room.id] >= maze.length + 1) {
                distances[linked_room.id] = distances[current_room.id] + 1;
                queue.push(linked_room);
            }
        });
    }

    // Trova la stanza più lontana (con la massima distanza)
    let max_distance = -1;
    let furthest_room;

    Object.keys(distances).forEach(roomId => {
        if (distances[roomId] > max_distance && distances[roomId] < (maze.length + 1)) {
            max_distance = distances[roomId];
            furthest_room = maze.find(room => room.id === parseInt(roomId));
        }
    });

    console.log("N-porte minimo: ", max_distance);
    console.log("Dalla stanza di partenza ", furthest_room)
    return [furthest_room.id, max_distance];
}

// Questa è la seconda roba che ho scritto per questo progetto... non sono sicuro avrà un utilità!
// (Le porte "up" sono quelle che permetteranno di cambiare stanza)
function relative_gateN(room_gates, player_frontdirection) {
    const relative_direction = {
        nord: ['up', 'down', 'rigth', 'left'],
        sud: ['down', 'up', 'left', 'rigth'],
        est: ['left', 'rigth', 'up', 'down'],
        ovest: ['rigth', 'left', 'down', 'up'],
    };

    const relative_gates = {
        up: 0,
        down: 0,
        rigth: 0,
        left: 0
    };


    nd_view.maze.global_directions.forEach((direction, index) => {
        const curr_relative = relative_direction[player_frontdirection][index];
        const gates_counter = room_gates.filter(p => p.direction === direction).length;

        relative_gates[curr_relative] = gates_counter
    });

    return relative_gates;
}

















// **************                      CARATTERIZZAZIONE (funzioni chiamate su un oggetto maze)

function generate_noise_rooms(maze) {
    let source_room = find_notspecialroom_in_maze(maze).room; // fortissimo
    let first_level_rooms = []; // un
    let second_level = []; // un leggero
    let casual_source = nd_view.maze.room_noises[Math.floor(Math.random() * nd_view.maze.room_noises.length)];

    mark_special_room(source_room);

    // riempio gli array
    let linked_ids = source_room.gates.map(gate => gate.id);
    first_level_rooms = linked_ids.map(id => find_room_in_maze(maze, id).room);
    let second_link_ids = first_level_rooms.map(room => room.id);
    second_level = second_link_ids.map(id => find_room_in_maze(maze, id).room);

    // Aggiungo le descrizioni
    source_room.description += casual_source.main_noise;
    first_level_rooms.forEach(room => {
        room.description += casual_source.closed_rooms
    });
    second_level.forEach(room => {
        room.description += casual_source.further_rooms
    });

}


function generate_odor_trail(maze) {

    let source_room = find_notspecialroom_in_maze(maze).room; // fortissimo
    let scente_length = Math.floor(Math.random() * 6) + 4;
    let casual_source = nd_view.maze.room_smells[Math.floor(Math.random() * nd_view.maze.room_smells.length)];

    source_room.description += casual_source.smell_source;
    mark_special_room(source_room);

    let tmp_room_id = random_targetRoom_id(source_room);
    for (let i = 0; i < scente_length; i++) {
        let main_room = find_room_in_maze(maze, tmp_room_id).room;
        let random_gates = main_room.gates.slice(0, Math.floor(Math.random() * main_room.gates.length));
        let linked_rooms = random_gates.map(gate => find_room_in_maze(maze, gate.id).room);

        main_room.description += casual_source.strong_smell;
        linked_rooms.forEach(room => {
            room.description += casual_source.light_smell;
        });

        tmp_room_id = random_targetRoom_id(main_room);
    }




}


function generate_finds_trail(maze) {
    let source_room = find_notspecialroom_in_maze(maze).room; // fortissimo
    let scente_length = Math.floor(Math.random() * 6) + 4;
    let casual_source = nd_view.maze.room_findings[Math.floor(Math.random() * nd_view.maze.room_findings.length)];

    source_room.description += casual_source.finding_source;
    mark_special_room(source_room);

    let findin_id = random_targetRoom_id(source_room);
    for (let i = 0; i < scente_length; i++) {
        const curr_room = find_room_in_maze(maze, findin_id).room;
        curr_room.description += casual_source.finding;
        findin_id = random_targetRoom_id(curr_room)
    }
}










console.log(newtonian_maze());







// TEST 
/*
let used_ids = [];
let nd = narrow_maze_level(used_ids, 1, 6);
let nd2 = narrow_maze_level(used_ids, 1, 6);
let nd3 = narrow_maze_level(used_ids, 1, 9);

let ndm = passage_maze_level(used_ids, 1, 15);
let ndm2 = passage_maze_level(used_ids, 1, 15);
let ndm3 = passage_maze_level(used_ids, 1, 10);


console.log("nd: %j",nd.level.length);
console.log("nd2: %j",nd2.level.length);
console.log("nd3: %j",nd3.level.length);
console.log("ndm-ndm: %j",ndm.level.length);
console.log("ndm-2: %j",ndm2.level.length);
console.log("ndm-3: %j",ndm3.level.length);
console.log("ID (stanze): %d ->"+used_ids, used_ids.length);

const labirinto = generate_maze();
const [starting_room, maxDistanza] = find_starting_room(labirinto, labirinto.length);

console.info(JSON.stringify(labirinto, null, "  "));

console.log("\n_________________\n");

console.log("Numero di stanze %d", labirinto.length)
console.log('maxDistanza:', maxDistanza);

console.log("\n_________________\n");

console.log('Stanza di partenza:', starting_room);

console.log("\n_________________\n");


console.log('Stanza Finale:', labirinto[labirinto.length-1]);
console.log("Guardando a est: %j",  relative_gateN(labirinto[labirinto.length-1].gates, "est"));
console.log("Guardando a ovest: %j",  relative_gateN(labirinto[labirinto.length-1].gates, "ovest"));
console.log("Guardando a sud: %j",  relative_gateN(labirinto[labirinto.length-1].gates, "sud"));
console.log("Guardando a nord: %j",  relative_gateN(labirinto[labirinto.length-1].gates, "nord"));


*/
