const util = require("./utils");

let stats = {
    loops: 0,
    messages: {
        delete: 0,
        recived: 0,
        sent: 0,
        edited: 0,
        file_sent: 0
    },
    callBack: {
        recived: 0,
        answered: 0
    },
    errors: {
        messages: {
            sent: 0,
            delete: 0,
            edited: 0,
            file_sent: 0
        },
        callBack: {
            query: 0
        },
    }
};

async function manage(response, bot_instance) {
    stats.loops++;

    if (!util.isNully(response)) {
        let responses = normalize_response(response);

        await check_query_response(bot_instance, responses);  // rispondo a query come prima cosa, se devo…

        // Rispetto al ciclo for, forEach consente di eseguire in parallelo le funzioni specifiche nell'array responses.
        responses.forEach(async (response) => {
            await switch_response(bot_instance, response);
        })
    }
}


// Accessoria di manage
// normalizza l'array su cui avviene il ciclo
function normalize_response(response) {
    return Array.isArray(response) ? response : [response];
}

// Accessoria di manage. È dove avviene lo switch nel singolo elemento di response
async function switch_response(bot_instance, response) {
    // TO DELETE
    if ("toDelete" in response) {
        await manage_toDelete(bot_instance, response);
    }

    // TO SEND
    if ("toSend" in response) {
        if (response.toSend.message_text.length >= 3500) {                                                  // questo limite di 3500 andrebbe reso astratto
            let message_text_array = chunkSubstr(to_check, 100);                                            // anche questo di 100…
            for (let l = 0; l < message_text_array.length; l++) {
                await manage_toSend(bot_instance, {
                    chat_id: response.toSend.chat_id,
                    message_text: message_text_array[l],
                    options: response.toSend.options
                });
            }
        } else {
            await manage_toSend(bot_instance, response);
        }
    }

    // TO EDIT
    if ("toEdit" in response) {
        await manage_toEdit(bot_instance, response);
    }

    // SEND FILE 
    if ("sendFile" in response) {
        await manage_sendFile(bot_instance, response)
    }

    // SEND OBJECT (come senFile, ma prende un oggetto, lo parsa e lo trasforma in buffer prima di inviarlo...) 
    if ("sendObject" in response) {
        await manage_sendObject(bot_instance, response)
    }
}

// Accessoria di manage (ma potrebbe esserlo solo di toSend?)
// Divide il testo troppo lungo in un array 
function chunkSubstr(str, size) { // il text_msg e una lunghezza *limite*
    let str_array = str.split("\n");
    const numChunks = Math.ceil(str_array.length / size);
    const chunks = new Array(numChunks);
    let str_copy = str_array.slice();

    let tmp_size_counter = 0;
    let counter = 0;
    for (let i = 0; i < str_array.length; i++) {
        tmp_size_counter++;
        if (tmp_size_counter >= size || (tmp_size_counter > size / 2 && (str_copy[i].length == 0 || str_copy[i] == "\n"))) {
            chunks[counter] = str_array.slice(0, tmp_size_counter).join("\n");
            str_array = str_array.slice(tmp_size_counter);
            counter++;
            tmp_size_counter = 0;
        }
    }
    return (chunks); //L'array finale. Ogni elemento contiene il testo_parziale (un messaggio)
}


// Seguono le chiamate ai metodi di bot_instance. Sono in try catch ed aggiornano i contatori in stats

async function check_query_response(bot_instance, responses) {
    const query_result = responses.find((response) => "query" in response);

    let esit = false;

    if (query_result) {
        try {
            esit = await bot_instance.answerCallbackQuery(
                query_result.query.id,
                query_result.query.options
            );
        } catch (err) {
            esit = false;
            stats.errors.callBack.query++;
            console.error(err);
        }
    }

    return esit;
}


async function manage_toDelete(bot_instance, response) {
    let esit;

    try {
        esit = await bot_instance.deleteMessage(
            response.toDelete.chat_id,
            response.toDelete.mess_id
        )
        stats.messages.delete++;
    } catch (err) {
        esit = false;
        stats.errors.messages.delete++;
        console.error(err.response.body);
    }

    return esit;
}

async function manage_toSend(bot_instance, response) {
    let esit;

    try {
        esit = await bot_instance.sendMessage(
            response.toSend.chat_id,
            response.toSend.message_text,
            response.toSend.options
        )
        stats.messages.sent++;
    } catch (err) {
        esit = false;
        stats.errors.messages.sent++;
        console.error(err.response.body);
    }

    return esit;
}

async function manage_toEdit(bot_instance, response) {
    let esit;

    try {
        esit = await bot_instance.editMessageText(
            response.toEdit.new_text,
            response.toEdit.options
        );
        stats.messages.edited++;
    } catch (err) {
        esit = false;
        stats.errors.messages.edited++;
        if (err.error_code && err.error_code != 400){ // messaggio già aggiornato...
            console.error(err.response.body);
        }
    }

    return esit;
}

// Questa non è stata ancora completata ne testata (sendObject è piu comoda…)
async function manage_sendFile(bot_instance, response) {
    let esit;

    try {
        esit = await bot_instance.sendDocument(
            response.sendFile.chat_id,
            response.sendFile.file,
            response.sendFile.message,
            response.sendFile.options
        );
        stats.messages.file_sent++;
    } catch (err) {
        esit = false;
        stats.errors.messages.file_sent++;
        console.error(err.response.body);
    }

    return esit;
}

async function manage_sendObject(bot_instance, response) {
    let esit;


    try {
        const objects_buffer = Buffer.from(response.sendObject.object, 'utf-8');

        esit = await bot_instance.sendDocument(
            response.sendObject.chat_id,
            objects_buffer,
            response.sendObject.message,
            response.sendObject.options
        );
        stats.messages.file_sent++;
    } catch (err) {
        esit = false;
        stats.errors.messages.file_sent++;
        console.error(err);
    }

    return esit;
}

module.exports = {
    manage: manage,
    stats: stats,
    responses: {
        query: () => ({ id: -1, options: { text: "", cache_time: 1, show_alert: false } }),
        toSend: (chat_id = -1) => ({ chat_id: chat_id, message_text: "", options: { parse_mode: "Markdown", disable_web_page_preview: true, reply_markup: { inline_keyboard: [] } } }),
        toEdit: () => ({ new_text: "", options: { chat_id: -1, message_id: -1, parse_mode: "Markdown", disable_web_page_preview: true, reply_markup: { inline_keyboard: [] } } }),
        sendFile: () => ({ chat_id: -1, message: {}, options: {}, file: {} }),
        toDelete: () => ({ chat_id: -1, message_id: -1 }),
        sendObject: (chat_id = -1, filename, object, caption_text = "…", text_keyboard = []) => ({
            chat_id: chat_id,
            object: object,
            message: {
                caption: caption_text,
                parse_mode: "Markdown",
                reply_markup: {
                    keyboard: text_keyboard,
                    resize_keyboard: true,
                    one_time_keyboard: true, 
                }

            },
            options: { filename: filename, contentType: "text/plain" }
        })
    }
}
