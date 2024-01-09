// Discesa agli inferi 👹

// Questo modulo si occupa dell'interazione finale con l'utente

// L'unica interazione testuale gestita dal modulo è "Altare Sacrificale" (view_utils.menu_strings.team.mansionsAltare)
// (il resto è interazione tramite bottoni inline)
// NOTA: siccome l'istanza è condivisa dai membri dello stesso team, sono state implementate delle soluzioni per gestire la concorrenza (vedi l'implementazione nel model)


const bot_response = require("../../utility/bot_response");                 // È il modulo che si occupa dell'invio, modifica etc...
const config = require("../../utility/config");                             // Per isDev
const utils = require("../../utility/utils");                               // Utilità è sempre utile…
//const view_utils = require("../views_util");                                 // Modulo utilità stringhe (generico)

const nd_view = require("../../views/specific/necro_descent");              // Modulo per le stringhe specifiche 
const nd_logic = require("../../logic/necro_descent/nd_logic");             // Logica di necro_descent


// Costanti per testing esteso
// Bruttissimo, ma mandare il comando ad ogni riavvio è snervante e non mi metto a fare pure una persistenza
const beta_tester_ids = config.beta_tester_ids.slice() 
const in_beta = beta_tester_ids.length > 0;

module.exports = {
    menu: nd_messageDispatcher,
    queryDispatcher: nd_queryDispatcher,                                        
    add_betaTester: add_betaTester                                                                                     
}

// schema: messaggio -> controlli -> logica -> vista -> risposta 


// **************************************  ENTRY-POINTS (le uniche funzioni pubbliche e che hanno un return. Tutte le altre aggiornano l'oggetto response)

// "Altare Sacrificale" (view_utils.menu_strings.team.mansionsAltare) (aggiunge a response l'oggetto toSend)
async function nd_messageDispatcher(telegram_user_id) {
    let response = { // Ad un messaggio si risponderà sempre con un messaggio (no toEdit)
        toSend: bot_response.responses.toSend(telegram_user_id),
    }

    const preload = await module_controlls(telegram_user_id);                   // carica player_info e instance_info, 
    if (preload.preload_response) {                                           // se esiste l'oggetto preload_response viene inviato quello (è o un errore o un limite imposto)
        return preload.preload_response;
    }

    const player_info = preload.player_info;
    const instance_info = preload.instance_info;
    const controll_player = nd_player_controll(response, instance_info.current_maze, player_info.account_id);



    // controllo se il giocatore è già nel dedalo
    if (controll_player.esit == false) {
        altar_message(response, player_info, instance_info, false);         // restituisce il menu formattato
    } else {
        maze_room_message(response, controll_player.nd_player, instance_info.current_maze, false);
    }

    //Libero instance_info (viene rimosso locked_by direttamente nel model.)
    await nd_logic.update_instance_info(player_info.team_id, instance_info);

    return response;

}

// Smistatore di tutte le query verso il modulo (in response prepara già la risposta) (aggiunge a response l'oggeto query)
async function nd_queryDispatcher(callback_query) {
    let query_data = callback_query.data.split(":").slice(1);
    let telegram_user_id = callback_query.from.id;
    let message_id = callback_query.message.message_id;
    let response = { query: bot_response.responses.query() };
    response.query.id = callback_query.id;

    let sub_structure = utils.query_structure.query_tree.necro_descent;

    let query_controll = await query_preload(response, telegram_user_id, message_id); //(Blocca instance_info)
    if (query_controll.esit == true) {
        switch (query_data[0]) {
            case sub_structure.altar.stmp: {
                altar_query(response, query_controll.player_info, query_controll.instance_info, message_id, query_data.slice(1));
                break;
            }
            case sub_structure.maze.stmp: {
                maze_room_query_dispatch(response, query_controll.player_info, query_controll.instance_info, message_id, query_data.slice(1))
            }
        }

        //Libero instance_info (viene rimosso locked_by direttamente nel model.)
        await nd_logic.update_instance_info(query_controll.player_info.team_id, query_controll.instance_info);

        if (response.other_responses) {
            response.other_responses.unshift(response);
            return response.other_responses
        }
    }

    return response;
}








// ****************************************** ALTARE

// Testo e bottoni dell'Altare (bottone sacrificio / bottone ingresso)
// message_id è trattato come un booleano, vero solo se il menù è attivato da una query 
function altar_message(response, player_info, altar_info, message_id = false) { // wp: player_info forse gia non serve piu?
    // Testo del messaggio
    let altar_keyboard = [];
    let altar_text = `*${nd_view.altar.title}*_\n\n${nd_view.altar.introduction}_\n`;

    // qui cose sul testo...
    // altar_text += "«";
    // altar_text += "»\n";

    //if per altar_info.current_altar…

    // • Qui gestione dell'altare con passaggio chiuso (bottone per sacrificio) 

    // • Il passaggio è aperto (bottone per l'ingresso.)
    altar_text += `${nd_view.altar.gate_is_open}`;
    altar_keyboard.push([nd_view.keyboard_buttons.start_descent]); // bottone ingresso


    add_editOrSend_response(response, message_id, altar_text, altar_keyboard);
}

// Altare, ma per una callback_query
function altar_query(response, player_info, instance_info, message_id, query_data) {
    let sub_structure = utils.query_structure.query_tree.necro_descent;

    switch (query_data[0]) {
        case sub_structure.altar.sacrifice.stmp: { // Vista sacrifici…
            break;
        }
        case sub_structure.altar.descent.stmp: { // Avvia discesa (con controlli) 
            const descent_controll = descent_beginning(response, player_info, instance_info);
            if (descent_controll.esit == true) {
                init_toEdit_response(response, player_info.account_id, message_id);
                maze_room_message(response, descent_controll.nd_player, instance_info.current_maze, message_id);
            }
            break;
        }
    }

}








// ****************************************** DEDALO

// ********** SMISTA LE QUERY
// Smista le query dei bottoni in una stanza labirinto (direzioni, apertura porte, zaino, raccogli, vedi scrigni, parla, aiuta (combattimento)…)
function maze_room_query_dispatch(response, player_info, instance_info, message_id, query_data) {
    let controll = nd_player_controll(response, instance_info.current_maze, player_info.account_id);
    if (controll.esit == true) {
        let sub_structure = utils.query_structure.query_tree.necro_descent.maze;

        switch (query_data[0]) {
            case sub_structure.change_facing.stmp: {
                set_player_facing(response, controll.nd_player, query_data[1], query_data[2]);
                break;
            }
            case sub_structure.goto_gate.stmp: {
                set_player_room(response, controll.nd_player, instance_info.current_maze, query_data[1]);
                break;
            }
        }
        init_toEdit_response(response, player_info.account_id, message_id);
        maze_room_message(response, { ...controll.nd_player }, { ...instance_info.current_maze }, message_id);
    }
}

// ********** VISTA e CONTROLLO DISCESA (INIZIO o SALTO)
// tra Altare e Labirinto (Risponde al bottone di ingresso) (manda una query con allert e porta (eventualmente) a maze_room_message)
function descent_beginning(response, player_info, instance_info) { // era async…
    let query_text = "";
    let player_can_descend = nd_logic.descent_controlls(player_info, instance_info); // Controlli e, nel caso, aggiorna l'istanza e crea la scheda nd_player per telegram_user_id (il salvataggio sarà solo alla fine del processo!)
    let can_proceed_to_maze = { esit: false, nd_player: {} };

    // gestione dell'esito 
    if (player_can_descend.esit == false) {
        switch (player_can_descend.cause) {
            case 1: { // Il giocatore non ha eseguito abbastanza sacrifici
                break;
            }
            case 2: { // Troppi compagni nel labirinto
                break;
            }
            case 3: { // Il giocatore deve ancora attendere il respawn
                break;
            }
            case 4: { // Errore aggiornando
                query_text = `${nd_view.errors.title}\n\n${nd_view.errors.cant_update_instance}\n`;
                break;
            }
            default: { // Il giocatore è già nel labirinto, in player_can_descend.cause la sua stanza attuale (che dovrebbe essere uguale a player_info.current_room_id)
                query_text = `${nd_view.maze.player.already_in_maze}` // \n\n${nd_view.maze.player.current_roomN} ${player_can_descend.nd_player.current_room_id}`;

                can_proceed_to_maze.esit = true;
                can_proceed_to_maze.nd_player = { ...can_proceed_to_maze.nd_player };
                break;
            }
        }


    } else { // Salto nell'abisso
        const minImpressions = 3;
        const maxImpressions = 5;
        const numImpressions = Math.min(Math.floor(instance_info.current_maze.difficulty / 8) + minImpressions, maxImpressions);
        const shuffledImpressions = nd_view.maze.player.firs_jump_impressions.sort(() => Math.random() - 0.5);

        query_text = shuffledImpressions.slice(0, numImpressions).join("\n");
        can_proceed_to_maze.esit = true;
        can_proceed_to_maze.nd_player = { ...can_proceed_to_maze.nd_player };

    }

    response.query.options.text = query_text;
    response.query.options.show_alert = true;

    return can_proceed_to_maze;

}

// ********** VISTA STANZA (ROOM)
// Testo e bottoni di ogni stanza nel labirinto.
function maze_room_message(response, nd_player, current_maze, message_id = false) {
    let controll = room_controll(response, current_maze.maze, nd_player.current_room_id);
    if (controll.esit == true) { // /controll.esit == true
        let maze_text = "";
        let maze_keyboard = [];
        let current_room = { ...controll.current_room };
        let facing_gates = nd_logic.get_front_gates(current_room, nd_player).gates;

        if (current_room.type == 5) {
            response.query.options.show_alert = true;
            response.query.options.text = `🌬\n... un brivido...`;
        }


        //stampa descrizione stanza (uguale per tutti)
        maze_text += get_current_room_description(current_room)

        //todo: stampa cue (sensazione giocatore)...


        //Porte davanti al giocatore
        maze_text += get_facing_gates_description(facing_gates);

        // Aggiungo i bottoni direzione
        maze_keyboard.push(get_current_direction_buttons(nd_player));

        //Se ce ne sono, aggiungo i bottoni per le porte
        add_gates_buttons(facing_gates, maze_keyboard);

        // Riempio l'oggetto (relativo) in response 
        add_editOrSend_response(response, message_id, maze_text, maze_keyboard);
    }
}







// ********** ACCESSORIE (ISTANZA)

// Cambia la direzione verso cui sta guardando il giocatore.
function set_player_facing(response, nd_player, new_direction, move_direction) {
    //response.query.options.show_alert = true;
    response.query.options.text = `${nd_view.maze.player.current_room.facing[move_direction]}`;
    nd_player.current_facing = new_direction; // tramite nd_player_controll (e quindi .find()) ottengo un riferimento all'oggetto in instance_info! comodo… È molto comodo. (pericoloso, si… ma dannatamente comodo)
}

// cambia la stanza in cui è il giocatore…
function set_player_room(response, nd_player, current_maze, new_room_id) {
    //response.query.options.show_alert = true;
    let controll = room_controll(response, current_maze.maze, nd_player.current_room_id);

    if (controll.esit == false) {
        response.query.options.text = `${nd_view.errors.title}\n\n${nd_view.errors.corrupted_instance}`;
        response.query.options.text += ` direzione`
        response.query.options.show_alert = true;

        return;
    }

    response.query.options.text = `...`;

    // qui bisogna aggiornare room_nd_players di current_room e target_room
    nd_player.current_room_id = parseInt(new_room_id);
}



// ********** ACCESSORIE (VISTA)

// Titolo messaggio e descrizione di current_room (variabile in base a room_nd_players.length)
function get_current_room_description(current_room) {
    let room_description = `*${nd_view.title}*\n\n`;
    room_description += `_${current_room.room_nd_players.length <= 1 ? nd_view.maze.player.current_room.single_player : nd_view.maze.player.current_room.multy_player} ${current_room.description}_`;
    room_description += "\n\n";
    return room_description;
}

// Descrizione delle porte (davanti al giocatore)
function get_facing_gates_description(facing_gates) {
    let gates_text = `${nd_view.maze.player.current_room.facing.front}\n`;
    if (facing_gates.length <= 0) {
        //const get_random_description = (array) => array[Math.floor(Math.random() * array.length)];
        gates_text += `${nd_view.maze.player.current_room.no_gates[Math.floor(Math.random() * nd_view.maze.player.current_room.no_gates.length)]}…`
    } else {
        for (let i = 0; i < facing_gates.length; i++) {
            gates_text += `${nd_view.maze.rooms_icons[i]} ${facing_gates[i].description}\n`;
        }
    }
    return gates_text;

}

// I bottoni delle direzioni, contestualizzati al facing_direction attuale
function get_current_direction_buttons(nd_player) {
    const direction_buttons = [];
    const relative_direction = nd_logic.get_relative_facing(nd_player);
    const move_directions = Object.keys(nd_view.maze.player.current_room.facing); // nd_view.maze.player.current_room.facing / test

    // const test = {front: "Davanti a te:", left: "Alla tua sinistra", right: "Alla tua destra", back: "Dietro di te"};
    // console.log(move_directions[1]);

    const buttonsInfo = [
        { button: nd_view.keyboard_buttons.face_left, index: 0, dir: move_directions[1] },
        { button: nd_view.keyboard_buttons.face_back, index: 1, dir: move_directions[3] },
        { button: nd_view.keyboard_buttons.face_right, index: 2, dir: move_directions[2] }
    ];

    buttonsInfo.forEach(buttonInfo => {
        const tmp_button = { ...buttonInfo.button };
        tmp_button.callback_data += `:${relative_direction[buttonInfo.index]}:${buttonInfo.dir}`;
        direction_buttons.push(tmp_button);
    });

    return direction_buttons.slice();
}

// Aggiorna maze_keyboard se ci sono porte davanti al giocatore
function add_gates_buttons(facing_gates, maze_keyboard) {
    let gates_buttons = []
    for (let i = 0; i < facing_gates.length; i++) {
        const tmp_button = { ...nd_view.keyboard_buttons.gate_x }
        tmp_button.text = nd_view.maze.rooms_icons[i];
        tmp_button.callback_data += `:${facing_gates[i].id}`
        gates_buttons.push(tmp_button)

    }
    if (gates_buttons.length > 0) {
        maze_keyboard.push(gates_buttons);
    }
}



// ********** ACCESSORIE (MESSAGGI)

// In base a message_id aggiorna response.toSend o response.toEdit
function add_editOrSend_response(response, message_id, message_text, message_keyboard) {
    if (!message_id) {
        response.toSend.message_text = message_text;
        response.toSend.options.reply_markup.inline_keyboard = message_keyboard;
    } else {
        response.toEdit.new_text = message_text;
        response.toEdit.options.reply_markup.inline_keyboard = message_keyboard;
    }
}

// Aggiunge l'oggetto toEdit a response
function init_toEdit_response(response, telegram_user_id, message_id) {
    response.toEdit = bot_response.responses.toEdit();
    response.toEdit.options.chat_id = telegram_user_id;
    response.toEdit.options.message_id = message_id;
}







// *******************************************  CONTROLLI E PRELOAD

// In questa funzione si possono ospitare tutti i controlli da fare sull'utente (ed eventualmente gestire limiti o errori con preload_response)
// (appunto: module_controlls lavora su preload_response e non su response. Il perche non è chiaro…)
async function module_controlls(telegram_user_id, message_id = false) {
    let response = {
        preload_response: {
            toSend: bot_response.responses.toSend(telegram_user_id),
        }
    }

    // Esclude i non abilitati
    if (!beta_tester_controll(response, telegram_user_id, message_id)) {
        return response
    }

    // Carico player_info in response (e se non riesco informo l'utente)
    if (!(await load_player_infos(response, telegram_user_id, message_id))) {
        return response
    }

    //Carico le instance_info in response (e se non riesco informo l'utente)
    if (!(await load_instance_info(response, message_id))) {
        return response
    }

    // response è inizializzato con preload_response per comodità, ma arrivati fin qui deve essere rimosso 
    delete response.preload_response;

    // (response contiene ora pleyer_info e instance_info)
    return response;
}

// Il module_controlls, ma per una callback_query (aggiunge a responde un oggetto toEdit)
async function query_preload(response, telegram_user_id, message_id) {
    let module_controll = await module_controlls(telegram_user_id, message_id);
    if (module_controll.preload_response) {
        response.query.options.text = module_controll.preload_response.query_text;
        response.query.options.show_alert = true;
        return { esit: false };
    } else {
        let player_info = module_controll.player_info;
        let instance_info = module_controll.instance_info;
        delete module_controll.player_info;
        delete module_controll.instance_info;

        return {
            esit: true,
            player_info: player_info,
            instance_info: instance_info
        }
    }
}


// Controllo betatester
function beta_tester_controll(response, telegram_user_id, message_id = false) {
    if (in_beta && !beta_tester_ids.includes(telegram_user_id)) {
        response.preload_response.toSend.message_text = `*${nd_view.altar.title}*\n\n`;
        response.preload_response.toSend.message_text += `_${nd_view.altar.introduction}_\n`;
        response.preload_response.toSend.message_text += `_${nd_view.beta_tester.user_message}_\n`;
        if (message_id != false) {
            response.preload_response.query_text = `${nd_view.beta_tester.query_user_not_listed}`
        }

        return false;
    }

    return true;
}

// Informazioni basilari (per init) sul player (LOOT) (compreso in questo caso il team_id)
async function load_player_infos(response, telegram_id, message_id) {
    let player_infos = await nd_logic.player_infos(telegram_id);
    let team_id;

    //Informazioni da player (DB)
    if (player_infos.esit == false) {
        response.preload_response.toSend.message_text = player_infos.error_text;
        if (message_id != false) {
            response.preload_response.query_text = `${player_infos.error_text}`
        }
        return false;
    }
    response.player_info = player_infos.results;

    // Informazioni da team_player (DB)
    team_id = await nd_logic.player_teamID(response.player_info.id);
    if (team_id.esit == false) {
        response.preload_response.toSend.message_text = team_id.error_text;
        if (message_id != false) {
            response.preload_response.query_text = `${team_id.error_text}`
        }
        return false;
    }
    response.player_info.team_id = team_id.results;


    return true;
}

// Persistenza dell'Altare Sacrificale 
async function load_instance_info(response, message_id) {
    let instance_info = await nd_logic.get_instance(response.player_info); // read and lock!

    if (instance_info.esit == false) {
        if (instance_info.error == 0) {
            response.preload_response.toSend.message_text = `*${nd_view.errors.title}*\n\n${nd_view.errors.cant_load_instance}`;
            if (message_id != false) {
                response.preload_response.query_text = `${nd_view.errors.cant_load_instance}`
            }
            return false;
        } else if (instance_info.error == 1) {
            response.preload_response.toSend.message_text = `*${nd_view.errors.title}*\n\n${nd_view.errors.instance_locked}`;
            if (message_id != false) {
                response.preload_response.query_text = `${nd_view.errors.instance_locked}`
            }
            return false;
        }
    }

    response.instance_info = instance_info.results;
    return true;
}

// Caricamento di nd_player da instance_info
function nd_player_controll(response, maze, account_id) {
    let player = nd_logic.get_ndplayer(maze, account_id)
    if (player.esit == false) { // room == "undefined"
        if (response.toSend) {
            response.toSend.message_text = `*${nd_view.errors.title}*\n\n${nd_view.errors.corrupted_instance}`;
            response.toSend.message_text += ` -${nd_view.errors.corrupted_segment.nd_room}`
        }
        if (response.query) {
            response.query.options.text = `${nd_view.errors.title}\n\n${nd_view.errors.corrupted_instance}`;
            response.query.options.text += ` -${nd_view.errors.corrupted_segment.nd_room}`
            response.query.options.show_alert = true;
        }
        return { esit: false };
    }
    return { esit: true, nd_player: player.nd_player }
}

// Caricamento di room da instance_info
function room_controll(response, maze, current_room_id) {
    let controll_room = nd_logic.get_maze_room(maze, current_room_id);
    if (controll_room.esit == false) { // room == "undefined"
        if (response.toSend) {
            response.toSend.message_text = `*${nd_view.errors.title}*\n\n${nd_view.errors.corrupted_instance}`
            response.toSend.message_text += ` -${nd_view.errors.corrupted_segment.nd_room}`
        }
        if (response.query) {
            response.query.options.text = `${nd_view.errors.title}\n\n${nd_view.errors.corrupted_instance}`;
            response.query.options.text += ` -${nd_view.errors.corrupted_segment.nd_room}`

            response.query.options.show_alert = true;
        }
        return { esit: false };
    }
    return { esit: true, current_room: controll_room.room }
}





// **************************************  TESTING (anche questo è un entry point) 

// Comando /altarebeta 
// > Inserisce uno o piu telegram_id nell'array temporaneo beta_tester_ids
// > Mostra la lista degli id abilitati (se mandato a vuoto)
// > supporta un elementare sistema di sanificazione dell'imput (l'idea comunque è passargli una lista di utenti separati da spazi)
//      esempio: /altarebeta 354140824 153738969
// (questa funzione non è strutturata perche temporanea…)
// (essendo temporanea, la lista stessa è solamente caricata in ram (e quindi sarà resettata ad ogni riavvio))
async function add_betaTester(message_user_id, message_text) {
    let response = {
        toSend: bot_response.responses.toSend(message_user_id),
    }

    //Questo comando è riservato agli amministratori
    if (!config.isDev(message_user_id))
        return; // Non serve avvisare...

    let target_user_id_array = message_text.split(" ").slice(1).join(" ").split("\n").join(" ").trim().split(" ");
    if (target_user_id_array.length === 1 && target_user_id_array[0] === "")
        target_user_id_array = [];

    //target_user_id_array.push(message_user_id)

    // Stampo la lista dei betatester
    if (message_text.split(" ").length == 1 || utils.isNully(target_user_id_array) || target_user_id_array.length < 1) {
        if (beta_tester_ids.length == 0) {
            response.toSend.message_text = `${nd_view.beta_tester.empty_list}`;
        } else {
            response.toSend.message_text = `${nd_view.beta_tester.show_list}`;
            for (const account_id of beta_tester_ids) {
                let player_info_controll = await nd_logic.player_infos(account_id);

                response.toSend.message_text += `> \`${account_id}\` -> ${player_info_controll.esit ? player_info_controll.results.nickname.split("_").join("\\_") : "???"}\n`;
            }
        }
        return response;
    }


    // Aggiungo gli id all'array teporaneo
    for (const user_id_or_nick of target_user_id_array) {
        let player_info_controll = await nd_logic.player_infos(user_id_or_nick);

        if (player_info_controll.esit === false) {
            response.toSend.message_text = `*${nd_view.errors.title}*\n\n${nd_view.errors.beta_wrong_input}\n`;
            response.toSend.message_text += player_info_controll.error_text;

            return response;
        }

        if (!beta_tester_ids.includes(player_info_controll.results.account_id)) {
            beta_tester_ids.push(player_info_controll.results.account_id);
        }
    }


    // Testo della risposta
    response.toSend.message_text += `${target_user_id_array.length} ${nd_view.beta_tester.insert_success}`;


    return response;
}

// :)