// La logica di necro_descent. Ottiene ed elabora dati, è il primo ponte di comunicazione tra il message_manager e le sotto-logiche (nd_combact, nd_maze, nd_player)

const model = require("../../model/JSON_managers/specifiche/necro_descent");
const player_logics = require("../players");
const nd_maze = require("../../logic/necro_descent/nd_maze")
const nd_player = require("../../logic/necro_descent/nd_player")


module.exports = {
    // GIOCATORE
    player_infos: load_pleyer_info,
    player_teamID: load_player_teamId,
    new_nd_player: create_nd_player,
    get_ndplayer: get_nd_player,

    //LABIRINTO
    get_front_gates: get_front_gates,
    get_relative_facing: get_relative_facing,
    get_maze_room: get_maze_room,
    get_instance: get_instance_info,
    update_instance_info: update_instance_info,
    descent_controlls: descent_controlls,

}







// *********************   INSTANCE_INFO (ALTARE)

// Crea un nuovo altare del sacrificio. (se ne esiste già uno sarà sovrascritto)
function init_instance_info(team_id) { // era async...
    let instance_info = model.altar_template();
    init_maze(instance_info);
    return instance_info;// await model.update_instance_info(team_id, instance_info);
}


// Espone il contenuto di /LootBot/sources/necro_descent/MansionsAltars/altat_${team_id}.json (lo crea, se necessario)
async function get_instance_info(player_info) {
    let instance_info = await model.get_instance_info(player_info.account_id, player_info.team_id);
    if (instance_info.esit == false) {
        if (instance_info.error == 0) { // potrebbe pur essere che non sia stato mai creato…
            instance_info.content = init_instance_info(player_info.team_id);
            // if (instance_info == false) { // niente.. proprio non si riesce ad accedervi. Male!
            //     return ({
            //         esit: false,
            //         error: 0
            //     });
            // }
        } else if (instance_info.error == 1) {
            return ({
                esit: false,
                error: 0
            });
        } else if (instance_info.error == 2){
            return ({
                esit: false,
                error: 1,
                locked_by: instance_info.locked_by
            });
        }
    }

    return {
        esit: true,
        results: instance_info.content
    };
}


// Aggiorna instance_info
async function update_instance_info(team_id, new_instance_info) {
    let instance_info = await model.update_instance_info(team_id, new_instance_info);
    if (instance_info == false) { // potrebbe pur essere che non sia stato mai creato…
        return {
            esit: false,
        };
    }
    return {
        esit: true,
        results: instance_info
    };
}







// *********************   MAZE

// Genera un nuovo labirinto e lo aggiunge ad instance_info (modificandolo) 
// la funzione è chiamata da new_altar (prima inizializzazione) ed ogni volta che un labirinto viene distrutto…
function init_maze(instance_info) {
    let new_maze = nd_maze.new_maze();
    instance_info.current_maze.difficulty = 2* Math.floor((new_maze.maze_difficulty*2 + new_maze.maze.length)/10);
    instance_info.current_maze.maze = new_maze.maze;
    instance_info.current_maze.entry_room = new_maze.starting_room_id;
}

// Espone la funzione in nd_maze. 
function get_maze_room(maze, room_id) {
    return nd_maze.get_room(maze, room_id)
}







// *********************   ND_PLAYER

//Carico player_info (espone la funzione in player_logics)
async function load_pleyer_info(telegram_user_id) {
    return await player_logics.player_full_infos(telegram_user_id)
}

//Carico team_id per il giocatore. (espone la funzione in player_logics)
async function load_player_teamId(player_id) {
    return await player_logics.player_teamId(player_id);
}

// Espone la funzione in nd_player. 
function create_nd_player(player_info) {
    return nd_player.generate_card(player_info);
}

// Espone la funzione in nd_maze. 
function get_nd_player(maze, account_id) {
    return nd_maze.get_ndplayer(maze, account_id)
}

// Espone la funzione in nd_maze. 
function get_relative_facing(nd_player){
    return nd_maze.relative_facing(nd_player.current_facing)
}

// Espone la funzione in nd_maze. 
function get_front_gates(room, nd_player){
    return nd_maze.get_gates(room, nd_player.current_facing);
}







// ACCESSORIE (SPECIFICHE)

// Controlli su instance_info, generazione della scheda nd_player e aggiornamento di instance_info
function descent_controlls(player_info, instance_info) { // era async
    let can_proceed = {
        esit: false,
        cause: -1,
        nd_player: {}
    };

    //controllo se player_info.account_id è già tra i giocatori nell'istanza
    let already_in_maze = nd_maze.get_ndplayer(instance_info.current_maze, player_info.account_id)
    can_proceed.esit = !already_in_maze.esit;
    can_proceed.cause = can_proceed.esit ? -1 : 0;

    //if (can_proceed.esit == true){
    // can_proceed.esit = controllo se player_info.account_id è tra instance_info.worthy_players_ids
    // can_proceed.cause = can_proceed.esit == false? 1 : -1; }



    //if (can_proceed.esit == true){
    // can_proceed.esit = controllo se instance_info.nd_players.length +1 è ancora nel range accettabile
    // can_proceed.cause = can_proceed.esit == false? 2 : -1; }

    //if (can_proceed.esit == true){
    // can_proceed.esit = controllo lo stato del giocatore in instance_info.nd_players[].states (se è morto verifico prima la data di morte...)
    // can_proceed.cause = can_proceed.esit == false? 3 : -1;}



    if (can_proceed.esit == true) {  // aggiorno la persistenza di instance_info
        //creo la scheda nd_player per player_info
        can_proceed.nd_player = create_nd_player(player_info);
        //let starting_room = nd_maze.get_room(instance_info.current_maze.maze, instance_info.current_maze.entry_room);

        //Lascio cadere il giocatore nella prima stanza
        can_proceed.nd_player.current_room_id = instance_info.current_maze.entry_room;
        //starting_room.room.room_nd_players.push(player_card.account_id); // per ora do per scontato esit. Se no non ne esco.. ma non è il massimo

        //Imposto una direzione (casuale) verso cui sta guardando
        can_proceed.nd_player.current_facing = nd_maze.random_direction();

        //aggiungo la scheda giocatore ad instance_info
        instance_info.current_maze.nd_players.push({...can_proceed.nd_player});
        //can_proceed.esit = (await update_instance_info(player_info.team_id, instance_info)).esit;
        // can_proceed.cause = can_proceed.esit == false ? 4 : -1;
    }


    return can_proceed;

}

