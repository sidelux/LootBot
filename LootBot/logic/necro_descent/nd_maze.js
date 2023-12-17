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
    get_gates: facing_gates,

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

//  una stanza (room_id) del labirinto
function facing_gates(room, direction) {
    const feacing = room.gates.filter(gate => gate.direction === direction.toLowerCase());

    return {
        esit: feacing.length > 0,
        gates: feacing
    };
}

// Data una direzione restituisce un array ordinato "contestualizzato"
function relative_facing(facing_direction) {
    const relative_direction = nd_view.maze.relative_direction;
    return relative_direction[facing_direction];
}

// ******* DEDALO NEWTONIANO (tirato in ballo un artista, tirati in ballo tutti… :) )

function newtonian_maze() {
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

    // Questa era l'idea... adesso provo ad implementarla con le funzioni appena definite




}


// funzione per generare un livello di tipo passaggio
function passage_maze_level(used_ids, level_deep, branch_length) {
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
        link_rooms(starting_room, random_main_branch_room, level_type);

        final_room.description = set_room_description(final_room.type); // Aggiorno il testo coerentemente con il type

        passage_level = [...passage_level, ...dead_end];
    });

    // definisco le stanze speciali
    for (let i = 0; i < islands_counter; i++){
        let random_main_branch_room = array_get_random_element(main_branch);
        random_main_branch_room.type = nd_view.maze.room_types.special
        random_main_branch_room.description = set_room_description(random_main_branch_room.type); // Aggiorno il testo coerentemente con il type

    }


    return {
        level: passage_level,
        first_rooms,
        last_rooms
    }
}

// funzione per generare un livello di tipo cunicolo
function narrow_maze_level(used_ids, level_deep, branch_length) {
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
        link_rooms(starting_room, random_main_branch_room, level_type);
        final_room.type = nd_view.maze.room_types.blind;
        final_room.description = set_room_description(final_room.type); // Aggiorno il testo coerentemente con il type

        narrow_level = [...narrow_level, ...dead_end];
    });

    return {
        level: narrow_level,
        first_room,
        last_room
    }
}


// Scheletro di una stanza
const room_skeleton = (used_ids, room_type, level_deep) => {
    return {
        id: manage_room_id(used_ids),
        type: room_type, // tipo della stanza
        room_nd_players: [], // Aggiornato da update_room_nd_players(account_id) <- giocatori nella stanza,             ?, tipo di oggetto: (account_id, message_id, nd_player_state)
        duel_id: -1,  //                                                                                                i combattimenti sono gestiti in un file a parte ../sources/necro_descent/Combacts/duel_id.js
        level_deep: level_deep,

        description: set_room_description(room_type),
        room_clues: [], // set_room_clues(type)                             <- descrizioni aggiuntive (intuizioni),      ?, tipo di oggetti: (vocazione, descrizione)
        items: [], // Aggiornato da update_room_items(account_id, item_id)  <- Oggetti per terra,                        ?, tipo di oggetto: (account_id, item_id, quantity)
        chests: [], // set_room_chests(type)                                <- Scrigni,                                  ?, tipo odi oggetto: items                         (solo per room_types.BONUS)
        npc: [], // set_room_npcs(type)                                     <- aiutanti,                                 ?, tipo di oggetto: nd_npc                         (solo per room_types.BONUS)
        traps: [], // set_room_traps(type)                                  <- trappole e malus,                         ?, tipo di oggetto: nd_trap                        (solo per room_types.MALUS)
        mobs: [], // set_room_mobs(type)                                    <- i nemici nascosti nella stanza,           ?, tipo di oggetto: nd_mob                         (solo per room_types.COMBATTIMENTO)
        gates: [], // Aggiornato da update_room_gates()                     <- Collegamenti ad altre stanze,      almeno 1, tipi di oggetto: room_gate                      (visibili solo quelle in facing_direction)
    }
}

// Scheletro di un passaggio/tunnel
const gate_skeleton = (gate_direction, gate_type, target_room_id) => {
    return {
        target_room: target_room_id,
        direction: gate_direction,
        type: gate_type,
        description: set_gate_descrtiption(gate_type)
    }
};

// il tipo delle stanze è determinato da branch_type 
const determinate_room_type = (level_type) => {
    switch (level_type) {
        case nd_view.maze.branch_types.tunnes: {       // Stanze anguste o piccole 
            let casual_type = (Math.random() * 5 < 3 ? nd_view.maze.room_types.micro : nd_view.maze.room_types.small);
            return casual_type;
        }
        case nd_view.maze.branch_types.passage: {    // Stanze piccole o grandi   
            let casual_type = (Math.random() * 5 < 3 ? nd_view.maze.room_types.small : nd_view.maze.room_types.large);
            return casual_type;
        }
    }
}

// Dal punto di vista di first_room_level_deep, determina il tipo di passaggio
const determinate_gate_type = (level_type, first_room_level_deep, second_room_level_deep = first_room_level_deep) => {
    let tunnel_complexity = 5; // Probabilità (inversa, su 100, di generazione porte)
    let passage_complexity = 3; // Probabilità (inversa, su 100, di generazione porte)

    switch (level_type) {
        case nd_view.maze.branch_types.tunnes: {
            let casual_type = (Math.random() * tunnel_complexity < 1 ? nd_view.maze.gate_types.door : nd_view.maze.gate_types.tunnel);
            let change_level_type = first_room_level_deep < second_room_level_deep ? nd_view.maze.gate_types.downhill_tunnel : nd_view.maze.gate_types.uphill_tunnel;
            return first_room_level_deep == second_room_level_deep ? casual_type : change_level_type;
        }
        case nd_view.maze.branch_types.passage: {
            let casual_type = (Math.random() * passage_complexity < 1 ? nd_view.maze.gate_types.door : nd_view.maze.gate_types.passage);
            let change_level_type = first_room_level_deep < second_room_level_deep ? nd_view.maze.gate_types.downhill_passage : nd_view.maze.gate_types.uphill_passage;
            return first_room_level_deep == second_room_level_deep ? casual_type : change_level_type;
        }
    }
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

const set_room_description = (room_type) => {
    return `${room_type}`;
}

const set_gate_descrtiption = (room_type) => {
    return `${room_type}`;
}

// Crea un id per una stanza (unico, non usato) e aggiorna used_ids
function manage_room_id(used_ids) {
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
        return manage_room_id(used_ids); // Chiama nuovamente la funzione per generare un nuovo ID
    }
}

// Funzione per generare un ramo (o traccia)
function generate_branch(used_ids, level_type, level_deep, branch_length) {
    console.log("Ramo di lunghezza %d", branch_length)
    // Il ramo è una catena di oggetti room: Esepio: A.room.id = 1, A.room.gates.id = B.room.id
    let last_directions = []; // per evitare la generazione di anelli chiusi

    let branch = [];

    for (let index = 0; index < branch_length; index++) {
        const room_type = determinate_room_type(level_type);
        // Definizione di un passaggio o tunnel
        const gate_type = determinate_gate_type(level_type, level_deep);
        const gate_direction = determinate_gate_pseudorandom_direction(last_directions);

        let room = room_skeleton(used_ids, room_type, level_deep);
        let gate = gate_skeleton(gate_direction, gate_type, array_get_random_element(used_ids))
        room.gates.push(gate);
        branch.push(room);

        if (last_directions.length >= 2) { last_directions.shift(); } // Rimuove il primo elemento
        last_directions.push(gate_direction);
    }
    return branch;

}

// Funzione esterna per collegare due stanze (confrontando room.level_deep) 
function link_rooms(first_room, second_room, level_type) {
    const first_gate_type = determinate_gate_type(level_type, first_room.level_deep, second_room.level_deep);
    const first_gate_direction = determinate_gate_pseudorandom_direction([]);
    const second_gate_type = determinate_gate_type(level_type, second_room.level_deep, first_room.level_deep);
    const second_gate_direction = relative_facing(first_gate_direction)[1];

    first_room.gates.push(gate_skeleton(first_gate_direction, first_gate_type, second_room.id));
    second_room.gates.push(gate_skeleton(second_gate_direction, second_gate_type, second_room.id));
}









// ******* DEDALO ESCHERIANO (il primo algoritmo che ho definito...) 
// molto difficile da navigare, perche contempla cose del tipo: (sud)A -> B, (sud)B -> A
// Inizialmente ho ricercato questa cosa e ne ero affascinato ma.... 
// (forse il concept potrebbe essere usato per generare solo "qualche" stanza-escheriana…)

// È la prima cosa che ho iniziato a scrivere per questo progetto... fa schifio, lo so… TODO è sistemarla
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






// ******* UTILITARIE 

// Funzione accessoria usata da generate_room_description e generate_gate_description
const array_get_random_element = (array) => array[Math.floor(Math.random() * array.length)];

// targetRoom_id è l'id di un gates in una room
const random_targetRoom_id = (room) => room.gates[Math.floor(Math.random() * room.gates.length)].id;

// Aggiunge l'attributo is_special all'oggetto room
function mark_special_room(room) {
    room.is_special = true;
}

// Restituisce una stanza (casuale, non speciale) del labirinto
function find_notspecialroom_in_maze(in_maze) {
    const room = in_maze.find(room => (typeof room.is_special == "undefined"));

    return {
        esit: room !== undefined,
        room
    };
}

// Restituisce una direzione casuale (nord, sud, est, ovest)
function random_direction() {
    return nd_view.maze.global_directions[Math.floor(Math.random() * nd_view.maze.global_directions.length)];
}



// ******* CARATTERIZZAZIONE (funzioni chiamate su un oggetto maze)

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
