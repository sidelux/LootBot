// "Mastro Artigiano ⚒" (sotto il menu Piazza) -> gestisce il craft (per l'intera linea) di piu oggetti, 

const utils = require("../../utility/utils");                               // Utilità è sempre utile…
const config = require("../../utility/config");                               // Per isDev
const view_utils = require("../views_util");                                 // Modulo utilità stringhe (generico)

const craftsman_view = require("../../views/specific/master_craftsman");    // Modulo per le stringhe specifiche di master_craftsman
const craftsman_logics = require("../../logic/master_craftsman");       // Logica specifico

const bot_response = require("../../utility/bot_response");                 // È il modulo che si occupa dell'invio, modifica etc...

// Costanti temporanee per testing esteso
const beta_tester_ids = [];
const in_beta = false;

module.exports = {
    add_betaTester: add_betaTester,                                     // "/craftbeta"                                                 <- (Stringa da definire in: ./views.strings.js
    menu: master_craftsman_menu,                                        // "mastro artigiano".indexOf(message.text.toLowerCase())>= 0   <- (Stringa da definire in: ./views.strings.js
    queryDispatcher: master_craftsman_queryDispatcher,                  //  query.data.split(":")[0] == "CRAFTSMAN"                     <- (Stringa da definire in: ./views.strings.js
    replyDispatcher: master_craftsman_replyDispatcher
}

// **************************************  MESSAGGIO - MENU
// Il menu del Maestro Artigiano. Gestisce (esclusivamente) la risposta al messaggio testuale views_struct.menu.square.master_craftsman

async function master_craftsman_menu(telegram_user_id) {
    let response = {
        toSend: bot_response.responses.toSend(telegram_user_id),
    }

    const preload = await menu_controlls(telegram_user_id);                   // carica player_info e craftman_info, 
    if (preload.preload_response) {                                           // se esiste l'oggetto preload_response viene inviato quello (o un errore o un limite imposto)
        return preload.preload_response;
    }

    const player_info = preload.player_info;
    const craftsman_info = preload.craftsman_info;



    return await menu_textAndButtons(response, player_info, craftsman_info, false);         // restituisce il menu formattato

}

// **************************************  QUERIES
// Lo smistatore di query (in response prepara già la risposta)
async function master_craftsman_queryDispatcher(callback_query) {
    let query_data = callback_query.data.split(":").slice(1);
    let telegram_user_id = callback_query.from.id;
    let message_id = callback_query.message.message_id;
    let response = { query: bot_response.responses.query() };
    response.query.id = callback_query.id;
    //response.query.options.text = query_data.join(", ");
    //response.query.options.show_alert = true;

    let sub_structure = utils.query_structure.query_tree.master_craftsman;

    switch (query_data[0]) {
        case sub_structure.delete_message.stmp: {
            response.toDelete = bot_response.responses.toDelete();
            response.toDelete.chat_id = callback_query.message.chat.id;
            response.toDelete.message_id = message_id;

            break;
        }
        case sub_structure.guide.stmp: {
            await guide_view(response, telegram_user_id, message_id);
            break;
        }
        case sub_structure.menu.stmp: {
            await menu_view(response, telegram_user_id, message_id);
            break;
        }
        case sub_structure.smuggler.stmp: {
            await smuggler_view_dispatch(response, telegram_user_id, message_id, query_data.slice(1));
            break;
        }
        case sub_structure.assault.stmp: {
            await assault_view_dispatch(response, telegram_user_id, message_id, query_data.slice(1));
            break;
        }
        case sub_structure.list.stmp: {
            await list_view_dispatch(telegram_user_id, response, message_id, query_data.slice(1));
            break;
        }
        case sub_structure.validate.stmp: {
            await validate_view_dispatch(response, telegram_user_id, message_id, query_data.slice(1))
            break;
        }
    }

    if (response.other_responses) {
        response.other_responses.unshift(response);
        return response.other_responses
    }

    return response;
}

// ************************************** REPLY_TO
// Smista la risposta ad un messaggio del mastro. response esiste solo se un delegato è stato trovato
async function master_craftsman_replyDispatcher(original_message, message) {
    const preload = await menu_controlls(message.from.id);                   // carica player_info e craftman_info, 
    if (preload.preload_response) {                                           // se esiste l'oggetto preload_response viene inviato quello (o un errore o un limite imposto)
        return preload.preload_response;
    }


    const title_trigger = original_message.text.split("\n")[0].toLowerCase();
    const player_info = preload.player_info;
    const craftsman_info = preload.craftsman_info;
    let response = {};
    response.toEdit = { ...bot_response.responses.toEdit() };
    response.toEdit.options.chat_id = player_info.account_id;
    response.toEdit.options.message_id = original_message.message_id;


    if (title_trigger.match(craftsman_view.list.title.toLowerCase())) {
        const player_input = message.text;
        response.toDelete = { ...bot_response.responses.toDelete };
        response.toDelete.chat_id = player_info.account_id;
        response.toDelete.message_id = message.message_id;


        if (title_trigger.match(craftsman_view.list.edit_moji)) { // filtro testuale (ricerca oggetti per input)

            list_view_custom_input(response, player_info, craftsman_info, [player_input, 0]);
            return (response);
        } else if (title_trigger.match(craftsman_view.list.list_moji)) { // Modifica le quantità

            list_quantity_input(response, player_info, craftsman_info, player_input);
            return (response);
        }

    }


    return false;

}

// ********************************************************************************  SUB_VIEWS


// ******************************************  MENU

// la vista menu, ma per una callback_query
async function menu_view(response, telegram_user_id, message_id) {
    let query_controll = await query_preload(response, telegram_user_id, message_id);

    if (query_controll.esit == true) {
        let saved_message_id = query_controll.craftsman_info.current_message_id;
        if (saved_message_id != -1 && saved_message_id != message_id) {
            response.toDetete = bot_response.responses.toDelete(telegram_user_id, saved_message_id)
        }

        if (saved_message_id != message_id) {
            query_controll.craftsman_info.current_message_id = message_id;
            await craftsman_logics.update_craftsman_info(telegram_user_id, query_controll.craftsman_info);
        }
        // console.log(saved_message_id);
        // console.log(response);

        await menu_textAndButtons(response, query_controll.player_info, query_controll.craftsman_info, message_id);
    }
}

// Testo e bottoni del menu master_craftsman_menu
// message_id è trattato come un booleano, vero solo se il menù è attivato da una query
async function menu_textAndButtons(response, player_info, craftsman_info, message_id = false, has_failed_validation = false) {
    // Testo del messaggio
    let menu_keyboard = [];
    let menu_text = `_${craftsman_view.menu.introduction}_\n`;
    let has_assault_affairs = await craftsman_logics.player_assault_infos(player_info.id)
    let has_smuggler_offert = await craftsman_logics.player_smuggler_offert(player_info);


    // Testo del Mastro...
    menu_text += "«";
    if (!message_id) {
        if (craftsman_info.is_new) {
            menu_text +=
                `${view_utils.ita_gender_impl_singular_all(craftsman_view.menu.wellcome, player_info.gender)} ${craftsman_view.menu.wellcome_new}!`;
        } else {
            menu_text +=
                `${view_utils.ita_gender_impl_singular_all(craftsman_view.menu.wellcome_back, player_info.gender)} ${player_info.username}!\n`;
        }
    } else {
        let fixed_big_quantity = 25;
        let phrases_random_index;
        let random_phrase;
        let total_quantity = craftsman_logics.list_total_quantity(craftsman_info.items_list);

        if (has_failed_validation) {
            phrases_random_index = Math.floor(Math.random() * craftsman_view.menu.failed_validation_phrases.length);
            random_phrase = `${craftsman_view.menu.failed_validation_phrases[phrases_random_index]}`;
        } else if (total_quantity > fixed_big_quantity) {
            phrases_random_index = Math.floor(Math.random() * craftsman_view.menu.long_list_phrases.length);
            random_phrase = `${craftsman_view.menu.long_list_phrases[phrases_random_index]}`
        } else if (total_quantity > 1) {
            phrases_random_index = Math.floor(Math.random() * craftsman_view.menu.short_list_phrases.length);
            random_phrase = `${craftsman_view.menu.short_list_phrases[phrases_random_index]}`
        } else {
            phrases_random_index = Math.floor(Math.random() * craftsman_view.menu.waiting_phrases.length);
            random_phrase = `${craftsman_view.menu.waiting_phrases[phrases_random_index]}`
        }
        menu_text += `${random_phrase}`
    }
    menu_text += "»\n";

    // Bottoni (inline_keyboard)
    menu_keyboard.push(
        [
            craftsman_view.keyboard_buttons.list_view_main, // assault_view_main
            craftsman_view.keyboard_buttons.master_craftsman_guide
        ]);

    if (has_assault_affairs.team_id != -1 && has_assault_affairs.assault_phase == 1) {
        menu_keyboard[0].splice(1, 0, craftsman_view.keyboard_buttons.assault_view_main)
    }

    if (has_smuggler_offert.esit == true && has_smuggler_offert.results.length > 0) {
        menu_keyboard[0].splice(1, 0, craftsman_view.keyboard_buttons.smuggler_view_main)
    }

    if (craftsman_info.items_list.length > 0) {
        menu_keyboard[0].push(craftsman_view.keyboard_buttons.show_items_list);
        menu_keyboard.push([
            craftsman_view.keyboard_buttons.validate_list,
        ]);
    }


    if (!message_id) {
        response.toSend.message_text = menu_text;
        response.toSend.options.reply_markup.inline_keyboard = menu_keyboard;
    } else {
        response.toEdit.new_text = menu_text;
        response.toEdit.options.reply_markup.inline_keyboard = menu_keyboard;
    }

    return response;
}

// ******************************************  GUIDE

// Vista con le informazioni sul MastroArtigiano
async function guide_view(response, telegram_user_id, message_id, preloaded_player_info, preloaded_craftsman_info) {
    let craftsman_info;
    let player_info;
    let guide_message_text = "";

    if (!telegram_user_id) {
        player_info = preloaded_player_info;
        craftsman_info = preloaded_craftsman_info;
    } else {
        let query_controll = await query_preload(response, telegram_user_id, message_id);
        player_info = query_controll.player_info;
        craftsman_info = query_controll.craftsman_info;
    }

    let view_keyboard = [
        [
            craftsman_view.keyboard_buttons.back_to_menu
        ]
    ];

    response.toEdit = bot_response.responses.toEdit();
    response.toEdit.options.chat_id = player_info.account_id;
    response.toEdit.options.message_id = message_id;

    guide_message_text = `*${craftsman_view.guide.title}*\n\n`;
    guide_message_text += `_${craftsman_view.guide.text}_\n`;
    guide_message_text += `_${view_utils.ita_gender_impl_singular_all(craftsman_view.guide.commit_text, player_info.gender)}_\n\n`;

    guide_message_text += `${craftsman_view.guide.navigation_title}\n`;
    guide_message_text += `\t\t${craftsman_view.guide.navigation_rarity}\n`;
    guide_message_text += `\t\t${craftsman_view.guide.navigation_prefix}\n`;
    guide_message_text += "\n\n";

    //  Censura (su player.reborn)
    guide_message_text += `${craftsman_view.guide.settings_title}\n`;
    if (craftsman_info.censure_view === false) {
        guide_message_text += `${craftsman_view.guide.censure_is_set}\n`;

        let censure_button = { ...craftsman_view.keyboard_buttons.censure_view_set };
        censure_button.callback_data += `:${player_info.reborn}`;
        view_keyboard[0].push(censure_button);
    } else {
        guide_message_text += `${craftsman_view.guide.censure_unset}\n`;
        view_keyboard[0].push(craftsman_view.keyboard_buttons.censure_view_remove);
    }
    // Preserva zaino
    if (!craftsman_info.preserve_crafted) {
        guide_message_text += `${craftsman_view.guide.preserve_unset}\n`;

        let preserve_button = { ...craftsman_view.keyboard_buttons.preserve_confirm };
        if (player_info.gender == "F") {
            preserve_button.text = "🙅‍♀️";
        }
        view_keyboard[0].push(preserve_button);
    } else {
        guide_message_text += `${craftsman_view.guide.preserve_is_set}\n`;


        let preserve_button = { ...craftsman_view.keyboard_buttons.preserve_remove };
        view_keyboard[0].push(preserve_button);
    }

    response.toEdit.new_text = guide_message_text;
    response.toEdit.options.reply_markup.inline_keyboard = view_keyboard;
}


// ******************************************  ASSAULT

async function assault_view_dispatch(response, telegram_user_id, message_id, query_data) {
    let query_controll = await query_preload(response, telegram_user_id, message_id);
    let player_info = query_controll.player_info;
    let craftsman_info = query_controll.craftsman_info;
    let has_assault_affairs = await craftsman_logics.player_assault_infos(player_info.id);
    let assault_infos;
    let craftable_items;
    let view_keyboard = [
        [
            craftsman_view.keyboard_buttons.back_to_menu
        ]
    ];

    if (has_assault_affairs.team_id == -1) {
        response.query.options.text = `${craftsman_view.assault.errors.title}${craftsman_view.assault.errors.no_team}`;
        response.query.options.show_alert = true;
        return;
    } else if (has_assault_affairs.assault_place <= 0) {
        response.query.options.text = `${craftsman_view.assault.errors.title}${craftsman_view.assault.errors.not_in_place}`;
        response.query.options.show_alert = true;
        return;
    } else if (has_assault_affairs.assault_phase != 1) {
        response.query.options.text = `${craftsman_view.assault.errors.title}${craftsman_view.assault.errors.not_now}`;
        response.query.options.show_alert = true;
        return;
    }


    assault_infos = await craftsman_logics.player_assault_upgrade_needs(has_assault_affairs.team_id, has_assault_affairs.assault_place);
    craftable_items = craftsman_logics.item_infos_forList_craftable_check(assault_infos.results)

    if (assault_infos.esit == false || craftable_items.length <= 0) {
        response.query.options.text = `${craftsman_view.assault.errors.nothing_to_do}`;
        response.query.options.show_alert = true;
        return;
    } else {
        let sub_structure = utils.query_structure.query_tree.master_craftsman.assault;
        response.toEdit = bot_response.responses.toEdit();
        response.toEdit.options.chat_id = player_info.account_id;
        response.toEdit.options.message_id = message_id;


        switch (query_data[0]) {
            case (sub_structure.missing.stmp): {
                let player_inventory_controll = await pleyer_inventory_controll(response, player_info, message_id);
                if (!player_inventory_controll) {
                    return;
                }
                let player_inventory = [...response.player_inventory];
                delete response.player_inventory;

                let filtered = craftsman_logics.filter_list_for_inventory(craftable_items, player_inventory).filtered_list;
                if (filtered.length <= 0) {
                    response.query.options.text = `${craftsman_view.assault.errors.nothing_important_to_do}`;
                    response.query.options.show_alert = true;
                    view_keyboard.push([craftsman_view.keyboard_buttons.assault_addAll_to_list]);
                } else {
                    craftable_items = filtered;
                    view_keyboard.push([craftsman_view.keyboard_buttons.assault_show_all]);

                    if (query_data[1] == sub_structure.missing.add_missing_to_list.stmp) {
                        response.query.options.text = `${craftable_items.length} ${craftsman_view.assault.items_added}`;
                        response.query.options.show_alert = true;
                        craftable_items.forEach(item => {
                            craftsman_logics.add_itemAndQuantity_to_items_list(item, craftsman_info.items_list)
                        });

                        await craftsman_logics.update_craftsman_info(telegram_user_id, craftsman_info);

                        return await menu_textAndButtons(response, player_info, craftsman_info, message_id)
                    } else {
                        view_keyboard.push([craftsman_view.keyboard_buttons.assault_addMissing_to_list]);
                    }
                }
                break;
            }
            default: {
                view_keyboard.push([craftsman_view.keyboard_buttons.assault_show_missing]);

                if (query_data[1] == sub_structure.all.add_all_to_list.stmp) {
                    response.query.options.text = `${craftable_items.length} ${craftsman_view.assault.items_added}`;
                    response.query.options.show_alert = true;
                    craftable_items.forEach(item => {
                        craftsman_logics.add_itemAndQuantity_to_items_list(item, craftsman_info.items_list)
                    });

                    await craftsman_logics.update_craftsman_info(telegram_user_id, craftsman_info);
                    return await menu_textAndButtons(response, player_info, craftsman_info, message_id)
                } else {
                    view_keyboard.push([craftsman_view.keyboard_buttons.assault_addAll_to_list]);
                }

                break;
            }
        }

        // Bottone lista
        if (craftsman_info.items_list.length > 0) {
            view_keyboard[0].push(craftsman_view.keyboard_buttons.show_items_list);
        }


        let needed_text = `*${craftsman_view.assault.title}*\n`;
        needed_text += `${craftable_items.length} ${craftsman_view.assault.items_needed}\n\n`;
        if (craftable_items.length > 0) {
            craftable_items.forEach(item => {
                needed_text += `• ${item.quantity}x ${item.name} (${item.rarity})\n`;
            });

        }

        response.toEdit.new_text = needed_text;
        response.toEdit.options.reply_markup.inline_keyboard = view_keyboard;
    }


}

// ******************************************  (SMUGGLER) CONTRABBANDIERE

async function smuggler_view_dispatch(response, telegram_user_id, message_id, query_data) {
    let query_controll = await query_preload(response, telegram_user_id, message_id);
    let player_info = query_controll.player_info;
    let craftsman_info = query_controll.craftsman_info;
    let has_smuggler_offert = await craftsman_logics.player_smuggler_offert(player_info);
    let offerts_text = `*${craftsman_view.smuggler.title}*\n\n`;
    let sub_structure = utils.query_structure.query_tree.master_craftsman.smuggler;
    let view_keyboard = [[craftsman_view.keyboard_buttons.back_to_menu]];


    if (has_smuggler_offert.esit == false || has_smuggler_offert.results.length < 0) {
        response.query.options.text = `${craftsman_view.smuggler.errors.title}${craftsman_view.smuggler.errors.nothing_to_do}`;
        response.query.options.show_alert = true;
        return;
    } else if (query_data[0] == sub_structure.add_smuggler_to_list.stmp) {
        has_smuggler_offert.results.forEach(item => {
            craftsman_logics.add_item_to_items_list(item.item_id, craftsman_info.items_list)
        });
        response.query.options.text = `${craftsman_view.smuggler.title}\n\n${craftsman_view.smuggler.items_added}`;
        response.query.options.show_alert = true;

        await craftsman_logics.update_craftsman_info(telegram_user_id, craftsman_info);
        return await menu_textAndButtons(response, player_info, craftsman_info, message_id)

    } else if (query_data[0] == sub_structure.check_missing.stmp) {
        let player_inventory_controll = await pleyer_inventory_controll(response, player_info, message_id);
        if (!player_inventory_controll) {
            return;
        }
        let player_inventory = [...response.player_inventory];
        delete response.player_inventory;
        let request_items_names = has_smuggler_offert.results.map(item => (craftsman_logics.item_infos(item.item_id)));

        let inventory_check = craftsman_logics.filter_list_for_inventory(request_items_names, player_inventory);

        if (inventory_check.filtered_list.length > 0) {

            response.query.options.text = `${craftsman_view.smuggler.title}\n\n${craftsman_view.smuggler.item_missing} ${inventory_check.filtered_list.map(item => (item.name)).join(", ")}`;
        } else {
            response.query.options.text = `${craftsman_view.smuggler.title}\n\n${craftsman_view.smuggler.has_item} ${inventory_check.quantity_list.map(item => (`${item.name} (${item.quantity})`)).join(", ")}`;
        }
        response.query.options.show_alert = true;
    } else {
        response.toEdit = bot_response.responses.toEdit();
        response.toEdit.options.chat_id = player_info.account_id;
        response.toEdit.options.message_id = message_id;

        view_keyboard.push(
            [craftsman_view.keyboard_buttons.smugglier_check_missing],
            [craftsman_view.keyboard_buttons.smuggler_add_offert]
        )

        offerts_text += `${craftsman_view.smuggler.items_needed}\n`;
        has_smuggler_offert.results.forEach(item => {
            let item_info = craftsman_logics.item_infos(item.item_id);
            offerts_text += `• ${item_info.name} (${item_info.rarity})\n`;
        });

        response.toEdit.new_text = offerts_text;
        response.toEdit.options.reply_markup.inline_keyboard = view_keyboard;
    }
}

// ******************************************  LIST (lista oggetti da creare)

// *******  DISPATCH -> Query che iniziano per LIST
async function list_view_dispatch(telegram_user_id, response, message_id, query_data) {
    let query_controll = await query_preload(response, telegram_user_id, message_id);
    let sub_structure = utils.query_structure.query_tree.master_craftsman.list;

    if (query_controll.esit == true) {
        if (query_data[0] == sub_structure.show_list.stmp) { // SHOW LIST
            show_list_messageAndButtons(response, query_controll.player_info, query_controll.craftsman_info)
        } else if (query_data[0] == sub_structure.custom_list.stmp) {
            list_view_custom_input(response, query_controll.player_info, query_controll.craftsman_info, query_data.slice(1))
        } else if (query_data[0] == sub_structure.download_list.stmp) {
            list_download(response, query_controll.player_info, query_controll.craftsman_info);
        } else if (query_data.length <= 1) {
            if (query_data[0] == sub_structure.set_rarity.stmp) {
                query_controll.craftsman_info.current_rarity = "";
                query_controll.craftsman_info.current_prefix = "";
                await craftsman_logics.update_craftsman_info(telegram_user_id, query_controll.craftsman_info);
            } else if (query_data[0] == sub_structure.set_prefix.stmp) {
                query_controll.craftsman_info.current_prefix = "";
                await craftsman_logics.update_craftsman_info(telegram_user_id, query_controll.craftsman_info);
            }
            response.query.options.show_alert = false;
            list_view(response, query_controll.craftsman_info, query_controll.player_info, query_data)
        } else {
            await list_view_updates(response, query_controll.player_info, query_controll.craftsman_info, message_id, query_data)
        }
    }
}

// vista show_list: mostra la lista attuale
function show_list_messageAndButtons(response, player_info, craftsman_info) {
    let view_keyboard = [
        [
            craftsman_view.keyboard_buttons.back_to_menu,
            craftsman_view.keyboard_buttons.list_view_main,
            craftsman_view.keyboard_buttons.delete_list,
        ]
    ];
    let message_text = `*${craftsman_view.list.title}* ${craftsman_view.list.list_moji}\n\n`;

    // Lista oggetti
    if (craftsman_info.items_list.length <= 0) { // ...vuota
        message_text += `${craftsman_view.list.empty_list}\n`;
    } else {
        if (craftsman_info.items_list.length > 1) {
            message_text += `${craftsman_info.items_list.length} ${craftsman_view.list.show_list_length}\n`;
        }

        if (craftsman_info.items_list.length <= 30) {
            let items_list_whith_infos = craftsman_logics.item_infos_forList(craftsman_info.items_list);
            items_list_whith_infos.forEach((item_info) => {
                message_text += `> ${item_info.quantity}x ${item_info.name} (${item_info.rarity})`;
                if (player_info.reborn < item_info.reborn) {
                    message_text += `${craftsman_view.validate.unable.unable_moji}`
                }
                message_text += "\n";
            });
            message_text += "\n";
        } else { // Aggiungo un bottone per il download download_list
            view_keyboard[0].splice(1, 0, craftsman_view.keyboard_buttons.download_list);
            message_text += `${craftsman_view.list.download_list}\n`;
        }


        message_text += `${craftsman_view.list.list_total_quantity} ${craftsman_logics.list_total_quantity(craftsman_info.items_list)}\n`;
    }

    response.toEdit.new_text = message_text;
    response.toEdit.options.reply_markup.inline_keyboard = view_keyboard;
}

// vista list_view, ma per query
function list_view(response, craftsman_info, player_info, query_data) {
    let sub_structure = utils.query_structure.query_tree.master_craftsman.list;
    if (query_data[1] == sub_structure.custom_list.stmp) {
        list_view_custom_input(response, player_info, craftsman_info, [query_data[2], query_data[5]]);
    } else {
        let craftables_array;
        if (craftsman_info.current_rarity.length > 0) {
            craftables_array = craftsman_logics.get_craftables_ofRarity(craftsman_info.current_rarity, craftsman_info.censure_view);
        } else {
            craftables_array = craftsman_logics.get_craftables_forRebor(player_info.reborn)
        }
        response.toEdit.new_text = list_view_message_text(craftables_array, craftsman_info, query_data);
        response.toEdit.options.reply_markup.inline_keyboard = list_view_buttons(craftables_array, craftsman_info, player_info, query_data);
    }

}

// vista list_view, ma prima aggiorna la persistenza di craftsman_info (c'è un po troppa logica qui...)
async function list_view_updates(response, player_info, craftsman_info, message_id, query_data) {
    let controll = false;
    let sub_structure = utils.query_structure.query_tree.master_craftsman.list;
    let type = query_data[0];
    let new_value = query_data[1];
    let query_controll = query_data[2];

    // Questa sezione di codice è diventato troppo lunga, va divisa nelle 4 (...3) sotto_sezioni (come list_view_buttons)
    if (type == sub_structure.set_preserve_bool.stmp) {
        controll = true;
        response.query.options.show_alert = true;
        craftsman_info.preserve_crafted = !craftsman_info.preserve_crafted;
        response.query.options.text = craftsman_info.preserve_crafted ? `${craftsman_view.list.is_preserving}` : `${craftsman_view.list.is_not_preserving}`;

    } else if (type == sub_structure.censure.stmp) {
        controll = true;
        response.query.options.show_alert = true;

        if (craftsman_info.censure_view === false) {
            craftsman_info.censure_view = player_info.reborn;
            response.query.options.text = `${craftsman_view.list.censure_set} (r${player_info.reborn - 1})`
        } else {
            craftsman_info.censure_view = false;
            response.query.options.text = `${craftsman_view.list.censure_remove}`
        }

    } else if (type == sub_structure.set_prefix.stmp) {
        let rarity_prefixes = craftsman_logics.get_prefixes_ofRarity(craftsman_info.current_rarity, craftsman_info.censure_view);
        controll = rarity_prefixes.indexOf(new_value) >= 0;
        if (controll) {
            response.query.options.text = new_value;
            response.query.options.show_alert = false;

            craftsman_info.current_prefix = new_value;
            type = sub_structure.set_rarity.stmp;
        } else {
            response.query.options.text = query_data.join("-");
            response.query.options.show_alert = true;
        }

    } else if (type == sub_structure.set_rarity.stmp) {
        controll = craftsman_logics.is_craftable_rarity(new_value);
        if (controll) {
            response.query.options.text = new_value;
            response.query.options.show_alert = false;

            craftsman_info.current_rarity = new_value;
            craftsman_info.current_prefix = "";
            type = sub_structure.set_prefix.stmp;
        } else {
            response.query.options.text = query_data.join("-");
            response.query.options.show_alert = true;
        }

    } else if (type == sub_structure.add_to_list.stmp) {
        new_value = query_data[3];
        query_controll = query_data[4];

        if (craftsman_info.query_random_char == query_controll) {

            response.query.options.show_alert = true;
            response.query.options.cache_time = 5;

            let item_info = craftsman_logics.item_infos(new_value);

            if (!utils.isNully(item_info) && item_info.craftable == 1) {
                controll = true;
                craftsman_info.query_random_char = String.fromCharCode(65 + Math.floor(Math.random() * 26));
                let new_quantity = craftsman_logics.add_item_to_items_list(new_value, craftsman_info.items_list);
                response.query.options.text = `1x\n${item_info.name} (${item_info.rarity})\n`;
                if (new_quantity > 1) {
                    response.query.options.text += `\n\n${craftsman_view.list.list_total_quantity} ${new_quantity}`
                }
            } else {
                response.query.options.text = query_data.join("-");
            }
        } else {
            response.query.options.text = "Ciao userbot :)";
            response.query.options.show_alert = true;
        }
    } else if (type == sub_structure.clear_list.stmp) {
        controll = true;
        craftsman_logics.clear_craftsman_info(craftsman_info);
        response.query.options.text = craftsman_view.list.list_clear;
        response.query.options.show_alert = true;
    }

    if (controll) {
        let update = await craftsman_logics.update_craftsman_info(player_info.account_id, craftsman_info);
        if (update) {
            if (type == sub_structure.censure.stmp || type == sub_structure.set_preserve_bool.stmp) {
                return await guide_view(response, false, message_id, player_info, craftsman_info);
            }
            return list_view(response, craftsman_info, player_info, query_data);
        } else {
            // console.log(update);
            // qui andrebbe mandata una query di errore, quantomeno
        }
    } else {
        return list_view(response, craftsman_info, player_info, query_data);
    }
}

// list_view è diviso in due parti, questo è il message_text  
function list_view_message_text(craftables_array, craftsman_info, query_data, custom_input = false, search_results = null) {
    let message_text = `*${craftsman_view.list.title}* ${craftsman_view.list.edit_moji}\n\n`;
    // ***** Testo

    // Lista oggetti
    if (craftsman_info.items_list.length == 0) {
        message_text += `${craftsman_view.list.empty_list}\n`;
    } else {
        message_text += `${craftsman_view.list.list_length} ${craftsman_info.items_list.length}\n`;
        message_text += `${craftsman_view.list.list_total_quantity} ${craftsman_logics.list_total_quantity(craftsman_info.items_list)}\n`;
    }
    if (craftables_array.length > 1) {
        message_text += `• ${craftables_array.length} ${craftsman_view.list.craftables_in_list}\n`;
    }

    message_text += "\n\n";
    if (!custom_input) {
        // Rarità
        if (craftsman_info.current_rarity.length > 0) {
            message_text += `• ${craftsman_view.list.selected_rarity} ${craftsman_view.keyboard_buttons.set_rarity.text}: ${craftsman_info.current_rarity} \n`;
            if (craftsman_info.current_prefix.length <= 0) {
                message_text += `${craftsman_view.list.prefix_select} ${craftsman_view.list.serarch_info}\n`;
            }
        } else {
            message_text += `${craftsman_view.list.rarity_select} ${craftsman_view.list.serarch_info}\n`;
        }

        // Prefisso
        if (craftsman_info.current_prefix.length > 0) {
            let current_prefix = craftsman_info.current_prefix.length == 1 ? craftsman_info.current_prefix : craftsman_info.current_prefix.split("").join(", ")
            message_text += `• ${craftsman_view.list.selected_prefix} ${craftsman_view.keyboard_buttons.index_button.text}: ${current_prefix}\n`;
        }
    } else {
        if (craftsman_info.current_rarity.length > 0) {
            message_text += `• ${craftsman_view.list.selected_rarity} ${craftsman_view.keyboard_buttons.set_rarity.text}: ${craftsman_info.current_rarity} \n`;
        }

        message_text += `${craftsman_view.search.input} \`${custom_input}\`, `;

        if (search_results.length <= 0) {
            message_text += `${craftsman_view.search.no_match}`;
        } else {
            message_text += `${search_results.length} ${craftsman_view.search.match}`;
        }


    }
    message_text += "\n";



    return message_text
}

// list_view è diviso in due parti, questi sono i bottoni 
// Questa roba è cresciuta e cresciuta e cresciuta con una velocità impressionante. E parlo anche di list_view_updates e un po tutte le robe di list_view.
// Urge un po di pulizia…
function list_view_buttons(craftables_array, craftsman_info, player_info, query_data) {
    let sub_structure = utils.query_structure.query_tree.master_craftsman.list;
    // Bottoni
    let list_buttons_array;                                                                         // La lista di Stringhe da cui generare i bottoni
    let button_template;                                                                            // Il template (text e callback_data per il bottone)
    let result_buttoms_array = [];
    let type = query_data[0]                                                                       // Array di Array restituito dalla funzione
    // Prima linea

    let first_line_buttons = [
        craftsman_view.keyboard_buttons.back_to_menu,
    ]

    // Condizioni per l'opbrobrio subito sotto
    let show_rarity_submenu = craftsman_info.current_rarity.length <= 0 || (type == sub_structure.set_rarity.stmp && query_data.length == 1);
    let show_items_list_submenu = craftsman_info.current_rarity.length > 0 && craftsman_info.current_prefix.length > 0
    // ((type == sub_structure.set_prefix.stmp && query_data[1]) || type == sub_structure.items_page.stmp || type == sub_structure.add_to_list.stmp);

    //Definizione di list_buttons_array e button_template
    if (show_rarity_submenu) {                                                              // Bottoni "rarità con creati"
        list_buttons_array = craftsman_logics.avaible_rarities(craftsman_info.censure_view);
        button_template = { ...craftsman_view.keyboard_buttons.set_rarity };
    } else if (show_items_list_submenu) {                                                   // Bottoni con gli oggetti 
        first_line_buttons.push(craftsman_view.keyboard_buttons.set_rarity)
        first_line_buttons.push(craftsman_view.keyboard_buttons.index_button)

        const hard_coded_paging = 5;
        const hard_code_tollerance = 2; // se gli elementi sono solo 7...

        let nav_buttons = [];

        list_buttons_array = craftsman_logics.get_craftable_subset_fromPrefixes(craftsman_info.current_prefix, craftables_array);

        let original_length = list_buttons_array.length;


        let current_page = !isNaN(parseInt(query_data[2])) ? parseInt(query_data[2]) : 0;
        let max_index = Math.min(list_buttons_array.length, current_page + hard_coded_paging);

        if (type == sub_structure.items_page.stmp || (type == sub_structure.add_to_list.stmp && original_length > (hard_coded_paging + hard_code_tollerance))) {
            list_buttons_array = list_buttons_array.slice(current_page, max_index);
            if (current_page > 0) {
                let min_index = Math.max(0, current_page - hard_coded_paging);

                let backward = { ...craftsman_view.keyboard_buttons.items_page_button_backward }
                backward.callback_data += `:${query_data[1]}:${min_index}`
                nav_buttons.push(backward);
            }

            if (max_index < original_length) {
                let forward_button = { ...craftsman_view.keyboard_buttons.items_page_button_forward }
                forward_button.callback_data += `:${query_data[1]}:${max_index}`
                nav_buttons.push(forward_button);
            }
        } else if (original_length > (hard_coded_paging + hard_code_tollerance)) {
            list_buttons_array = list_buttons_array.slice(0, hard_coded_paging);
            let forward_button = { ...craftsman_view.keyboard_buttons.items_page_button_forward }
            forward_button.callback_data += `:${query_data[1]}:${max_index}`
            nav_buttons.push(forward_button);
        }

        if (nav_buttons.length > 0) {
            first_line_buttons.push(...nav_buttons);
        }

        button_template = { ...craftsman_view.keyboard_buttons.add_to_list };

    } else if (craftsman_info.current_rarity.length > 0) {                                  // Bottoni "prefissi di una rarità" (default, perché current_rarity è sempre settato)
        first_line_buttons.push(craftsman_view.keyboard_buttons.set_rarity)

        let prefixes_array = craftsman_logics.get_craftable_array_groupedPrefixes(craftables_array);

        if (prefixes_array.length <= 5 && craftables_array.length <= 5) {
            list_buttons_array = craftsman_logics.get_craftable_subset_fromPrefixes(prefixes_array.join(""), craftables_array);
            button_template = { ...craftsman_view.keyboard_buttons.add_to_list };
            show_items_list_submenu = true;
        } else {

            list_buttons_array = prefixes_array;
            button_template = { ...craftsman_view.keyboard_buttons.index_button };
        }
    }

    // Bottone lista
    if (craftsman_info.items_list.length > 0) {
        first_line_buttons.push(craftsman_view.keyboard_buttons.show_items_list);
    }

    result_buttoms_array.push(first_line_buttons);

    // Linee dinaiche
    if (list_buttons_array) {
        let indexes_buttons = [];                                                                   // Generazione dell'array bottoni
        list_buttons_array.forEach(index => {                                                       // Generazione grezza (partendo da list_buttons_array)
            let index_button = { ...button_template };
            if (show_items_list_submenu) {                                                                     // nel caso dei nomi c'è il paging, quindi mi devo comportare in maniera leggermente diversa
                let current_page = !isNaN(parseInt(query_data[2])) ? parseInt(query_data[2]) : 0;
                index_button.text = `${index.name}`;                                                // Il testo del bottone è la la propietà .name
                index_button.callback_data += `:${query_data[1]}:${current_page}:${index.id}:${craftsman_info.query_random_char}`;   // La callback_data specifica è concatenata con la propietà .id e query_random_char (una misura anti userbot)
            } else {
                index_button.text = `${index}`;                                                         // Il testo del bottone è la iesima-stringa
                index_button.callback_data += `:${index}`;                                              // La callback_data specifica è concatenata con la iesima-stringa    
            }
            indexes_buttons.push(index_button);
        });

        // Controllo sul numero di elementi per la stampa
        if (show_items_list_submenu) {
            for (let i = 0; i < indexes_buttons.length; i++) {                       // divido in chunk secondo medium_length
                result_buttoms_array.push([indexes_buttons[i]]);                                                           // aggiungo (singolarmente) i chunk all'array risultato
            }
        } else if (indexes_buttons.length <= 6) {                                                          // Piu di 8 bottoni su una stessa riga non si riescono a leggere
            result_buttoms_array.push(indexes_buttons);
        } else {
            let medium_length = indexes_buttons.length >= 10 ? 5 : (1 + Math.floor(indexes_buttons.length / 2));    // Calcolo una lunghezza media per le righe
            for (let i = 0; i < indexes_buttons.length; i += medium_length) {                                       // divido in chunk secondo medium_length
                const chunk = indexes_buttons.slice(i, i + medium_length);
                result_buttoms_array.push(chunk);                                                                   // aggiungo (singolarmente) i chunk all'array risultato
            }
        }
    }

    return result_buttoms_array;
}

// Funzione che gestisce l'input in risposta a messaggi di tipo edit-lista
function list_view_custom_input(response, player_info, craftsman_info, query_data) {
    const hard_coded_paging = 5;
    const sub_structure = utils.query_structure.query_tree.master_craftsman.list;
    const current_page = !isNaN(parseInt(query_data[1])) ? parseInt(query_data[1]) : 0;
    const craftables_array = (craftsman_info.current_rarity.length <= 0) ? craftsman_logics.get_craftables_forRebor(player_info.reborn) : craftsman_logics.get_craftables_ofRarity(craftsman_info.current_rarity, player_info.reborn);
    const search_results = craftsman_logics.search_item(query_data[0], craftables_array);
    const max_index = Math.min(search_results.length, current_page + hard_coded_paging);

    craftsman_logics.sort_items_fromRarity(search_results);



    let keyboard_buttons = [[
        craftsman_view.keyboard_buttons.back_to_menu,
        craftsman_view.keyboard_buttons.set_rarity
    ]];


    if (current_page > 0) {
        let min_index = Math.max(0, current_page - hard_coded_paging);

        let backward = { ...craftsman_view.keyboard_buttons.items_page_button_backward }
        backward.callback_data = backward.callback_data.split(":").slice(0, -1).join(":")
        backward.callback_data += `:${sub_structure.custom_list.stmp}:${query_data[0]}:${min_index}`
        keyboard_buttons[0].push(backward);
    }

    if (max_index < search_results.length) {
        let forward_button = { ...craftsman_view.keyboard_buttons.items_page_button_forward }
        forward_button.callback_data = forward_button.callback_data.split(":").slice(0, -1).join(":");
        forward_button.callback_data += `:${sub_structure.custom_list.stmp}:${query_data[0]}:${max_index}`
        keyboard_buttons[0].push(forward_button);
    }

    for (let i = current_page; i < max_index; i++) {
        let button_template = { ...craftsman_view.keyboard_buttons.add_to_list };
        button_template.text = `${search_results[i].name}`;
        if (craftsman_info.current_rarity.length <= 0) {
            button_template.text += ` (${search_results[i].rarity})`;
        }
        button_template.callback_data += `:${sub_structure.custom_list.stmp}:${query_data[0]}:${search_results[i].id}:${craftsman_info.query_random_char}:${query_data[1]}`;   // La callback_data specifica è concatenata con la propietà .id e query_random_char (una misura anti userbot)
        keyboard_buttons.push([button_template]);
    }

    if (craftsman_info.items_list.length > 0) {
        keyboard_buttons[0].push(craftsman_view.keyboard_buttons.show_items_list);
    }


    response.toEdit.new_text = list_view_message_text(craftables_array, craftsman_info, [], query_data[0], search_results);
    response.toEdit.options.reply_markup.inline_keyboard = keyboard_buttons;

}


// Funzione che gestisce l'input in risposta a messaggi di tipo mostra-lista (modifica le quantità)
async function list_quantity_input(response, player_info, craftsman_info, input_data) {
    const list_items_names = craftsman_info.items_list.map((item) => {
        let item_info = craftsman_logics.item_infos(item.id);
        return { id: item.id, name: item_info.name, rarity: item_info.rarity, quantity: item.quantity }
    });
    const lines = input_data.trim().split('\n');
    const first_line_no_operator = lines[0].toLowerCase().replace(/x|\+|\-/g, '').trim()
    const result = [];
    const skipped = [];
    let new_items_list = [];

    // Il comando di solo quantità ed (eventualmente) operatore è verso ogni item
    if (lines.length == 1 && first_line_no_operator.split(" ").length <= 1 && !isNaN(parseInt(first_line_no_operator))) {
        let global_operator = lines[0].match(/x|\+|\-/) ? lines[0].match(/x|\+|\-/)[0] : " ";
        let global_quantity = parseInt(first_line_no_operator);

        list_items_names.forEach(item => {
            result.push({ id: item.id, name: item.name, list_quantity: item.quantity, new_quantity: global_quantity, operator: global_operator });
        });
    } else { // Cerco di interpretare il comando

        lines.forEach(line => {
            let curr_quantity, curr_operator, curr_item;
            let parts = line.trim().split(" ");
            let operatorIndex = parts.findIndex(part => part.includes('x') || part.includes('+') || part.includes('-'));
            // const operatorIndex = parts.findIndex(part => /x|\+|\-/.test(part));


            if (operatorIndex !== -1) { // Cerco l'operatore
                curr_operator = parts[operatorIndex].match(/x|\+|\-/)[0];
                if (!isNaN(parseInt(parts[operatorIndex].replace(/x|\+|\-/g, '')))) {                     // controllo se la quantità è attaccata all'operatore
                    curr_quantity = parseInt(parts[operatorIndex].replace(/x|\+|\-/g, ''));
                }
                if (isNaN(curr_quantity)) {                                                               // controllo anche prima e dopo operatorIndex
                    if (operatorIndex < parts.length - 1 && !isNaN(parts[operatorIndex + 1])) {
                        curr_quantity = parseInt(parts[operatorIndex + 1]);
                        parts.splice(operatorIndex + 1, 1); // Rimuovo la quantità dall'array
                    } else if (operatorIndex > 0 && !isNaN(parts[operatorIndex - 1])) {
                        curr_quantity = parseInt(parts[operatorIndex - 1]);
                        parts.splice(operatorIndex - 1, 1); // Rimuovo la quantità dall'array
                        operatorIndex--;
                    }
                }

                parts.splice(operatorIndex, 1); // Rimuovo l'operatore dall'array

            }

            if (isNaN(curr_quantity)) { // Cerco la quantità in tutta la linea
                const quantityIndex = parts.findIndex(part => !isNaN(parseInt(part.replace(/x|\+|\-/g, ''))));
                if (quantityIndex !== -1) {
                    curr_quantity = parseInt(parts[quantityIndex].replace(/x|\+|\-/g, ''));
                    parts.splice(quantityIndex, 1); // Rimuovo la quantità dall'array
                } else {
                    curr_quantity = 1;
                }
            }

            const matchingItems = list_items_names.filter(item => item.name.toLowerCase().includes(parts.join(' ').toLowerCase().trim()));

            if (matchingItems.length > 0) {
                matchingItems.forEach(curr_item => {
                    result.push({
                        id: curr_item.id,
                        name: curr_item.name,
                        list_quantity: curr_item.quantity,
                        new_quantity: curr_quantity,
                        operator: curr_operator || ' '
                    });
                });
            } else {
                skipped.push({ id: -1, name: parts.join(' ').trim(), list_quantity: 0, new_quantity: curr_quantity, operator: curr_operator || ' ' });                                   // Aggiorno la lista degli scarti
            }
            
        });
    }

    // Posso fare qualche cosa sulla lista
    if (result.length > 0) {
        list_items_names.forEach(old_item => {
            const indexToUpdate = result.findIndex(item => old_item.id === item.id);
            if (indexToUpdate !== -1) {
                const new_item = result[indexToUpdate];
                // Aggiorna la quantità dell'elemento in base all'operatore specificato in newList
                switch (new_item.operator) {
                    case '+':
                        old_item.quantity += new_item.new_quantity;
                        break;
                    case '-':
                        old_item.quantity -= new_item.new_quantity;
                        break;
                    case 'x':
                        old_item.quantity *= new_item.new_quantity;
                        break;
                    default:
                        old_item.quantity = new_item.new_quantity;
                        break;
                }
                // Se la quantità risultante è inferiore a 0, impostiamola a 0. Non serve a nulla ma...
                if (old_item.quantity < 0) {
                    old_item.quantity = 0;
                }
            }

            // Aggiorna l'elemento nell'array new_items_list
            if (old_item.quantity > 0) {
                new_items_list.push({ id: old_item.id, quantity: old_item.quantity });
            }

        });


        // Aggiorno la persistenza
        craftsman_info.items_list = [...new_items_list];
        await craftsman_logics.update_craftsman_info(player_info.account_id, craftsman_info);
        show_list_messageAndButtons(response, player_info, craftsman_info);
    } else { // comando completamente invalido, informo l'utente con una guida
        show_list_messageAndButtons(response, player_info, craftsman_info);
        response.toEdit.options.reply_markup.inline_keyboard[0][response.toEdit.options.reply_markup.inline_keyboard[0].length - 1] = craftsman_view.keyboard_buttons.show_items_list;
        response.toEdit.new_text = `*${craftsman_view.list.title}* ${craftsman_view.list.list_moji}\n${craftsman_view.edit_quantity.guide}`

    }

    return;

}


function list_download(response, player_info, craftsman_info) {
    let caption_text = "";
    let print_text = `${craftsman_view.list.title} ${craftsman_view.list.list_moji}\n\n`;

    caption_text += `${craftsman_view.list.list_length} (${craftsman_info.items_list.length})\n`; // list_total_quantity
    caption_text += `${craftsman_view.list.list_total_quantity} (${craftsman_info.items_list.reduce(((total_quantity, item) => (total_quantity + item.quantity)), 0)})\n`; // list_total_quantity

    let items_list_whith_infos = craftsman_logics.item_infos_forList(craftsman_info.items_list);
    items_list_whith_infos.forEach((item_info) => {
        print_text += `> ${item_info.quantity}x ${item_info.name} (${item_info.rarity})`;
        if (player_info.reborn < item_info.reborn) {
            print_text += `${craftsman_view.validate.unable.unable_moji}`
        }
        print_text += "\n";
    })
    print_text += "\n";


    response.sendObject = bot_response.responses.sendObject(player_info.account_id, `${craftsman_view.list_print.current_list_file_name}`, print_text, caption_text);
    delete response.sendObject.message.reply_markup.keyboard;
    response.sendObject.message.reply_markup.inline_keyboard = [];
    response.sendObject.message.reply_markup.inline_keyboard.push([craftsman_view.keyboard_buttons.delete_message]);
}



// ******************************************  VALIDATE (messaggio "Commissione")

// Smistatore di callback
async function validate_view_dispatch(response, telegram_user_id, message_id, query_data) {
    let query_controll = await query_preload(response, telegram_user_id, message_id);
    if (query_controll.esit == true) {
        let player_info = query_controll.player_info;
        let craftsman_info = query_controll.craftsman_info;
        let sub_structure = utils.query_structure.query_tree.master_craftsman.validate;
        response.query.options.text = craftsman_view.validate.give_list;


        // Primo controllo: gli id in items_list devono essere tra i creabili a disposizione dell'utente
        let unavaible_craftables = craftsman_logics.validate_items_list_forReborn(craftsman_info.items_list, player_info.reborn);
        let fail_controll = unavaible_craftables.length > 0                                                      // se vero il controllo fallisce
        if (fail_controll) {
            return await validate_view_fail(response, craftsman_info, player_info, unavaible_craftables);
        }

        //... qui possono essere inseriti altri controlli

        if (query_data.length > 0) {
            if (query_data[0] == sub_structure.show_used.stmp) {
                validate_used_items_view(response, player_info, craftsman_info, message_id)
            } else if (query_data[0] == sub_structure.print_manual_craft_line.stmp) {
                await print_manual_craft_view(response, player_info, craftsman_info, message_id)
            } else if (query_data[0] == sub_structure.craft_line_commit.stmp) {
                await commit_view(response, player_info, craftsman_info, message_id)
            }
        } else {
            let player_inventory_controll = await pleyer_inventory_controll(response, player_info, message_id);
            if (!player_inventory_controll) {
                return;
            }
            let player_inventory = [...response.player_inventory];
            delete response.player_inventory;

            let craft_line = await craft_line_controll(response, player_info, craftsman_info, player_inventory);
            if (craft_line) { // response è già stato gestito da craft_line_controll
                await validate_view(response, player_info, craftsman_info, craft_line, message_id); // Asincrona perche aggiorna craftsman_info
            }
        }
    }
}

// La vista di "validazione" (dove si mostrano usati ed eventuali mancanti e si propone, eventualmente, la commissione.)
async function validate_view(response, player_info, craftsman_info, craft_line, message_id) {
    let message_text = "";

    let can_proceed_controll = craftsman_logics.validate_can_proceed(craft_line, player_info);     // Questo controllo sarà applicato solo alla fine, per permettere comunque di vedere mancanti e/o usati
    let to_craft_total_quantity = craftsman_logics.list_total_quantity(craftsman_info.items_list);

    // Sulla lista
    message_text += `_${craftsman_view.validate.introduction}_\n`;
    message_text += "\n«";
    message_text += `${craft_line.loops <= 3 ? craftsman_view.validate.loops.just_one :
        craft_line.loops < 50 ? craftsman_view.validate.loops.a_fiew :
            craft_line.loops < 150 ? craftsman_view.validate.loops.not_much :
                craftsman_view.validate.loops.a_lot
        }`
    if (to_craft_total_quantity > 20) {
        message_text += `\n${to_craft_total_quantity} ${craftsman_view.validate.quote_on_items_quantity}`
    }
    message_text += "»\n\n";

    // Sullo zaino
    message_text += `_${craftsman_view.validate.inventory_lookup}_\n`;
    message_text += "\n«";

    // Oggetti mancanti
    if (craft_line.missing_baseItems.length > 0) {
        let fixed_missing_max_quantity = 8;

        message_text += `${craft_line.missing_baseItems.length < 5 ? craftsman_view.validate.inventory_is_missing.a_fiew :
            craft_line.missing_baseItems.length < fixed_missing_max_quantity ? craftsman_view.validate.inventory_is_missing.not_much :
                craftsman_view.validate.inventory_is_missing.a_lot
            }`;
        message_text += "»\n\n";

        // Stampo la lista
        if (craft_line.missing_baseItems.length < fixed_missing_max_quantity) {
            craft_line.missing_baseItems.forEach((item) => {
                message_text += `> ${item.total_quantity}x ${item.name} (${item.rarity})\n`
            })
            //view_keyboard[0].push(craftsman_view.keyboard_buttons.show_craft_missing);
        } else {
            response.sendObject = validate_reportfile(craft_line, craftsman_info, player_info.account_id);
        }
        message_text += "\n";

        // Aggiungo il bottone "Mancanti"
    } else if (!can_proceed_controll) {
        let phrases_random_index = Math.floor(Math.random() * craftsman_view.validate.inventory_no_money.length);
        message_text += `${craftsman_view.validate.inventory_no_money[phrases_random_index]}`;
        message_text += "»\n\n";
    } else {
        let phrases_random_index = Math.floor(Math.random() * craftsman_view.validate.inventory_no_missing.length);
        message_text += `${craftsman_view.validate.inventory_no_missing[phrases_random_index]}`;
        message_text += "»\n\n";

    }

    // Oggetti consumati
    // Aggiungo il bottone "Consumati"

    // Spesa e Guadagno PC
    if (!can_proceed_controll) {
        message_text += `• ${craftsman_view.validate.too_expensive_craft_cost}: ${utils.simple_number_formatter(craft_line.craft_cost)}§\n`;
        message_text += `• ${craftsman_view.validate.too_expensive_craft_pc}: ${craft_line.craft_point}pc\n`;
    } else {


        // Commissione
        message_text += `«${view_utils.ita_gender_impl_singular_all(craftsman_view.validate.craft_commission.introduction, player_info.gender)} `;
        message_text += `${utils.simple_number_formatter(craft_line.craft_cost)} `;
        message_text += `${craftsman_view.validate.craft_commission.commission}`;
        let phrases_random_index = Math.floor(Math.random() * craftsman_view.validate.craft_commission.commission_excuses.length);
        message_text += `${craftsman_view.validate.craft_commission.commission_excuses[phrases_random_index]}`;
        message_text += `${craftsman_view.validate.craft_commission.commission_end}`;
        message_text += `${utils.simple_number_formatter((craft_line.craft_cost * utils.master_craftsman_cost_multiplier - craft_line.craft_cost))}§»\n\n`;



        message_text += `• ${craftsman_view.validate.craft_pc}: ${utils.simple_number_formatter(craft_line.craft_point)}pc\n`;
        message_text += `• ${craftsman_view.validate.craft_total_cost}: ${utils.simple_number_formatter(craft_line.craft_cost * utils.master_craftsman_cost_multiplier)}§\n`;


        // aggiorno il controll di craftsman_info
        craftsman_logics.craftman_info_craftUpdate(craftsman_info, craft_line, message_id);

        // Aggiungo il bottone "Commit"
    }

    // Aggiorno la cache in craftsman_info
    await craftsman_logics.update_craftsman_info(player_info.account_id, craftsman_info);

    response.toEdit.new_text = message_text;
    response.toEdit.options.reply_markup.inline_keyboard = validate_view_keyboard(can_proceed_controll);
}

// La tastiera della vista validate
function validate_view_keyboard(can_proceed_controll) {
    let view_keyboard = [];
    view_keyboard.push([craftsman_view.keyboard_buttons.back_to_menu]);
    view_keyboard.push([craftsman_view.keyboard_buttons.show_craft_used]); // Bottone usati
    view_keyboard.push([craftsman_view.keyboard_buttons.print_manual_craft_line]); // Bottone craft manuale

    if (can_proceed_controll) {
        view_keyboard.push([craftsman_view.keyboard_buttons.commit_craft]);
    }
    return view_keyboard;
}

// la lista viene stralciata e l'utente notificato (show_allert = true) -> quindi menu_textAndButtons (avviene se fallise un controllo...)
async function validate_view_fail(response, craftsman_info, player_info, unavaible_craftables, message_id) {
    let item_info = craftsman_logics.item_infos(unavaible_craftables[0].id);
    response.query.options.show_alert = true;
    response.query.options.text = `${craftsman_view.validate.unable.first_line}\n\n`;
    response.query.options.text += `«${item_info.name}??\n${craftsman_view.validate.unable.quote}»\n\n`;
    response.query.options.text += `${craftsman_view.validate.unable.conclusion}`;

    craftsman_logics.clear_craftsman_info(craftsman_info);
    await craftsman_logics.update_craftsman_info(player_info.account_id, craftsman_info);

    await menu_textAndButtons(response, player_info, craftsman_info, true, true);
}

// Risponde al bottone "Craft manuale" (stampa un file.txt)
async function print_manual_craft_view(response, player_info, craftsman_info) {
    let craft_max_quantities = (await craftsman_logics.player_craft_abilities(player_info.id)).craft_max_quantities   // 3 o + (in base al talento)
    const manual_list = craftsman_info.controll.manual_craft ? craftsman_info.controll.manual_craft : craftsman_info.manual_craft;
    let print_list = manual_craft_print_list(manual_list, craft_max_quantities)
    let caption_text = `• ${craftsman_view.list_print.manual_line_short} ${print_list.craft_needed}\n`;
    let print_text = `${craftsman_view.list.title} ${craftsman_view.list.list_moji}\n\n`;


    //Obbiettivo
    print_text += `\n${craftsman_view.list_print.line.repeat(50)}\n\n`;
    print_text += `${craftsman_view.list_print.target_items} (${craftsman_info.items_list.length})\n`;
    print_text += validate_print_list(craftsman_logics.item_infos_forList(craftsman_info.items_list))
    caption_text += `${craftsman_view.list_print.target_items}: ${craftsman_info.items_list.length}\n`;

    //Mancanti
    if (craftsman_info.controll.missing_baseItems.length > 0) {
        print_text += `${craftsman_view.list_print.missing} (${craftsman_info.controll.missing_baseItems.length})\n`;
        print_text += validate_print_list(craftsman_info.controll.missing_baseItems);
        caption_text += `${craftsman_view.list_print.missing}: ${craftsman_info.controll.missing_baseItems.length}\n`;
    }

    print_text += `${craftsman_view.list_print.manual_line} (${print_list.craft_needed})\n`;
    print_text += `\n${craftsman_view.list_print.line.repeat(50)}\n\n`; // manual_line 
    print_text += `${print_list.manual_craft_text}`;


    let phrases_random_index = Math.floor(Math.random() * craftsman_view.manual_craft.quick_evade.length);
    response.query.options.show_alert = true;
    response.query.options.text = `${craftsman_view.manual_craft.quick_evade[phrases_random_index]}\n\n`;

    response.sendObject = bot_response.responses.sendObject(player_info.account_id, `${craftsman_view.list_print.current_list_file_name}`, print_text, caption_text);
    delete response.sendObject.message.reply_markup.keyboard;
    response.sendObject.message.reply_markup.inline_keyboard = [];
    response.sendObject.message.reply_markup.inline_keyboard.push([craftsman_view.keyboard_buttons.delete_message]);
}

// Accessoria di print_manual_craft_view
function manual_craft_print_list(manual_list, craft_max_quantities) {
    let manual_craft_parse = {
        craft_needed: 0,
        manual_craft_text: ""
    }
    manual_list.forEach(raw_item => {
        let item = craftsman_logics.item_infos(raw_item.id);
        let line_quantity = Math.min(parseInt(raw_item.quantity), craft_max_quantities);
        let over_quantity_text = raw_item.quantity > craft_max_quantities ? `(x${Math.floor(raw_item.quantity / craft_max_quantities)}, ${raw_item.quantity})` : ``

        manual_craft_parse.craft_needed += raw_item.quantity <= craft_max_quantities ? 1 : Math.floor(raw_item.quantity / craft_max_quantities) + Math.floor(raw_item.quantity % craft_max_quantities)
        manual_craft_parse.manual_craft_text += `${craftsman_view.list_print.manual_line_index}${item.name}, ${line_quantity} ${over_quantity_text}\n`;
    })

    return manual_craft_parse;

}

// Risponde al bottone  "Consumati"
function validate_used_items_view(response, player_info, craftsman_info, message_id) {
    let fixed_max_used_items = 10;
    let used_base = craftsman_info.controll.used_items.base;
    let used_crafted = craftsman_info.controll.used_items.crafted;

    let used_sum = used_base.length + used_crafted.length;

    if (used_sum < fixed_max_used_items) { // Pochi oggetti, stampo la lista nel messaggio
        let message_text = `«${craftsman_view.validate.show_used.not_much}»\n\n`;

        // BASE
        if (used_base.length == 0) {
            message_text += `«${craftsman_view.validate.show_used.base.none} `
        } else if (used_base.length == 1) {
            message_text += `«${craftsman_view.validate.show_used.base.just_one}»\n`
            let item = used_base[0];
            message_text += `> ${item.total_quantity}x ${item.name} (${item.rarity})\n`
        } else {
            message_text += `«${used_base.length} ${craftsman_view.validate.show_used.base.default}»\n`;
            used_base.forEach((item) => {
                message_text += `> ${item.total_quantity}x ${item.name} (${item.rarity})\n`
            })
        }

        if (used_base.length > 0) {
            message_text += `\n«…E `;
            if (used_crafted.length > 0) {
                message_text += `anche `;
            }
        } else {
            message_text += `e `
        }


        // CREATI
        if (used_crafted.length == 0) {
            message_text += `${craftsman_view.validate.show_used.crafted.none}»\n`
        } else if (used_crafted.length == 1) {
            message_text += `${craftsman_view.validate.show_used.crafted.just_one}»\n`
            let item = used_crafted[0];
            message_text += `> ${item.total_quantity}x ${item.name} (${item.rarity})\n`
        } else {
            message_text += `${used_crafted.length} ${craftsman_view.validate.show_used.crafted.default}»\n`;
            used_crafted.forEach((item) => {
                message_text += `> ${item.total_quantity}x ${item.name} (${item.rarity})\n`
            })
        }


        response.toEdit.new_text = message_text;
        let button = {... craftsman_view.keyboard_buttons.validate_list}
        button.text = craftsman_view.keyboard_buttons.back_to_menu.text;
        response.toEdit.options.reply_markup.inline_keyboard = [[  button   ]];
        response.query.options.text = `«${craftsman_view.validate.show_used.quote}»`;
    } else {
        response.query.options.show_alert = true;
        response.query.options.text = `«${craftsman_view.validate.show_used.quote}»`;
        response.sendObject = validate_reportfile(craftsman_info.controll, craftsman_info, player_info.account_id);
    }
}

// La validate_used_items_view, ma stampata su un file.txt
function validate_reportfile(craft_line, craftsman_info, telegram_user_id) {
    let caption_text = "";
    let print_text = "";

    //Obbiettivo
    print_text += `\n${craftsman_view.list_print.line.repeat(50)}\n\n`;
    print_text += `${craftsman_view.list_print.target_items} (${craftsman_info.items_list.length})\n`;
    print_text += validate_print_list(craftsman_logics.item_infos_forList(craftsman_info.items_list))
    caption_text += `${craftsman_view.list_print.target_items} (${craftsman_info.items_list.length})\n`;

    //Mancanti
    if (craft_line.missing_baseItems.length > 0) {
        print_text += `${craftsman_view.list_print.missing} (${craft_line.missing_baseItems.length})\n`;
        print_text += validate_print_list(craft_line.missing_baseItems);
        caption_text += `${craftsman_view.list_print.missing} (${craft_line.missing_baseItems.length})\n`;
    }

    caption_text += `+${craftsman_view.list_print.used_items} (${craft_line.used_items.base.length + craft_line.used_items.crafted.length})\n`;

    //Consumati base
    if (craft_line.used_items.base.length > 0) {
        print_text += `${craftsman_view.list_print.base}\n`;
        print_text += `${craftsman_view.list_print.used_items} (${craft_line.used_items.base.length})\n`;
        print_text += validate_print_list(craft_line.used_items.base);
    }

    //Consumati creati
    if (craft_line.used_items.crafted.length > 0) {
        print_text += `${craftsman_view.list_print.crafted}\n`;
        print_text += `${craftsman_view.list_print.used_items} (${craft_line.used_items.crafted.length})\n`;
        print_text += validate_print_list(craft_line.used_items.crafted);
    }

    let response = bot_response.responses.sendObject(telegram_user_id, `${craftsman_view.list_print.file_name}`, print_text, caption_text);
    delete response.message.reply_markup.keyboard;
    response.message.reply_markup.inline_keyboard = [];
    response.message.reply_markup.inline_keyboard.push([craftsman_view.keyboard_buttons.delete_message]);
    return response;
}

// Accessoria di validate_reportfile
function validate_print_list(items_list) {
    let print_text = "";
    craftsman_logics.sort_items_fromRarity(items_list);

    print_text += `\n${craftsman_view.list_print.line.repeat(50)}\n\n`;
    let rarity_title = items_list[0].rarity;
    print_text += `${craftsman_view.list_print.list_tab}${rarity_title}\n`;
    for (let i = 0; i < items_list.length; i++) {
        let quantity = items_list[i].total_quantity ? items_list[i].total_quantity : items_list[i].quantity
        print_text += `${craftsman_view.list_print.list_tab}\t${quantity}x ${items_list[i].name} (${items_list[i].rarity})\n`;
        if (i + 1 < items_list.length && rarity_title != items_list[i + 1].rarity) {
            rarity_title = items_list[i + 1].rarity;
            print_text += `\n${craftsman_view.list_print.list_tab}${rarity_title}\n`;
        }
    };
    print_text += `\n${craftsman_view.list_print.line.repeat(50)}\n\n`;
    return print_text;
}

// ******************************************  COMMIT (messaggio all'avvenuta consegna della lista)    

// La vista
async function commit_view(response, player_info, craftsman_info, message_id) {
    let commit_esit = await craftsman_logics.commit_craft(craftsman_info, player_info);

    if (!commit_esit.money_controll) {
        response.query.options.show_alert = true;
        response.query.options.text = `«${craftsman_view.commit.money_controll}»`;
        if (in_beta) {
            response.sendObject = validate_reportfile(craftsman_info.controll, craftsman_info, player_info.account_id);
        }
    } else if (!commit_esit.load_controll) {
        response.query.options.show_alert = true;
        response.query.options.text = `«${craftsman_view.commit.load_controll}»`;
        if (in_beta) {
            response.sendObject = validate_reportfile(craftsman_info.controll, craftsman_info, player_info.account_id);
        }
    } else if (!commit_esit.used_items_controll) {
        response.query.options.show_alert = true;
        response.query.options.text = `«${craftsman_view.commit.used_items_controll}»`;
        if (in_beta) {
            response.sendObject = validate_reportfile(craftsman_info.controll, craftsman_info, player_info.account_id);
        }
    } else if (!commit_esit.target_items_controll) {
        response.query.options.show_alert = true;
        response.query.options.text = `«${craftsman_view.commit.target_items_controll}»`;
        if (in_beta) {
            response.sendObject = validate_reportfile(craftsman_info.controll, craftsman_info, player_info.account_id);
        }
    } else {
        response.query.options.text = `«commissione accettata!»`;

        let bizzarre_fixed = Math.min((parseInt(craftsman_info.controll.loops) < 20 ? 2 : parseInt(craftsman_info.controll.loops) % 10), craftsman_view.commit.bizzarre_events.length / 2);
        let message_text = `${craftsman_view.commit.text}\n`
        let bizzarre_event_number = Math.floor(Math.random() * bizzarre_fixed) + bizzarre_fixed;
        craftsman_view.commit.bizzarre_events.sort(() => Math.random() - 0.5); // così, sull'oggetto!
        let first_bizzarre = Math.floor(Math.random() * (craftsman_view.commit.bizzarre_events.length - bizzarre_event_number + 1));
        let bizzarre_events = craftsman_view.commit.bizzarre_events.slice(first_bizzarre, first_bizzarre + bizzarre_event_number);

        bizzarre_events.forEach((b_event) => {
            message_text += `_${b_event}_\n`;
        })

        message_text += `${craftsman_view.commit.ending_text}\n`;

        response.sendObject = commit_report(player_info.account_id, commit_esit.craft_report)
        response.toEdit.new_text = message_text;
        response.toEdit.options.reply_markup.keyboard = [];
        response.query.options.text = `«${craftsman_view.validate.show_used.quote}»`;

        craftsman_logics.clear_craftsman_info(craftsman_info);
        await craftsman_logics.update_craftsman_info(player_info.account_id, craftsman_info);
    }

}

// Il report finale (un file.txt)
function commit_report(telegram_user_id, craft_report) {
    // ad oggi tutto questo casino che faccio qui è inutile, perche sembra il txt non supporti il padding... :(

    let view_keyboard = [[view_utils.menu_strings.square.master_craftsman, view_utils.menu_strings.square.main], [view_utils.menu_strings.back_to_menu]];
    let report_text = "";
    let caption_text = `${craftsman_view.list_print.all_used_items}: ${craft_report.used_items.length}`;

    let to_format_used_items = craft_report.used_items.map((raw_item) => {
        let item_info = craftsman_logics.item_infos(raw_item.item_id);
        return {
            name: item_info.name,
            rarity: item_info.rarity,
            new_quantity: raw_item.new_quantity,
            after_craft_quantity: raw_item.after_craft_quantity
        }
    })
    craftsman_logics.sort_items_fromRarity(craft_report.used_items);


    let to_format_crafted_items = craft_report.crafted_items.map((raw_item) => {
        let item_info = craftsman_logics.item_infos(raw_item.item_id);
        return {
            name: item_info.name,
            rarity: item_info.rarity,
            new_quantity: raw_item.new_quantity,
            after_craft_quantity: raw_item.after_craft_quantity
        }
    })
    craftsman_logics.sort_items_fromRarity(craft_report.crafted_items);


    // tiene traccia della larghezza massima per ogni colonna
    const columnWidths = {
        name: 0,
        rarity: 0,
        new_quantity: 0,
        after_craft_quantity: 0
    };

    const mergedArray = to_format_used_items.concat(to_format_crafted_items);
    mergedArray.forEach(item => {
        columnWidths.name = Math.max(columnWidths.name, item.name.length);
        columnWidths.rarity = Math.max(columnWidths.rarity, item.rarity.length + 2);
        columnWidths.new_quantity = Math.max(columnWidths.new_quantity, item.new_quantity.toString().length);
        columnWidths.after_craft_quantity = Math.max(columnWidths.after_craft_quantity, item.after_craft_quantity.toString().length + 4);
    });


    const formatted_used_items = to_format_used_items.map(item => {
        const formattedName = `${item.name} (${item.rarity}): `.padEnd(columnWidths.name + columnWidths.rarity + 4);
        const formattedQuantity = item.new_quantity.toString().padStart(columnWidths.new_quantity);
        const formattedAfterCraftQuantity = `(-${item.after_craft_quantity.toString()})`.padStart(columnWidths.after_craft_quantity);
        return `${formattedName} ${formattedQuantity}  ${formattedAfterCraftQuantity}`;
    }).join("\n");


    const formatted_crafted_items = to_format_crafted_items.map(item => {
        const formattedName = `${item.name} (${item.rarity}): `.padEnd(columnWidths.name + columnWidths.rarity + 4);
        const formattedQuantity = item.new_quantity.toString().padStart(columnWidths.new_quantity);
        const formattedAfterCraftQuantity = `(+${item.after_craft_quantity.toString()})`.padStart(columnWidths.after_craft_quantity);
        return `${formattedName} ${formattedQuantity}  ${formattedAfterCraftQuantity}`;
    }).join("\n");

    const separator = Object.values(columnWidths)
        .map(width => craftsman_view.list_print.line.repeat(width))
        .join(craftsman_view.list_print.line.repeat(4));

    const formattedOutput = [
        craftsman_view.commit.report_title,
        separator,
        `${craftsman_view.list_print.craft_cost}: ${utils.simple_number_formatter(craft_report.craft_cost * utils.master_craftsman_cost_multiplier)}`,
        `${craftsman_view.list_print.craft_commission}: ${utils.simple_number_formatter((craft_report.craft_cost * utils.master_craftsman_cost_multiplier) - craft_report.craft_cost)}`,

        `${craftsman_view.list_print.craft_gained_pc}: ${craft_report.craft_gained_pc}`,
        separator,
        ``, ``,
        separator,
        craftsman_view.list_print.all_used_items,
        separator,
        formatted_used_items,
        separator,
        ``,
        craftsman_view.list_print.crafted,
        separator,
        formatted_crafted_items,
        separator,
    ];

    report_text += formattedOutput.join("\n");

    return bot_response.responses.sendObject(telegram_user_id, `${craftsman_view.commit.file_name}`, report_text, caption_text, view_keyboard);

}


// *******************************************  CONTROLLI E PRELOAD


// Il menu controll, ma per una callback_query
async function query_preload(response, telegram_user_id, message_id) {
    let menu_controll = await menu_controlls(telegram_user_id, message_id);
    if (menu_controll.preload_response) {
        response.query.options.text = menu_controll.preload_response.query_text;
        response.query.options.show_alert = true;
        return { esit: false };
    } else {
        let player_info = menu_controll.player_info;
        let craftsman_info = menu_controll.craftsman_info;
        delete menu_controll.player_info;
        delete menu_controll.craftsman_info;
        //response.query.options.text = craftsman_view.title;
        response.toEdit = bot_response.responses.toEdit();
        response.toEdit.options.chat_id = telegram_user_id;
        response.toEdit.options.message_id = message_id;
        return {
            esit: true,
            player_info: player_info,
            craftsman_info: craftsman_info
        }
    }
}

// In questa funzione si possono ospitare tutti i controlli da fare sull'utente (ed eventualmente gestire limiti o errori con preload_response)
async function menu_controlls(telegram_user_id, message_id = false) {
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

    if (!(await pleyer_info_controll(response, telegram_user_id, message_id))) {
        return response
    }

    // Carico le craftsman_info in response (e se non riesco informo l'utente)
    if (!(await craftsman_info_controll(response, telegram_user_id, message_id))) {
        return response
    }

    // response è inizializzato con preload_response per comodità, ma arrivati fin qui deve essere rimosso 
    delete response.preload_response;

    // (response contiene ora pleyer_info e craftsman_info)
    return response;
}

// Controllo betatester
function beta_tester_controll(response, telegram_user_id, message_id = false) {
    if (in_beta && !beta_tester_ids.includes(telegram_user_id)) {
        response.preload_response.toSend.message_text = `_${craftsman_view.menu.introduction}_\n`;
        response.preload_response.toSend.message_text += `_${craftsman_view.menu.not_allowed}_\n\n`;
        response.preload_response.toSend.message_text += `> ${craftsman_view.beta_tester.user_message}\n\n`;
        if (message_id != false) {
            response.preload_response.query_text = `${craftsman_view.beta_tester.query_user_not_listed}`
        }

        return false;
    }

    return true;
}

//Carico playerinfo
async function pleyer_info_controll(response, telegram_user_id, message_id) {
    let player_info_controll = await craftsman_logics.pleyer_info_controll(telegram_user_id)
    if (player_info_controll.esit == false) {
        response.preload_response.message_text = player_info_controll.error_text;
        if (message_id != false) {
            response.preload_response.query_text = `${player_info_controll.error_text}`
        }
        return false;
    }

    response.player_info = player_info_controll.results;
    return true;
}

//Carico player_inventory
async function pleyer_inventory_controll(response, player_info, message_id) {
    let player_inventory_controll = await craftsman_logics.pleyer_inventory_controll(player_info.id);
    if (player_inventory_controll.esit == false) {
        response.preload_response.message_text = player_inventory_controll.error_text;
        if (message_id != false) {
            response.preload_response.query_text = `${player_inventory_controll.error_text}`
        }
        return false;
    }

    response.player_inventory = player_inventory_controll.player_inventory;
    return true;
}

// carico craftsan_info
async function craftsman_info_controll(response, telegram_user_id, message_id) {
    let craftsman_info_controll = await craftsman_logics.get_craftsman_info(telegram_user_id);
    if (craftsman_info_controll == false) {
        response.preload_response.message_text = craftsman_info_controll.error_text;
        if (message_id != false) {
            response.preload_response.query_text = `${craftsman_info_controll.error_text}`
        }
        return false
    }
    response.craftsman_info = craftsman_info_controll.craftsman_info;
    return true;
}


async function craft_line_controll(response, player_info, craftsman_info, player_inventory) {
    let craft_controll = await craftsman_logics.craft_line_controll(player_info, craftsman_info, player_inventory);
    if (craft_controll.has_error) { // La linea craft non è stata generata correttamente...
        response.toEdit.new_text += `_${craftsman_logics.craf_line_error(craftsman_info.items_list, player_info.account_id)}_\n`;
        return false;
    } else if (craft_controll.is_incompleate) {
        response.toEdit.new_text += `_${craftsman_view.validate.introduction}_\n\n`;
        response.toEdit.new_text += `«${craftsman_view.validate.unable.too_much}»\n\n`;
        response.toEdit.new_text += `_${craftsman_view.validate.unable.too_much_conclusion}_\n`;
        response.toEdit.options.reply_markup.inline_keyboard = [];
        return false;
    } else if (craft_controll.is_too_expensive) {
        return false;
    }

    return craft_controll.craft_line;
}

// **************************************  TESTING ()

// Comando /craftbeta 
// > Inserisce uno o piu telegram_id nell'array temporaneo beta_tester_ids
// > Mostra la lista degli id abilitati (se mandato a vuoto)
// > supporta un elementare sistema di sanificazione dell'imput (l'idea comunque è passargli una lista di utenti separati da spazi)
//      esempio: /craftbeta 354140824 153738969
// (questa funzione non è strutturata perche temporanea…)
// (essendo temporanea, la lista stessa è solamente caricata in ram (e quindi sarà resettata ad ogni riavvio))
async function add_betaTester(message_user_id, message_text) {
    let response = {
        toSend: bot_response.responses.toSend(message_user_id),
    }

    //Questo comando è riservato agli amministratori
    if (!config.isDev(message_user_id))
        return;

    let target_user_id_array = message_text.split(" ").slice(1).join(" ").split("\n").join(" ").trim().split(" ");
    if (target_user_id_array.length === 1 && target_user_id_array[0] === "")
        target_user_id_array = [];

    //target_user_id_array.push(message_user_id)

    // Stampo la lista dei betatester
    if (message_text.split(" ").length == 1 || utils.isNully(target_user_id_array) || target_user_id_array.length < 1) {
        if (beta_tester_ids.length == 0) {
            response.toSend.message_text = `${craftsman_view.beta_tester.empty_list}`;
        } else {
            response.toSend.message_text = `${craftsman_view.beta_tester.show_list}`;
            response.toSend.message_text += `\``;
            beta_tester_ids.forEach((user_id) => {
                response.toSend.message_text += `${user_id}\n`;
            })
            response.toSend.message_text += `\``;
        }
        return response;
    }

    // Scelgo un id casuale da controllare (piu o meno per verificare la bontà della lista. Chi usa il comando è un admin...)
    let random_controll = target_user_id_array.length == 1 ?
        target_user_id_array[0] :
        target_user_id_array[Math.floor(Math.random() * target_user_id_array.length)];

    // Carico le informazioni giocatore player_info (e se non riesco informo l'admin)
    let player_info_controll = await craftsman_logics.pleyer_info_controll(random_controll);
    if (player_info_controll.esit == false) {
        response.toSend.message_text = player_info_controll.error_text;
        return response;
    }

    let player_info = player_info_controll.results;
    // Aggiungo l'id all'array teporaneo
    target_user_id_array.forEach((user_id) => {
        let parsed_id = parseInt(user_id)
        if (isNaN(parsed_id)) {
            response.toSend.message_text = `*${craftsman_view.errors.title}*\n\n${craftsman_view.errors.beta_wrong_input}`;
            return response;
        }
        if (!beta_tester_ids.includes(parsed_id)) {
            beta_tester_ids.push(parsed_id);
        }
    });

    // Testo della risposta
    response.toSend.message_text += `${player_info.nickname} ${craftsman_view.beta_tester.insert_success}\n`;
    if (target_user_id_array.length > 1) {
        response.toSend.message_text += `(e ${target_user_id_array.length - 1} altri…)\n`;
    }

    return response;
}

// :)