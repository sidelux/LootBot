const tips_handler = require('./models/tips_message_model');
const config = tips_handler.config;


const manual_log = config.manual_log; //log orribile
const simple_log = config.simple_log; // log orribile2, meno verbroso


const channel_name = config.LootSuggChannel; // "ArgoTest" //"Suggerimenti_per_LootBot" -> nome del canale per pubblicare. Il bot deve esserne admin. "ArgoTest" per testing;
const avvisi_channel_name = config.LootAvvisiChannel; // "ArgoTest"; // "LootBotAvvisi" -> nome del canale per Avvisi. Il bot deve esserne admin. "ArgoTest" per testing;
const amministratore_suggerimenti = config.creatore_id; // Per funzioni di debug e testing
const amministratore = config.phenix_id;  //telegram id per @fenix45

const mantenimento = false; // analizza solo messaggi e query di creatore_id

const antiflood_time = config.sugg_antifloodTime;
const max_delay = 2 * antiflood_time + 1; //in secondi
const censura = true; // abilita il controllo sul testo usando il file bandit_w.txt (da rivedere!)


const sugg_triggers = {
	cmd: "/suggerimenti",
	tag: "#suggerimento",
	quick: "/suggerimento"
}

const loot_link = "[LootBot](https://telegram.me/lootgamebot/)";
const channel_link_no_parse = "https://t.me/" + channel_name;
const channel_link = "[canale](t.me/" + channel_name + ")";




//___________________________________________________________//
//CALLBACKS MANAGER********************************************
//___________________________________________________________//

function manageCallBack(query) {
	return new Promise(async function (callBack_resolve) {
		if (manual_log) {
			console.log("================\nCallBack\n================");
			console.log("> Orario di inizio gestione:\t" + Date.now() / 1000);
		}
		if (mantenimento && query.from.id != amministratore_suggerimenti)
			return callBack_resolve({ query: { id: query.id, options: { text: "Modulo in manutenzione straordinaria..." } } });

		let date = Date.now() / 1000;
		let user_info = await tips_handler.getUserInfo(query.from.id);
		if (manual_log) { console.log(">\t\tUltima query: " + user_info.lastQDate); }

		if (user_info == -1) {
			return callBack_resolve({ query: { id: query.id, options: { text: "Uups! Il modulo ha qualche problema..." } } });
		}
		let controll = true;
		if (user_info.lastcheck > 0) {
			controll = (date - user_info.lastcheck) > 86400
		}
		if (simple_log) console.log("query da:" + query.from.username + "\nControllo: " + controll);
		try {
			let loot_user = await tips_handler.getLootUser(query.from.username, (query.from.id == amministratore ? false : controll), query.from.id);
			if (loot_user == null) {
				return callBack_resolve({
					toSend: invalidMessage(query.from.id, "Il server di Loot non è raggiungibile, se il problema persiste contatta pure @nrc382"),
					query: { id: query.id, options: { text: "Whoops!" } }
				});
			}

			let player_check = playerCheck(query, loot_user);
			if (player_check.resolve) {
				return callBack_resolve(player_check.resolve);
			}

			if ((user_info.id == amministratore || user_info.id == amministratore_suggerimenti) || (date - user_info.lastQDate) > antiflood_time) {
				try {
					let updateQuery = await tips_handler.currQueryOf(user_info.id, date);
					if (manual_log) { console.log("> Query Accettata!"); }
					if (updateQuery > 0) {
						let queryMenager;
						switch (query.data.split(":")[1]) {
							case "MENU": {
								queryMenager = manageMenu(query, user_info);
								break;
							}
							case "AVVISO_PUB": {
								queryMenager = manageAvvisoPublish(query, user_info, query.data.split(":")[2]);
								break;
							}
							case "PUBLISH": {
								queryMenager = managePublish(query, user_info);
								break;
							}
							case "UPVOTE": {
								queryMenager = manageVote(query, user_info, 1);
								break;
							}
							case "DOWNVOTE": {
								queryMenager = manageVote(query, user_info, -1);
								break;
							}
							case "DELETE": {
								if (query.data.split(":")[2] == "ANDLIMIT")
									queryMenager = manageDelete(query, user_info, -1, false);
								else
									queryMenager = manageDelete(query, user_info, 0, false);
								break;
							}
							case "AIDBUTTON": {
								queryMenager = manageAidButton(query, user_info);
								break;
							}
							case "CLOSE": {
								if (query.data.split(":")[2] == "ANDLIMIT")
									queryMenager = manageDelete(query, user_info, 0, true);
								else
									queryMenager = manageDelete(query, user_info, 1, true);
								break;
							}
							case "OPINION": {
								queryMenager = manageOpinion(query, user_info);
								break;
							}
							case "REVIEW": {
								queryMenager = manageReview(query, user_info);
								break;
							}
							case "INTEGRA": {
								let command = query.data.split(":");
								let fullCommand = {
									target: command[2],
									comment: query.message.text.substring(query.message.text.indexOf("Nuovo commento:") + "Nuovo commento:".length).trim()
								}
								queryMenager = integrateMessage(user_info.id, user_info, fullCommand, query); // return command_resolve(integrateMessage(curr_user.id, curr_user, fullCommand, false));
								break;
							}
							case "FORGET": {
								queryMenager = manageForget(query, user_info);
								break;
							}
							case "DISCUSSION_PUBLISH": {
								queryMenager = manageDiscussionPublish(query, user_info);
								break;
							}
							case "DEV_STUFF": {
								queryMenager = manageDevStuff(query, user_info);
								break;
							}
						}

						try {
							let risposta = await queryMenager;
							if (manual_log) {
								let end_time = Date.now();
								console.log("> Orario di fine gestione query: " + end_time + " [esecuzione in " + (end_time - date * 1000) + " millisecondi]");
								console.log("================\nFINE CallBack\n================");
							}
							return callBack_resolve(risposta);
						} catch (err) { console.log(err) };
					} else {
						if (manual_log) {
							let end_time = Date.now();
							console.log("> Orario di fine gestione query: " + end_time + " [esecuzione in " + (end_time - date * 1000) + " millisecondi]");
							console.log("================\nFINE CallBack\n================");
						}
						return callBack_resolve({ query: { id: query.id, options: { text: "Woops..." } } });
					}
				} catch (err) { console.log(err) };
			} else {
				if (manual_log) { console.log("> Query NON Accettata!"); }
				return callBack_resolve({ query: { id: query.id, options: { text: "Magna cum calma!\n🍪\n\nAspetta almeno " + antiflood_time + " secondo tra un bottone ed un altro...", show_alert: true, cache_time: 2 } } });
			}

		}
		catch (error) {
			if (simple_log) { console.log(error); }
			return callBack_resolve({ query: { id: query.id, options: { text: "Woops!\nNon sono riuscito a verificare il tuo id…\n\n>Codice errore: GOT:GETQ\n>Segnala a @nrc382 ", show_alert: true, cache_time: 2 } } });
		};


	});
}
module.exports.manageCallBack = manageCallBack;

//___________________________________________________________//
//MESSAGE MANAGER *********************************************
//___________________________________________________________//

function suggestionManager(message) {
	if (simple_log) console.log("> Gestione suggerimento");
	return new Promise(function (suggestion_resolve) {
		let text = message.text.toString();

		if (mantenimento && message.from.id != amministratore_suggerimenti) {
			return suggestion_resolve({ toSend: invalidMessage(message.chat.id, "🤖 ❓\nModulo in manutenzione straordinaria...") });
		}

		// Cambio utenza, per testing
		if ((message.from.id == amministratore_suggerimenti || message.from.id == amministratore) && text.length > 7 && text.length < 30) {
			if (text.split(" ")[1] == "sono") {
				let type = text.split(" ")[2];
				let new_role = 1;
				let creatore_msg = message.from.id == amministratore_suggerimenti ? ", Creatore!" : ", Fenice!";

				let msg = "🐾\nSei ora cammuffato da semplice utente" + creatore_msg;

				if (type != "utente") {
					if (type == "io") {
						new_role = 5;
						msg = "🌟\nBentornato" + creatore_msg;
					} else if (type == "mod") {
						new_role = 3;
						msg = "🛠\nSei ora cammuffato da moderatore" + creatore_msg;
					} else if (type == "limitato") {
						new_role = 0;
						msg = "👐\nTi sei legato le mani" + creatore_msg;
					} else if (type.match("ban")) {
						new_role = -1;
						msg = "😯\nUUh!" + creatore_msg;
					} else if (type == "nazi") { // "🦖\nSieg Heil"
						new_role = 2;
						msg = "🦖\nSieg Heil";
					}
				}

				return tips_handler.setUserRole(message.from.id, new_role, "Nuovo Inizio").then(function (role_set) {
					if (role_set == false) {
						return suggestion_resolve({ toSend: simpleMessage(message.chat.id, "Woops...") });
					} else {
						return suggestion_resolve({ toSend: simpleMessage(message.chat.id, msg) });
					}
				});
			}
		}




		// Messaggi in risposta: azioni sull'utente e gestione suggerimenti
		if (message.reply_to_message) {
			let is_avviso = message.reply_to_message.forward_from_chat ? (message.reply_to_message.forward_from_chat.id == -1001057075090) : (false);
			if (is_avviso || (message.from.id == amministratore && message.text.match("avv"))) {
				return parseAvvisi(message.reply_to_message.text, message.from.id).then(function (parsed) {
					let to_return = {}
					if (parsed.esit == true) {
						to_return = simpleDeletableMessage(message.chat.id, parsed.msg_text);
						if (message.from.id == amministratore_suggerimenti) {
							to_return.options.reply_markup.inline_keyboard.unshift([
								{ text: "📢", callback_data: "SUGGESTION:AVVISO_PUB:NOW" },
								{ text: "🕐", callback_data: "SUGGESTION:AVVISO_PUB:FRIDAY" }
							]);

						} else if (message.from.id == amministratore) {
							to_return.options.reply_markup.inline_keyboard.unshift([
								{ text: "📢", callback_data: "SUGGESTION:AVVISO_PUB:NOW" },
							]);

						}
					} else {
						to_return = simpleDeletableMessage(message.chat.id, "*Woops!*\n\nHo pensato fosse un messaggio per _Avvisi_,\nMa non sono riuscito a completare il parse :(");
					}
					return suggestion_resolve({ toSend: to_return });
				})

			} else if (message.reply_to_message.text.startsWith(("👨‍💻 Candidati"))) {
				if (message.reply_to_message.text.includes("Scegli un emoji, ")) {
					return impostaPseudonimoDev(message).then(function (risposta) {
						return suggestion_resolve(risposta);
					})
				} else {
					return suggestion_resolve({ toSend: simpleMessage(message.chat.id, "🤖 *???* \nNon è questo il contesto per certe cose…") });
				}

			} else if (message.reply_to_message.from.is_bot == true) {
				if (message.reply_to_message.from.username == 'LootPlusBot') {
					return suggestion_resolve({ toSend: simpleMessage(message.chat.id, "🤖 *???* \nMa quello sono io!") });
				} else {
					return suggestion_resolve({ toSend: simpleDeletableMessage(message.chat.id, "🤖*??*\nMa quello è un bot!") });
				}
			}



		}

		if (manual_log) {
			console.log("================\nSUGGERIMENTO\n================");
			console.log("> Orario di inizio gestione:\t" + Date.now() / 1000);
			console.log("> Orario messaggio:\t" + message.date);
		}
		let start_time = Date.now() / 1000;

		// Scarta messaggi doppi o ricevuti durante inattività del modulo
		if ((message.date - start_time) > max_delay) {
			if (manual_log) { console.log(">\tIl messaggio è troppo vecchio [" + (start_time - message.date) + " secondi], lo scarto."); }
			return suggestion_resolve(); 			//suggestion_resolve(invalidMessage(message.chat.id, "Ho avuto qualche problema..."));
		} else {
			if (simple_log) console.log("Chiedo info");
			return tips_handler.getUserInfo(message.from.id).then(async function (user_info) {
				if (simple_log) console.log("Ultimo controllo: " + user_info.lastcheck + " Booleano: " + (start_time - user_info.lastcheck));
				let controll = true;

				// Gestione della variabile "controll". che poi è abbastanza ridondante come cosa. Ma vabbeh…
				if (user_info.id == amministratore) {
					controll = false;
				} else if (user_info.lastcheck > 0) {
					controll = (start_time - user_info.lastcheck) > 86400
				}

				if (simple_log) console.log("Messaggio da: " + message.from.username + ", controllo: " + controll);
				try {

					//informazioni da api/…/players/nick_name
					const loot_user = await tips_handler.getLootUser(message.from.username,  (message.from.id == amministratore ? false : controll), message.from.id);

					if (loot_user == null) {
						return suggestion_resolve({
							toSend: invalidMessage(message.from.id, "Il server di Loot non è raggiungibile, se il problema persiste contatta @nrc382"),
						});
					}
					let check_player = playerCheck(message, loot_user);

					if (check_player.resolve) {
						return suggestion_resolve({ toSend: check_player.resolve.toSend });
					}

					if ((message.date - user_info.lastmsg) < antiflood_time) {
						if (manual_log) { console.log(">\tIl messaggio è " + (((message.date - user_info.lastmsg) > 0) ? "TROPPO recente" : "OBSOLETO") + ", lo scarto... "); }
						return suggestion_resolve();
					} else {
						if (simple_log) { console.log(">\tIl messaggio è recente, ma non troppo... "); }
						return suggestionDispatch(user_info, message).then(function (res_message) {
							if (res_message.noMessage) { suggestion_resolve({}); }
							else if (res_message.chat_id) { suggestion_resolve({ toSend: res_message }); }
							else if (res_message.toSend || res_message.toEdit) { suggestion_resolve(res_message); }
							//else { suggestion_resolve({ toSend: invalidMessage(user_info.id, "") }); }
						}).catch(function (error) { console.log(">\tErrore nella dispatch:"); console.log(error); }).then(function (pub_res) {
							return tips_handler.updateLast(user_info.id, start_time, false);
						}).catch(function (error_1) { console.log(">\tErrore nel'update del messaggio:"); console.log(error_1); }).then(function (res) {
							if (manual_log) {
								let end_time = Date.now();
								console.log("> Orario di fine gestione: " + end_time + " [esecuzione in " + (end_time - start_time * 1000) + " millisecondi]");
								console.log("> Orario di impostato all'untente: " + (res * 1000) + " [differenza: " + (end_time - (res * 1000)) + " millisecondi]");
								console.log("================\nFINE SUGGERIMENTO\n================");
							}
						});
					}
				} catch (error_2) {
					console.log(error_2);
					suggestion_resolve({ toSend: simpleDeletableMessage(message.chat.id, "Woops!\nNon sono riuscito a verificare il tuo id…\n\n>Codice errore: GOT:GETM\n>Segnala a @nrc382 ") });
				}
			}).catch(function (error) { console.log(">\tErrore richiedendo le info per l'utente: " + message.from.id); console.log(error); });
		}
	});
}
module.exports.suggestionManager = suggestionManager;

function playerCheck(query, loot_user) {
	if (loot_user == true) {
		return true;
	} else if (query.from.id == amministratore) {
		return true;
	} else if (loot_user == false) { // nei casi di problemi contattando l'api
		return false;
	} else { // catch per gli utenti da controllare: exp greater_50
		if (loot_user.nickname.toLowerCase() == query.from.username.toLowerCase()) {
			if (loot_user.greater_50 == 0) {
				return ({
					resolve: {
						toSend: invalidMessage(query.from.id, "Sei troppo giovane per usare questo bot.\nAumenta un poco la tua esperienza su @lootgamebot!"),
						query: { id: query.id, options: { text: "Whoops!" } }
					}
				});
			} else if (loot_user.greater_50 == 1){
				return true;
			}
		} else {
			if (manual_log) { console.log(">\t\t" + query.from.username + " non è un giocatore di loot!\n"); }
			return ({
				resolve: {
					toSend: invalidMessage(query.from.id, "Devi essere un utente di " + loot_link + " per usare questo bot..."),
					query: { id: query.id, options: { text: "Whoops!" } }
				}
			});
		}
	}
}

function suggestionDispatch(user_info, message) {
	let entities = message.entities;
	let trigger = message.text.substr(entities[0].offset, entities[0].length).toLowerCase();
	if (manual_log) { console.log("> Dispatch, TRIGGER: " + trigger); }

	if (message.text.length > 3500) {
		return Promise.resolve(invalidMessage(user_info.id, "Non è un po troppo lungo, questo suggerimento? 🤔"));
	} else if (trigger.charAt(0) == "/" && message.text.trim().length > trigger.length) { // comando 
		let text_array = message.text.substr(entities[0].offset + entities[0].length).replace('\n', ' ').trim().split(" ");
		let cmd_msg = { command: text_array, target: "", comment: "" };

		if (cmd_msg.command[0].length == 5 && tips_handler.isValidID(cmd_msg.command[0])) {
			cmd_msg.target = cmd_msg.command[0];
			cmd_msg.command = "sugg_info";
		} else if (text_array[0] == "integra" || text_array[0].indexOf("revision") == 0) {
			cmd_msg.command = text_array[0];

			if (typeof (message.reply_to_message) != "undefined") {
				cmd_msg.target = resolveCode(message.reply_to_message.text);
				cmd_msg.comment = text_array.splice(1, text_array.length).join(" ");
				if (simple_log) console.log("Parsing in risposta...");
			} else {
				cmd_msg.target = text_array[1];
				cmd_msg.comment = text_array.splice(2, text_array.length).join(" ");
				if (simple_log) console.log("Parsing manuale...");
			}
			if (simple_log) console.log(cmd_msg);
		} else if (typeof (message.reply_to_message) != "undefined") {
			if (message.text.charAt(0) == "💡") {
				let text_array = message.text.split("\n");
				cmd_msg.target = resolveDiscussionCode(text_array[text_array.length - 1]);
			} else if (typeof (message.reply_to_message.forward_from) != "undefined") {
				if (message.reply_to_message.text.indexOf(suggestionCode_msg) >= 0) {
					cmd_msg.target = resolveCode(message.reply_to_message.text);
					if (manual_log) { console.log("> Messaggio inoltrato, codice: " + cmd_msg.target); }
				} else {
					cmd_msg.target = message.reply_to_message.forward_from.id;
					cmd_msg.target_name = message.reply_to_message.forward_from.first_name;
				}
			} else {
				if (message.reply_to_message.text.indexOf(suggestionCode_msg) >= 0) {
					cmd_msg.target = resolveCode(message.reply_to_message.text);
					if (manual_log) { console.log("> Messaggio in risposta, codice: " + cmd_msg.target); }

				} else {
					cmd_msg.target = message.reply_to_message.from.id;
					cmd_msg.target_name = message.reply_to_message.from.first_name;
					if (manual_log) { console.log("Messaggio in risposta di: " + cmd_msg.target); }
				}
			}
		} else {
			if (text_array.length == 2) {
				cmd_msg.command = text_array[0];
				cmd_msg.target = text_array[1];
			}
		}

		if (simple_log) console.log("Parsato il comando: " + cmd_msg.command + "\nTarget: " + cmd_msg.target)
		return commandMeneger(message.chat.id, user_info, cmd_msg, (message.chat.type == "private"));
	} else { //if (message.chat.type == "private")
		if (message.text == trigger) {
			return mainMenu(user_info);
		} else if (trigger == sugg_triggers.tag) { // tag #suggerimento
			let paragraph_array = message.text.substr(entities[0].offset + entities[0].length).trim().split("\n");
			let text_array = [];
			paragraph_array.forEach(function (par) {
				let array = par.split(" ");
				array.forEach(function (single) {
					text_array.push(single);
				})
				text_array.push("\n");
			});
			let tags_array = [];
			if (entities.length > 0) {
				entities.forEach(function (ent) {
					if (ent.type == 'hashtag') {
						let curr_tag = message.text.substr(ent.offset, ent.length);
						tags_array.push(curr_tag.toLowerCase());
						text_array.splice(text_array.indexOf(curr_tag), 1);
					}
				});
			}

			return propouseInsert(user_info, text_array, tags_array, (message.chat.type != "private"), message);
		} else if (trigger == "#suggellamento") {
			if (Math.random() * 10 < 8) {
				return Promise.resolve({ noMessage: true });
			}

			let res_text = "🤔 *Mumble*\n_…un suggellamento!_\n\nMagari lavorandoci ne potrebbe venir fuori una buona idea.";
			let to_return = simpleDeletableMessage(user_info.id, res_text);
			if (message.chat_id == "1001225957195") {
				to_return.options.reply_markup.inline_keyboard[0].unshift({ text: "🦪", url: "https://t.me/c/1069842056/" + message.message_id });
			}
			return Promise.resolve(to_return);
		} else {
			let generic_error = "Cerchi di dirmi qualche cosa?\n\nManda `/suggerimenti` per il menù, o proponi un suggerimento includendo il tag `#suggerimento`";
			return Promise.resolve(invalidMessage(user_info.id, generic_error));
		}
	}
	// else {
	// 	let res = { noMessage: true };
	// 	return Promise.resolve(res);
	// }
}

//___________________________________________________________//
//IMPLEMENTAZIONE *********************************************
//___________________________________________________________//

function initialize() {
	return new Promise(async function (getSuggestionInfoCmd_resolve) {
		if (simple_log) console.log("> Init dei Suggerimenti...");
		try {
			const globals = await tips_handler.getGlobalStats();
			if (!globals) {
				tips_handler.recreateAllTablesStruct().then(function (updated) {
					if (manual_log)
						console.log("Salvato!");

					if (manual_log)
						console.log(updated);
					return getSuggestionInfoCmd_resolve(false);

				}).catch(function (save_error) {
					console.error(save_error);
					return getSuggestionInfoCmd_resolve(false);
				});
			} else {
				if (simple_log)
					console.log("> Ottenute le globals_stat");

				aproximative_userNumber.total = Math.max(globals.totalUsers, 140);
				aproximative_userNumber.active = Math.max(globals.activUser, 60);
				return getSuggestionInfoCmd_resolve(true);
			}
		} catch (aStrange_error) {
			console.error(aStrange_error);
		}
	});
}
module.exports.initialize = initialize;

function parseAvvisi(message_txt, user_id) {
	return new Promise(function (parseAvvisi_res) {
		let msg_array = message_txt.split("\n");
		let sugg_ids = [];

		let to_return = { esit: false, msg_text: "" };

		let tmp_code;
		for (let i = 0; i < msg_array.length; i++) {
			if (msg_array[i].charAt(0) == ">" && msg_array[i].charAt(msg_array[i].length - 1) == ")") {

				tmp_code = msg_array[i].substr((msg_array[i].length - 6), 5);

				if (tips_handler.isValidID(tmp_code)) {
					sugg_ids.push(tmp_code);
				}
			}
		}

		if (sugg_ids.length == 0) {
			return parseAvvisi_res(to_return);
		} else {
			to_return.esit = true;
			to_return.msg_text = "";
			return tips_handler.getIDSOf(sugg_ids).then(function (ids_res) {
				let tmp_infos;

				for (let i = 0; i < msg_array.length; i++) {
					if (msg_array[i].charAt(0) == "-") {
						msg_array[i] = "• *" + msg_array[i].substr(1, msg_array[i].length) + "*";
					} else if (msg_array[i].charAt(0) == ">" && msg_array[i].charAt(msg_array[i].length - 1) == ")") {
						tmp_code = msg_array[i].substr((msg_array[i].length - 6), 5);

						if (tips_handler.isValidID(tmp_code)) {
							tmp_infos = getInfoFor(tmp_code, ids_res);
							if (tmp_infos != false) {
								msg_array[i] = "> " + "" + msg_array[i].substr(1, msg_array[i].length - 8) + "" + "[⇨](" + channel_link_no_parse + "/" + tmp_infos.link + ")";
							}

						} else if (msg_array[i].match("://")) {
							msg_array[i] = "> " + "" + msg_array[i].substr(1, msg_array[i].indexOf("(")) + "" + "[⇨](" + (msg_array[i].substr(msg_array[i].indexOf("(") + 1, msg_array[i].length - 2)) + ")";
						}
					}
				}
				msg_array.push("\n•  *In questo Update* 💡");
				if (sugg_ids.length > 0) {
					msg_array.push("> [Suggerimenti](t.me/" + channel_name + ") implementati: *" + sugg_ids.length + "*");
				} else {
					msg_array.push("> Non sono stati implementati suggerimenti dal " + channel_link);
				}
				to_return.msg_text = msg_array.join("\n");

				return tips_handler.saveTmp_Suggestion(user_id, to_return.msg_text).then(function (update_res) {
					return parseAvvisi_res(to_return);
				});

			});
		}
	});
}
module.exports.parseAvvisi = parseAvvisi;

function getInfoFor(id, array) {
	for (let i = 0; i < array.length; i++) {
		if (array[i].id == id) {
			return array[i];
		}
	}
	return false;
}






//________________________//
// MENU *********
//________________________//

// Principale
function mainMenu(user_info) {
	return new Promise(async function (resolveMenu) {
		let menu_text = "💡 *Bacheca Suggerimenti*\nVota sul " + channel_link + "!\n\n";
		if (simple_log) { console.log("- Richiesto Menù"); }

		switch (user_info.role) {
			case -2: {
				let res_text = "☹️ *È triste!*\n\nPer tre volte sei stato limitato dall'utilizzo di questo modulo, ";
				res_text += "non possiamo permetterti di continuare...\n";
				return resolveMenu(simpleDeletableMessage(user_info.id, res_text));
			}
			case -1: {
				let line = "`      ——————————`\n"

				let res_text = "😨 *Woops!*\n\nSei stato limitato dall'utilizzo del modulo, *direttamente da un moderatore*, ";
				res_text += "a causa di questo suggerimento:\n";
				res_text += line + "«" + user_info.tmpSugg + "»\n" + line;
				res_text += "\n\n💡Per chiedere d'essere riabilitato, inoltra questo messaggio all'amministratore.";
				return resolveMenu(simpleDeletableMessage(user_info.id, res_text));
			}
			case 0: {
				let now = Date.now();
				let time_enlapsed = (now / 1000) - user_info.lastSugg;
				let rest_time = 43200 - time_enlapsed; //in secondi
				if (rest_time > 0) { // to do: da finire!!!
					let to_wait = "\n⏳Dovrai aspettare";
					if (rest_time > 3600) {
						let time_toWait = Math.floor(rest_time / 3600);
						to_wait += " almeno " + (time_toWait == 1 ? "un ora " : time_toWait + " ore");
					} else if (rest_time > 60) {
						let time_toWait = Math.floor(rest_time / 60);
						to_wait += " " + (time_toWait == 1 ? "circa un minuto " : "almeno" + time_toWait + " minuti");
					} else {
						to_wait += " ancora qualche secondo";
					}
					let line = "`      ——————————`\n"
					to_wait += " prima di poter riutilizzare questo modulo.";

					let toDate = new Date((user_info.lastSugg * 1000) + (43200000));

					if (toDate.getHours() != 1) {
						to_wait += "\n(Fino alle " + toDate.getHours() + ":" + ('0' + toDate.getMinutes()).slice(-2);
					} else {
						to_wait += "\n(Fino al'" + toDate.getHours() + ":" + ('0' + toDate.getMinutes()).slice(-2);
					}

					if (toDate.getDate() > new Date(now).getDate()) {
						to_wait += " di domani)";
					} else {
						to_wait += ")";
					}

					let res_text = "😟 *Woops!*\n\nSei stato *limitato* dall'utilizzo del modulo a causa di questo suggerimento:\n";

					res_text += line + "«" + user_info.tmpSugg + "»\n" + line + to_wait;

					return resolveMenu(simpleDeletableMessage(user_info.id, res_text));
				} else {
					return tips_handler.setUserRole(user_info.id, 1).then(function (action_res) {
						let msg_text = "🌟*Un nuovo inizio*\n\nSei stato riabilitato all'utilizzo del modulo /suggerimenti...\n";
						let tips_array = [
							{ text: "Ogni fallimento è semplicemente un’opportunità per ricominciare in modo più intelligente", author: "Henry Ford" },
							{ text: "Esperienza: La somma di quelle conoscenze che ci permettono di cambiare gli errori della gioventù con quelli della vecchiaia", author: "Ambrose Bierce" },
							{ text: "È cosa comune l'errare, ma solo dell'ignorante perseverare nell'errore", author: "Cicerone: Filippiche, XII. 5" },
							{ text: "Ogni errore umano merita perdono", author: "Livio: Storie, VIII.35" },
							{ text: "Cadere nell'errore è cosa dell'essere umano, ma diabolico è insistere nell'errore per superbia!", author: "s.Agostino d'Ippona: Sermones (164, 14)" }
						];
						let random_index = intIn(0, tips_array.length);
						msg_text += "\n_«" + tips_array[random_index].text + "»_ -" + tips_array[random_index].author;
						return resolveMenu(simpleDeletableMessage(user_info.id, msg_text))
					});
				}
			}
			case 2: {
				menu_text = "\n🧐 *Salve, professore*\n...Hai controllato il " + channel_link + "?\n\n";
				break;
			}
			case 3: {
				menu_text = "⭐️ *Sei moderatore del *" + channel_link + "\n\n";
				break;
			}
			case 5: {
				menu_text = "🔥 *Fenice, hai pieni poteri sul *" + channel_link + "\n\n";
				break;
			}
		}
		let sugg_count = await tips_handler.getSuggestionsCount(user_info.id);

		if (simple_log) console.log("> Limite: " + sugg_count.suggLimit);
		if (simple_log) console.log("> " + sugg_count);
		if (manual_log) { console.log(">\tMain menu, ottenuto sugg_count"); }


		if (user_info.isNew == true) {
			menu_text = "💡 *Bacheca Suggerimenti*\n_Benvenuto!_\n\nTramite questo modulo potrai condividere e votare idee e suggerimenti su @LootGameBot\n\n";
			menu_text += "· Per controllare i comandi a cui sei abilitato, manda `/sugg comandi`\n";
			menu_text += "· Altrimenti, per proporre qualche cosa, manda un messaggio che includa il tag: `#suggerimento`\n";
		}

		if (sugg_count.totalSuggsN <= 0) {
			if (user_info.isNew == true) {
				menu_text += "\nNon è ancora stato proposto nulla, sii il primo!\n";
			} else if (user_info.role < 3) {
				menu_text = "💡 *Bacheca Suggerimenti*,\nDove proporre idee e consigli su @LootGameBot\n\n";
				menu_text += "Sii il primo a proporre qualcosa, manda un messaggio con tag `#suggerimento`!\n";
			} else if (user_info.role == 3) {
				menu_text = "💡 *Bacheca Suggerimenti*,\n\nSei moderatore del modulo, ma non è ancora stato proposto nulla...\n";
			} else {
				menu_text = "💡 *Bacheca Suggerimenti*\n\nSalve, _Fenice!_ 🔥\n\nNon è ancorqa stato proposto alcun suggerimento\n";
			}
		} else {
			if (sugg_count.opens == 0) {
				if (sugg_count.suggLimit < 0) {
					if (user_info.role >= 5) {
						menu_text += "Ha temporaneamente ";
					} else {
						menu_text += "La Fenice ha temporaneamente ";
					}
					menu_text += "chiuso la possibilità di inserire nuovi suggerimenti, e non ne sono rimasti di aperti";
					if (user_info.role >= 5) {
						menu_text += "! 💪";
					} else {
						menu_text += "...";
					}
				} else {
					menu_text += "Non ci sono suggerimenti aperti al momento...";
					if (user_info.role < 5 && sugg_count.suggLimit != 0) {
						menu_text += "\nIl limite imposto dalla Fenice è " + sugg_count.suggLimit + ".";
					}

				}
			} else {
				menu_text += suggestionMessageMenu(sugg_count, user_info);
			}

			if (user_info.role <= 3) {
				menu_text += userMenuMessage(user_info, sugg_count);
			}
		}


		// Statistiche per amministratore
		if (user_info.role >= 5) {
			if (sugg_count.suggLimit != 0) {
				menu_text += "\n\n· Limite impostato: *" + Math.abs(sugg_count.suggLimit) + "* \n";
			} else {
				menu_text += "\n\nNessun limite impostato.\n";
				//menu_text += "· Per settarlo:\n> `/sugg massimo` "
			}
			menu_text += "· Partecipazione: *" + aproximative_userNumber.active + "*/" + aproximative_userNumber.total + "\n";

		}

		let sugg_mess;

		if (sugg_count.totalSuggsN <= 0) {
			sugg_mess = simpleMessage(user_info.id, menu_text);
		} else {
			sugg_mess = simpleMenuMessage(user_info, menu_text, sugg_count);
		}
		return resolveMenu(sugg_mess);
	});
}

// testo generico per il menu principale
function suggestionMessageMenu(sugg_count, user_infos) {
	if (manual_log) { console.log(">\tsuggestionMessageMenu"); }
	let sugg_count_msg = {
		first_line: "È aperta la votazione di ",
		alot: "ben ",
		not_much: "appena ",
		just_one: "un suggerimento.",
		plural: " suggerimenti.",
	};

	let menu_text = sugg_count_msg.first_line;
	if (typeof sugg_count.suggLimit == "number") {
		if (sugg_count.suggLimit == 0) {
			if (sugg_count.opens == 1) {
				menu_text += sugg_count_msg.not_much + sugg_count_msg.just_one;
			} else {
				if (sugg_count.opens < 6) {
					menu_text += sugg_count_msg.not_much + sugg_count.opens;
				} else
					menu_text += sugg_count_msg.alot + sugg_count.opens;
				menu_text += sugg_count_msg.plural;
			}
		} else {
			if (sugg_count.suggLimit <= 0) {
				if (user_infos.role >= 5) {
					menu_text = "Hai ";
				} else {
					menu_text = "La Fenice ha ";
				}
				menu_text += "chiuso la pubblicazione di nuovi suggerimenti";

				if (sugg_count.opens == 1) {
					menu_text += ", nel canale ne è rimasto solo uno aperto."
				} else {
					menu_text += ", nel canale ne sono rimasti " + sugg_count.opens + " aperti."
				}
			} else {
				if (sugg_count.opens == 1) {
					menu_text += "un suggerimento"; //" (su " + sugg_count.suggLimit + " consentiti)";
				} else {
					menu_text += sugg_count.opens + " suggerimenti"; //" (su " + sugg_count.suggLimit + " consentiti)";
				}
				if (sugg_count.suggLimit <= sugg_count.opens) {
					menu_text += " (ed impedita la pubblicazione di nuovi).";
				} else {
					menu_text += " (su " + sugg_count.suggLimit + " consentiti).";
				}
			}
		}
	}

	return menu_text;
}

// testo 'adattato' per il menu principale
function personalMsgForOpens(user_info, sugg_count) {
	let u_role = user_info.role;
	if (manual_log) { console.log(">\t\tpersonalMsgForOpens: " + u_role); }
	let menu_text = "";
	let mediumOnOpenVote = sugg_count.usr_onOpensRecived / sugg_count.usr_opens;

	if (u_role <= 0) {
		if (sugg_count.opens > 0)
			menu_text += " ma per il tuo recente comportamento non puoi votarne nessuno!";
		else
			menu_text += " ma per il tuo recente comportamento non potresti votarne nessuno!";
	} else if (sugg_count.usr_total <= 0) {
		menu_text += "\n\nNon hai ancora suggerito nulla.\nSe hai qualche idea, condividila inviandomi un messaggio con tag \`" + sugg_triggers.tag + "\`\n";
	} else {
		const personal_msg = {
			single_andOpen: { positive: "\n\nQuello che hai aperto sembra essere apprezzato, per il momento...😏\n", negative: "\n\nQuello che hai suggerito è aperto ma, ahimé, non sembra essere apprezzato per ora... 😶\n", neutro: "\n\nQuello che hai suggerito è aperto ma ancora ignorato\n" },
			single_andClosed: { positive: "\n\nIl tuo è stato chiuso ed è stato apprezzato nel complesso 😏\n", negative: "\n\nIl tuo è stato chiuso e non sembra sia stato apprezzato 🙁\n" },
			moreThanOne: { firstLine: "\nIn passato ne hai proposti ", all_opens: " e sono *tutti aperti*!\n", all_close: " e sono *tutti stati chiusi*...\n", some_opens: " sono *aperti*", some_approved: " sono *stati approvati*" },
			some_positive: " sembrano essere apprezzati nel complesso...🙂\n",
			alot_positive: " nel complesso sembrano adorati dalla comunità!😍\n",
			some_negative: ", nel complesso, non stanno riscuotendo un gran successo...🙁\n",
			alot_negative: "...\nProbabilmente sarebbe stato meglio te ne fossi risparmiato qualcuno!😔\n"
		}

		if (sugg_count.usr_total == 1) {
			if (sugg_count.usr_opens == 1) {
				if (sugg_count.usr_onOpensRecived > 0) {
					menu_text += personal_msg.single_andOpen.positive;
				} else if (sugg_count.usr_onOpensRecived != 0) {
					menu_text += personal_msg.single_andOpen.negative;
				} else {
					menu_text += personal_msg.single_andOpen.neutro;
				}

			} else {
				let total_recived = (sugg_count.usr_recivedVotes.onClosed.up + sugg_count.usr_recivedVotes.onClosed.down);
				total_recived += (sugg_count.usr_recivedVotes.onApproved.up + sugg_count.usr_recivedVotes.onApproved.down);

				if (sugg_count.usr_approved == 1) {
					if (total_recived > 0)
						menu_text += "\nL'unico che hai proposto è stato apprezzato dalla Fenice e dalla comunità!";
					else
						menu_text += "\nL'unico che hai proposto non è stato capito dalla comunità, ma la Fenice ha apprezzato il consiglio!";

				} else {
					if (total_recived > 0)
						menu_text += personal_msg.single_andClosed.positive;
					else
						menu_text += personal_msg.single_andClosed.negative;

				}
			}
		} else {
			menu_text += personal_msg.moreThanOne.firstLine + sugg_count.usr_total;
			let negative_motivational_msg = [
				"Ricorda: _forma e sostanza servono in egual misura!_\n",
				"Comunque non scoraggiarti e ricorda di essere chiaro nelle tue descrizioni!\n",
				"Non suggerire _a sproposito_: valuta prima le meccaniche del gioco...\n"
			];


			if (sugg_count.usr_total == sugg_count.usr_opens) {
				menu_text += personal_msg.moreThanOne.all_opens + "E diciamolo,";
				if (mediumOnOpenVote > 0) {
					if (mediumOnOpenVote > 45) {
						menu_text += personal_msg.alot_positive;
					} else {
						menu_text += personal_msg.some_positive;
					}
				} else {
					if (mediumOnOpenVote < -25) {
						menu_text += personal_msg.alot_negative;
					} else {
						menu_text += personal_msg.some_negative;
					}
					menu_text += negative_motivational_msg[Math.floor(Math.random() * (negative_motivational_msg.length))];
				}

			} else if (sugg_count.usr_opens == 0) {
				if (sugg_count.usr_approved == 1) {
					menu_text += ", ed uno è stato approvato";
				} else if (sugg_count.usr_approved > 1) {
					menu_text += ", e di questi " + sugg_count.usr_approved + " sono stati approvati";
				} else {
					menu_text += personal_msg.moreThanOne.all_close;
				}
			} else {
				let recivedVotes = sugg_count.usr_recivedVotes.onClosed.up + sugg_count.usr_recivedVotes.onClosed.down + sugg_count.usr_recivedVotes.onApproved.up + sugg_count.usr_recivedVotes.onApproved.down;

				if (sugg_count.usr_approved == 1) {
					menu_text += " e di questi solo uno è stato approvato";
				} else if (sugg_count.usr_approved > 1) {
					menu_text += " e di questi " + sugg_count.usr_approved + " sono stati approvati";
				} else {
					if (recivedVotes > 0) {
						menu_text += ", nessuno è stato approvato";
					} else {
						menu_text += ". \n🙄Nessuno è stato approvato dalla Fenice!";
					}
				}

				if (sugg_count.usr_opens == 1) {
					if (recivedVotes < 0) {
						menu_text += ".\nIn generale gli altri giocatori non hanno apprezzato le tue idee, ";
						if (sugg_count.usr_onOpensRecived <= 0) {
							menu_text += "ed anche nell'ultimo suggerimento... 😕\n";
						} else {
							menu_text += "ma l'ultimo suggerimento"; {
								if (sugg_count.usr_onOpensRecived > 20) {
									menu_text += " sta andando alla grande, fantastico! 🤩";
								} else if (sugg_count.usr_onOpensRecived > 2) {
									menu_text += " sta andando abbastanza bene 🙂";
								} else {
									menu_text += "...";
								}
							}
						}
					} else if (recivedVotes > 0) {
						menu_text += ".\nIn generale agli altri giocatori sono piaciute le tue idee, ";

						if (sugg_count.usr_onOpensRecived <= 0) {
							menu_text += "ma l'ultimo suggerimento... 😕\n";
						} else {
							menu_text += "ed anche l'ultimo suggerimento"; {
								if (sugg_count.usr_onOpensRecived > (aproximative_userNumber.active / 2)) {
									menu_text += " sta andando alla grande. Ovvio? 😘";
								} else if (sugg_count.usr_onOpensRecived > 2) {
									menu_text += " sta andando bene 😎";
								} else {
									menu_text += "... 😏";
								}
							}
						}
					}
				} else {
					if (recivedVotes < 0) {
						menu_text += ".\nIn generale gli altri giocatori non hanno apprezzato le tue idee";
						if (mediumOnOpenVote <= 0) {
							menu_text += "ma, straordinariamente, i " + sugg_count.usr_opens + " suggerimenti aperti";
							if (mediumOnOpenVote > (aproximative_userNumber.active / 2)) {
								menu_text += " stanno riscuotendo un gran successo!"
							} else {
								menu_text += " stanno piacendo alla comunità."
							}
						} else {
							if (mediumOnOpenVote < -1 * (aproximative_userNumber.active / 2)) {
								menu_text += ", ed anche i " + sugg_count.usr_opens + " ancora aperti... 😪";
							} else {
								menu_text += ", ed anche i " + sugg_count.usr_opens + " ancora aperti... ☹️";
							}
						}
					} else {
						menu_text += ".\nIn generale agli altri giocatori sono piaciute le tue idee";
						if (mediumOnOpenVote <= 0) {
							if (mediumOnOpenVote > -1 * (aproximative_userNumber.active / 2)) {
								menu_text += " ma, ahime, lo stesso non si può dire per le " + sugg_count.usr_opens + " ancora in votazione...";
							} else if (sugg_count.downVotes > 3) {
								menu_text += ", ma le " + sugg_count.usr_opens + " ancora in votazione sembrano *detestate* 😱\n";
								menu_text += negative_motivational_msg[Math.floor(Math.random() * (negative_motivational_msg.length))];
							} else {
								menu_text += ", ma i " + sugg_count.usr_opens + " suggerimenti ancora aperti non sembra stiano riscuotendo grande attenzione.";
							}
						} else {
							if (mediumOnOpenVote > (aproximative_userNumber.active / 2)) {
								menu_text += ", ed i " + sugg_count.usr_opens + " suggerimenti aperti sono `ADORATI` 🥰";
							} else {
								menu_text += ", ed anche i " + sugg_count.usr_opens + " suggerimenti aperti... 👍";
							}
						}

					}
				}
			}
		}
	}
	return menu_text;
}

// Utente
function userMainMenu(user_info, page_n) {
	return new Promise(async function (userMainMenu_res) {
		if (page_n == 0) {
			const sugg_count = await tips_handler.getSuggestionsCount(user_info.id);
			let msg_tex = "👤 *Bacheca Suggerimenti*\n\n";
			let insert_button = [];
			if (sugg_count.usr_total > 1) {
				let totalV = {
					up: (sugg_count.usr_recivedVotes.onClosed.up
						+ sugg_count.usr_recivedVotes.onApproved.up
						+ sugg_count.usr_onOpensRecived),
					down: ((-1) * sugg_count.usr_recivedVotes.onApproved.down + (-1) * sugg_count.usr_recivedVotes.onClosed.down + sugg_count.usr_onOpensRecived)
				};
				let total_sum = (totalV.up - totalV.down);
				let vote_medium = (Math.floor((total_sum / sugg_count.usr_total) * 10) / 10);

				let usr_delay = userPointCalc(sugg_count);
				let delayText = "";
				if (usr_delay > 3600) {
					usr_delay = Math.round(usr_delay / 3600);
					delayText = "h.";
				} else {
					usr_delay = Math.round(usr_delay / 60);
					delayText = "m.";
				}

				msg_tex += "• Proposti: " + sugg_count.usr_total + " (*" + sugg_count.usr_opens + "*)\n";
				msg_tex += "• Contribuzione: " + (Math.round((sugg_count.usr_total * 100) / sugg_count.totalSuggsN)) + "%\n";
				msg_tex += "• Approvazione: " + (Math.round((sugg_count.usr_approved * 100) / sugg_count.usr_total)) + "%\n";
				msg_tex += "• Media dei voti: " + (vote_medium > 0 ? "+" + vote_medium : vote_medium) + "\n";
				msg_tex += "• Delay per proposta: *" + usr_delay + delayText + "* ca.\n";

				insert_button.push([{ text: "⏱", callback_data: "SUGGESTION:MENU:PERSONAL_RECENT" }]); //Mumble... e se non ce ne sono?

				if (user_info.tmpSugg != "") {
					insert_button[0].push({ text: "📜", callback_data: "SUGGESTION:MENU:PERSONAL_TMP" });
				}
				if ((sugg_count.usr_total - sugg_count.usr_approved) > 0) {
					insert_button[0].unshift({ text: "🌪️", callback_data: "SUGGESTION:MENU:PERSONAL_REFUSED" });
				}
				if (sugg_count.usr_approved > 0) {
					insert_button[0].unshift({ text: "⚡️", callback_data: "SUGGESTION:MENU:PERSONAL_APPROVED" });
				}



			} else if (sugg_count.usr_total == 1) {
				msg_tex += "• Hai proposto un solo suggerimento\n";
			} else {
				msg_tex += "• Non hai proposto alcun suggerimento\n";
			}

			if (insert_button.length <= 0) {
				insert_button.push([{ text: "👨‍💻", callback_data: "SUGGESTION:DEV_STUFF:MAIN" }]);
			} else {
				insert_button[0].push({ text: "👨‍💻", callback_data: "SUGGESTION:DEV_STUFF:MAIN" });
			}



			msg_tex += "\n🌐 Sul canale:\n";
			msg_tex += "• Proposti: " + sugg_count.totalSuggsN + "\n";
			msg_tex += "• Chiusi: " + sugg_count.closed + "\n";
			msg_tex += "• Approvati: " + sugg_count.approved + "\n";
			let tasso = (sugg_count.approved * 100) / (sugg_count.closed + sugg_count.approved);

			if (tasso < 1) {
				tasso = 0;
			} else if (tasso >= 100) {
				tasso = 100;
			} else {
				tasso = tasso.toPrecision(2);
			}

			msg_tex += "• Rapporto: " + tasso + "%\n";
			if (sugg_count.usr_total < 3) {
				msg_tex += "\nTrovi tutti i comandi disponibili sotto:\n> `/sugg comandi`\n";
			}

			insert_button.push([
				{ text: "Albo 🔰", callback_data: "SUGGESTION:MENU:ALBO:MAIN" },
				{ text: "🔝 Contributi", callback_data: "SUGGESTION:MENU:TOP" },
			]);
			insert_button.push([
				{ text: "⮐", callback_data: "SUGGESTION:MENU:REFRESH" },
				//{ text: "Chiudi ⨷", callback_data: 'SUGGESTION:FORGET' }
			]);
			let to_return = simpleDeletableMessage(user_info.id, msg_tex);
			to_return.options.reply_markup.inline_keyboard = insert_button;
			return userMainMenu_res(to_return);
		}

	});
}

// testo per il menu utente
function userMenuMessage(user_info, sugg_count) { //Da rivedere
	let menu_text = "";
	let expression_msg = "\n";
	let user_totalVotes = sugg_count.usr_upVotes + sugg_count.usr_downVotes;


	if (sugg_count.opens == 1 && sugg_count.usr_opens == 1) {
		menu_text += "\nIl tuo, ";
		if (user_totalVotes > 0) {
			menu_text += "che hai votato ";
			if (sugg_count.usr_upVotes >= 1) {
				menu_text += "positivamente.\n";
			} else {
				menu_text += "negativamente (!?)\n";
			}
		} else {
			menu_text += "che non hai votato.\n";
		}

		if (sugg_count.usr_onOpensRecived == 0) {
			menu_text += "ne tu ne nessun altro...\n";
		} else {
			if (Math.abs(sugg_count.usr_onOpensRecived) == 1) {
				if (user_totalVotes > 0) {
					menu_text += "(e per il momento sei il solo)\n";
				} else {
					menu_text += "(ma qualcun altro si!)\n";
				}
			} else {
				if (sugg_count.usr_onOpensRecived > 0) {
					menu_text += "Per il momento agli altri utenti piace come idea, comunque.\n";
				} else {
					menu_text += "Per il momento non sembra piacere ";
					if (sugg_count.usr_downVotes == 1) {
						menu_text += "neanche ";
					}
					menu_text += "agli altri utenti.\n";
				}
			}
		}
	} else {
		if (!user_info.isNew) {
			menu_text += personalMsgForOpens(user_info, sugg_count);
		}

		if (sugg_count.opens > 0) {
			let user_selective = (user_totalVotes / sugg_count.opens).toPrecision(3);
			let user_point = Math.floor((sugg_count.usr_upVotes / (sugg_count.usr_downVotes != 0 ? sugg_count.usr_downVotes : 1)) * 100);

			if (sugg_count.opens == 1) {
				if (sugg_count.usr_upVotes == 1) {
					expression_msg += "\n🐸 \nHai già votato il suggerimento aperto, positivamente.\n";
				} else if (sugg_count.usr_upVotes == -1) {
					expression_msg += "\n🐨 \nHai già votato il suggerimento aperto, e non t'è piaciuto.\n";
				}

			} else if (user_totalVotes == 0) {
				expression_msg += "\n🐣 \nNon hai votato nessuno dei suggerimenti aperti.\n";
			} else if (user_totalVotes > sugg_count.opens / 2) {
				if (user_selective == 1) {
					if (user_point > 160) {
						expression_msg += "\n🦍\nHai votato *ogni* `singolo` *suggerimento aperto*, positivamente. Ok...\n";
					}
					else if (user_point < 20) {
						expression_msg += "\n🐀\nHai votato *ogni* `singolo` *suggerimento aperto*, e negativamente!!\n";
					}
					else {
						expression_msg += "\n🦆\nHai votato *ogni* `singolo` *suggerimento aperto*...\n";
					}
				} else if (user_selective > 0.5) {
					if (user_point > 160) {
						expression_msg += "\n🐺\nHai votato la maggior parte dei suggerimenti aperti, sostanzialmente dimostrandoti entusiasta!\n";
					}
					else if (user_point < 40) {
						expression_msg += "\n🦉\nHai votato la maggior parte dei suggerimenti aperti e..." +
							"\nTi piace criticare, eh?\n";
					}
					else {
						if (user_point > 100)
							expression_msg += "\n🐢\nHai votato la maggior parte dei suggerimenti aperti e " +
								"sei stato piuttosto bilanciato.\n";
						else
							expression_msg += "\n🐌\nHai votato la maggior parte dei suggerimenti aperti e..." +
								"\n_ni!_\n";
					}
				} else if (sugg_count.open > 3) {
					if (user_point > 170) {
						expression_msg += "🐋\nSugli aperti, \nSei stato piuttosto selettivo nel votare, " +
							"limitandoti a cio che ti è piaciuto\n";
					}
					else if (user_point < 20) {
						expression_msg += "🐍\nSugli aperti, \nSei stato piuttosto selettivo nel votare, " +
							"limitandoti a criticare cio che non t'è piaciuto...\n";
					} else {
						expression_msg += "🦎\nSugli aperti, \nSei stato piuttosto selettivo nel votare, " +
							"quantomeno non sei un _criticone_\n";
					}
				}
			} else {
				expression_msg += "\n🐞 \nSugli aperti,\nPer il momento hai votato solo " + (user_totalVotes > 1 ? user_totalVotes + " suggerimenti:" : "un suggerimento:");
				if (sugg_count.usr_downVotes == sugg_count.usr_upVotes) {
					if (sugg_count.user_totalVotes > 3)
						expression_msg += " la metà dei quali ti è piaciuta.\n";
					else {
						expression_msg += " uno t'è piaciuto, l'altro no.\n";
					}
				} else if (sugg_count.usr_downVotes < sugg_count.usr_upVotes) {
					expression_msg += (user_totalVotes > 1 ? " sembra non ti siano piaciuti molto.\n" : " t'è piaciuto!\n");
				} else {
					expression_msg += (user_totalVotes > 1 ? " nel complesso si può dire ti siano piaciuti.\n" : " non t'è piaciuto!\n");
				}
			}
		}
	}

	let usr_delay = userPointCalc(sugg_count);

	if (((Date.now() / 1000) - user_info.lastSugg) < usr_delay) {
		let delayText = "";
		if (usr_delay > 3600) {
			usr_delay = Math.round(usr_delay / 3600);
			delayText = "h.";
			if (usr_delay > 24) {
				usr_delay = Math.round(usr_delay / 24);
				delayText = "g.";
			}
		} else {
			usr_delay = Math.round(usr_delay / 60);
			delayText = "m.";
		}

		expression_msg += "\n⥁ Per una nuova proposta dovrai aspettare circa " + usr_delay + " " + delayText;
	}

	return menu_text + expression_msg;
}


// Testo per il comando markdown
function generateMarkdownString() {
	if (manual_log) { console.log(">\t\trandom_tip"); }
	let text = "È attiva una semplice modalità *Markdown* " +
		"con la quale aggiungere stile ai tuoi messaggi! 🕶\n" +
		"\n> \`*\`*Grassetto*\`*\`" +
		"\n> \`_\`_Italico_\`_\`" +
		"\n> \`[link visualizzato](url)\`";

	return text;
}

// Testo per il comando tags
function generateTagString() {
	if (manual_log) { console.log(">\t\tgenerateTagString"); }

	const suggestion_tag = {
		primo: ['🗺', '#loot', '#plus', '#community', "#tools"],
		secondo: ['👤', '#alchimia', '#drago', '#giocatore', '#imprese', '#team', '#talenti', '#vocazione'],
		bis: ['🎮', '#assalto', '#craft', '#contrabbandiere', '#dungeon', '#figurine', '#incarichi', '#ispezioni', '#mappe', '#mercato', '#missioni', "#top", '#viaggi'],
		ter: ['🎭', "#eventi", '#casadeigiochi', '#vette', '#globali', '#polvere', '#miniere'],
		terzo: ['⚙', '#estetica', '#meccaniche', '#bottoni', '#testi', '#comandi'],
		quarto: ['⭐️', '#novità', '#revisione'],
		quinto: ['👥', '#discussione']
	};

	let onText = "Per rendere piu comoda a tutti la consultazione dei suggerimenti sul " + channel_link + ", "
	onText += "sono stati definiti alcuni tag, includili nei tuoi suggerimenti!\n\n";

	let levels = Object.keys(suggestion_tag);
	levels.forEach(function (level) {
		let tags = Object.keys(suggestion_tag[level]);
		onText += "> " + suggestion_tag[level][tags[0]] + "\n";
		for (let i = 1; i < tags.length; i++) {
			onText += "\`" + suggestion_tag[level][tags[i]] + "\` ";
		}
		onText += "\n\n";
	});
	return (onText) // + "\n*Includili nei tuoi suggerimenti!️*");
}













//________________________//
// GESTIONE COMMANDI *********
//________________________//

function commandMeneger(chat_id, curr_user, fullCommand, is_private_chat) {
	if (simple_log) console.log(">commandMeneger: “" + fullCommand.command + "“ " + fullCommand.target + ", chat privata: " + is_private_chat);

	return new Promise(function (command_resolve) {
		let toAnalize;
		if (Array.isArray(fullCommand.command)) {
			toAnalize = fullCommand.command.join(" ");
			if (simple_log) console.log("Il comando era un array");
		} else {
			toAnalize = String(fullCommand.command);
		}
		if (simple_log) { console.log("> toAnalize: “" + toAnalize); }

		if (is_private_chat) { // comandi in sola privata
			if (curr_user.role >= 5 && (fullCommand.command == "massimo" || fullCommand.command == "max")) {
				return command_resolve(setMaximumAllowed(chat_id, fullCommand.target));
			} else if (toAnalize == "recenti") {
				return command_resolve(getRecentlyApproved(curr_user.id, curr_user, fullCommand));
			} else if (toAnalize == "scartati") {
				return command_resolve(getRefusedOf(curr_user.id, curr_user, fullCommand));
			} else if (toAnalize == "albo") {
				return command_resolve(getBestOf(curr_user.id, "MAIN"));
			} else if (toAnalize == "top") {
				return command_resolve(topMessage(curr_user.id));
			} else if (toAnalize == "aperti") {
				return command_resolve(getOpens(curr_user.id, false));
			} else if (toAnalize == "miei") {
				return command_resolve(getOpensFor(curr_user.id));
			} else if (toAnalize == "markdown" || toAnalize == "stile") {
				return command_resolve(simpleDeletableMessage(curr_user.id, generateMarkdownString()));
			} else if (toAnalize == "inizializza") {
				return command_resolve(resetCmd(curr_user));
			} else if (toAnalize.match("tag")) {
				return command_resolve(simpleDeletableMessage(curr_user.id, generateTagString()));
			}
			// l'else di default è catturato alla fine della catena successiva
		}

		if (toAnalize == "sugg_info") {
			return command_resolve(getSuggestionLinkCmd(curr_user, fullCommand, chat_id));
		} else if (toAnalize == "escludi") {
			return command_resolve(limitAuthorOfDiscussion(curr_user, fullCommand));
		} else if (toAnalize == "limita" || toAnalize == "dimentica") {
			return command_resolve(manageUserCmd(chat_id, curr_user, fullCommand));
		} else if (toAnalize == "recluta") {
			return command_resolve(manageUserCmd(chat_id, curr_user, fullCommand));
		} else if (toAnalize == "promuovi") {
			return command_resolve(manageUserCmd(chat_id, curr_user, fullCommand));
		} else if (toAnalize == "approvati") {
			return command_resolve(getApprovedOf(curr_user.id, curr_user, fullCommand));
		} else if (toAnalize == "integra") {
			return command_resolve(integrateMessage(curr_user.id, curr_user, fullCommand));
		} else if (toAnalize == "gestisci" || toAnalize == "g") {
			return command_resolve(changeOpinion(chat_id, curr_user, fullCommand));
		} else if (toAnalize == "autore") {
			return command_resolve(getAuthorMsg(chat_id, curr_user, fullCommand));
		} else if (toAnalize.match("stat")) {
			return command_resolve(getSuggestionsStatsCmd(curr_user, fullCommand));
		} else if (toAnalize.match("curiosit")) {
			return command_resolve(curiosityCmd(chat_id, curr_user, fullCommand));
		} else if (toAnalize.match("revision")) {
			return command_resolve(askReview(curr_user.id, curr_user, fullCommand));
		} else {
			// solo in chat privata: lista dei comandi disponibili
			if (is_private_chat) {
				let avaible_cmds = "Hai disponibili i comandi:\n\n🌐\n> " +
					"`tags`\n> " +
					"`aperti `\n> " +
					"`recenti `\n> " +
					"`statistiche `\n> " +
					"`albo `\n" +
					"`\n👤`\n> " +
					"`miei `\n> " +
					"`approvati`\n> " +
					"`scartati`\n> " +
					"`curiosità`\n";
				if (curr_user.role > 1)
					avaible_cmds += "\n📄\n> `revisione`";
				if (curr_user.role > 2)
					avaible_cmds += "\n> `integra`\n\n👥\n> "
						+ "`recluta`\n> "
						+ "`limita`\n> "
						+ "`dimentica`";
				if (curr_user.role >= 5) {
					avaible_cmds += "\n> " + "`promuovi`";
					avaible_cmds += "\n> " + "`escludi`";
					avaible_cmds += "\n> massimo `N` (imposta il limite)";
					avaible_cmds += "\n> `#suggerimeno #annuncio` (per pubblicare un annuncio)";
				}
				avaible_cmds += "\n\nUsali preceduti dal comando:\n`/suggerimenti `";

				if (curr_user.role <= 0)
					avaible_cmds += "\n\n>😟\n *Sei stato limitato all'utilizzo di questo modulo!*";
				return command_resolve(simpleDeletableMessage(curr_user.id, avaible_cmds));

			} else {
				return command_resolve({ noMessage: true });
			}
		}
	});

}


// le funzioni che seguono rispondono a /comandi 

function getSuggestionsStatsCmd(user_info, fullCmd) {
	return new Promise(async function (getSuggestionInfoCmd_resolve) {
		if (simple_log) { console.log(">\t\tComando getSuggestionInfoCmd -> " + fullCmd.command); }
		const sugg_count = await tips_handler.getSuggestionsCount(user_info.id);
		if (sugg_count.totalSuggsN > 0) {
			return tips_handler.getGlobalStats().then(function (globals) {
				aproximative_userNumber.total = Math.max(globals.totalUsers, 140);
				aproximative_userNumber.active = Math.max(globals.activUser, 60);
				let nowDate = new Date(Date.now());
				let stringDate = " " + nowDate.getDate() + "." + (nowDate.getMonth() + 1) + " - " + nowDate.getHours() + ":" + (("0" + nowDate.getMinutes()).slice(-2));
				let res_text = "*Statistiche al " + stringDate + "*\n";

				res_text += "\n🌐\n";

				if (sugg_count.totalSuggsN == 1)
					res_text += "È stato proposto un solo suggerimento... ";

				else
					res_text += "Sono stati proposti " + sugg_count.totalSuggsN + " suggerimenti";

				if (sugg_count.opens == 0)
					res_text += ", al momento nessuno è aperto...\n";

				else
					res_text += (sugg_count.opens == 1 ? ", solo di uno è aperta la votazione...\n" : ", di " + sugg_count.opens + " è aperta la votazione...\n");


				if (sugg_count.closed == 0)
					res_text += "- Nessuno è stato chiuso\n";
				else {
					if (sugg_count.closed == 1)
						res_text += "- Uno è stato chiuso\n";

					else
						res_text += "- Chiusi: *" + sugg_count.closed + "*\n";
				}

				if (sugg_count.approved == 0)
					res_text += "- Nessuno è stato approvato\n";
				else {
					if (sugg_count.approved == 1)
						res_text += "- Uno è stato approvato\n";
					else {
						res_text += "- Approvati: *" + sugg_count.approved + "*\n";
						res_text += "- Tasso d'approvazione: *" + ((sugg_count.approved * 100) / (sugg_count.closed + sugg_count.approved)).toPrecision(2) + "*%\n";
					}
				}
				let usr_delay = userPointCalc(sugg_count);
				let delayText = "";
				if (usr_delay > 3600) {
					usr_delay = Math.round(usr_delay / 3600);
					delayText = "h.";
					if (usr_delay > 24) {
						usr_delay = Math.round(usr_delay / 24);
						delayText = "g.";
					}
				} else {
					usr_delay = Math.round(usr_delay / 60);
					delayText = "m.";
				}

				res_text += "\n👥\n";
				res_text += "Ci sono stati *" + globals.activUser + "* utenti attivi nelle ultime 24h\n";
				res_text += "- Votanti (ultimi 30g): " + globals.totalUsers + "\n";
				res_text += "- Che hanno proposto: " + globals.propositiveUser + "\n";

				if (sugg_count.usr_total > 0) {
					res_text += "\n👤\n";
					let totalV = {
						up: (sugg_count.usr_recivedVotes.onClosed.up
							+ sugg_count.usr_recivedVotes.onApproved.up
							+ sugg_count.usr_onOpensRecived),
						down: ((-1) * sugg_count.usr_recivedVotes.onApproved.down + (-1) * sugg_count.usr_recivedVotes.onClosed.down + sugg_count.usr_onOpensRecived)
					};
					let total_sum = (totalV.up - totalV.down);
					let vote_medium = (Math.floor((total_sum / sugg_count.usr_total) * 10) / 10);
					res_text += "" +
						"Tu ne hai proposti " + sugg_count.usr_total + " (*" + sugg_count.usr_opens + "*)\n" +
						"- Rapporto di contribuzione: " + (Math.round((sugg_count.usr_total * 100) / sugg_count.totalSuggsN)) + "%\n" +
						"- Rapporto d'approvazione: " + (Math.round((sugg_count.usr_approved * 100) / sugg_count.usr_total)) + "%\n" +
						"- Media dei voti ricevuti: " + (vote_medium > 0 ? "+" + vote_medium : vote_medium) + "\n" +
						"- Delay per Proposta: *" + usr_delay + delayText + "* ca.\n";
				}

				if (manual_log)
					console.log(res_text);
				return getSuggestionInfoCmd_resolve(simpleDeletableMessage(user_info.id, res_text));
			}).catch(function (err) { console.error(err); });
		} else {
			return getSuggestionInfoCmd_resolve(simpleDeletableMessage(user_info.id, "😶\nNon è stato ancora proposto alcun suggerimento"));
		}
	});
}

function manageUserCmd(chat_id, user_info, fullCmd) {
	if (manual_log) { console.log(">\t\tmanageUserCmd"); }
	return new Promise(function (manageUserCmd_resolve) {
		if (manual_log) { console.log(">\t\tComando manageUserCmd -> " + fullCmd.command); }

		const cmd_error_needReplay = "Questo comando va usato in risposta ad un messaggio (anche inoltrato)";
		const cmd_error_Role = "🤔\nI comandi disponibili, che vanno preceduti da `/suggerimenti`, sono:";
		const cmd_error_Target = "🙃\n_...te le canti e te le suoni?_\n\nQuesti comandi non hanno senso mandati verso se stessi!";
		const role_message = [
			"_Era il momento..._\nL'utente è stato limitato!",
			"_Ne scordiamo i peccati, ne dimentichiamo le lodi..._\nÈ ora un normale utente",
			"*Reclutato!* 🧐\nÈ ora un _revisore_ di suggerimenti",
			"*Promosso!* ⭐️\nÈ ora moderatore del canale",
		];

		const sugg_comand_triggers = {
			user: { tags: "tags", getStats: "statistiche", curiosity: "curiosità" },
			mod: { limit: "limita", forget: "dimentica" },
			admin: { promove: "promuovi", recruit: "recluta", init: "inizializza" }
		}

		if (user_info.role < 3) {
			let avaible_cmds = "\n> " + sugg_comand_triggers.user.tags + "\n> " + sugg_comand_triggers.user.getStats + "\n> " + sugg_comand_triggers.user.curiosity;
			return manageUserCmd_resolve(invalidMessage(user_info.id, cmd_error_Role + avaible_cmds));
		} else {
			if (manual_log) { console.log(">\t\tChiesto -> " + fullCmd.command + " , (" + fullCmd.target + ")"); }

			if (fullCmd.target.length == 5) { // con codice suggerimento. Limita l'autore
				if (manual_log) { console.log("Il target è: " + fullCmd.target); }
				if (fullCmd.command == sugg_comand_triggers.mod.limit) {
					return tips_handler.getSuggestionInfos(fullCmd.target, user_info.id).then(function (sugg_infos) {
						if (manual_log) { console.log("\t\tOttenute le info sul suggerimento " + fullCmd.target + " -> autore: " + sugg_infos.author); }
						return tips_handler.setUserRole(sugg_infos.author, -1).then(function (action_res) {
							return manageUserCmd_resolve(simpleDeletableMessage(chat_id, "L'autore di " + fullCmd.target + " è stato bandito dall'utilizzo del *modulo suggerimenti*"));
						});
					})

				}
			} else {
				if (manual_log) { console.log("Il target è un utente: " + fullCmd.target); }

				if (fullCmd.target <= 0) {
					let limit_text = cmd_error_needReplay;
					if (fullCmd.command == sugg_comand_triggers.admin.recruit) {
						limit_text = "💡\nIl comando `recluta`\n" +
							"*Abilita un utente alla revisione dei suggeriemnti*" +
							"\nPuoi usarlo in risposta ad un qualcunque messaggio, recluterà l'autore";
					} else if (fullCmd.command == sugg_comand_triggers.mod.limit) {
						let insert = "\n";
						if (user_info.role >= 5)
							insert = " *o un utente in generale (anche mod)*\n";

						limit_text = "💡\nIl comando `limita`\n" +
							"*bandisce per un tempo indefinito l'autore di un suggerimento*" + insert +
							"\nPuoi usarlo in risposta ad un suggerimento inoltrato,\nAl messaggio di un utente (in gruppo o inoltrato)" +
							"\nO specificando direttamente il codice del suggerimento (la " + suggestionCode_msg + "non è necessaria)";
					} else if (fullCmd.command == sugg_comand_triggers.mod.forget) {
						let insert = "*Toglie le limitazioni ad un utente.*\n";
						if (user_info.role >= 5)
							insert = "*Ristabilisce la condizione di utente (che fosse mod o limitato)*\n";

						limit_text = "💡\nIl comando `dimentica`\n" +
							insert +
							"\nPer usarlo sarà necessario rispondere direttamente ad un messaggio (anche inoltrato)\n\n" +
							"Nota:\nDi default, la limitazione per _suggerimento eliminato_ dura 12h, solo quella manuale (comando `limita`) è a scadenza indefinita.";
					}
					return manageUserCmd_resolve(invalidMessage(chat_id, limit_text));
				} else {
					if (fullCmd.target == user_info.id) {
						return manageUserCmd_resolve(invalidMessage(chat_id, cmd_error_Target));
					}
					return tips_handler.getUserInfo(fullCmd.target).then(function (autor_infos) {
						let actionPromise;
						if (autor_infos.warn < -1 && (user_info.role < 5)) {
							return manageUserCmd_resolve(invalidMessage(chat_id, "Solo @fenix45 può agire sul ruolo di un esiliato dal modulo!"));
						}

						if (fullCmd.command == sugg_comand_triggers.admin.recruit)
							actionPromise = tips_handler.setUserRole(fullCmd.target, 2);
						else if (fullCmd.command == sugg_comand_triggers.mod.limit)
							actionPromise = tips_handler.setUserRole(fullCmd.target, 0);
						else if (fullCmd.command == sugg_comand_triggers.mod.forget) {
							actionPromise = tips_handler.setUserRole(fullCmd.target, 1);
						} else if (fullCmd.command == sugg_comand_triggers.admin.promove && user_info.role >= 5)
							actionPromise = tips_handler.setUserRole(fullCmd.target, 3);
						else
							actionPromise = Promise.resolve(-1);

						actionPromise.then(function (action_res) {
							if (action_res >= 0) {
								return manageUserCmd_resolve(simpleDeletableMessage(chat_id, role_message[action_res] + "\n> ID utente: `" + fullCmd.target + "`"));
							} else {
								let avaible_cmds = "";
								if (fullCmd.command == sugg_comand_triggers.admin.recruit) {
									limit_text = "💡\nIl comando `recluta`\n" +
										"*Abilita un utente alla revisione dei suggeriemnti*" +
										"\nPuoi usarlo in risposta ad un qualcunque messaggio, recluterà l'autore";
								} else if (fullCmd.command == sugg_comand_triggers.mod.limit) {
									avaible_cmds += "💡\nIl comando `limita`\n" +
										"*bandisce per un tempo indefinito l'autore di un suggerimento*\n" +
										"\nPuoi usarlo in risposta ad un suggerimento inoltrato,\nAl messaggio di un utente (in gruppo o inoltrato)" +
										"\nO specificando direttamente il codice del suggerimento (" + suggestionCode_msg + "non è necessario)";
								} else if (fullCmd.command == sugg_comand_triggers.mod.forget) {
									let insert = "*toglie le limitazioni ad un utente*\n";
									if (user_info.role >= 5)
										insert = "*ristabilisce la condizione di utente (che fosse mod o limitato)*\n";

									avaible_cmds += "💡\nIl comando `dimentica`\n" +
										insert +
										"\nPer usarlo sarà necessario rispondere direttamente ad un messaggio (ancheo inoltrato)" +
										"Nota: di default, la limitazione per _suggerimento eliminato_ dura 24h, solo quella manuale (comando `limita`) è a scadenza indefinita.";

								} else {
									avaible_cmds = "\n> " + sugg_comand_triggers.mod.limit + "\n> " + sugg_comand_triggers.mod.forget;
									avaible_cmds += "\n> " + sugg_comand_triggers.admin.recruit;
									if (user_info.role >= 5)
										avaible_cmds += "\n> " + sugg_comand_triggers.admin.promove + "\n> " + sugg_comand_triggers.admin.init;
								}

								return manageUserCmd_resolve(simpleDeletableMessage(chat_id, cmd_error_Role + avaible_cmds));

							}

						});
					});
				}
			}
		}
	});
}

function curiosityCmd(chat_id, user_info, fullCmd) {
	return new Promise(function (curiosityCmd_resolve) {
		if (manual_log) { console.log(">\t\tcuriosityCmd -> comando: " + fullCmd.command + ", target: " + fullCmd.target); }
		let curiosity_msg;
		if (user_info.role <= 0) {
			curiosity_msg = "*Il comando curiosità* 💡\n\n";
			curiosity_msg += "Non può essere usato da chi è limitato..."
			return curiosityCmd_resolve(simpleMessage(user_info.id, curiosity_msg));
		} else if (typeof (fullCmd.target) != 'number') {
			if (user_info.role < 3) {
				curiosity_msg = "*Il comando \"curiosità\"* 💡\n\n" +
					"Ti permette d'avere un idea complessiva dell'attività di un utente sul modulo /suggerimenti\n\n" +
					"Puoi usarlo in risposta ad un messaggio inoltrato o direttamente a quello di un utente, _se il bot è Amministratore del SuperGruppo_\n\n" +
					"(In risposta ad un tuo messaggio ti porterà all'*albo personale*.)";

			} else {
				curiosity_msg = "\nIl comando `curiosità` 💡\n\n" +
					"Ti permette di avere informazioni sul ruolo di un utente\n" +
					"Puoi usarlo in risposta ad un messaggio inoltrato o direttamente a quello di un utente _(se il bot è Amministratore del SuperGruppo)_\n";
			}
			return curiosityCmd_resolve(simpleMessage(user_info.id, curiosity_msg));
		}

		if (user_info.id == fullCmd.target) { // ALBO personale
			return tips_handler.activityOf(user_info.id).then(function (res) {
				if (res.droppedCount + res.acceptedCount == 0) {
					return curiosityCmd_resolve(simpleMessage(chat_id, "Nessuno dei tuoi suggerimenti è stato ancora chiuso"));
				}
				let mess = "🔰 *Albo dei Tuoi Suggerimenti*\n\n";
				//let sugg_partial;

				if (res.droppedCount == 0) {
					mess += "• Nessuno dei tuoi suggerimenti è stato scartato! 🌪 \n";
				} else {
					mess += "*" + res.droppedCount + "* Scartati 🌪\n";
					for (let i = 0; i < res.dropped.length; i++) {
						mess += "> " + generatePartialString(res.dropped[i].text) + "\n";
						mess += "   [" + "↑" + res.dropped[i].upVotes + ", " + res.dropped[i].downVotes + "↓](" + channel_link_no_parse + "/" + res.dropped[i].id + ")\n";

					}
				}


				if (res.acceptedCount == 0) {
					mess += "• Nessuno dei tuoi suggerimenti è stato approvato! ⚡️\n";
				} else {
					if (res.droppedCount != 0) {
						mess += "\n";
					}
					mess += "*" + res.acceptedCount + "* Approvati ⚡️\n";
					for (let i = 0; i < res.accepted.length; i++) {

						mess += "> " + generatePartialString(res.accepted[i].text) + "\n";
						mess += "   [" + "↑" + res.accepted[i].upVotes + ", " + res.accepted[i].downVotes + "↓](" + channel_link_no_parse + "/" + res.accepted[i].id + ")\n";


					}
				}

				return curiosityCmd_resolve(simpleMessage(chat_id, mess));

			});
		} else if (user_info.role <= 3) { // UTENTE
			if (fullCmd.target == amministratore_suggerimenti && user_info.id != amministratore_suggerimenti) {
				return curiosityCmd_resolve(simpleMessage(chat_id, "🤡\nQuello è _il creatore_!"));
			} else if (fullCmd.target == amministratore) {
				return curiosityCmd_resolve(simpleMessage(chat_id, "⚡️\n\nQuetzalcoatl, Wakonda, Homa, Seemorgh..._\nMolti sono i nomi che gli hanno dato, ma noi lo conosciamo come Fenice!🎶"));
			} else {
				return tips_handler.getSuggestionsCount(fullCmd.target).then(function (sugg_usrInfo) {
					let usrCountPartial = sugg_usrInfo.usr_total + sugg_usrInfo.usr_upVotes + sugg_usrInfo.usr_downVotes;
					if (manual_log) { console.log(usrCountPartial); }
					if (usrCountPartial == 0 || isNaN(usrCountPartial)) {
						curiosity_msg = "🙃\nL'utente non ha avviato il modulo!";
						if (user_info.id == amministratore_suggerimenti) {
							curiosity_msg += "\n> ID: " + fullCmd.target;
						}
					} else if (sugg_usrInfo.usr_total == sugg_usrInfo.opens) {
						curiosity_msg = "💡\nÈ presto per chiedere _curiosità_ su questo utente...\n\n🐣";
					} else {
						curiosity_msg = "";
						let number = 2;
						let contribution = (sugg_usrInfo.usr_total * 25) / sugg_usrInfo.totalSuggsN;
						curiosity_msg = " *Curiosità su:* _" + fullCmd.target_name + "_\n\n";

						if (sugg_usrInfo.usr_total > 0) {
							number = 1;

							let totalV = {
								up: (sugg_usrInfo.usr_recivedVotes.onClosed.up
									+ sugg_usrInfo.usr_recivedVotes.onApproved.up),
								down: ((-1) * sugg_usrInfo.usr_recivedVotes.onApproved.down + (-1) * sugg_usrInfo.usr_recivedVotes.onClosed.down)
							};

							let point = (Math.floor(((totalV.up - totalV.down) / sugg_usrInfo.usr_total) * 10) / 10);

							if (contribution >= 2) {
								curiosity_msg += "Suoi circa " + Math.floor(contribution) + " suggerimenti ogni 25 proposti...";
								number = 3;
							} else {
								curiosity_msg += "Ha proposto ";
								if (sugg_usrInfo.usr_total == 1) {
									curiosity_msg += "un solo suggerimento";
								} else {
									curiosity_msg += sugg_usrInfo.usr_total + " suggerimenti";
								}


								if (point > 0) {
									if (point > (aproximative_userNumber / 10)) {
										curiosity_msg += " che la comunità ha decisamente apprezzato.";
									} else {
										if (sugg_usrInfo.usr_total == 1) {
											curiosity_msg += ", non così apprezzato dalla comunità.";
										} else {
											curiosity_msg += ", mediamente apprezzati dalla comunità.";
										}
									}
								} else {
									if ((-1) * point > (aproximative_userNumber / 10)) {
										curiosity_msg += " che la comunità ha (con decisione) disapprovato.";
									} else {
										if (sugg_usrInfo.usr_total == 1) {
											curiosity_msg += ", nel complesso non apprezzato dagli altri utenti.";
										} else {
											curiosity_msg += ", nel complesso non apprezzati dagli altri utenti.";
										}
									}
								}


							}

							if (sugg_usrInfo.usr_approved == 0) {
								curiosity_msg += " La Fenice, di conto suo,";
								if (point > 0) {
									if (sugg_usrInfo.usr_total == 1) {
										curiosity_msg += " l'ha comunque scartato! 🙁";
									} else {
										if (sugg_usrInfo.usr_total == 2) {
											curiosity_msg += " li ha scartati entrambi!! 😱";
										} if (sugg_usrInfo.usr_total == 3) {
											curiosity_msg += " li ha scartati tutti e tre!! 😱";
										} else {
											curiosity_msg += " li ha scartati tutti!! 😱";
										}
									}
								} else {
									if (sugg_usrInfo.usr_total == 1) {
										curiosity_msg += " l'ha scartato. So... 🤷‍♂️";
									} else {
										if (sugg_usrInfo.usr_total == 2) {
											curiosity_msg += " li ha scartati entrambi 😉 ";
										} if (sugg_usrInfo.usr_total == 3) {
											curiosity_msg += " li ha scartati tutti e tre 😁";
										} else {
											curiosity_msg += " li ha scartati tutti!! 🤣";
										}
									}
								}
							} else if (sugg_usrInfo.usr_approved == 1) {
								if (sugg_usrInfo.usr_total == 1) {
									curiosity_msg += " La Fenice lo ha approvato!";
									if (point > 0) {
										curiosity_msg += " 🌝";
									} else {
										curiosity_msg += " 🌚";
									}
								} else {
									curiosity_msg += " La Fenice ne ha approvato giusto uno...";

								}

							} else {
								let approv_quote = (Math.round((sugg_usrInfo.usr_approved * 100) / sugg_usrInfo.usr_total));
								if (approv_quote <= 5) {
									curiosity_msg += " La Fenice ne ha approvata solo una minima parte... 😐";
								} else if (approv_quote <= 15) {
									curiosity_msg += " La Fenice ne ha approvata una parte... 😶";
								} else if (approv_quote <= 20) {
									curiosity_msg += " La Fenice ne ha approvata una buona parte... 🙂";
								} else {
									if (sugg_usrInfo.usr_approved == sugg_usrInfo.usr_total) {
										curiosity_msg += " La Fenice li ha approvati tutti... " + (point < 0 ? "🌚" : "🌝");
									} else {
										curiosity_msg += " La Fenice ne ha approvata una gran parte... 😋";
									}
								}

							}

						} else {
							curiosity_msg += "Non ha proposto alcun suggerimento.\n";
							number = 4;
						}

						if (sugg_usrInfo.opens > 1) {
							let votecount = sugg_usrInfo.opens - (sugg_usrInfo.usr_upVotes + sugg_usrInfo.usr_downVotes);
							curiosity_msg += "\nAl momento ha ";

							if (sugg_usrInfo.opens <= 3) {
								if (votecount == 2) {
									curiosity_msg += "votato solo uno dei suggerimenti aperti";
								} else {
									curiosity_msg += "votato solo la maggior parte dei suggerimenti aperti";
								}
							} else {
								if (votecount == 0) {
									curiosity_msg += "votato tutti i suggerimenti aperti";
									number = number / 2;
								} else {
									if (votecount < (sugg_usrInfo.opens / 2)) {
										curiosity_msg += "votato più della metà di quelli aperti";
										number = number * 2;
									} else {
										curiosity_msg += "votato meno della metà di quelli aperti";
									}
								}

								if (sugg_usrInfo.usr_upVotes >= sugg_usrInfo.usr_downVotes) {
									curiosity_msg += " e la maggior parte positivamente";
									number += (number / 2);
								} else {
									if (fullCmd.target == user_info.id) {
										curiosity_msg += " e nel complesso non ti sono piaciuti.";
									} else {
										curiosity_msg += " e nel complesso non gli sono piaciuti.";
									}
									number -= (number / 2);
								}
							}
							curiosity_msg += "\n";
						}


						if (sugg_usrInfo.role < 1) {
							if (number % 2 == 0) {
								curiosity_msg += "\n🦆 ...quack!";
							} else {
								curiosity_msg += "\n🐜 ...shh!";
							}
						} else if (number <= 1) {
							curiosity_msg += "\n🦃";
						} else if (number <= 2) {
							curiosity_msg += "\n🦄";
						} else if (number < 3) {
							curiosity_msg += "\n🐟";
						} else if (number <= 4) {
							curiosity_msg += "\n🐧";
						} else if (number <= 6) {
							curiosity_msg += "\n🐝";
						} else {
							curiosity_msg += "\n🐘";
						}
					}
					return curiosityCmd_resolve(simpleMessage(chat_id, curiosity_msg));
				});
			}
		} else {
			return tips_handler.getUserInfo(fullCmd.target, false).then(function (sugg_usrInfo) {
				if (sugg_usrInfo == -1 || sugg_usrInfo.lastQDate + sugg_usrInfo.lastSugg == 0) {
					curiosity_msg = "🙃\nL'utente non ha avviato il modulo suggerimenti!";
					if (user_info.id == amministratore_suggerimenti) {
						curiosity_msg += "\n> ID: " + fullCmd.target;
					}

				} else {
					if (fullCmd.target == amministratore_suggerimenti) {
						return curiosityCmd_resolve(simpleMessage(chat_id, "🤡 Guardone!"));
					}
					if (sugg_usrInfo.role >= 5)
						curiosity_msg = "🔥 *Admin*\n";
					else if (sugg_usrInfo.role == 3)
						curiosity_msg = "⭐️ *Moderatore*\n";
					else if (sugg_usrInfo.role == 2)
						curiosity_msg = "🎖 *Grammar Nazi*\n";
					else if (sugg_usrInfo.role == 1)
						curiosity_msg = "👤️ *Utente*\n";
					else if (sugg_usrInfo.role == 0)
						curiosity_msg = "👤️ *Utente Limitato*\n";
					else if (sugg_usrInfo.role == -1)
						curiosity_msg = "🥜️ *Utente Limitato senza scadenza!*\n";
					else if (sugg_usrInfo.role == -1)
						curiosity_msg = "🦇 *Utente Bandito*\n";

					if (user_info.id == amministratore_suggerimenti) {
						curiosity_msg += "\n> ID: " + fullCmd.target;
					}
					return tips_handler.getSuggestionsCount(fullCmd.target).then(function (sugg_infos) {
						let delay = userPointCalc(sugg_infos);
						let delayText = "";
						if (delay > 3600) {
							delay = delay / 3600;
							delayText = "h.";
						} else {
							delay = delay / 60;
							delayText = "m.";
						}
						if (user_info.id == amministratore_suggerimenti) {
							let totalV = {
								up: (sugg_infos.usr_recivedVotes.onClosed.up
									+ sugg_infos.usr_recivedVotes.onApproved.up
									+ sugg_infos.usr_onOpensRecived),
								down: ((-1) * sugg_infos.usr_recivedVotes.onApproved.down + (-1) * sugg_infos.usr_recivedVotes.onClosed.down + sugg_infos.usr_onOpensRecived)
							};
							let total_sum = (totalV.up - totalV.down);
							curiosity_msg += "\n> Inseriti: " + sugg_infos.usr_total;
							curiosity_msg += "\n> Aperti: " + sugg_infos.usr_opens;
							curiosity_msg += "\n> Recenti: " + sugg_infos.usr_recents;
							curiosity_msg += "\n> Approvati: " + sugg_infos.usr_approved;
							curiosity_msg += "\n> Rapporto d'approvazione: " + (Math.round((sugg_infos.usr_approved * 100) / sugg_infos.usr_total)) + "%";
							curiosity_msg += "\n> Media voti ricevuti: " + (Math.floor((total_sum / sugg_infos.usr_total) * 10) / 10);
						}
						curiosity_msg += "\n> Voti positivi inseriti: " + sugg_infos.usr_upVotes;
						curiosity_msg += "\n> Voti negativi inseriti: " + sugg_infos.usr_downVotes;
						curiosity_msg += "\n> Delay calcolato: " + Math.round(delay) + delayText;

						return curiosityCmd_resolve(simpleMessage(chat_id, curiosity_msg));
					})


				}
				return curiosityCmd_resolve(simpleMessage(user_info.id, curiosity_msg));
			});
		}
	});
}

function integrateMessage(chat_id, curr_user, fullCommand, is_confirm) {
	return new Promise(async function (integrateMessage_resolve) {
		if (simple_log) console.log("> Integra: " + fullCommand);
		let condition = (curr_user.id == 340271798 || curr_user.id == amministratore_suggerimenti);

		if (!condition && curr_user.role < 3) {
			return integrateMessage_resolve(simpleDeletableMessage(chat_id, "???\n\nSeriamente?"));
		} else {
			if (true) console.log("Chiesto integra per : " + fullCommand.target);
			let codeArray;
			let sugg_id;
			let number;
			if (typeof (fullCommand.target) != 'undefined') {
				codeArray = fullCommand.target.split(":");
				sugg_id = codeArray[0].toUpperCase().trim();
				number = parseInt(codeArray[1]);
			}


			if (manual_log) console.log("Dopo il parse: sugg_id -> " + sugg_id + " (" + typeof (sugg_id) + "),  number -> " + number + ", comment -> " + fullCommand.comment);

			if (typeof (sugg_id) == 'string' && fullCommand.comment.length > 0) {
				let sugg_infos = await tips_handler.getSuggestionInfos(sugg_id, curr_user.id);

				if (sugg_infos == -1) {
					return integrateMessage_resolve(
						simpleDeletableMessage(
							chat_id,
							"😕\nNon ho trovato il suggerimento " + sugg_id + " nel database...")
					);
				} else if (sugg_infos.author == "NOAUTHOR") {
					return integrateMessage_resolve(
						simpleDeletableMessage(
							chat_id,
							"😕\nControlla l'imput!\nNon ho trovato il suggerimento " + sugg_id + " nel database...")
					);
				} else if (sugg_infos.msg_id != 0) {
					number = sugg_infos.msg_id;
				} else if (isNaN(number) || number < 0) {
					return integrateMessage_resolve(
						simpleDeletableMessage(
							chat_id,
							"😕\nNon hai specificato il numero del messaggio, e non sono riuscito a recuperarlo dal database...")
					);
				}

				if (simple_log) console.log("Riconosciuto! -> messaggio n. " + number);

				let integrateMsg = {};
				let updated_text = sugg_infos.sugg_text + "\n";



				if (simple_log) { console.log("> Commento: " + fullCommand.comment); console.log("> Conferma: " + is_confirm) }



				if (typeof is_confirm != "undefined") {
					let authorMsg_text = "";
					let moji = "";
					if (curr_user.id == 340271798) {
						moji = "💾️";

						authorMsg_text = moji + " *Nuovo commento...*\n\nDeloo ";

						if (sugg_infos.sugg_text.indexOf("#tools") >= 0) {
							updated_text += moji + "* Risposta del Tools*"
						} else {
							return integrateMessage_resolve(simpleDeletableMessage(340271798, "😕\nIl suggerimento " + sugg_id + " non è per te, Deloo..."));
						}
					} else if (curr_user.id == amministratore) {
						moji = "⚡️";
						authorMsg_text = moji + " *Nuovo commento...*\n\nLa _Fenice_ ";
						updated_text += moji + "* Risposta dalla Fenice*";
					} else if (curr_user.role == 3) {
						moji = "⭐";
						authorMsg_text = moji + " *Nuovo commento...*\n\nUn moderatore ";
						updated_text += moji + "* Risposta da un moderatore*";
					} else if (curr_user.id == amministratore_suggerimenti) {
						moji = "🤖";
						authorMsg_text = moji + " *Nuovo commento...*\n\nIl bot dei suggerimenti ";
						updated_text += moji + "* Risposta dal bot dei Suggerimenti*";
					}

					updated_text += "\n" + fullCommand.comment.charAt(0).toUpperCase() + fullCommand.comment.slice(1);


					let save_res = await tips_handler.updateSuggestionText(sugg_id, updated_text);
					updated_text += "\n\n" + suggestionCode_msg + "\`" + sugg_id + "\`";
					authorMsg_text += "ha commentato un [tuo suggerimento](" + channel_link_no_parse + "/" + number + ") (`" + save_res + "`)\n";


					if (sugg_infos.status != 0) {


						updated_text += reportLine(sugg_infos);
						integrateMsg.toEdit = simpleToEditMessage("@" + channel_name, number, updated_text);
					} else {
						integrateMsg.toEdit = suggestionEditedMessage("@" + channel_name, number, updated_text, sugg_infos);
					}

					integrateMsg.toSend = simpleDeletableMessage(sugg_infos.author, authorMsg_text);
					integrateMsg.toDelete = { chat_id: curr_user.id, mess_id: is_confirm.message.message_id };

					integrateMsg.query = { id: is_confirm.id, options: { text: moji + "\n\nCommento aggiunto!", cache_time: 2, show_alert: true } }

				} else {
					updated_text = "*Nuovo commento*\n al [suggerimento](" + channel_link_no_parse + "/" + number + ") " + sugg_id + "\n\n" + updated_text.trim() + "\n";
					let moji = "";
					if (curr_user.id == 340271798) {
						if (sugg_infos.sugg_text.indexOf("#tools") >= 0) {
							moji += "\n💾️ ";
						} else {
							return integrateMessage_resolve(simpleDeletableMessage(340271798, "😕\nIl suggerimento " + sugg_id + " non è per te, Deloo..."));
						}
					} else if (curr_user.id == amministratore) {
						moji += "\n⚡️ ";
					} else if (curr_user.role == 3) {
						moji += "\n⭐️ ";
					} else if (curr_user.id == amministratore_suggerimenti) {
						moji += "\n🤖 ";
					}
					updated_text += moji + "*Nuovo commento:*\n" + fullCommand.comment.charAt(0).toUpperCase() + fullCommand.comment.slice(1);

					integrateMsg.toSend = simpleDeletableMessage(curr_user.id, updated_text);
					integrateMsg.toSend.options.reply_markup.inline_keyboard.unshift([{ text: "Aggiungi commento", callback_data: "SUGGESTION:INTEGRA:" + sugg_id }])
				}





				return integrateMessage_resolve(integrateMsg);
			} else {
				let text = "*Comando Integra*\n\n"
				text += "Permette di aggiungere un commento";
				if (curr_user.id == amministratore) {
					text += " (come Fenice ⚡️) ";
				} else if (curr_user.role == 3) {
					text += ", come moderatore, ";
				} else if (curr_user.id == amministratore_suggerimenti) {
					text += ", come bot, ";
				}
				text += "ad un messaggio pubblicato sul canale.\n";
				text += "\n• Sintassi: `/sugg integra " + (typeof sugg_id == "string" ? sugg_id : "00AAA") + " `[commento]\n";

				text += "\nPuoi omettere il codice suggerimento se il messaggio è in risposta ad uno che lo includa nel testo. (anche inoltrato)\n";


				return integrateMessage_resolve(simpleDeletableMessage(curr_user.id, text));
			}

		}
	});
}

function changeOpinion(chat_id, curr_user, fullCommand) {
	return new Promise(function (changeOpinion_resolve) {
		let condition = (curr_user.id != 340271798); // && curr_user.id != theCreator  
		if (simple_log) console.log("Cambio d'opinione!\nID: " + curr_user.id + " Condizione " + condition);

		if (condition && curr_user.role < 3) {
			return changeOpinion_resolve(simpleDeletableMessage(chat_id, "🤔 ???\n\nSeriamente?"));
		} else {
			if (simple_log) console.log("> Chiesto gestione di : " + fullCommand.target);
			let codeArray;
			let sugg_id;
			let number;
			if (typeof (fullCommand.target) != 'undefined') {
				codeArray = fullCommand.target.split(":");
				sugg_id = codeArray[0];
				number = parseInt(codeArray[1]);
			}
			if (simple_log) console.log("> Dopo il parse: sugg_id -> " + sugg_id + "(" + typeof (sugg_id) + "),  number -> " + number + "(" + typeof (number) + ")");

			if (typeof (sugg_id) == 'string') {
				return tips_handler.getSuggestionInfos(sugg_id, curr_user.id).then(function (sugg_infos) {
					if (sugg_infos == -1) {
						return changeOpinion_resolve(
							simpleDeletableMessage(
								chat_id,
								"😕\nNon ho trovato il suggerimento " + sugg_id + " nel database...")
						);

					} else if (number < 0 && sugg_infos.msg_id == 0) {
						return changeOpinion_resolve(
							simpleDeletableMessage(
								chat_id,
								"😕\nNon hai specificato il numero del messaggio, e non sono riuscito a recuperarlo dal database...")
						);
					}
					if (sugg_infos.msg_id != 0) {
						number = sugg_infos.msg_id;
					}
					if (simple_log) console.log("> Number: " + sugg_infos.msg_id);

					if (!(number > 0)) {
						return changeOpinion_resolve(
							simpleDeletableMessage(
								chat_id,
								"😕\nNon sono riuscito a recuperare il numero del messaggio, dovrai specificarlo manualmente...")
						);
					}

					if (curr_user.id == 340271798) {
						if (sugg_infos.sugg_text.indexOf("#tools") < 0) {
							return changeOpinion_resolve(
								simpleDeletableMessage(
									chat_id,
									"😕\nDeloo,\nNon puoi gestire questo messaggio...")
							);
						}
					}

					return changeOpinion_resolve(manageSuggestionMessage(curr_user.id, curr_user.role, sugg_infos));
				}).catch(function (err) {
					console.error(err);
					return changeOpinion_resolve({});
				})
			} else {
				return changeOpinion_resolve(
					simpleDeletableMessage(
						chat_id,
						"⚙ *Gestione Suggerimento*\n_Permette di cambiare opinione su un suggerimento_\n\n" +
						"Per usarlo, puoi specificare l'id suggerimento *o* rispondere direttamente ad un messaggio che lo includa.\n"
					)
				);
			}

		}
	});
}

function getOpens(user_id, toVote) {
	return new Promise(async function (getOpens_resolve) {
		const currentS = await tips_handler.getOpensSuggestions(user_id);
		if (currentS == null) {
			return getOpens_resolve(simpleDeletableMessage(user_id, "*Woops!* :(\n\nNon sono riuscito a contattare il database!\nSe riesci, segnala a @nrc382"));
		} else {
			let message = "...";
			if (currentS.opens.length == 0) {
				if (user_id == amministratore) {
					message = "😌 Ahhh!\nNon ci sono piu suggerimenti aperti.";
				} else {
					message = "Al momento non ci sono suggerimenti aperti...";
				}
			} else if (currentS.opens.length == 1) {
				if (toVote == false) {
					message = "*È aperto un solo suggerimento,*\n\n";
				} else {
					if (currentS.votedByUser.length == 0) {
						message = "*C'è un solo suggerimento*\n_...che non hai votato_\n\n";
					} else {
						message = "😌 Hai già votato per l'unico suggerimento aperto!\n\n";
					}
				}
			} else {
				if (user_id == amministratore) {
					message = "*Fenice, sono aperti " + currentS.opens.length + " suggerimenti:*\n";
				} else if (toVote == false) {
					message = "*Sono aperti " + currentS.opens.length + " suggerimenti,*\n";
					if (currentS.votedByUser.length == 0) {
						message += "  _...e tu non ne hai votato nessuno!_\n\n";
					} else if (currentS.votedByUser.length == 1) {
						message += "  _...e tu ne hai votato solo uno_\n\n";
					} else {
						if (currentS.votedByUser.length == currentS.opens.length) {
							if (currentS.votedByUser.length == 2) {
								message += "  _...e tu li hai votati entrambi!_\n\n";
							} else {
								message += "  _...e tu li hai votati tutti!_\n\n";
							}
						} else {
							message += "  _...e tu ne hai votati " + currentS.votedByUser.length + "_\n\n";
						}
					}
				} else {
					let toVoteN = currentS.opens.length - currentS.votedByUser.length;
					if (toVoteN == 0) {
						message = "😌\n\nHai votato tutti i suggerimenti aperti!\n";
					} else if (toVoteN == 1) {
						message = "* Di " + currentS.opens.length + " suggerimenti aperti,*\n   _...ce n'è solo uno che non hai votato_\n\n";
					} else if (toVoteN > 1) {
						message = "*Ci sono " + toVoteN + " suggerimenti*\n   _...che non hai votato_\n\n";
					} else {
						message = "*Mumble...*\nCi sono " + currentS.opens.length + " suggerimenti aperti e... ne hai votati " + currentS.votedByUser.length + "... ?";
						message += "\nSe riesci, contatta @nrc382";
					}
				}
			}

			if (currentS.opens.length > 0) {
				let sugg_partial;
				let line = "";
				for (let i = 0; i < currentS.opens.length; i++) {
					let thisSugg = currentS.votedByUser.filter(function (users) {
						return users.id == currentS.opens[i].id;
					});
					sugg_partial = generatePartialString(currentS.opens[i].text);

					if (thisSugg.length == 1) {
						line = "🔘 ";
					} else {
						line = "⚪️ ";
					}

					line += sugg_partial + "...\n";
					let text = "Link";
					if (currentS.opens[i].date != 0) {
						suggDate = new Date(currentS.opens[i].date * 1000);
						if (suggDate.getDate() == 1 || suggDate.getDate() == 8 || suggDate.getDate() == 11) {
							text = "Dell'";
						} else {
							text = "Del ";
						}
						text += suggDate.getDate() + "." + (suggDate.getMonth() + 1) + " alle " + suggDate.getHours() + ":" + (("0" + suggDate.getMinutes()).slice(-2));
					}
					line += "      [" + text + "](" + channel_link_no_parse + "/" + currentS.opens[i].number + ")";
					if (manual_log)
						console.log(text + " id: " + currentS.opens[i].number);

					if (thisSugg.length == 1) {
						if (thisSugg[0].vote == 1) {
							line += " ↑";
						} else {
							line += " ↓";
						}
					}

					line += "\n\n";
					if (toVote == false || (toVote == true && thisSugg.length == 0)) {
						message += line;
					}

				}
			}

			return getOpens_resolve(simpleDeletableMessage(user_id, message));
		}
	});
}

function getMostVoted(user_info) {
	return new Promise(function (getMostVoted_resolve) {
		if (user_info.id != amministratore && user_info.id != amministratore_suggerimenti) {
			return getMostVoted_resolve(simpleDeletableMessage(user_info.id, "*Woops!* 🙃\n\nCi hai provato!\nQuesta funzione è dedicata all'amministratore."));
		}
		return tips_handler.getMajorOpenSuggestion().then(function (major_sugg) {
			if (major_sugg < 0) {
				return getMostVoted_resolve(simpleDeletableMessage(user_info.id, "*Woops!* :(\n(codice: " + major_sugg + ")\n\nHo avuto qualche problema a contattare il database.\nSe riesci, segnala a @nrc382"));
			} else if (major_sugg == false) {
				return getMostVoted_resolve(simpleDeletableMessage(user_info.id, "*Woops!* 🙃\n\nNessun suggerimento è attivo"));
			} else {
				let res_text = "*Suggerimento " + major_sugg.s_id + "*\n\n";//"_Ha ricevuto "+major_sugg.totalVotes+" _\n\n";
				let to_return = {};
				if (major_sugg.msg_id == null || major_sugg.msg_id <= 0) {
					res_text += "\n\n*Spiacente*\nNon è possibile gestire in privato un suggerimento fino a che non riceve almeno un voto";
					to_return = simpleDeletableMessage(user_info.id, res_text);
				} else {
					to_return = manageSuggestionMessage(user_info.id, user_info.role, major_sugg, "SHOW_TEXT");
				}
				return getMostVoted_resolve(to_return);
			}

		});
	});
}

function getOpensFor(id) {
	return new Promise(function (getOpens_resolve) {
		tips_handler.getOpensFor(id).
			then(function (recents) {
				if (recents == -1) {
					getOpens_resolve(simpleDeletableMessage(id, "Woops! :("));
				} else {
					let stateText = "";
					let message = "";

					if (recents.length <= 0) {
						message += "*Inizia a Suggerire!*\n\nNon hai proposto alcun suggerimento...\nPer inviarne uno manda un messaggio che inizi con il tag `#suggerimento `";
					} else {
						if (recents.length == 1) {
							message += "*Hai proposto un solo suggerimento*\n\n";
							message += "> " + generatePartialString(recents[0].text) + "\n";
							stateText = recents[0].state == 0 ? "🍀 Aperto" : recents[0].state == 1 ? "⚡️ Approvato" : "🌪 Scartato";
							message += "  [" + stateText + "](" + channel_link_no_parse + "/" + recents[0].id + ")\n";

						} else {
							message += "*Ecco " + recents.length + " dei tuoi suggerimenti*\n   _...piu recenti_\n\n";
							for (let i = 0; i < recents.length; i++) {
								message += "· " + generatePartialString(recents[i].text) + "\n";
								stateText = recents[i].state == 0 ? "🍀 Aperto" : recents[i].state == 1 ? "⚡️ Approvato" : "🌪 Scartato";
								message += "   [" + stateText + "](" + channel_link_no_parse + "/" + recents[i].id + ")\n";
							}

						}

					}

					getOpens_resolve(simpleDeletableMessage(id, message));
				}

			}
			);
	});
}

function getApprovedOf(chat_id, curr_user, fullCommand) {
	return new Promise(function (getApprovedOf_resolve) {
		let myTarget = curr_user.id
		if (curr_user.id == amministratore_suggerimenti && typeof fullCommand.target == 'number') {
			myTarget = fullCommand.target;
		}
		tips_handler.getApprovedOf(myTarget).then(function (res) {
			if (res) {
				if (res.length == 0) {
					getApprovedOf_resolve(simpleDeletableMessage(chat_id, "🙁\nNessun tuo suggerimento è stato approvato..."));
				} else {
					let mess;
					if (res.length == 1) {
						mess = "🏅 *Un solo Suggerimento*\n_...approvato dalla Fenice!_\n\n";
					} else {
						mess = "🏅 *Ecco " + res.length + " dei tuoi migliori suggerimenti*\n";
						if (curr_user.id == amministratore_suggerimenti && myTarget != amministratore_suggerimenti) {
							mess = "🏅 *Ecco " + res.length + " dei suoi migliori suggerimenti*\n";
						}
						mess += " _...approvati dalla Fenice!_\n\n";
					}

					for (let i = 0; i < res.length; i++) {
						mess += "· " + generatePartialString(res[i].text) + " [/.../](" + channel_link_no_parse + "/" + res[i].id + ") (" + res[i].votes + ")\n";
					}
					getApprovedOf_resolve(simpleDeletableMessage(chat_id, mess));
				}

			} else {
				getApprovedOf_resolve(simpleDeletableMessage(chat_id, "Whoops... È successo qualche casino.\nSe vuoi puoi contattare @nrc382"));
			}
		});

	});
}

function setMaximumAllowed(chat_id, target) {
	let newLimit = parseInt(target);
	return new Promise(function (setMaximumAllowed_resolve) {
		if (isNaN(newLimit)) {
			let res_text = "🔥 *Limite ai Suggerimenti*\n_che possono essere proposti_\n\n";
			res_text += "Seleziona un valore standard dalla tastiera, o usa il comando:\n";
			res_text += "> `/sugg massimo N`\n";
			//res_text += "\nCon `N` il nuovo limite.\n(\"0\" per toglierlo)\n";
			let to_return = simpleDeletableMessage(chat_id, res_text);
			to_return.options.reply_markup.inline_keyboard[(to_return.options.reply_markup.inline_keyboard.length - 1)].unshift(
				{ text: "⮐", callback_data: "SUGGESTION:MENU:OPZIONI_ADMIN" },
			);
			to_return.options.reply_markup.inline_keyboard.push([
				{ text: "1", callback_data: "SUGGESTION:MENU:CHNNL_ADMIN:LIMIT:1" },
				{ text: "5", callback_data: "SUGGESTION:MENU:CHNNL_ADMIN:LIMIT:5" },
				{ text: "10", callback_data: "SUGGESTION:MENU:CHNNL_ADMIN:LIMIT:10" },
				{ text: "20", callback_data: "SUGGESTION:MENU:CHNNL_ADMIN:LIMIT:10" },
			]);
			to_return.options.reply_markup.inline_keyboard.push([
				{ text: "Nessuno", callback_data: "SUGGESTION:MENU:CHNNL_ADMIN:LIMIT:0" },
			]);

			//to_return.options.reply_markup.inline_keyboard[to_return.options.reply_markup.inline_keyboard.length - 1].unshift({ text: "⮐", callback_data: "SUGGESTION:MENU:REFRESH" })

			return setMaximumAllowed_resolve(to_return);
		} else {

			// if (target <= 0) {
			// 	newLimit = -newLimit;
			// }

			return tips_handler.setSuggestionLimit(newLimit).then(function (res) {
				let res_text = "";
				if (target == 0) {
					res_text = "😉 *Suggerimenti Aperti*\n\nHo rimosso il limite ai suggerimenti";
				} else if (target > 0) {
					res_text = "😉 *Suggerimenti Limitati*\n\nNon accetterò più di " + newLimit + " suggerimenti fino a nuovo ordine!";
				} else {
					res_text = "😉 *Suggerimenti Chiusi*\n\nNon accetterò nuovi suggerimenti fino a nuovo ordine!";
				}
				let to_return = simpleDeletableMessage(chat_id, res_text);
				to_return.options.reply_markup.inline_keyboard[(to_return.options.reply_markup.inline_keyboard.length - 1)].unshift(
					{ text: "⮐", callback_data: "SUGGESTION:MENU:REFRESH" },
				);
				return setMaximumAllowed_resolve(to_return);

			});
		}
	});
}

function getRecentlyApproved(chat_id, curr_user, fullCommand) {
	return new Promise(async function (getRecentlyApproved_resolve) {

		let res;
		if (fullCommand.command == "scartati") {
			res = await tips_handler.getRecentlyRefused();
		} else {
			res = await tips_handler.getRecentlyApproved();
		}
		if (res == -1) {
			getRecentlyApproved_resolve(simpleDeletableMessage(chat_id, "🙁\nC'è stato un errore. Se puoi segnala a @nrc382"));
		} else {
			if (res.length == 0) {
				let res_message = simpleDeletableMessage(chat_id, "😶\n...Non è ancora stato approvato alcun suggerimento!");
				res_message.options.reply_markup.inline_keyboard[0].splice(0, 0, { text: "🌪", callback_data: 'SUGGESTION:MENU:GLOBAL_RECENT:REF' })

				getRecentlyApproved_resolve(res_message);
			} else {
				let mess = "⚡ *Ecco gli ultimi suggerimenti*\n _...approvati dalla Fenice!_\n\n";
				if (fullCommand.command == "scartati") {
					mess = "🌪 *Ecco gli ultimi suggerimenti*\n _...scartati dalla Fenice!_\n\n";
				}
				let sugg_partial;
				let linea_gestione = [];


				for (let i = 0; i < res.length; i++) {
					sugg_partial = generatePartialString(res[i].text);

					//mess += "· [" + "↑" + res[i].upVotes + ", " + res[i].downVotes + "↓](" + channel_link_no_parse + "/" + res[i].id + ")\n";
					mess += " • [" + sugg_partial + "...](" + channel_link_no_parse + "/" + res[i].id + ") (" + "↑" + res[i].upVotes + ", " + res[i].downVotes + "↓)\n";


					if (curr_user.role >= 3 && linea_gestione.length <= 3) {
						linea_gestione.push({ text: "⚙ " + sugg_partial, callback_data: 'SUGGESTION:MENU:MANAGE_RECENT:' + res[i].s_id })
					}
				}

				let res_message = simpleDeletableMessage(chat_id, mess);
				if (fullCommand.command == "scartati") {
					res_message.options.reply_markup.inline_keyboard[0].splice(0, 0, { text: "⚡️", callback_data: 'SUGGESTION:MENU:GLOBAL_RECENT:' })
				} else {
					res_message.options.reply_markup.inline_keyboard[0].splice(0, 0, { text: "🌪", callback_data: 'SUGGESTION:MENU:GLOBAL_RECENT:REF' })
				}

				if (curr_user.role >= 3 && linea_gestione.length > 0) {
					for (let i = 0; i < linea_gestione.length; i++) {
						res_message.options.reply_markup.inline_keyboard.push([linea_gestione[i]]);
					}
				}


				return getRecentlyApproved_resolve(res_message);
			}
		}
	});
}

function getRefusedOf(chat_id, curr_user, fullCommand) {
	return new Promise(async function (getRefusedOf_resolve) {
		let myTarget = curr_user.id
		if (curr_user.id == amministratore_suggerimenti && typeof fullCommand.target == 'number') {
			myTarget = fullCommand.target;
			if (simple_log) console.log("> cambio...");
		}
		if (simple_log) console.log("> Target ->" + myTarget + " tipo: " + typeof fullCommand.target);

		const res = await tips_handler.getRefusedOf(myTarget);
		if (res) {
			if (res.length == 0) {
				return getRefusedOf_resolve(simpleDeletableMessage(chat_id, "😊\n\nNessun tuo suggerimento è stato scartato..."));
			} else {
				let mess;
				if (res.length == 1) {
					mess = "🌑 *Un solo Suggerimento*\n _...scartato dalla Fenice!_\n\n";
				} else {
					mess = "🌑 *Ecco " + res.length + " dei tuoi migliori suggerimenti*\n";
					if (curr_user.id == amministratore_suggerimenti && myTarget != amministratore_suggerimenti) {
						mess = "🌑 *Ecco " + res.length + " dei suoi migliori suggerimenti*\n";
					}
					mess += " _...scartati dalla Fenice!_\n\n";
				}

				let sugg_partial;
				for (let i = 0; i < res.length; i++) {
					sugg_partial = generatePartialString(res[i].text);
					mess += "· " + sugg_partial + " [/.../](" + channel_link_no_parse + "/" + res[i].id + ")\n";
				}
				return getRefusedOf_resolve(simpleDeletableMessage(chat_id, mess));
			}

		} else {
			getRefusedOf_resolve(simpleDeletableMessage(chat_id, "*Whoops!*\n\nSi è verificato un errore grave (codice UE: 1)\nSe riesci, contatta @nrc382"));
		}

	});
}

function topMessage(chat_id) {
	return new Promise(async function (topMessage_res) {
		const res = await tips_handler.getTop();
		let mess = "🎩 *Top Contributori*\n";
		mess += " _nel canale Suggerimenti_\n\n";

		let my_list = res.sort(function (a, b) {
			let a_prop = (a.approvati / a.scartati);
			let b_prop = (b.approvati / b.scartati);
			if (a_prop > b_prop) {
				return -1;
			} else if (a_prop < b_prop) {
				return 1;
			} else {
				return (a.voti - b.voti);
			}
		});

		for (let i = 0; i < my_list.length; i++) {
			let total_v = (my_list[i].approvati + my_list[i].scartati);
			let v_point = Math.round(my_list[i].voti / total_v);
			let perc = Math.round((my_list[i].approvati * 100) / total_v);

			let icon = "♝"; // ♝ ♟ ♞ ♜ ♛
			if (perc > 40) {
				if (v_point > 0.6) {
					icon = "♛";
				} else if (v_point > 0.4) {
					icon = "♜";
				}
			} else if (v_point < 0.4) {
				icon = "♞"
			} else if (perc < 10) {
				icon = "♟";
			}

			mess += `· ${(i + 1)}° [${icon}](tg://user?id=${my_list[i].autore})   ${my_list[i].approvati}⚡️, ${my_list[i].voti}⊙\n`; //,  (${perc}%)\n`;

			// [👤](tg://user?id=" + sugg_info.author + ")
		}

		return topMessage_res(simpleDeletableMessage(chat_id, mess));


	});
}

function getBestOf(chat_id, page_n) {
	return new Promise(async function (getBestOf_resolve) {
		const res = await tips_handler.getBestSuggestions();
		if ((res.dropped.length + res.audaci.length + res.notAppreciated.length) == 0) {
			return getBestOf_resolve(simpleDeletableMessage(chat_id, "*Woops!*\n_La Fenice_ non ha ancora gestito alcun suggerimento..."));
		}
		let buttons_line = [];
		let mess = "🔰 *Albo dei Suggerimenti*\n";
		mess += " _per voti positivi ricevuti dagli utenti_\n\n";


		if (page_n == "MAIN") {
			mess += "Categorie sbloccate:\n"
			if (res.dropped != null && res.dropped.length > 0) {
				mess += " > Scartati 🌪\n";
				buttons_line.push({ text: "🌪", callback_data: "SUGGESTION:MENU:ALBO:DROP" })
			}
			if (res.accepted != null && res.accepted.length > 0) {
				mess += " > Approvati ⚡️\n";
				buttons_line.push({ text: "⚡️", callback_data: "SUGGESTION:MENU:ALBO:ACCEPT" })
			}
			if (res.audaci != null && res.audaci.length > 0) {
				mess += " > I più audaci 🌚\n";
				buttons_line.push({ text: "🌚", callback_data: "SUGGESTION:MENU:ALBO:AUDACI" })
			}
			if (res.notAppreciated != null && res.notAppreciated.length > 0) {
				mess += " > I meno apprezzati 🥀\n";
				buttons_line.push({ text: "🥀", callback_data: "SUGGESTION:MENU:ALBO:ODIATI" })
			}
		} else {
			//				{ text: "🔰", callback_data: "SUGGESTION:MENU:ALBO:MAIN" }

			let is_blank = false;

			buttons_line.push(
				{ text: "🔰", callback_data: "SUGGESTION:MENU:ALBO:MAIN" },
				{ text: "🌪", callback_data: "SUGGESTION:MENU:ALBO:DROP" },
				{ text: "⚡️", callback_data: "SUGGESTION:MENU:ALBO:ACCEPT" },
				{ text: "🌚", callback_data: "SUGGESTION:MENU:ALBO:AUDACI" },
				{ text: "🥀", callback_data: "SUGGESTION:MENU:ALBO:ODIATI" }
			)
			if (page_n == "DROP") {
				if (res.dropped != null && res.dropped.length > 0) {
					mess += "*Scartati *🌪\n";
					for (let i = 0; i < res.dropped.length; i++) {
						if (res.dropped[i].author_id == chat_id) {
							mess += "> ✶ ";
						} else {
							mess += "> ";
						} // ⇨

						mess += generatePartialString(res.dropped[i].text) + " [⇨](" + channel_link_no_parse + "/" + res.dropped[i].id + ")\n";
					}
				} else {
					is_blank = true;
				}

				buttons_line.splice(1, 1);
			} else if (page_n == "ACCEPT") {
				if (res.accepted != null && res.accepted.length > 0) {
					if (res.dropped.length > 0) {
						mess += "\n";
					}
					mess += "*Approvati* ⚡️\n";
					for (let i_1 = 0; i_1 < res.accepted.length; i_1++) {
						if (res.accepted[i_1].author_id == chat_id) {
							mess += "> ✶ ";
						} else {
							mess += "> ";
						}
						mess += generatePartialString(res.accepted[i_1].text) + " [⇨](" + channel_link_no_parse + "/" + res.accepted[i_1].id + ")\n";
					}
				} else {
					is_blank = true;
				}
				buttons_line.splice(2, 1);
			} else if (page_n == "AUDACI") {
				if (res.audaci != null && res.audaci.length > 0) {
					if ((res.accepted.length + res.dropped.length) > 0) {
						mess += "\n";
					}
					mess += "*I più audaci *🌚\n";
					for (let i_2 = 0; i_2 < res.audaci.length; i_2++) {
						if (res.audaci[i_2].author_id == chat_id) {
							mess += "> ✶ ";
						} else {
							mess += "> ";
						}
						mess += Math.abs(res.audaci[i_2].votes) + ": ";
						mess += generatePartialString(res.audaci[i_2].text) + " [⇨](" + channel_link_no_parse + "/" + res.audaci[i_2].id + ")\n";
					}
				} else {
					is_blank = true;
				}
				buttons_line.splice(3, 1);
			} else if (page_n == "ODIATI") {
				if (res.notAppreciated != null && res.notAppreciated.length > 0) {
					if ((res.accepted.length + res.dropped.length + res.audaci.length) > 0) {
						mess += "\n";
					}
					mess += "*I meno apprezzati* 🥀\n";
					for (let i_3 = 0; i_3 < res.notAppreciated.length; i_3++) {
						if (res.notAppreciated[i_3].author_id == chat_id) {
							mess += "> ✶ ";
						} else {
							mess += "> ";
						}
						mess += generatePartialString(res.notAppreciated[i_3].text) + " [⇨](" + channel_link_no_parse + "/" + res.notAppreciated[i_3].id + ")\n";
					}
				} else {
					is_blank = true;
				}
				buttons_line.splice(4, 1);
			}

			if (is_blank == true) {
				mess += " • Woops, c'è  stato un errore contattando il database…\n\n";
			}
		}


		let to_return = simpleDeletableMessage(chat_id, mess);
		to_return.options.reply_markup.inline_keyboard.unshift(buttons_line);


		return getBestOf_resolve(to_return);

	});
}

function askReview(chat_id, curr_user, fullCommand) {
	return new Promise(function (askReview_resolve) {
		if (curr_user.role < 2) {
			return askReview_resolve(simpleMessage(chat_id, "🤔 ???\n\nSeriamente?"));
		} else {
			if (simple_log) console.log("Chiesta revisione di : " + fullCommand.target);
			let codeArray;
			let sugg_id;
			let number;
			if (typeof (fullCommand.target) != 'undefined') {
				codeArray = fullCommand.target.split(":");
				sugg_id = codeArray[0];
				number = parseInt(codeArray[1]);
			}
			if (simple_log) console.log("Dopo il parse: sugg_id -> " + sugg_id + "(" + typeof (sugg_id) + "),  number -> " + number + "(" + typeof (number) + ")");

			if (typeof (sugg_id) == 'string') {
				return tips_handler.getSuggestionInfos(sugg_id, curr_user.id).then(function (sugg_infos) {
					if (sugg_infos == -1) {
						return askReview_resolve(
							simpleDeletableMessage(
								chat_id,
								"😕\nNon ho trovato il suggerimento " + sugg_id + " nel database...")
						);

					}
					if (number < 0 && sugg_infos.msg_id == 0) {
						return askReview_resolve(
							simpleDeletableMessage(
								chat_id,
								"😕\nNon hai specificato il numero del messaggio, e non sono riuscito a recuperarlo dal database...")
						);
					}
					if (sugg_infos.msg_id != 0) {
						number = sugg_infos.msg_id;
					}

					if (!(number > 0)) {
						return askReview_resolve(
							simpleDeletableMessage(
								chat_id,
								"😕\nNon sono riuscito a recuperare il numero del messaggio, dovrai specificarlo manualmente...")
						);
					}
					if (!(fullCommand.comment.length > 5)) {
						let message_text = "*Revisione Suggerimento*\ncompleta il comando\n\n• Sintassi\n· `/suggerimenti revisione` TESTOREVISIONE\n\n";
						message_text += "• Attuale:\n```" + sugg_infos.sugg_text + "```\n";
						return askReview_resolve(simpleDeletableMessage(chat_id, message_text));
					}
					if (simple_log) console.log("Alla revisione: sugg_id -> " + sugg_id + ",  number -> " + number + " (" + typeof (number) + ")");


					let msg_text = "📖 *Revisione Manuale* (Beta)\n\n";
					msg_text += suggestionCode_msg + "`" + sugg_id.toUpperCase() + "` [⇨](" + channel_link_no_parse + "/" + number + ") \n\n";
					msg_text += fullCommand.comment;
					msg_text += "\n\n> Stato: ";
					if (sugg_infos.status == 0) {
						msg_text += "*Aperto*\n";
						msg_text += "> Voti positivi: " + sugg_infos.upVotes + "\n";
						msg_text += "> Voti negativi: " + Math.abs(sugg_infos.downVotes) + "\n";
					} else {
						if (sugg_infos.status == 1) {
							msg_text += "*Approvato* ⚡️\n";
						} else if (sugg_infos.status == -1) {
							msg_text += "*Scartato* 🌪️\n";
						} else {
							msg_text += "*Errore*, inoltra a @nrc382\n";
						}
						msg_text += "> Voti positivi: " + (sugg_infos.upOnClose + sugg_infos.upVotes) + "\n";
						msg_text += "> Voti negativi: " + (sugg_infos.downOnClose + sugg_infos.downVotes) + "\n";
					}
					//msg_text += "\n🔘 " + number + "";

					return tips_handler.saveReview(curr_user.id, fullCommand.comment.trim()).then(function (res) {
						if (res == curr_user.id) {
							return askReview_resolve(reviewMessage(chat_id, sugg_infos.status, msg_text));
						} else {
							askReview_resolve(simpleDeletableMessage(chat_id, "Errore salvando il messaggio...\nSegnala a @nrc382"));
						}
					})
				}).catch(function (err) {
					console.error(err);
				});
			} else {
				return askReview_resolve(
					simpleDeletableMessage(
						chat_id,
						"⚠️ Il comando *" + fullCommand.command + "* è in fase beta\n\n" +
						"Permette di sostituire il testo di un suggerimento già pubblicato sul canale. Effettua controlli minimi...\n" +
						"\nPer usarlo,\n" +
						"\nRispondi ad un suggerimento pubblicato sul canale (con `/suggerimenti revisione`)\n" +
						"\nO specifica l'id suggerimento prima del nuovo testo.\n" +
						"\nPer suggerimenti molto vecchi, potresti dover specificare il numero del messaggio nella chat.\n\n" +
						"Es Completo:\n``` /suggerimenti revisiona AAA00:NUMERO\n\_Testo corsivo\_, \*Testo in Grassetto\*,\n\[link visualizzato\](indirizzo)```\n" +
						"\n_L'opzione prevede un bottone di conferma._"
					)
				);
			}

		}
	});
}

function getAuthorMsg(chat_id, curr_user, fullCommand) {
	return new Promise(async function (getAuthorMsg_resolve) {
		if (curr_user.id != amministratore_suggerimenti) {
			getAuthorMsg_resolve(simpleMessage(chat_id, "???"));
		} else {
			const sugg_info = await tips_handler.getSuggestionInfos(fullCommand.target, curr_user.id);
			if (sugg_info == null) {
				getAuthorMsg_resolve(simpleDeletableMessage(chat_id, "*Whoops!*\nSicuro che `" + fullCommand.target.toUpperCase() + "` sia un codice corretto?"));
			}
			const author_infos = await tips_handler.getUserInfo(sugg_info.author);
			let msg = "📄 *Suggerimento* [" + fullCommand.target + "]" + "(" + channel_link_no_parse + "/" + sugg_info.msg_id + ")\n";
			if (sugg_info.status >= 0) {
				if (sugg_info.status == 0) {
					msg += "\nA giudicare dai voti ";
					if ((sugg_info.upVotes + sugg_info.upOnClose) <= (sugg_info.downVotes + Math.abs(sugg_info.downOnClose))) {
						msg += "avremmo potuto risparmiarcelo ";
					} else {
						msg += "non è poi malaccio. ";
					}
				} else {
					msg += "\nA giudicare dai voti ";
					if (sugg_info.totalVotes <= 2) {
						msg += "qualcuno piangerà...\n*Approvato dalla Fenice!* 😎";
					} else {
						msg += "un buon suggerimento,\nApprovato _dalla Fenice!_ ⚡️";
					}
				}
			} else if (sugg_info.status != -3) {
				msg += "\nA giudicare dai voti ";
				if (sugg_info.totalVotes <= 2) {
					msg += "non un gran suggerimento";
				} else {
					msg += "un buon suggerimento";
				}
				msg += "...\nAd ogni modo è stato scartato, so 🤷‍♂️";
			}
			msg += "\n\n*L'autore:*";
			msg += "\n> È " + ((author_infos.role < 1) ? "stato limitato" : ((author_infos.role == 3) ? "un moderatore" : "un normale utente"));
			if (author_infos.role == 2) {
				msg += "🎖";
			}
			msg += "\n> Il suo profilo: [👤](tg://user?id=" + sugg_info.author + ")";
			return getAuthorMsg_resolve(simpleDeletableMessage(chat_id, msg));
		}
	});
}

function resetCmd(user_info) {
	return new Promise(function (reset_resolve) {
		if (user_info.role == 5) {
			return tips_handler.initialize().
				then(function (init_res) { return tips_handler.setUserRole(amministratore_suggerimenti, 5) }).
				catch(function (error) { console.log(">\tErrore nel set dell'utente Admin"); console.log(error); }).
				then(function (res) { return reset_resolve(invalidMessage(user_info.id, "Rinato! ")) }).
				catch(function (error) { console.log(">\tErrore durante il reset:"); console.log(error); });
		}
	});
}
















//________________________//
//CALLBACKQUERY MANAGERS *//
//________________________//

const voteButton = { up: '🌕', down: '🌑', up_moji: "️👍", down_moji: "👎", hot: "🔥" };
const suggestionCode_msg = "🌀 ";


// gestione dei bottoni
function manageMenu(query, user_info) {
	return new Promise(function (manageMenu_resolve) {
		let queryQ = query.data.split(":")[2];
		if (queryQ === "REFRESH") {
			return mainMenu(user_info).then(function (res) {
				res.mess_id = query.message.message_id;
				return manageMenu_resolve({
					query: { id: query.id, options: { text: "Aggiornato!", cache_time: 1 } },
					toEdit: res
				});
			}).catch(function (err) {
				if (simple_log) console.error(err);
				menuRes = {
					query: { id: query.id, options: { text: "C'è stato un errore!", cache_time: 1 } }
				};
				manageMenu_resolve(menuRes);

			});
		} else if (queryQ === "LIMIT") {
			if (user_info.role <= 3) {
				return manageMenu_resolve({
					query: { id: query.id, options: { text: "Questa funzione è riservata agli amministratori", cache_time: 2, show_alert: true } },
					toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id }
				});
			} else {
				return setMaximumAllowed(query.message.chat.id).then(function (to_return) {
					to_return.mess_id = query.message.message_id;
					return manageMenu_resolve({
						query: { id: query.id, options: { text: "Opzioni admin", cache_time: 2 } },
						toEdit: to_return
					});
				});
			}
		} else if (queryQ === "PERSONAL") {
			let page = 0;
			if (typeof query.data.split(":")[3] == "string") {
				page = query.data.split(":")[3];
			}
			return userMainMenu(user_info, page).then(function (res) {
				res.mess_id = query.message.message_id;
				return manageMenu_resolve({
					query: { id: query.id, options: { text: "Menu Personale", cache_time: 1 } },
					toEdit: res
				});
			});
		} else if (queryQ === "GET_TOVOTE") { // USR: Da votare
			return getOpens(user_info.id, true).then(function (res) {
				res.mess_id = query.message.message_id;
				res.options.reply_markup.inline_keyboard[res.options.reply_markup.inline_keyboard.length - 1].unshift({ text: "⮐", callback_data: "SUGGESTION:MENU:REFRESH" });
				return manageMenu_resolve({
					query: { id: query.id, options: { text: "Suggerimenti da votare", cache_time: 1 } },
					toEdit: res
				});

			});
		} else if (queryQ === "GLOBAL_RECENT") { // USR: Ultimi Approvati
			let full_command = { command: "approvati", target: "", comment: "" };
			if (query.data.split(":")[3] == "REF") {
				full_command.command = "scartati";
			}
			return getRecentlyApproved(user_info.id, user_info, full_command).then(function (res) {
				res.mess_id = query.message.message_id;
				res.options.reply_markup.inline_keyboard[0].unshift({ text: "⮐", callback_data: "SUGGESTION:MENU:REFRESH" });

				return manageMenu_resolve({
					query: { id: query.id, options: { text: "Ultimi Suggerimenti Approvati", cache_time: 1 } },
					toEdit: res
				});
			});
		} else if (queryQ === "MOST_VOTED") { // EDO
			return getMostVoted(user_info, false).then(function (res) {
				return manageMenu_resolve({
					query: { id: query.id, options: { text: "Suggerimento più attivo", cache_time: 2 } },
					toSend: res
				});
			});
		} else if (queryQ === "CHNNL_ADMIN") { // EDO
			queryQ = query.data.split(":")[3];
			if (user_info.role < 5) {
				return manageMenu_resolve({
					query: { id: query.id, options: { text: "Ci hai provato!\n\nSolo la Fenice ha di questi poteri!", cache_time: 2, show_alert: true } },
					toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id }
				});
			} else {  // con CHANNEL entrano solo: if (queryQ === "CLOSE" || queryQ === "OPEN" || queryQ === "LIMIT") {
				let new_warm = 0;
				if (queryQ === "LIMIT") {
					new_warm = query.data.split(":")[4];
				} else if (queryQ == "CLOSE") {
					new_warm = -1 * Math.abs(user_info.warn);
				} else {
					new_warm = Math.abs(user_info.warn);
				}
				return setMaximumAllowed(user_info.id, new_warm).then(function (res) {
					//res.options.reply_markup.inline_keyboard[res.options.reply_markup.inline_keyboard.length - 1].unshift({ text: "⮐", callback_data: "SUGGESTION:MENU:REFRESH" })
					res.mess_id = query.message.message_id;
					return manageMenu_resolve({
						query: { id: query.id, options: { text: "Limite aggiornato!", cache_time: 2 } },
						toEdit: res
					});
				});
			}
		} else if (queryQ === `OPZIONI_ADMIN`) { // EDO
			let res = menu_opzioniAmministratore(user_info.id);
			res.mess_id = query.message.message_id;
			return manageMenu_resolve({
				query: { id: query.id, options: { text: "Opzioni Amministratore", cache_time: 1 } },
				toEdit: res
			});
		} else if (queryQ === "PERSONAL_TMP") { // 
			let message_text = "📜 *Ultima bozza*\n\n";
			if (user_info.tmpSugg == "") {
				message_text += "> Obsoleta!"
			} else {
				message_text += "```" + user_info.tmpSugg.trim() + "```";
			}
			let res = simpleDeletableMessage(user_info.id, message_text);
			res.mess_id = query.message.message_id;
			res.options.reply_markup.inline_keyboard[res.options.reply_markup.inline_keyboard.length - 1].unshift({ text: "⮐", callback_data: "SUGGESTION:MENU:PERSONAL" });
			return manageMenu_resolve({
				query: { id: query.id, options: { text: "Ultima bozza", cache_time: 1 } },
				toEdit: res
			});
		} else if (queryQ === "PERSONAL_RECENT") { // 
			return getOpensFor(user_info.id).then(function (res) {
				res.mess_id = query.message.message_id;
				res.options.reply_markup.inline_keyboard[res.options.reply_markup.inline_keyboard.length - 1].unshift({ text: "⮐", callback_data: "SUGGESTION:MENU:PERSONAL" });
				return manageMenu_resolve({
					query: { id: query.id, options: { text: "I tuoi Suggerimenti", cache_time: 1 } },
					toEdit: res
				});
			});
		} else if (queryQ === "PERSONAL_REFUSED") { // 
			return getRefusedOf(user_info.id, user_info, {}).then(function (res) {
				res.mess_id = query.message.message_id;
				res.options.reply_markup.inline_keyboard[res.options.reply_markup.inline_keyboard.length - 1].unshift({ text: "⮐", callback_data: "SUGGESTION:MENU:PERSONAL" });
				return manageMenu_resolve({
					query: { id: query.id, options: { text: "I tuoi Suggerimenti Scartati", cache_time: 1 } },
					toEdit: res
				});
			});
		} else if (queryQ === "PERSONAL_APPROVED") { // getBestOf
			return getApprovedOf(user_info.id, user_info, {}).then(function (res) {
				res.mess_id = query.message.message_id;
				res.options.reply_markup.inline_keyboard[res.options.reply_markup.inline_keyboard.length - 1].unshift({ text: "⮐", callback_data: "SUGGESTION:MENU:PERSONAL" });
				return manageMenu_resolve({
					query: { id: query.id, options: { text: "I tuoi Suggerimenti Approvati", cache_time: 1 } },
					toEdit: res
				});
			});
		} else if (queryQ === "ALBO") { // getBestOf
			return getBestOf(user_info.id, query.data.split(":")[3]).then(function (res) {
				res.mess_id = query.message.message_id;
				res.options.reply_markup.inline_keyboard[res.options.reply_markup.inline_keyboard.length - 1].unshift({ text: "⮐", callback_data: "SUGGESTION:MENU:PERSONAL" });
				return manageMenu_resolve({
					query: { id: query.id, options: { text: "Albo dei Suggerimenti", cache_time: 1 } },
					toEdit: res
				});
			});
		} else if (queryQ === "TOP") {
			return topMessage(user_info.id).then(function (res) {
				res.mess_id = query.message.message_id;
				res.options.reply_markup.inline_keyboard[res.options.reply_markup.inline_keyboard.length - 1].unshift({ text: "⮐", callback_data: "SUGGESTION:MENU:PERSONAL" });
				return manageMenu_resolve({
					query: { id: query.id, options: { text: "Top Contributori", cache_time: 1 } },
					toEdit: res
				});
			});
		} else if (queryQ === "GET_OPENS") { // 
			return getOpens(user_info.id, false).then(function (res) {
				res.mess_id = query.message.message_id;
				res.options.reply_markup.inline_keyboard[res.options.reply_markup.inline_keyboard.length - 1].unshift({ text: "⮐", callback_data: "SUGGESTION:MENU:REFRESH" });

				return manageMenu_resolve({
					query: { id: query.id, options: { text: "Suggerimenti Aperti", cache_time: 1 } },
					toEdit: res
				});
			}); //
		} else if (queryQ === "MANAGE_RECENT") {
			return tips_handler.getSuggestionInfos(query.data.split(":")[3], user_info.id).then(function (sugg_infos) {
				let to_return = manageSuggestionMessage(user_info.id, user_info.role, sugg_infos, "");
				//to_return.mess_id = query.message.message_id;

				return manageMenu_resolve({
					query: { id: query.id, options: { text: "Seconda analisi…", cache_time: 2 } },
					toSend: to_return
				});

			});
		}

	});
}



// le funzioni che seguono rispondono a bottoni inline

function getTagsArray() {
	const suggestion_tag = {
		primo: ['🗺', '#loot', '#plus', '#community', "#tools"],
		secondo: ['👤', '#alchimia', '#drago', '#giocatore', '#imprese', '#team', '#talenti', '#vocazione'],
		bis: ['🎮', '#assalto', '#craft', '#contrabbandiere', '#dungeon', '#figurine', '#incarichi', '#ispezioni', '#mappe', '#mercato', '#missioni', "#top", '#viaggi'],
		ter: ['🎭', "#eventi", '#casadeigiochi', '#vette', '#globali', '#polvere', '#miniere'],
		terzo: ['⚙', '#estetica', '#meccaniche', '#bottoni', '#testi', '#comandi'],
		quarto: ['⭐️', '#novità', '#revisione'],
		quinto: ['👥', '#discussione']
	};

	let res_array = [];
	let levels = Object.keys(suggestion_tag);
	levels.forEach(function (level) {
		let tags = Object.keys(suggestion_tag[level]);
		for (let i = 1; i < tags.length; i++) {
			res_array.push(suggestion_tag[level][tags[i]]);
		}
	});
	return res_array
}

function reviewInsert(suggestion_text, entities) {
	if (manual_log) { console.log(">\treviewInsert"); }
	return new Promise(function (reviewInsert_resolve) {
		if (censura) {
			if (suggestion_text.length < 3) {
				return reviewInsert_resolve(-3);
			} else {
				const private_tags = ["#approvato", "#chiuso"];
				private_tags.forEach(function (tag) {
					if (manual_log) { console.log(">\t\t\t Tag: " + tag + " -> " + (entities.indexOf(tag))); }
					if (entities.indexOf(tag) >= 0) {
						if (manual_log) { console.log(">\t\t\t-> " + tag); }
						let res = ["«"]
						res.push(tag);
						res.push("»");
						return reviewInsert_resolve(res);
					}
				})
				entities.splice(0, 1);

				let discussione_bool = false;

				if (entities.length >= 1) {
					if (entities.length > 5) { //troppi tag
						return reviewInsert_resolve(-2);
					}

					let tags_array = getTagsArray();
					let out_tags = [];
					entities.forEach(function (used_tag) {
						if (used_tag == "#discussione") {
							discussione_bool = true;
						} else if (tags_array.indexOf(used_tag) < 0) {
							out_tags.push(used_tag);
						}
					});

					if (out_tags.length > 0) {
						if (manual_log) { console.log(">\t\t\tDovrei aggiungere:" + out_tags.length + " tags.."); }
						let res = ["«"]
						res = res.concat(out_tags);
						res.push("»");
						return reviewInsert_resolve(res);
					}
				} else {
					return reviewInsert_resolve(-2);
				}

				let tmp_word;
				for (let i = 0; i < suggestion_text.length; i++) {
					if (suggestion_text[i].trim().length > 0) {
						tmp_word = suggestion_text[i].trim().split("_").join("").split("*").join("").split("`").join("");
						if (tmp_word.indexOf("#") >= 0) {
							return reviewInsert_resolve(-5);
						} else if ((tmp_word.indexOf("👨‍💻") + tmp_word.indexOf("⚡️") + tmp_word.indexOf("🌀") + tmp_word.indexOf("🌪")) != -4) {
							let res = ["«"]
							res.push(tmp_word);
							res.push("»");
							return reviewInsert_resolve(res);
						}
					}
				}

				return tips_handler.getBannedWords().then(function (bannedArray) { //to do *** array di sugg_id e index (nel model) per autocomplete
					let sugg_id = "nrc";
					let index = -1;
					if (manual_log) { console.log(">\tOttenuta la lista delle parole bandite [" + bannedArray.length + "]"); }

					for (var text_count = 0; text_count < suggestion_text.length; text_count++) {
						if (suggestion_text[text_count].length <= 0) {
							suggestion_text.splice(text_count, 1);
						} else if (text_count < (suggestion_text.length - 2) && suggestion_text[text_count].toLowerCase() == "suggerimento") { // preparo per autocomplete del link. Funziona solo per un suggerimento (l'ultimo)
							if (suggestion_text[text_count + 1].length >= 5 && !isNaN(parseInt(suggestion_text[text_count + 1].substring(0, 3)))) {
								sugg_id = suggestion_text[text_count + 1].substring(0, 5);
								index = text_count;
							}
						} else if (suggestion_text[text_count].length >= 3) {
							for (var banned_count = 0; banned_count < bannedArray.length; banned_count++) {
								// qui si potrebbe mettere l'autocompleate del link suggerimento... ma è difficile
								if (suggestion_text[text_count].toLowerCase() != "flaridion" && suggestion_text[text_count].toLowerCase().indexOf(bannedArray[banned_count].banditw) >= 0) {
									return reviewInsert_resolve(["!", suggestion_text[text_count]]);
								}
							}

						}
					}

					return tips_handler.getIDOf(sugg_id).then(function (sugg_messID) {
						let final_text;
						if (sugg_messID.length == 1) { // autocomplete di UN link
							let autocomplete = "[suggerimento]";
							if (sugg_messID[0].id > 0) {
								autocomplete += "(" + channel_link_no_parse + "/" + sugg_messID[0].id + ")";
							}
							autocomplete += " `" + sugg_id + "`";

							suggestion_text[index] = autocomplete;
							suggestion_text.splice(index + 1, 1);
						} else {
							if (simple_log) console.log(sugg_messID);
							if (index > 0) {
								suggestion_text[index + 1] = "`" + suggestion_text[index + 1] + "` (❗️)";
							}
						}
						final_text = entities.join(" ") + "\n\n" + suggestion_text.join(" ").split("\n ").join("\n").trim();
						let type = "suggestion";
						if (discussione_bool) {
							type = "discussion";
						}
						return reviewInsert_resolve([type, final_text]);
					})
				}).catch(function (err) { console.log(err); return reviewInsert_resolve(false); });
			}
		}
	});
}

function propouseInsert(user_info, text, entities, isQuick, message) {
	if (manual_log) { console.log(">\tpropouseInsert"); }
	if (simple_log) { console.log("- Richiesta inserimento: -> tags:" + entities.join(" ")); }

	return new Promise(function (propouseInsert_resolve) {
		let condition_urgent = entities.indexOf("#manutenzione");
		if (condition_urgent >= 0 && user_info.id == amministratore_suggerimenti) {
			return propouseInsert_resolve(insertMessage(user_info.id, text.join(" "), false));
		} else {
			condition_urgent = (user_info.id == amministratore) || (user_info.id == amministratore_suggerimenti);
			if (condition_urgent) {
				let message = "";
				if (entities.indexOf("#annuncio") >= 0) {
					if (simple_log) { console.log("- è un annuncio"); }
					message = "#Annuncio `della Fenice` 🔥\n\n" + text.join(" ").split("\n ").join("\n").trim()

				} else if (entities.indexOf("#salve") >= 0) {
					if (simple_log) console.log("- è un annuncio");
					message = "#Annuncio `dal Bot` \n\n" + text.join(" ").split("\n ").join("\n").trim();
				}
				if (message.length > 0) {
					return tips_handler.saveTmp_Suggestion(user_info.id, message).then(function (res) {
						return propouseInsert_resolve(insertMessage(user_info.id, message, false));
					});
				}
			}
		}
		if (simple_log) { console.log("- NON è un annuncio"); }

		if (user_info.role < 1) {
			let unableToInsert_msg = "🤭 *Devi aver fatto qualche cosa di grave*\n\n_T'è stato impedito di inserire nuovi suggerimenti..._\n";
			return propouseInsert_resolve({
				toSend: simpleDeletableMessage(user_info.id, unableToInsert_msg + "\nManda `/suggerimenti` per maggiori informazioni..."),
				toDelete: { chat_id: user_info.id, mess_id: message.message_id }
			});
		}
		if (manual_log) { console.log(">\t\tUltimo suggerimento: " + user_info.lastSugg + ", check: " + (user_info.lastSugg != 0 && user_info.role < 5)); }

		return userRushManager(user_info, entities).then(function (rus_res) {
			if (rus_res != true) { // ******+ to do -> bottone tags
				return propouseInsert_resolve(simpleDeletableMessage(user_info.id, rus_res));
			}
			if (manual_log) {
				console.log(">\tCensura " + (censura == true ? "" : "non ") + "attiva");
				console.log(">\tQuickInsert -> " + isQuick);
				console.log(">\tIl messaggio ha " + text.length + " parole");
			}
			return reviewInsert(text, entities).then(function (review_res) {
				//
				if (review_res == false) {
					return propouseInsert_resolve(invalidMessage(user_info.id, "C'è stato un errore nell'elaborazione.\nSe puoi, contatta @nrc382"));
				} else if (review_res == -2) {
					if (entities.length < 2)
						return propouseInsert_resolve(invalidMessage(user_info.id, generateTagString()));
					return propouseInsert_resolve(invalidMessage(user_info.id, "🙄\nPer favore,\nCerca di usare piu di un tag ed in maniera coerente al tuo messaggio"));
				} else if (review_res == -3) {
					return propouseInsert_resolve(invalidMessage(user_info.id, "Un po corto per essere un suggerimento...\nIntendevi ...cosa?"));
				} else if (review_res == -4) {
					return propouseInsert_resolve(invalidMessage(user_info.id, "Deloo e gli altri stanno lavorando ad una soluzione che riporti il tools.\nPer il momento i suggerimenti su questo bot sono sospesi."));
				} else if (review_res == -5) {
					return propouseInsert_resolve(invalidMessage(user_info.id, "🕵️ _Sembrerebbe quasi tu sia a caccia di bug!_\n\nPer favore, non noscondere i tags tra i marcatori di stile..."));
				} else {
					if (simple_log) { console.log("- Risultato review: -> " + review_res + " [" + (typeof review_res) + "]"); }
					if (manual_log) {
						console.log(typeof review_res);
						console.log(typeof (review_res) == 'string');
					}

					if (typeof (review_res) == 'object' && review_res.length > 0) {
						if (review_res[0] == "!") {
							return propouseInsert_resolve(simpleDeletableMessage(
								user_info.id,
								"😱 *Cattivo!*\n\n\"\`" + review_res[1] + "\`\"?\n_...non si dicono le parolacce!_"
							)
							);
						} else if (review_res[review_res.length - 1] == "»") {
							return propouseInsert_resolve(
								invalidMessage(
									user_info.id,
									"\nPer evitare confusione, non posso farti usare _"
									+ review_res.join(" ") + "_ nel tuo suggerimento...\n\nManda: " +
									"`/suggerimenti tags` per una lista dei tag in uso nel " +
									channel_link + "")
							);
						} else if (review_res[0] == "suggestion" || review_res[0] == "discussion") {
							return tips_handler.saveTmp_Suggestion(user_info.id, review_res[1]).then(function (res) {
								let res_tex = "";
								let res_bool = false;
								if (review_res[0] == "discussion") {
									res_tex = "📝*Ricontrolla la forma*\n\n" + review_res[1];
									res_bool = true;
								} else {
									if (isQuick) {
										res_tex = "📝 *Vuoi pubblicare questo suggerimento?*\n\n";
									} else {
										res_tex = "👁‍🗨 *Anteprima del suggerimento*\n";
										if (entities.indexOf("#tools") >= 0) {
											res_tex += "_ricorda che il tag #tools è riservato ai suggerimenti per @LootBotTools_\n"
										}
										res_tex += "\n";
									}
									res_tex += review_res[1];
								}
								return propouseInsert_resolve(insertMessage(user_info.id, res_tex, res_bool));
							});
						}
					} else {
						if (review_res == 'emoji') {
							return propouseInsert_resolve(invalidMessage(user_info.id, "Sicurmente _in buona fede_,\nMa hai usato delle emoji riservate nel tuo messaggio.\nCosì non può essere pubblicato...  😔"));
						} else {
							return propouseInsert_resolve(invalidMessage(user_info.id, "Per favore, contatta @nrc382\n\nErrore 42 😱"));
						}
					}
				}
			});
		});
	});
}

function manageOpinion(query, user_info) { // to do *** cacca
	if (manual_log) { console.log(">\manageOpinion"); }

	return new Promise(async function (manageOpinion_resolve) {
		let request = query.data.split(":");
		let sugg_id = resolveCode(query.message.text);
		let number = parseInt(query.message.text.substring(query.message.text.indexOf("🔘 ") + "🔘 ".length).trim());
		if (simple_log) { console.log("- Richiesta modifica per suggerimento: " + sugg_id); }

		try {
			const sugg_infos = await tips_handler.getSuggestionInfos(sugg_id, user_info.id);
			if (sugg_infos == -1) {
				return manageOpinion_resolve(
					simpleDeletableMessage(chat_id, "*Woops,* 😕\n_c'è stato un errore..._\n\nSe puoi, inoltra ad @nrc382\n[errore CHO-001]")
				);
			} else if (sugg_infos.msg_id == 0) {
				if (simple_log) { console.log("- Non Trovato id reale : fornito -> " + number); }
				if (!(number > 0)) {
					return manageOpinion_resolve(simpleDeletableMessage(
						chat_id,
						"😕\nNon sono riuscito a recuperare il numero del messaggio, dovrai specificarlo manualmente...")
					);
				}
			} else {
				number = sugg_infos.msg_id;
			}
			console.log(sugg_infos);

			if (request[2] == "EDIT") {
				return manageOpinion_resolve(simpleDeletableMessage(
					chat_id,
					"😕\nLa funzione non è ancora attiva...\nPressa @nrc382 ;)")
				);
			} else {
				if (simple_log) { console.log("- Richiesto cambio di opinione, nuova: -> " + request[2]); }

				let new_status;
				if (request[2] == "REOPEN") {
					new_status = 0;
				} else {
					new_status = request[2];
				}

				let update_res = await tips_handler.setSuggestionStatus(sugg_id, new_status);

				if (update_res == -1) {
					return manageOpinion_resolve(
						simpleDeletableMessage(chat_id, "😕\nSegnala a @nrc382\n[errore CHO-9]")
					);
				} else if (request[2] == "REOPEN") {
					let sugg_text = sugg_infos.sugg_text != "undefined" ? sugg_infos.sugg_text.trim() : "";

					if (sugg_text.indexOf("#chiuso ") >= 0) {
						sugg_text = sugg_text.split("\n").slice(1).join("\n").trim();
					}

					sugg_text = "#riaperto\n\n" + sugg_text;
					update_res = await tips_handler.updateSuggestionText(sugg_id, sugg_text);

					sugg_text += "\n\n" + suggestionCode_msg + "\`" + sugg_id.toUpperCase() + "\`\n\n> Appena riaperto!";
					let toEdit_res = simpleToEditMessage("@" + channel_name, number, sugg_text);
					toEdit_res.options.reply_markup = {
						inline_keyboard: [
							[{
								text: voteButton.up,
								callback_data: 'SUGGESTION:UPVOTE'
							},
							{
								text: voteButton.down,
								callback_data: 'SUGGESTION:DOWNVOTE'
							}],
							[
								{
									text: "Appena riaperto",
									callback_data: 'SUGGESTION:AIDBUTTON:SHOW'
								}
							]]
					}

					let toSend_text = "😊 *Wow!*\n\n";
					if (sugg_infos.status > 0) {
						toSend_text = "😲 *Woops!\n\n*";
					}
					toSend_text += "Un tuo [suggerimento](" + channel_link_no_parse + "/" + sugg_infos.msg_id + ") è stato riaperto dalla Fenice!";

					// 
					return manageOpinion_resolve({
						query: { id: query.id, options: { text: "Suggerimento ri aperto!", cache_time: 3, show_alert: true } },
						toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id },
						toEdit: toEdit_res,
						toSend: simpleDeletableMessage(sugg_infos.author, toSend_text)
					});

				} else {
					let onChannel_text = "";
					let query_text = "Il suggerimento " + sugg_id + " è ora ";
					let toSend_text_1 = "";



					if (request[2] > 0) {
						query_text += "#approvato\n";
						toSend_text_1 += "😊 *Wow!*\n\n";
						if (user_info.id == 340271798) {
							onChannel_text += "💾️ Delooo ha #apprezzato questo suggerimento ";
							toSend_text_1 += "@Delooo, autore de @LootToolsBot, ha apprezzato il tuo [suggerimento](" + channel_link_no_parse + "/" + number + "!";
						} else {
							onChannel_text += "\n#piaciuto in seconda analisi ";
							toSend_text_1 += "Un tuo [suggerimento](" + channel_link_no_parse + "/" + number;
							toSend_text_1 += ") è stato *approvato*";
							toSend_text_1 += ", in seconda analisi, dalla Fenice ⚡\n\n";

						}
					} else {
						toSend_text_1 += "😢 *Sigh!*\n\n";

						if (user_info.id == 340271798) {
							onChannel_text += "💾️ Delooo ha #apprezzato questo suggerimento ";
							toSend_text_1 += "@Delooo, autore de @LootToolsBot ha scartato il tuo [suggerimento](" + channel_link_no_parse + "/" + number + "!\n\n";

						} else {
							toSend_text_1 += "Un tuo [suggerimento](" + channel_link_no_parse + "/" + number + ") è stato scartato";
							if (user_info.id == amministratore) {
								toSend_text_1 += ", in seconda analisi, dalla Fenice!\n\n";
								query_text = "#scartato\n";
								onChannel_text += "\n#scartato in seconda analisi ";
							} else {
								query_text += "#chiuso\n";
								onChannel_text += "#chiuso in seconda analisi ";
								toSend_text_1 += " da un moderatore!\n\n";
							}
						}

					}


					onChannel_text += "\n· Dopo " + getEnlapsed_text(sugg_infos.sDate) + "\n" + sugg_infos.sugg_text.trim() + "\n\n" + suggestionCode_msg + "\`" + sugg_id.toUpperCase() + "\`";
					onChannel_text += reportLine(sugg_infos);

					return manageOpinion_resolve({
						query: { id: query.id, options: { text: query_text, cache_time: 5, show_alert: true } },
						toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id },
						toEdit: simpleToEditMessage("@" + channel_name, number, onChannel_text),
						toSend: simpleDeletableMessage(sugg_infos.author, toSend_text_1)
					});
				}

			}
		} catch (err) {
			if (simple_log)
				console.error(err);
			return manageOpinion_resolve({ query: { id: query.id, options: { text: "Whoops, Errore!\nSegnala a @nrc382", cache_time: 2, show_alert: true } } });
		}


	});
}

function managePublish(in_query, user_info) {
	if (manual_log || simple_log) { console.log("- Richiesta pubblicazione, testo: -> " + user_info.tmpSugg); }

	return new Promise(function (managePublish_resolve) {
		if (typeof user_info.tmpSugg != "string" || user_info.tmpSugg.length <= 0) {
			return managePublish_resolve({
				query: { id: in_query.id, options: { text: "Woops!\n\nChe strano...", cache_time: 2, show_alert: true } },
				toSend: simpleMessage(user_info.id, "*Woops!*\n\nMi spiace, ma c'è stato un qualche errore...\nRimandami il messaggio per una nuova anteprima (:"),
				toEdit: simpleToEditMessage(in_query.message.chat.id, in_query.message.message_id, "*SCADUTO!*\n\n" + in_query.message.text)
			});

		} else if (user_info.role <= 0) {
			return managePublish_resolve({ query: { id: in_query.id, options: { text: "🤡\nCi hai provato!\n\nAl momento non puoi proporre nuovi suggerimenti", cache_time: 2, show_alert: true } } });
		} else {
			if (manual_log) { console.log(in_query.message.text); }
			let condition_urgent = false; // ((user_info.id == phenix_id) || (user_info.id == theCreator)); // || (user_info.id == theCreator));
			let date_now = Date.now() / 1000;
			let usr_delay = 5;
			let delay_text = "Prenditi qualche secondo";
			let lastSugg_enlapsed = isNaN(user_info.lastmsg) ? 60 : (date_now - user_info.lastmsg);
			if (user_info.tmpSugg.length > 100) {
				usr_delay += 7 * Math.floor(user_info.tmpSugg.length / 100);
			}

			if (usr_delay > 60) {
				delay_text = "Prenditi almeno un minuto...";
				usr_delay = 60;
			}


			if (condition_urgent) {
				if (in_query.message.text.indexOf("🔥") == 0) {
					return managePublish_resolve({
						query: { id: in_query.id, options: { text: "Pubblico l'annuncio..." } },
						toSend: simpleMessage("@" + channel_name, user_info.tmpSugg),
						toEdit: simpleToEditMessage(in_query.message.chat.id, in_query.message.message_id, "*Annuncio pubblicato!*\n" + user_info.tmpSugg)
					});
				} else if (in_query.message.text.indexOf("🤖") == 0) {
					return managePublish_resolve({
						query: { id: in_query.id, options: { text: "Pubblico l'annuncio..." } },
						toSend: simpleMessage("@" + channel_name, user_info.tmpSugg),
						toEdit: simpleToEditMessage(in_query.message.chat.id, in_query.message.message_id, "*Annuncio pubblicato!*\n" + user_info.tmpSugg)
					});
				}
			} else if (lastSugg_enlapsed < usr_delay) {
				return managePublish_resolve({
					query: {
						id: in_query.id,
						options: {
							text: "👁‍🗨\nControlla il tuo suggerimento!\n\n" + delay_text + " e ricorda:\n\nMigliore è il linguaggio che usi, migliore è la qualità del canale...\n\n🙏",
							show_alert: true,
							cache_time: 5
						}
					}
				}
				);
			}

			return userRushManager(user_info, in_query.message.entities).then(function (rus_res) {
				if (rus_res != true) {
					return managePublish_resolve(simpleDeletableMessage(in_query.message.chat.id, rus_res));
				} else {
					return tips_handler.insertSuggestion(user_info.id, user_info.tmpSugg).then(function (new_suggestion) {
						if (new_suggestion == false) {
							let invalid_msg = invalidMessage(in_query.message.chat.id, "*Impossibile Pubblicare*\n_saturazione id_\n\nDesolato, al momento non è possibile pubblicare nuovi suggerimenti");
							invalid_msg.options.reply_to_message_id = in_query.message.message_id;

							return managePublish_resolve({
								query: { id: in_query.id, options: { text: "Woops!" } },
								toSend: simpleDeletableMessage(amministratore_suggerimenti, "Aiaiai...\nSon finiti gli id?"),
								toEdit: invalid_msg
							});
						} else if (new_suggestion) {
							let toDate = new Date(date_now * 1000);
							let date_string = "";
							if (toDate.getHours() != 1) {
								date_string += "alle " + toDate.getHours() + ":" + ('0' + toDate.getMinutes()).slice(-2);
							} else {
								date_string += "al'" + toDate.getHours() + ":" + ('0' + toDate.getMinutes()).slice(-2);
							}
							if (toDate.getDate() == 1 || toDate.getDate() == 8 || toDate.getDate() == 11) {
								date_string += " dell'"
							} else {
								date_string += " del ";
							}
							date_string += toDate.getDate() + "." + (toDate.getMonth() + 1);
							let toEdit_text = "📢 *Suggerimento " + new_suggestion.SUGGESTION_ID + "*\n\nPubblicato " + date_string;
							let edited = simpleToEditMessage(in_query.message.chat.id, in_query.message.message_id, toEdit_text);
							edited.options.reply_markup = {
								inline_keyboard: [[{ text: "Menu", callback_data: "SUGGESTION:MENU:REFRESH" }, { text: "Canale", url: channel_link_no_parse }]]
								// 					line += "      [" + text + "](" + channel_link_no_parse + "/" + currentS.opens[i].number + ")";

							}
							return tips_handler.updateAfterPublish(user_info.id, date_now, date_now).then(function (update_res) {
								if (update_res == -1) {
									return managePublish_resolve({ toSend: simpleDeletableMessage(in_query.message.chat.id, "*Woops!*\n\nSi è verificato un probema grave (codice P:2)...\nse riesci, contatta @nrc382") });
								}

								let toSend_res = suggestionMessage(user_info.tmpSugg + "\n\n" + suggestionCode_msg + "\`" + new_suggestion.SUGGESTION_ID + "\`");
								return managePublish_resolve({
									query: { id: in_query.id, options: { text: "Suggerimento pubblicato" } },
									toSend: toSend_res,
									toEdit: edited
								});
							});
						} else {
							return managePublish_resolve({ toSend: simpleDeletableMessage(in_query.message.chat.id, "*Woops!*\n\nSi è verificato un probema grave (codice P:1)...\nse riesci, contatta @nrc382") });
						}
					});
				}
			});
		}
	});

}

function manageAvvisoPublish(query, user_info, type) {
	return new Promise(function (manageAvvisoPublish_res) {
		if (user_info.id != amministratore) {
			return manageAvvisoPublish_res({
				query: { id: query.id, options: { text: "Ci hai provato!\n\nSolo edo pubblica su Avvisi", cache_time: 5, show_alert: true } },
				toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id }
			});
		} else { // avvisi_channel_name
			let shedule_send = simpleMessage("@" + avvisi_channel_name, user_info.tmpSugg);
			if (type != "NOW") {
				let now_date = new Date(Date.now());
				let shedule_date = new Date(Date.now());

				shedule_date.setDate(now_date.getDate() + (7 + 5 - now_date.getDay()) % 7);
				shedule_date.setHours(12, 0, 3);
				shedule_send.options.schedule_date = shedule_date.getTime();

				console.log(shedule_send.options);
			}
			return manageAvvisoPublish_res({
				query: { id: query.id, options: { text: "Pubblicato!\n\nAvviso pubblicato su: " + avvisi_channel_name, cache_time: 3, show_alert: true } },
				toSend: shedule_send,
				toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id }
			});
		}
	});
}

function manageVote(query, user_info, vote) {
	if (manual_log) { console.log(">\tmanageVote"); }
	return new Promise(async function (manageVote_resolve) {
		if (user_info.role > 0) {
			let suggestion_id = resolveCode(query.message.text);
			if (simple_log) { console.log("- Votazione " + vote + " per il suggerimento: " + suggestion_id); }

			let sugg_infos = await tips_handler.getSuggestionInfos(suggestion_id, user_info.id)
			let voteSugg = {};
			let final_text = "";

			if (sugg_infos.status != 0) {
				final_text = closedSuggestionUpdated_text(sugg_infos, user_info.role);
				final_text += suggestionCode_msg + "\`" + sugg_infos.s_id + "\`";
				final_text += reportLine(sugg_infos);

				voteSugg.toEdit = simpleToEditMessage(query.message.chat.id, query.message.message_id, final_text);
				voteSugg.query = { id: query.id, options: { text: "Il suggerimento non è piu aperto!", cache_time: 2 } }
				return manageVote_resolve(voteSugg);
			} else {
				let set_res = await tips_handler.setMsgID(sugg_infos.msg_id, suggestion_id, query.message.message_id);
				if (user_info.role < 5) {
					let insertRes = await tips_handler.insertVote(user_info.id, suggestion_id, vote, sugg_infos.author);
					if (simple_log) console.log(insertRes);
				}

				if (user_info.role >= 5) { // Voto di EDO
					if (simple_log) console.log("> Votazione di Edo -> " + vote);

					if (vote == 1) {
						voteSugg.query = { id: query.id, options: { text: (vote == 1 ? "Approvato" : "Chiuso"), cache_time: 2 } };
						sugg_infos.status = 1;
						final_text = closedSuggestionUpdated_text(sugg_infos, user_info.role);


						let totalCountedVotes = (sugg_infos.upVotes + sugg_infos.downVotes);
						let authorMsg_text;

						authorMsg_text = "😊 *Wow!*\n\nUn tuo [suggerimento](" + channel_link_no_parse + "/";
						authorMsg_text += query.message.message_id + ") è stato *approvato* dalla Fenice ⚡";
						if (sugg_infos.totalVotes > 1) {
							authorMsg_text += " dopo che " + ((totalCountedVotes < 10) ? "appena " : "");
							authorMsg_text += totalCountedVotes + " utenti lo avevano votato";
							if (totalCountedVotes > 10) {
								if (sugg_infos.upVotes > sugg_infos.totalVotes - (sugg_infos.totalVotes / 20))
									authorMsg_text += ", praticamente tutti positivamente!!";
								else {
									authorMsg_text += " (di questi solo " + (sugg_infos.downVotes) + " negativamente)";
								}
							}
							authorMsg_text += "\n*Benfatto* 🥂";
						} else if (sugg_infos.downVotes > 3) {
							authorMsg_text += "\n...in netta controtendenza, hai proposto qualcosa di evidentemente interessante.\n\nQuesta volta hai segnato _doppio punteggio_,\n*Benfatto!* 🍻";
						}

						let close_res = await tips_handler.closeSuggestion(suggestion_id, vote, final_text, sugg_infos.author);

						final_text += "\n#piaciuto alla Fenice ⚡\n";
						final_text += suggestionCode_msg + "\`" + sugg_infos.s_id + "\`";
						final_text += reportLine(sugg_infos);

						if (simple_log) console.log("> Chiuso suggerimento " + close_res[0]);
						voteSugg.toSend = simpleDeletableMessage(sugg_infos.author, authorMsg_text);
						voteSugg.toEdit = simpleToEditMessage(query.message.chat.id, query.message.message_id, final_text);
						return manageVote_resolve(voteSugg);


					} else if (vote == -1) {
						voteSugg.toSend = manageSuggestionMessage(user_info.id, user_info.role, sugg_infos, "CLOSE_OPTIONS");
						voteSugg.query = { id: query.id, options: { text: "Prosegui in chat privata...", cache_time: 4 } };

						return manageVote_resolve(voteSugg);
					}

				} else { // Voto
					final_text = "";

					if (sugg_infos.msg_id == null || sugg_infos.msg_id <= 0) {
						if (query.message.entities.length > 0) {
							let tmp_entities = query.message.entities;
							for (let i = 0; i < tmp_entities.length; i++) {
								if (tmp_entities[i].type == 'hashtag') {
									let curr_tag = query.message.text.substr(tmp_entities[i].offset, tmp_entities[i].length);
									if (curr_tag == "#tools") {
										if (simple_log) { console.log("-> messaggio per Deloo!"); }
										voteSugg.toSend = delooMessage(query.message.message_id, suggestion_id);
										break;
									}
								}
							}
						}
					}

					final_text += sugg_infos.sugg_text + "\n\n" + suggestionCode_msg + "\`" + suggestion_id + "\`";

					if (sugg_infos.usr_prevVote == 0) {
						voteSugg.query = {
							id: query.id,
							options: {
								text: ((vote > 0) ? voteButton.up + " " + sugg_infos.upVotes : voteButton.down + " " + sugg_infos.downVotes) + "  +1",
								cache_time: 2
							}
						};
						sugg_infos.totalVotes += vote;
						if (vote == 1) {
							sugg_infos.upVotes += 1;
						} else if (vote == -1) {
							sugg_infos.downVotes += 1;
						}
					} else {
						voteSugg.query = { id: query.id, options: { text: "Voto rimosso...", cache_time: 2 } };
						sugg_infos.totalVotes -= 1;
						if (vote == 1) {
							sugg_infos.upVotes -= 1;
						} else if (vote == -1) {
							sugg_infos.downVotes -= 1;
						}
					}
					let sviluppatori = sugg_infos.devs == null ? [] : sugg_infos.devs.split(":");

					if (sviluppatori.length > 0) {
						final_text += "\n\n> *Sviluppatori di Lootia*\n"
						if (sviluppatori.length == 1) {
							// Ci sarebbe già uno sviluppatore pronto ad implementare la funzione
							final_text += "Ci sarebbe già uno sviluppatore pronto ad implementare il suggerimento:\n";
						} else {
							final_text += "Sviluppatori pronti ad implementare il suggerimento:\n";
						}

						for (let i = 0; i < sviluppatori.length; i++) {
							final_text += `• ${sviluppatori[i]}\n`;
						}
					}
					final_text += proportionTextCalc(sugg_infos.totalVotes);

					voteSugg.toEdit = suggestionEditedMessage(query.message.chat.id, query.message.message_id, final_text, sugg_infos);
					return manageVote_resolve(voteSugg);
				}
			}

		} else {
			return manageVote_resolve({ query: { id: query.id, options: { text: "Paenitet!\n\n😞\nNon ti è consentito nemmeno votare…", cache_time: 4, show_alert: true } } });
		}
	});
}

function manageReview(query, user_info) { // to do *** cacca grossa
	if (manual_log) { console.log(">\tmanageReview"); }

	return new Promise(async function (manageReview_resolve) {
		let request = query.data.split(":");
		if (manual_log) console.log(request);
		let sugg_id = resolveCode(query.message.text);
		let number = parseInt(query.message.text.substring(query.message.text.indexOf("🔘 ") + "🔘 ".length).trim());
		let newStatus;
		if (simple_log) { console.log("- Richiesta review per suggerimento: " + sugg_id); }

		try {
			const sugg_infos = await tips_handler.getSuggestionInfos(sugg_id, user_info.id);
			if (sugg_infos.msg_id == 0) {
				if (simple_log) { console.log("- Non Trovato id reale : fornito-> " + number); }
				if (!(number > 0)) {
					return manageReview_resolve(simpleDeletableMessage(
						chat_id,
						"😕\nNon sono riuscito a recuperare il numero del messaggio, dovrai specificarlo manualmente...\n\nManda `/suggerimenti revisione` per maggiori dettagli")
					);
				}
			} else {
				number = sugg_infos.msg_id;
			}


			newStatus = sugg_infos.status;
			if (request[2]) {
				newStatus = request[2];
			}

			if (simple_log) { console.log("- Richiesta review di " + sugg_id + " status: " + newStatus); }
			const res = await tips_handler.setSuggestionStatus(sugg_id, newStatus);
			if (res == -1 || user_info.lastReview.length <= 0) {
				return manageReview_resolve(
					simpleDeletableMessage(chat_id, "😕\nSegnala a @nrc382\nProblemi cercando il suggerimento " + sugg_id)
				);
			}

			let send_text = "🎖 *Modificato da un revisore...*\n\nIl testo di un [tuo suggerimento](" + channel_link_no_parse + "/" + number + ") è stato aggiornato da un revisore.\nOcchio alla grammatica!";
			let final_text = "\n🎖 *Modificato da un revisore*\n\n" + user_info.lastReview + "\n\n" + suggestionCode_msg + "\`" + sugg_id + "\`";

			let review_res = {
				query: { id: query.id, options: { text: "Testo del suggerimento:\nAggiornato!", options: { show_alert: true, cache_time: 5 } } },
				toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id },
				toSend: simpleDeletableMessage(sugg_infos.author, send_text)
			};

			if (sugg_infos.status != 0) {
				if (simple_log) { console.log("- Suggerimento chiuso =" + sugg_infos.status); }
				final_text += reportLine(sugg_infos);

				review_res.toEdit = simpleToEditMessage("@" + channel_name, number, final_text);

			} else {
				if (simple_log) { console.log("- Suggerimento aperto =" + sugg_infos.status); }
				review_res.toEdit = suggestionEditedMessage("@" + channel_name, number, final_text, sugg_infos);
				//if (simple_log) console.log(review_res.toEdit);
			}
			const res_1 = await tips_handler.updateSuggestionText(sugg_id, "\n🎖 *Modificato da un revisore*\n\n" + user_info.lastReview);
			return manageReview_resolve(review_res);
		} catch (err) {
			if (simple_log)
				console.log(err);
			return manageReview_resolve({ query: { id: query.id, options: { text: "Whoops, Errore!\nERRORE GRAVE 😳\nSegnala a @nrc382", cache_time: 2, show_alert: true } } });
		}


	});
}

function manageForget(query, user_info) { //elimina il messaggio che ha inviato una query
	return new Promise(function (manageForget_resolve) {
		return manageForget_resolve({
			toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id },
			query: { id: query.id, options: { text: "Ok!", cache_time: 2 } }
		});
	});
}

function manageAidButton(query, user_info) {
	if (simple_log || manual_log) { console.log(">\manageAidButton: forUserID " + user_info.id); }
	return new Promise(async function (manageAidButton_resolve) {
		let option = query.data.split(":")[2];
		let suggestion_id = resolveCode(query.message.text);

		if (suggestion_id == false) {
			let res_edit = simpleDeletableMessage(user_info.id, "*Woops!*\n_non ho potuto recuperare il codice id del suggerimento_\n\nSe puoi, inoltra ad @nrc382\n\[errore: MAB:001]")
			//res_edit.mess_id = query.message.message_id
			return manageAidButton_resolve({
				query: { id: query.id, options: { text: "Woops!\n\nNon ho potuto recuperare il codice id del suggerimento…", cache_time: 2, show_alert: true } },
				toSend: res_edit
			});
		}
		let sugg_infos = {};

		if (false && option == "SHOW" && user_info.id == amministratore_suggerimenti) {
			sugg_infos.all_votes = await tips_handler.spoilVotesOn(suggestion_id);
			sugg_infos.upVotes = sugg_infos.all_votes.filter(function (el) {
				return el.vote == 1;
			}).length;

			sugg_infos.downVotes = sugg_infos.all_votes.filter(function (el) {
				return el.vote == -1;
			}).length;
			let voti_tmp = sugg_infos.all_votes.filter(function (el) {
				return el.t_id == amministratore_suggerimenti;
			});

			sugg_infos.usr_prevVote = voti_tmp.length == 1 ? voti_tmp[0].vote : 0;

			sugg_infos.id = suggestion_id;
		} else {
			sugg_infos = await tips_handler.getSuggestionInfos(suggestion_id, user_info.id);
		}


		let manage_options = ["REFRESH", "SHOW_TEXT", "DEL_CONFIRM", "LIMIT_CONFIRM", "APP_CONFIRM", "REOPEN_CONFIRM"];

		if (sugg_infos.msg_id == 0) {
			sugg_infos.msg_id = query.message.message_id;
			await tips_handler.setMsgID(0, suggestion_id, query.message.message_id);
		}

		console.log(sugg_infos.usr_prevVote);


		if (manage_options.indexOf(option) >= 0) {
			if (user_info.role < 3) {
				let res_edit = simpleMessage(query.message.chat.id, "*Azione impossibile!*\n\nHai perso il ruolo di moderatore.");
				res_edit.mess_id = query.message.message_id

				return manageAidButton_resolve({
					query: { id: query.id, options: { text: "Woops!", cache_time: 2, show_alert: true } },
					toEdit: res_edit
				});
			} else {
				let to_return = manageSuggestionMessage(user_info.id, user_info.role, sugg_infos, option);
				to_return.mess_id = query.message.message_id

				let query_text = "Gestione di: " + suggestion_id;
				if (option == "SHOW_TEXT") {
					query_text = "Testo del Suggerimento";
				} else if (option == "DEL_CONFIRM") {
					query_text = "Eliminare il Suggerimento?";
				} else if (option == "LIMIT_CONFIRM") {
					query_text = "Limitarne l'autore?";
				} else if (option == "APP_CONFIRM") {
					query_text = "Approvare in seconda analisi?";
				} else if (option == "REOPEN_CONFIRM") {
					query_text = "Riaprire il Suggerimento?";
				}

				return manageAidButton_resolve({
					query: { id: query.id, options: { text: query_text, cache_time: 2 } },
					toEdit: to_return
				});
			}
		} else {
			if (user_info.role >= 3) {
				return manageAidButton_resolve({
					query: { id: query.id, options: { text: (aidInfoText(sugg_infos, user_info.role) + "\n\n⚙\nGestione in chat privata\n"), cache_time: 2, show_alert: true } },
					toSend: manageSuggestionMessage(user_info.id, user_info.role, sugg_infos)
				});
			} else if (false) { // user_info.id == creatore_id 
				return manageAidButton_resolve({
					query: { id: query.id, options: { text: (aidInfoText(sugg_infos, user_info.role) + "\n\n⚙\nGestione in chat privata\n"), cache_time: 2, show_alert: true } },
					toSend: mostraVotiMessage(user_info.id, user_info, sugg_infos)
				});
			} else if (user_info.isDev == true && user_info.dev_nick.split(":").length == 1 && sugg_infos.usr_prevVote == 1) {
				let disponibilità = await disponibilità_sviluppatore(user_info, sugg_infos, "MAIN");
				let risposta = simpleDeletableMessage(user_info.id, disponibilità.testo_messaggio);
				if (disponibilità.linea_bottoni.length > 0) {
					risposta.options.reply_markup.inline_keyboard.unshift(disponibilità.linea_bottoni);
				}
				return manageAidButton_resolve({
					query: { id: query.id, options: { text: (aidInfoText(sugg_infos, user_info.role) + "\n\n💡\nOpzioni Sviluppatore in chat privata"), cache_time: 2, show_alert: true } },
					toSend: risposta
				});
			} else {
				if (sugg_infos.msg_id == 0) { // Arriva qui ANCHE chi preme sul bottone di "appena proposto"
					return manageAidButton_resolve({
						query: { id: query.id, options: { text: "Appena proposto!\nAncora nessun voto...", show_alert: true, cache_time: 5 } }
					});
				} else {
					let updated_suggText = "";
					updated_suggText += sugg_infos.sugg_text + "\n\n" + suggestionCode_msg + "\`" + suggestion_id + "\` ";
					let sviluppatori = sugg_infos.devs == null ? [] : sugg_infos.devs.split(":");

					if (sviluppatori.length > 0) {
						//let sviluppatori = sugg_infos.devs.split(":");
						updated_suggText += "\n\n> *Sviluppatori di Lootia*\n"
						if (sviluppatori.length == 1) {
							// Ci sarebbe già uno sviluppatore pronto ad implementare la funzione
							updated_suggText += "Ci sarebbe già uno sviluppatore pronto ad implementare il suggerimento:\n";
						} else {
							updated_suggText += `${sviluppatori.length} sviluppatori pronti ad implementare il suggerimento:\n`;
						}

						for (let i = 0; i < sviluppatori.length; i++) {
							updated_suggText += `• ${sviluppatori[i]}\n`;
						}
					}
					updated_suggText += proportionTextCalc((sugg_infos.upVotes + sugg_infos.downVotes));

					return manageAidButton_resolve({
						query: { id: query.id, options: { text: aidInfoText(sugg_infos, user_info.role), cache_time: 2, show_alert: true } },
						toEdit: suggestionEditedMessage(query.message.chat.id, query.message.message_id, updated_suggText, sugg_infos)
					});
				}


			}
		}
	});
}

function aidInfoText(sugg_infos, role) {
	let query_msg = "";
	if (role >= 3) {
		if ((sugg_infos.upVotes + sugg_infos.downVotes) > 0) {
			query_msg = "👥\nVoti: " + (sugg_infos.upVotes + sugg_infos.downVotes) + "\n";
			query_msg += "\n• Favorevoli: " + sugg_infos.upVotes; //+sugg_infos.downVotes*(-1)+" "+voteButton.down+"     [👤 ";
			query_msg += "\n• Contrari: " + sugg_infos.downVotes + "\n";
		} else {
			query_msg = "👥\nAncora nessun voto espresso...\n";
		}

		if (role < 5) {
			if (sugg_infos.usr_prevVote == 1) {
				query_msg += "\n\n" + voteButton.up_moji + "\nHai votato positivamente!";
			} else if (sugg_infos.usr_prevVote == -1) {
				query_msg += "\n\n" + voteButton.down_moji + "\nHai votato negativamente...";
			}
		}

	} else {
		if (sugg_infos.usr_prevVote == 0) {
			query_msg = "❕\nNon hai votato questo suggerimento";
		} else if (sugg_infos.upVotes + sugg_infos.downVotes == 1) {
			if (sugg_infos.usr_prevVote == 1) {
				query_msg = "Sei l'unico ad aver votato il tuo suggerimento\n\n" + voteButton.up_moji + "\nPositivamente...\n(è un inizio!)";
			} else if (sugg_infos.usr_prevVote == -1) {
				query_msg = "Sei l'unico ad aver votato il tuo suggerimento\n\n" + voteButton.down_moji + "\nNegativamente...\n(è uno scherzo?)";
			}
		} else {
			query_msg = "👥\nSu " + (sugg_infos.upVotes + sugg_infos.downVotes) + " voti\n";
			query_msg += "\n• Favorevoli: " + sugg_infos.upVotes; //+sugg_infos.downVotes*(-1)+" "+voteButton.down+"     [👤 ";
			query_msg += "\n• Contrari: " + sugg_infos.downVotes + "\n\n";

			if (sugg_infos.usr_prevVote == 1) {
				query_msg += voteButton.up_moji + "\nHai votato positivamente!";
			} else if (sugg_infos.usr_prevVote == -1) {
				query_msg += voteButton.down_moji + "\nHai votato negativamente...";
			}
		}
	}

	return query_msg;
}

function manageDelete(query, user_info, set_role, close) {
	if (simple_log || manual_log) { console.log("- Eliminazione richiesta da -> " + user_info.id); }
	return new Promise(async function (manageDelete_resolve) {

		let opinions = query.data.split(":");
		if (user_info.role <= 2) { // Arriva qui anche chi preme sul bottone di "appena proposto"
			let delSugg = {};
			delSugg.query = { id: query.id, options: { text: "Appena proposto!\nAncora nessun voto", show_alert: true, cache_time: 5 } };
			if (query.message.chat.id == user_info.id) { // non so bene come possa verificarsi questa condizione.
				delSugg.query = { id: query.id, options: { text: "Ci hai provato!" } };
				delSugg.toDelete = { chat_id: user_info.id, mess_id: query.message.message_id };
			}
			return manageDelete_resolve(delSugg);
		}

		let suggestion_id = resolveCode(query.message.text);
		let new_role;
		let close_effect = -2;

		let sugg_infos = await tips_handler.getSuggestionInfos(suggestion_id, user_info.id);
		if (sugg_infos) {
			let toDelmess_id = sugg_infos.msg_id;

			if (toDelmess_id == 0) {
				toDelmess_id = query.message.message_id;
			}

			if (close && opinions[2] == "SHOW_OPTIONS") {
				let options_mess = {};
				options_mess.query = { id: query.id, options: { text: "Motivazione…", cache_time: 5 } };
				options_mess.toEdit = manageSuggestionMessage(user_info.id, user_info.role, sugg_infos, "CLOSE_OPTIONS");
				options_mess.toEdit.mess_id = query.message.message_id
				return manageDelete_resolve(options_mess);
			}


			if (manual_log) { console.log(">\t\tChiedo eliminazione di " + suggestion_id + ", id messaggio: " + toDelmess_id); }

			let author_info = await tips_handler.getUserInfo(sugg_infos.author)
			let warn_adder = 1;

			if (close == true) {
				if (set_role <= 0) {
					new_role = set_role;
				} else {
					new_role = author_info.role;
					warn_adder = 0;
				}
				console_messInsert = "chiusura";
				close_effect = -1;
			} else {
				if (set_role <= 0) {
					new_role = set_role;
				} else {
					new_role = author_info.role;
					warn_adder = 0;
				}
			}

			if (author_info.warn >= 3) {
				new_role = -2;
			}

			let limit_res = await tips_handler.setUserRole(sugg_infos.author, new_role, sugg_infos.sugg_text, warn_adder)
			if (simple_log) { console.log(">\t\t" + sugg_infos.author + " è ora con ruolo: " + limit_res); }

			if (close == true) {
				sugg_infos.status == -1;
			} else {
				sugg_infos.status == -2;
			}

			let final_text = closedSuggestionUpdated_text(sugg_infos, new_role, opinions[2]);
			let drop_res = await tips_handler.closeSuggestion(suggestion_id, close_effect, final_text, sugg_infos.author);
			final_text += suggestionCode_msg + "\`" + sugg_infos.s_id + "\`";
			final_text += reportLine(sugg_infos);

			let deleteSugg = {};
			let query_messInsert = "❌\n\nEliminato!\n\n[" + Math.abs(drop_res[1]) + " voti]\n\n";

			if (new_role == -1) {
				query_messInsert += "L'autore è stato bandito!";
			} else if (new_role == 0) {
				query_messInsert += "L'autore è stato limitato!";
			}

			if (close == true) {
				query_messInsert = "🌪\n\nChiuso!\n\n[" + Math.abs(drop_res[1]) + " voti]";

				deleteSugg.toEdit = simpleToEditMessage("@" + channel_name, toDelmess_id, final_text);
				deleteSugg.toDelete = { chat_id: query.message.chat.id, mess_id: query.message.message_id };

			} else {
				if (query.message.chat.id == user_info.id) {
					deleteSugg.toEdit = simpleToEditMessage(
						query.message.chat.id,
						query.message.message_id,
						query.message.text + "\n>Stato: *Rimosso!*"
					);
					deleteSugg.toDelete = { chat_id: "@" + channel_name, mess_id: toDelmess_id };
				} else {
					deleteSugg.toDelete = { chat_id: "@" + channel_name, mess_id: query.message.message_id };
				}
			}

			if (drop_res[0].length == 5) {
				let author_msg = "😢 *Sigh!*\n_suggerimento " + (close == true ? "chiuso" : "eliminato") + "_\n\n";
				// 

				if (sugg_infos.status < 0) {
					if (user_info.id == amministratore || user_info.role >= 5) {
						author_msg += "La Fenice ";
					} else {
						author_msg += "Un moderatore ";
					}

					author_msg += "ha cambiato la motivazione per cui un [tuo suggerimento](" + channel_link_no_parse + "/" + sugg_infos.msg_id + ") è stato chiuso.";

				} else if (sugg_infos.status > 0) {
					if (user_info.id == amministratore || user_info.role >= 5) {
						author_msg += "La Fenice ";
					} else {
						author_msg += "Un moderatore ";
					}

					author_msg += "ha scartato, in seconda analisi, un [tuo suggerimento](" + channel_link_no_parse + "/" + sugg_infos.msg_id + ")…";

				} else {
					author_msg += "Un [tuo suggerimento](" + channel_link_no_parse + "/" + sugg_infos.msg_id + ") è stato " + (close == true ? "scartato" : "eliminato");

					if (user_info.id == amministratore || user_info.role >= 5) {
						author_msg += " dalla Fenice ";
					} else {
						author_msg += " da un moderatore ";
					}
				}


				if (warn_adder == 0) {
					if (close == true && sugg_infos.status == 0) {
						if (opinions[2] == "CRIT") {
							query_messInsert += "\n\nNon rispetta le linee guida";
							author_msg = "❌ " + author_msg + "perché a suo giudizio infrange le [linee-guida](https://telegra.ph/Linee-guida-Suggerimenti-01-30) del canale.\n\n";
						} else if (opinions[2] == "TIME") {
							query_messInsert += "\n\nTroppo lungo da implementare";
							author_msg = "⏳ " + author_msg + "perché giudicato troppo complesso da realizzare…\n\n";
						} else if (opinions[2] == "JOB") {
							author_msg = "🔨 " + author_msg + "perché tratta di una funzione non ancora definita.\n\n";
							query_messInsert += "\n\nLa funzione è in beta";
						} else if (opinions[2] == "IMPOSSIBLE") {
							author_msg = "🔨 " + author_msg + "perché non sarebbe possibile realizzarlo.\n\n";
							query_messInsert += "\n\nNon fattibile";
						} else if (opinions[2] == "BAL") {
							author_msg = "⚖ " + author_msg + "perché a suo giudizio andrebbe a sbilanciare le attuali meccaniche di gioco.\n\n";
							query_messInsert += "\n\nPorterebbe a sbilanciamenti";
						} else if (opinions[2] == "FILO") {
							author_msg = "🧠 " + author_msg + "perché va contro una meccanica consolidata.\n\n";
							query_messInsert += "\n\nContro la filosofia";
						} else if (opinions[2] == "SIMILE") {
							author_msg = "🪞 " + author_msg + "perché simile ad una meccanica già esistente.\n\n";
							query_messInsert += "\n\nTroppo simile";
						} else if (opinions[2] == "NO") {
							author_msg = "👎 " + author_msg + "perché, a suo giudizio, considerato poco utile…\n\n";
							query_messInsert += "\n\nNon utile!";
						} else if (opinions[2] == "DISLIKE") {
							author_msg = "👥 " + author_msg + "perché non piaciuto alla community…\n\n";
							query_messInsert += "\n\nNon piaciuto";
						} else {
							author_msg = "🙄 " + author_msg + "\n\n";
							query_messInsert += "\n\nSenza una motivazione precisa";

						}

						author_msg += "Se credi,\nPoi discuterne con altri avventurieri [in Taverna](https://telegram.me/joinchat/AThc-z_EfojvcE8mbGw1Cw), ";
						author_msg += "ma l'invito resta quello di evitare la recriminazione di _chissà cosa_, cercare di capire e soprattutto ricordare che …l'ultima parola spetta alla Fenice!";
					}
				} else {
					if (new_role == -2) {
						author_msg = "🐀 " + author_msg + "\nSei bandito dall'utilizzo di questo modulo e segnalato come disturbatore\n";
					} else if (author_info.warn + warn_adder == 2) {
						author_msg = "🐁 " + author_msg + ". Sei bandito dall'utilizzo di questo modulo per 12 ore, e questo è il tuo ultimo avviso\n";
					} else {
						if (new_role == 0) {
							author_msg = "🦡 " + author_msg + "e sei stato bandito dall'utilizzo di questo modulo per 12 ore\n";
						} else if (new_role == -1) {
							author_msg = "🐁 " + author_msg + "e sei ora bandito dall'utilizzo di questo modulo.\n_Non è luogo per spam o sarcasmo._\n";
						}

						if (author_info.warn + warn_adder == 2) {
							author_msg += "\nQuesto è il tuo ultimo avviso\n";
						} else if (warn_adder > 0) {
							author_msg += "\nQuesto è comunque solo un avviso, ma non ce ne saranno molti...";
						}

					}
				}

				deleteSugg.query = { id: query.id, options: { text: query_messInsert, cache_time: 5, show_alert: true } };
				deleteSugg.toSend = simpleDeletableMessage(sugg_infos.author, author_msg);

			} else {
				deleteSugg.query = { id: query.id, options: { text: suggestion_id + " non era nel database...", cache_time: 5, show_alert: true } };
			}

			if (simple_log) { console.log("- DeleteQueryMessage -> " + query_messInsert); }
			return manageDelete_resolve(deleteSugg);

		} else {
			return manageDelete_resolve({
				query: { id: query.id, options: { text: "Woops!" } },
				toSend: simpleDeletableMessage(user_info.id, "*Spiacente*\n\nNon ho trovato il suggerimento " + suggestion_id + " nel database")
			});
		}

	});
}

function closedSuggestionUpdated_text(sugg_infos, new_role, option) {
	let final_text;
	if (manual_log) { console.log(">\t\tVoti ricevuti: " + sugg_infos.totalVotes); }


	if (sugg_infos.status == -2) {
		final_text = "#eliminato"
	} else {
		final_text = "#chiuso"
	}
	final_text += " dopo " + getEnlapsed_text(sugg_infos.sDate) + "";
	if (new_role <= 0) {
		final_text += ", L'autore è stato limitato ✴\n\n"
	} else if (option == "CRIT") {
		final_text += " perché infrange le [linee-guida](https://telegra.ph/Linee-guida-Suggerimenti-01-30) ❌ \n\n";
	} else if (option == "TIME") {
		final_text += " perché troppo complesso da realizzare ⏳ \n\n";
	} else if (option == "JOB") {
		final_text += " perché tratta di una funzione non ancora definita 🔨 \n\n";
	} else if (option == "IMPOSSIBLE") { // 
		final_text += " perché al momento impossibile da attuare ⭕️ \n\n";
	} else if (option == "BAL") {
		final_text += " perché sbilancerebbe le attuali meccaniche ⚖ \n\n";
	} else if (option == "FILO") {
		final_text += " perché contro una filosofia di gioco 🧠\n\n";
	} else if (option == "SIMILE") {
		final_text += " perché troppo simile ad una meccanica esistente 🪞\n\n";
	} else if (option == "NO") {
		final_text += " perché considerato non necessario 👎 \n\n";
	} else if (option == "DISLIKE") {
		final_text += " perché non piaciuto alla community 👥 \n\n";
	} else if (sugg_infos.status <= 0) {
		final_text += ", senza una motivazione precisa…\n\n";
	} else {
		final_text += "\n\n";
	}

	let sugg_text = sugg_infos.sugg_text;

	if (sugg_text.indexOf("#chiuso") >= 0) {
		sugg_text = sugg_text.split("\n").slice(1).join("\n").trim();
	}
	if (sugg_text.indexOf("#riaperto") >= 0) {
		sugg_text = sugg_text.split("\n").slice(1).join("\n").trim();
	}

	final_text += sugg_text + "\n\n";

	return final_text;
}



function userPointCalc(suggStats) {
	// Nuova idea:
	let base = 28800; // 8 ore di delay standard
	let becauseRecent = suggStats.usr_recents * 3600; // un ora ogni "recente"
	let becauseOpens = suggStats.usr_opens * 7200; // due ore ogni "aperto"
	let approvedBonus = Math.min(5, suggStats.usr_approved) * 3600; // - un ora ogni "approvato", massimo 5
	let voteBonus = suggStats.usr_onOpensRecived * 25; // -25 secondi ogni voto positivo ricevuto 

	// NON PIU: let becauseApprovedRatio = Math.round(300 * (suggStats.usr_approved > 0 ? (suggStats.usr_approved / suggStats.usr_total) : suggStats.usr_total)) * 2;


	return Math.round(base + becauseRecent + becauseOpens - (approvedBonus + voteBonus));
}

function userRushManager(user_info, entities) {
	return new Promise(function (userRushManager_resolve) {
		let condition = false //(user_info.id == theCreator) || (user_info.id == phenix_id); //|| user_info.id == 399772013; (user_info.id == theCreator) || 
		condition = (entities.indexOf("#discussione") >= 0);
		if (condition) {
			return userRushManager_resolve(true);
		} else {
			return tips_handler.getSuggestionsCount(user_info.id).then(function (sugg_count) {
				let err_text = "😶\n\n";
				if (simple_log) console.log("Limite: " + sugg_count.suggLimit + ", Aperti: " + sugg_count.opens);
				if (sugg_count.suggLimit < 0) {
					err_text += "_La Fenice_ ha temporaneamente chiuso la possibilità di inviare nuovi suggerimenti. Riprova più tardi...";
					return userRushManager_resolve(err_text);
				} else if (sugg_count.suggLimit > 0 && (sugg_count.opens >= (sugg_count.suggLimit))) {
					err_text += "_La Fenice_ ha impostato a " + sugg_count.suggLimit;
					err_text += " il limite di nuovi suggerimenti che possono essere aperti contemporaneamente.";
					err_text += "\nProva a riproporre la tua idea tra un po'...";
					return userRushManager_resolve(err_text);
				} else {
					if (user_info.lastSugg == 0) {
						return userRushManager_resolve(true);
					}
					let time_enlapsed = (Date.now() / 1000) - user_info.lastSugg;
					let new_coolDown = userPointCalc(sugg_count);
					if (time_enlapsed < new_coolDown) {
						let towait = (new_coolDown - time_enlapsed) / 60;
						let hours = towait / 60;
						let time_str;
						if (hours < 2) {
							time_str = (towait >= 2 ? Math.floor(towait) + " minuti" : Math.floor(towait * 60) + " secondi");
						} else {
							time_str = Math.round(hours) + " ore";
						}
						err_text = "*Wow!* 😲\nÈ bello tu abbia tante idee e voglia di condividerle!\n\nMa sarebbe meglio aspettassi almeno " + time_str;
						err_text += " prima di chiedere la pubblicazione di un nuovo suggerimento.";
						err_text += "\n\nDi default l'attesa tra un suggerimento ed un altro è stata impostata ad 8 ore.\n";
						err_text += "Varia poi in base alla tua attività sul canale, presente e passata.";
						return userRushManager_resolve(err_text);
					} else {
						return userRushManager_resolve(true);
					}
				}
			});
		}
	})
}

function resolveCode(text) {
	let suggestion_id = text.substring((text.indexOf(suggestionCode_msg) + suggestionCode_msg.length)).trim().substring(0, 5);
	if (manual_log) { console.log(">\t\tRicavato codice: " + suggestion_id); }
	if (typeof suggestion_id != "string" || !tips_handler.isValidID(suggestion_id.replace("\`", ""))) {
		return (false);
	}
	return (suggestion_id);
}

function reduceFraction(num, den) {
	var gcd = function gcd(a, b) {
		return b ? gcd(b, a % b) : a;
	};
	gcd = gcd(num, den);
	return [num / gcd, den / gcd];
}

function proportionTextCalc(totalVotes) {
	let votes = totalVotes;
	let final_text = "";
	let proportion = Math.min(100, ((votes * 100) / aproximative_userNumber.active).toFixed(1)); // in centesimi, votanti su attivi

	final_text += "\n> *Partecipazione:* ";
	if (isNaN(proportion)) {
		final_text += " nulla\n";
	} else if (proportion < 1) {
		final_text += " ~1%\n";
	} else {
		final_text += " ~" + proportion + "%\n";
	}

	return final_text;
}

function generatePartialString(fromLine) {
	let sugg_partial = fromLine.trim().split("\n"); //[0].split(" ");

	if (sugg_partial[0].length <= 1 || sugg_partial[0].indexOf("#") >= 0 || sugg_partial[0].indexOf("🎖") >= 0) {
		for (let j = 1; j < sugg_partial.length; j++) {
			if (sugg_partial[j].length > 3 && sugg_partial[j].indexOf("#") < 0 && sugg_partial[j].indexOf("🎖") < 0) {
				sugg_partial = sugg_partial[j].trim().split(" ");
				break;
			}
		}
	} else {
		sugg_partial = sugg_partial[0].trim().split(" ");
	}


	let max = Math.min(2, (sugg_partial.length - 1))


	if (sugg_partial[max].length <= 5) {
		if ((typeof sugg_partial[max + 1] != 'undefined') && sugg_partial[max + 1].length >= 5) {
			max = Math.min((max + 1), sugg_partial.length);
		}
	}
	//max = Math.min(max, sugg_partial.length);
	sugg_partial = sugg_partial.slice(0, max + 1);

	return sugg_partial.join(" ").split("*").join("").split("_").join("").split("`").join("");
}

function getEnlapsed_text(sDate) {
	let now_date = Date.now() / 1000;
	let diff = now_date - sDate;

	let return_string = "";
	if (diff < 30) {
		return_string += "pochi secondi";
	} else if (diff < 60) {
		return_string += "meno di un minuto";
	} else if (diff < 60 * 60) {
		if ((diff / 60) < 2) {
			return_string += "appena un minuto";
		} else {
			return_string += Math.round(diff / 60) + " minuti circa";
		}
	} else if (diff < 60 * 60 + 15 * 60) {
		return_string += "poco piu di un ora";
	} else if (diff < 60 * 60 + 40 * 60) {
		return_string += "poco meno di due ore";
	} else if (diff < 60 * 60 * 24) {
		return_string += "circa " + Math.round(diff / (60 * 60)) + " ore";
	} else if ((diff / (60 * 60 * 24)) < 1) {
		return_string += "meno di un giorno";
	} else if ((diff / (60 * 60 * 24)) < 2) {
		return_string += "meno di due giorni";
	} else {
		return_string += "circa " + Math.round(diff / (60 * 60 * 24)) + " giorni";
	}
	return return_string;
}

function intIn(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min; //max è escluso, min incluso
}

//________________________//
//MESSAGE MANAGER *******
//________________________//

var aproximative_userNumber = { total: 0, active: 0 };


function menu_opzioniAmministratore(chat_id) {
	let testo_menu = "⚙️ *Opzioni Amministratore*";
	let bottoni_inline = [];


	bottoni_inline.push([
		{ text: "⮐", callback_data: 'SUGGESTION:MENU:REFRESH' },
		{ text: "⨷", callback_data: 'SUGGESTION:FORGET' }
	]);
	bottoni_inline.push([{ text: "👨‍💻 Sviluppatori di Lootia", callback_data: 'SUGGESTION:DEV_STUFF:ADMIN_MENU' }]);
	bottoni_inline.push([{ text: "🔥 Limite ai Suggerimenti", callback_data: 'SUGGESTION:MENU:LIMIT' }]);


	let risposta = simpleDeletableMessage(chat_id, testo_menu);
	risposta.options.reply_markup.inline_keyboard = bottoni_inline;
	return risposta;
}

function simpleMenuMessage(user_info, text, sugg_count) {
	let mess_id = user_info.id;
	let hasOpens = sugg_count.opens;
	console.log("> Suggerimenti aperti: " + hasOpens);
	let limit = sugg_count.suggLimit

	let menu_button = [];


	if (user_info.role >= 5) { // AMMINISTRATORE
		let first_line = [
			{ text: "▤", callback_data: 'SUGGESTION:MENU:GLOBAL_RECENT' },
			{ text: "⌥", callback_data: 'SUGGESTION:MENU:OPZIONI_ADMIN' },
			{ text: "↺", callback_data: 'SUGGESTION:MENU:REFRESH' },
			{ text: "⨷", callback_data: 'SUGGESTION:FORGET' }];
		if (hasOpens > 0) {
			if (hasOpens > 0) {
				first_line.unshift({ text: "✜", callback_data: 'SUGGESTION:MENU:GET_OPENS' });
			}
			first_line.unshift({ text: "🌟", callback_data: 'SUGGESTION:MENU:MOST_VOTED' });
		}
		menu_button.push(first_line);

		if (limit < 0) {
			menu_button.push([{ text: "Riapri il Canale", callback_data: 'SUGGESTION:MENU:CHNNL_ADMIN:OPEN' }]);
		} else if (limit > 0) {
			menu_button.push([{ text: "Chiudi il Canale", callback_data: 'SUGGESTION:MENU:CHNNL_ADMIN:CLOSE' }]);
		} else {
			menu_button.push([{ text: "Imposta Limite", callback_data: 'SUGGESTION:MENU:CHNNL_ADMIN:LIMIT' }]);
		}
	} else { 	// UTENTE, LIMITATO, REVISORE, MODERATORE
		menu_button.push([
			{ text: "⚡️", callback_data: 'SUGGESTION:MENU:GLOBAL_RECENT' },

		]);

		if (sugg_count.opens > 0) {
			menu_button[0].push({ text: "✜", callback_data: 'SUGGESTION:MENU:GET_OPENS' });
		}

		if (sugg_count.usr_upVotes + sugg_count.usr_downVotes < sugg_count.opens) {
			menu_button[0].push({ text: "◌", callback_data: 'SUGGESTION:MENU:GET_TOVOTE' });
		}

		menu_button[0].push(
			{ text: "ⓘ", url: "https://telegra.ph/Linee-guida-Suggerimenti-01-30" },
			{ text: "↺", callback_data: 'SUGGESTION:MENU:REFRESH' },
			{ text: "⨷", callback_data: 'SUGGESTION:FORGET' },
		); //,



		menu_button.push([{ text: "👤", callback_data: 'SUGGESTION:MENU:PERSONAL' }]); //
	}

	return ({
		chat_id: mess_id,
		message_txt: text,
		options: {
			parse_mode: "Markdown",
			disable_web_page_preview: true,
			reply_markup: {
				inline_keyboard: menu_button
			}
		}
	});
}

function simpleDeletableMessage(mess_id, text) {
	return ({
		chat_id: mess_id,
		message_txt: text,
		options: {
			parse_mode: "Markdown",
			disable_web_page_preview: true,
			reply_markup: {
				inline_keyboard: [
					[{
						text: "⨷",
						callback_data: 'SUGGESTION:FORGET'
					}]
				]
			}
		}
	});
}

function simpleMessage(mess_id, text) {
	if (manual_log) { console.log(">\t\tsimpleMessage"); }

	let cmd_options = {
		parse_mode: "Markdown",
		disable_web_page_preview: true
	};

	let simple_msg = {
		chat_id: mess_id,
		message_txt: text,
		options: cmd_options
	};

	return simple_msg;
}

function simpleToEditMessage(chatId, messId, text) {
	return ({
		chat_id: chatId,
		mess_id: messId,
		message_txt: text,
		options: {
			parse_mode: "Markdown",
			disable_web_page_preview: true
		}
	})
}

function suggestionEditedMessage(chatId, messId, text, infos) {
	let votes_text = "";
	let votes_msg = "";
	//infos.totalVotes += Math.abs(infos.usr_prevVote);

	if (infos.totalVotes == 0) {
		votes_msg = " ❕";
	} else if (infos.upVotes == 0) {
		votes_msg = "🍂 ";
		votes_text += Math.abs(infos.downVotes);
	} else if (infos.downVotes == 0) {
		votes_msg = "🌱 ";
		votes_text += infos.upVotes;
	} else if ((Math.abs(infos.upVotes) + Math.abs(infos.downVotes)) > 1) {
		let fraction;
		let num;
		let totalCount = infos.upVotes + Math.abs(infos.downVotes);

		if (infos.upVotes > infos.downVotes) {
			num = infos.upVotes;
		} else {
			num = Math.abs(infos.downVotes);
		}

		if (((num % 2)) + ((totalCount % 2)) > 0) {
			fraction = reduceFraction((num - (num % 2)), (totalCount - (totalCount % 2)));
		} else {
			fraction = reduceFraction(num, totalCount);
		}

		if (fraction[1] >= 5 || fraction[0] > 10) {
			fraction = reduceFraction(((fraction[0] - (fraction[0] % 2)) / 2), Math.abs(((fraction[1] - (fraction[1] % 2)) / 2)));
		}

		if (fraction[1] == 1) {
			votes_text += Math.abs(infos.totalVotes);
		} else {
			if (((num % 2) + (totalCount % 2)) > 0) {
				votes_text += "~ ";
			}
			votes_text += fraction[0] + " su " + fraction[1];
		}
	} else {
		votes_text += "" + (Math.abs(infos.upVotes) + Math.abs(infos.downVotes));
	}

	let margin = Math.max(35, Math.floor(aproximative_userNumber.active / 2));
	if (infos.upVotes > Math.abs(infos.downVotes)) {
		if (infos.totalVotes < 11)
			votes_msg += voteButton.up_moji + " " + votes_text + " 😶 ";
		else if (infos.totalVotes < (margin + margin / 4))
			votes_msg += voteButton.up_moji + " " + votes_text + " 🙂 ";
		else
			votes_msg += voteButton.up_moji + " " + votes_text + " 😍 ";
	} else if (Math.abs(infos.downVotes) > 0) {
		if (infos.totalVotes > 11)
			votes_msg += voteButton.down_moji + " " + votes_text + " 😕 ";
		else if (infos.totalVotes > (margin + margin / 4))
			votes_msg += voteButton.down_moji + " " + votes_text + " 🙁 ";
		else
			votes_msg += voteButton.down_moji + " " + votes_text + " ☹ ";
	}

	if (infos.upVotes + Math.abs(infos.downVotes) >= (margin + 1)) {
		if (infos.upVotes > Math.abs(infos.downVotes))
			votes_msg += voteButton.hot;
		else
			votes_msg += " 💥";
	}

	return ({
		chat_id: chatId,
		mess_id: messId,
		message_txt: text,
		options: {
			parse_mode: "Markdown",
			disable_web_page_preview: true,
			reply_markup: {
				inline_keyboard: [
					[{
						text: voteButton.up,
						callback_data: 'SUGGESTION:UPVOTE'
					},
					{
						text: voteButton.down,
						callback_data: 'SUGGESTION:DOWNVOTE'
					}],
					[
						{
							text: votes_msg,
							callback_data: 'SUGGESTION:AIDBUTTON:SHOW'
						}
					]]
			}
		}
	});
}

function suggestionMessage(text) {
	if (manual_log) { console.log(">\t\tsuggestionMessage"); }
	return ({
		chat_id: "@" + channel_name,
		message_txt: text,
		options: {
			parse_mode: "Markdown",
			disable_web_page_preview: true,
			reply_markup: {
				inline_keyboard: [
					[
						{ text: voteButton.up, callback_data: 'SUGGESTION:UPVOTE' },
						{ text: voteButton.down, callback_data: 'SUGGESTION:DOWNVOTE' }
					],
					[{ text: "Appena proposto!", callback_data: 'SUGGESTION:AIDBUTTON:SHOW' }]
				]
			}
		}
	});
}

function insertMessage(mess_id, text, is_a_discussion) {
	if (manual_log) { console.log(">\t\tinsertMessage"); }
	let keyboard = [];
	if (is_a_discussion == true) {
		keyboard.push([
			{
				text: "⌫ Annulla",
				callback_data: 'SUGGESTION:FORGET'
			},
			{
				text: 'In Taverna! 🍺',
				callback_data: 'SUGGESTION:DISCUSSION_PUBLISH'
			}
		]);

	} else {
		keyboard.push([
			{ text: "⨷ Chiudi", callback_data: 'SUGGESTION:MENU:REFRESH' },
			{ text: "⌫ Annulla", callback_data: 'SUGGESTION:MENU:REFRESH' }
		]);
		keyboard.push([{ text: '📢 Pubblica!', callback_data: 'SUGGESTION:PUBLISH' }])
	}

	return ({
		chat_id: mess_id,
		message_txt: text,
		options: {
			parse_mode: "Markdown",
			disable_web_page_preview: true,
			reply_markup: {
				inline_keyboard: keyboard
			}
		}
	});
}

function delooMessage(message_id, sugg_id) {
	let text = "🙃 *Hey Delooo!*\n\nC'è una nuova [proposta per il tools](" + channel_link_no_parse + "/" +
		message_id + ") pubblicata sul canale dei suggerimenti:\n\n";

	text += suggestionCode_msg + "`" + sugg_id.toUpperCase() + "`\n";
	text += "🔘 " + message_id + "";


	return ({
		chat_id: 340271798,
		message_txt: text,
		options: {
			parse_mode: "Markdown",
			disable_web_page_preview: true,
			reply_markup: {
				inline_keyboard: [[{
					text: 'Scarta 🌪️ ',
					callback_data: 'SUGGESTION:OPINION:-1'
				},
				{
					text: 'Approva ⚡',
					callback_data: 'SUGGESTION:OPINION:1'
				}
				]]
			}
		}
	});
}

function reviewMessage(mess_id, status, msg_text) {
	return ({
		chat_id: mess_id,
		message_txt: msg_text,
		options: {
			parse_mode: "Markdown",
			disable_web_page_preview: true,
			reply_markup: {
				inline_keyboard: [
					[{
						text: "Aggiorna il Testo",
						callback_data: 'SUGGESTION:REVIEW'
					}],
					[{
						text: "Annulla ⨷",
						callback_data: 'SUGGESTION:FORGET'
					}]
				]
			}
		}
	})
}

function reportLine(sugg_infos) {
	let report_line = "";
	let total_downVotes = (Math.abs(sugg_infos.downVotes) + Math.abs(sugg_infos.downOnClose));
	let total_UpVotes = (sugg_infos.upVotes + sugg_infos.upOnClose);

	if (sugg_infos.upVotes > Math.abs(sugg_infos.downVotes)) {
		report_line += "\n\n📈";
	} else {
		report_line += "\n\n📉";
	}

	report_line += " *Report:*\n";
	if ((total_downVotes + total_UpVotes) == 0) {
		report_line += "> Questo suggerimento non ha ricevuto voti\n";
	} else {

		if (total_UpVotes > 0)
			report_line += "> " + total_UpVotes + (total_UpVotes == 1 ? " voto positivo" : " voti positivi");
		if (total_downVotes > 0) {
			if (total_UpVotes > 0)
				report_line += "\n";
			report_line += "> " + total_downVotes + (total_downVotes == -1 ? " voto negativo" : " voti negativi");
		}
		// if (total_votes > toHotnumber)
		// 	report_line += "  " + voteButton.hot;
		// else if (sugg_infos.downVotes == 0) {
		// 	report_line += "  🌱";
		// }
	}
	return report_line;
}

function mostraVotiMessage(mess_id, user_info, sugg_infos) {
	let message_txt = "*Debugger Canale Suggerimenti*\n\n";
	message_txt += suggestionCode_msg + " `" + sugg_infos.id + "`\n\n";
	let buttons_array = [
		[{ text: "Chiudi", callback_data: 'SUGGESTION:FORGET' }]
	];
	if (user_info.id != amministratore_suggerimenti) {
		message_txt = "*Mumble...*\n\n";
		message_txt += "È strano...";
	} else {
		let up_votes = sugg_infos.all_votes.filter(function (el) {
			return el.vote == 1;
		})
		let down_votes = sugg_infos.all_votes.filter(function (el) {
			return el.vote == -1;
		})

		if (up_votes.length > 0) {
			message_txt += "Positivamente 🌕\n"; // 🌑
			for (let i = 0; i < up_votes.length; i++) {
				message_txt += `• [${up_votes[i].t_id}](tg://user?id=${up_votes[i].t_id})\n` // [👤](tg://user?id=
			}

			if (down_votes.length > 0) {
				message_txt += "\n\n";
			}
		}

		if (down_votes.length > 0) {
			message_txt += "Negativamente 🌑\n"; // 
			for (let i = 0; i < down_votes.length; i++) {
				message_txt += `• [${down_votes[i].t_id}](tg://user?id=${down_votes[i].t_id})\n` // [👤](tg://user?id=
			}
		}

		//buttons_array.unshift([{ text: "ⓘ", url: "t.me" }]);
	}


	return ({
		chat_id: mess_id,
		message_txt: message_txt,
		options: {
			parse_mode: "Markdown",
			disable_web_page_preview: true,
			reply_markup: {
				inline_keyboard: buttons_array
			}
		}
	});
}

async function disponibilità_sviluppatore(user_info, sugg_infos, opzione_messaggio) {
	let opzioni_messaggio = opzione_messaggio.split(":");

	let risposta = {
		testo_messaggio: "👨‍💻 *Sviluppatori di Lootia*\n",
		testo_query: "Sviluppatori di Lootia",
		query_mostra_avviso: false,
		linea_bottoni: [],
		nel_canale: {}
	};


	let linea_link = `_disponibilità per_ [${sugg_infos.s_id}](${channel_link_no_parse}/${sugg_infos.msg_id})\`\`\n\n`;
	risposta.testo_messaggio += linea_link;


	if (user_info.isDev == false || user_info.dev_nick.split(":").length != 1) {
		risposta.testo_messaggio = `🤪\nCome sei arrivato fin qui?`;
		risposta.testo_query = "Woops!";
	} else if (opzioni_messaggio[0] == "MOSTRA_TESTO") {
		risposta.testo_messaggio += "• *Testo* 📃\n";
		risposta.testo_messaggio += sugg_infos.sugg_text + "\n\n";
		risposta.linea_bottoni.push({ text: '⊖', callback_data: `SUGGESTION:DEV_STUFF:OPT:${sugg_infos.s_id}:MAIN` });
	} else if (opzioni_messaggio[0] == "MAIN") {
		//risposta.testo_messaggio += `Questo è il main!` // ☝
		risposta.linea_bottoni.push({ text: '⊕', callback_data: `SUGGESTION:DEV_STUFF:OPT:${sugg_infos.s_id}:MOSTRA_TESTO` });
		let sviluppatori = sugg_infos.devs == null ? [] : sugg_infos.devs.split(":");
		let è_già_candidato = false;

		if (sviluppatori.length == 1) {
			risposta.testo_messaggio += `> Uno sviluppatore disponibile\n`
		} else if (sviluppatori.length > 1) {
			risposta.testo_messaggio += `> ${sviluppatori.length} sviluppatori disponibili\n`
		} else {
			risposta.testo_messaggio += `> Ancora nessuno sviluppatore si è mostrato disponibile…\n`
		}

		for (let i = 0; i < sviluppatori.length; i++) {
			risposta.testo_messaggio += ` • ${sviluppatori[i]}`;
			if (sviluppatori[i] == user_info.dev_nick) {
				è_già_candidato = true;
				risposta.testo_messaggio += "(Tu)";
			}
			risposta.testo_messaggio += "\n";
		}

		if (!è_già_candidato) {
			risposta.linea_bottoni.push({ text: '☝', callback_data: `SUGGESTION:DEV_STUFF:OPT:${sugg_infos.s_id}:CONFERMA_DISPONIBILITA` });
		} else {
			risposta.testo_messaggio += `\n\n💡\nTi sei proposto per implementare il suggerimento\n`
			risposta.linea_bottoni.push({ text: '🙅', callback_data: `SUGGESTION:DEV_STUFF:OPT:${sugg_infos.s_id}:RIMUOVI_DISPONIBILITA` });
		}
	} else if (opzioni_messaggio[0] == "CONFERMA_DISPONIBILITA") {
		let sviluppatori = sugg_infos.devs == null ? [] : sugg_infos.devs.split(":");

		if (sviluppatori.indexOf(user_info.dev_nick) < 0) {
			let lista_aggiornata = "";
			sviluppatori.push(user_info.dev_nick);
			if (sviluppatori.length <= 0) {
				lista_aggiornata += user_info.dev_nick;
			} else {
				lista_aggiornata += sviluppatori.join(":");
			}
			await tips_handler.aggiorna_lista_sviluppatoriDisponibili(sugg_infos.s_id, lista_aggiornata);

			// Aggiorno nel canale:
			let updated_suggText = "";
			updated_suggText += sugg_infos.sugg_text + "\n\n" + suggestionCode_msg + "\`" + sugg_infos.s_id + "\` ";
			if (sviluppatori.length > 0) {
				updated_suggText += "\n\n> *Sviluppatori di Lootia*\n"
				if (sviluppatori.length == 1) {
					// Ci sarebbe già uno sviluppatore pronto ad implementare la funzione
					updated_suggText += "Ci sarebbe già uno sviluppatore pronto ad implementare il suggerimento:\n";
				} else {
					updated_suggText += `${sviluppatori.length} sviluppatori pronti ad implementare il suggerimento:\n`;
				}

				for (let i = 0; i < sviluppatori.length; i++) {
					updated_suggText += `• ${sviluppatori[i]}\n`;
				}
			}
			updated_suggText += proportionTextCalc((sugg_infos.upVotes + sugg_infos.downVotes));
			risposta.nel_canale = suggestionEditedMessage("@" + channel_name, sugg_infos.msg_id, updated_suggText, sugg_infos);
		}
		risposta.testo_messaggio += "> Ti sei mostrato disponibile ad implementare il suggerimento\n";
		risposta.linea_bottoni.push({ text: '⮐', callback_data: `SUGGESTION:DEV_STUFF:OPT:${sugg_infos.s_id}:MAIN` });

	} else if (opzioni_messaggio[0] == "RIMUOVI_DISPONIBILITA") {
		let sviluppatori = sugg_infos.devs == null ? [] : sugg_infos.devs.split(":");

		if (sviluppatori.indexOf(user_info.dev_nick) >= 0) {
			let lista_aggiornata = "";

			sviluppatori = sviluppatori.filter(function (dev_nick) {
				return dev_nick !== user_info.dev_nick
			});

			if (sviluppatori.length == 1) {
				lista_aggiornata += sviluppatori[0];
			} else if (sviluppatori.length > 1) {
				lista_aggiornata += sviluppatori.join(":");
			} else {
				lista_aggiornata = null;
			}

			await tips_handler.aggiorna_lista_sviluppatoriDisponibili(sugg_infos.s_id, lista_aggiornata);

			// Aggiorno nel canale, codice che si ripete (qui sotto) ma sono stanco…
			let updated_suggText = "";
			updated_suggText += sugg_infos.sugg_text + "\n\n" + suggestionCode_msg + "\`" + sugg_infos.s_id + "\` ";
			if (sviluppatori.length > 0) {
				updated_suggText += "\n\n> *Sviluppatori di Lootia*\n"
				if (sviluppatori.length == 1) {
					updated_suggText += "Ci sarebbe già uno sviluppatore pronto ad implementare il suggerimento:\n";
				} else {
					updated_suggText += `${sviluppatori.length} sviluppatori pronti ad implementare il suggerimento:\n`;
				}

				for (let i = 0; i < sviluppatori.length; i++) {
					updated_suggText += `• ${sviluppatori[i]}\n`;
				}
			}
			updated_suggText += proportionTextCalc((sugg_infos.upVotes + sugg_infos.downVotes));
			risposta.nel_canale = suggestionEditedMessage("@" + channel_name, sugg_infos.msg_id, updated_suggText, sugg_infos);
		}

		risposta.testo_messaggio += "• Non sei più disponibile ad implementare il suggerimento";
		risposta.linea_bottoni.push({ text: '⮐', callback_data: `SUGGESTION:DEV_STUFF:OPT:${sugg_infos.s_id}:MAIN` });
	}




	return (risposta);
}


// Mi ero dimenticato di questa funzione… potrebbe sostituire un bel po di "Woops"  sparsi qua e la
function invalidMessage(mess_id, res_message) {
	return ({
		chat_id: mess_id,
		message_txt: "*Whoops!* 🙃" + "\n" + res_message,
		options: {
			parse_mode: "Markdown",
			disable_web_page_preview: true,
			reply_markup: {
				inline_keyboard: [
					[{ text: "Chiudi ⨷", callback_data: 'SUGGESTION:FORGET' }]
				]
			}
		}
	})
}

function getSuggestionLinkCmd(user_info, fullCmd, chat_id) {
	return new Promise(async function (getSuggestionLinkCmd_resolve) {
		let sugg_id = fullCmd.target.toUpperCase();
		if (simple_log) { console.log(">\t\tComando getSuggestionLinkCmd -> " + fullCmd.command + ", " + sugg_id); }

		const sugg_infos = await tips_handler.getSuggestionInfos(sugg_id, user_info.id);
		if (sugg_infos == -1) {
			return getSuggestionLinkCmd_resolve(
				simpleMessage(user_info.id, "😕\nNon ho trovato il suggerimento `" + sugg_id + "` nel database...")
			);
		} else if (sugg_infos.author == "NOAUTHOR") {
			return integrateMessage_resolve(
				simpleDeletableMessage(
					user_info.id,
					"😕\nProva a controllare l'imput...\nNon ho trovato il suggerimento `" + sugg_id + "` nel database...")
			);
		} else {
			let res_text = "ⓘ *Suggerimento* " + "`" + sugg_id + "`\n\n";
			res_text += "[" + generatePartialString(sugg_infos.sugg_text) + " /.../](" + channel_link_no_parse + "/" + sugg_infos.msg_id + ")\n";
			res_text += "\nStato: ";
			if (sugg_infos.status == 0) {
				res_text += "Aperto ♻️";
			} else if (sugg_infos.status == 1) {
				res_text += "Approvato ⚡️";
			} else {
				res_text += "Scartato 🌪";
			}
			if (sugg_infos.status == 0) {
				res_text += "\n" + sugg_infos.upVotes + " " + voteButton.up;
				res_text += "\n" + sugg_infos.downVotes + " " + voteButton.down;
			} else {
				res_text += "\n" + sugg_infos.upOnClose + " " + voteButton.up;
				res_text += "\n" + sugg_infos.downOnClose + " " + voteButton.down;
			}

			let to_return = simpleDeletableMessage(chat_id, res_text);
			if (user_info.role >= 3 && chat_id == user_info.id) {
				to_return.options.reply_markup.inline_keyboard.unshift([{ text: "Gestisci", callback_data: 'SUGGESTION:MENU:MANAGE_RECENT:' + sugg_infos.s_id }])
			}
			return getSuggestionLinkCmd_resolve(to_return);
		}
	});
}

function limitAuthorOfDiscussion(curr_user, fullCommand) {
	return new Promise(function (limitAuthorOfDiscussion_resolve) {
		if (curr_user.role < 3) {
			let avaible_cmds = "Hai disponibili i comandi:\n\n🌐\n> " +
				"`tags`\n> " +
				"`aperti `\n> " +
				"`recenti `\n> " +
				"`statistiche `\n> " +
				"`albo `\n" +
				"`\n👤`\n> " +
				"`miei `\n> " +
				"`approvati`\n> " +
				"`scartati`\n> " +
				"`curiosità`\n";
			return limitAuthorOfDiscussion_resolve(invalidMessage(curr_user.id, avaible_cmds));
		}
		return tips_handler.getUserFromDiscussionDate(fullCommand.target).then(function (targhet_UserId) {
			if (simple_log) { console.log("> Chiedo che l'utente " + targhet_UserId + " sia limitato per una discussione pubblicata in taverna " + fullCommand.target) }
			return tips_handler.setUserRole(fullCmd.target, 0).then(function (new_role_set) {
				if (new_role_set >= 0) {
					return manageUserCmd_resolve(simpleDeletableMessage(chat_id, "Limitato l'autore della discussione " + fullCommand.target + "\n> ID utente: `" + targhet_UserId + "`"));
				} else {
					return manageUserCmd_resolve(simpleDeletableMessage(chat_id, "Non sono riuscito a limitare l'aurore della discussione.\n\n" + "> N. discussione: `" + fullCommand.target + "`\n> ID utente: `" + targhet_UserId + "`"));

				}
			});
		});
		//limitAuthorOfDiscussion_resolve()
	});
}

function manageSuggestionMessage(mess_id, user_role, sugg_infos, opzione) { // Solo edo ha option != undefined
	if (manual_log) { console.log(">\t\tmanageSuggestionMessage"); }

	//let line = "`      ——————————`\n"

	let testo_messaggio = "⚙ *Gestione Suggerimento*\n\n";
	testo_messaggio += "[" + suggestionCode_msg + "](" + channel_link_no_parse + "/" + sugg_infos.msg_id + ") `" + sugg_infos.s_id + "`\n";

	//text += "• ID: " + query.message.message_id + "\n";


	// Contestalizzazione del testo
	if (opzione == "CLOSE_OPTIONS") {
		let motivo_prec = "";

		testo_messaggio += "\n*Motivazione:*";
		testo_messaggio += "\n· ⏳   _Impegno_";
		testo_messaggio += "\n· 🔨   _Funzione in beta_";
		testo_messaggio += "\n· ❌   _Linee guida_";
		testo_messaggio += "\n· ⭕️   _Non fattibile_";
		testo_messaggio += "\n· 🪞   _Troppo simile_";
		testo_messaggio += "\n· ⚖   _Sbilanciato_";
		testo_messaggio += "\n· 🧠   _Fuori-filosofia_";
		testo_messaggio += "\n· 👎   _Non necessario_";
		testo_messaggio += "\n· 👥   _Non piaciuto_";
		testo_messaggio += "\n· 💭   _Altro_\n";

		if (sugg_infos.status < 0) {
			if (sugg_infos.sugg_text.indexOf("⏳") > 0) {
				motivo_prec = "⏳   _Impegno_";
			} else if (sugg_infos.sugg_text.indexOf("🔨") > 0) {
				motivo_prec = "🔨   _Funzione in beta_";
			} else if (sugg_infos.sugg_text.indexOf("🪞") > 0) {
				motivo_prec = "🪞   _Troppo simile_";
			} else if (sugg_infos.sugg_text.indexOf("⚖") > 0) {
				motivo_prec = "⚖   _Sbilanciato_";
			} else if (sugg_infos.sugg_text.indexOf("🧠") > 0) {
				motivo_prec = "🧠   _Fuori-filosofia_";
			} else if (sugg_infos.sugg_text.indexOf("❌") > 0) {
				motivo_prec = "❌   _Linee guida_";
			} else if (sugg_infos.sugg_text.indexOf("⭕️") > 0) {
				motivo_prec = "⭕️   _Non fattibile_";
			} else if (sugg_infos.sugg_text.indexOf("👎") > 0) {
				motivo_prec = "👎   _Non necessario_";
			} else if (sugg_infos.sugg_text.indexOf("👥") > 0) {
				motivo_prec = "👥   _Non piaciuto_";
			} else if (sugg_infos.sugg_text.indexOf("💭") > 0) {
				motivo_prec = "💭   _Altro_";
			}

			if (motivo_prec != "") {
				testo_messaggio += "\n*Attuale:*\n• " + motivo_prec + "\n";
			}
		} else {
			//console.log(sugg_infos)
		}
	} else if (opzione == "SHOW_TEXT") {
		testo_messaggio += "\n• *Testo* 📃\n";
		testo_messaggio += sugg_infos.sugg_text + "\n\n";
	} else if (opzione == "DEL_CONFIRM") {
		let now_date = Date.now() / 1000;

		if ((now_date - sugg_infos.sDate) < (60 * 60 * 24 * 2)) {
			testo_messaggio += "\n• *Elimina* 🗑 \n_Il suggerimento verrà eliminato dal canale e l'autore bandito_";
		} else {
			testo_messaggio += "\n• *Elimina* 🗑 \n_Il suggerimento è troppo vecchio e non può essere eliminato da un bot..._";
		}
	} else if (opzione == "LIMIT_CONFIRM") {
		testo_messaggio += "\n• *Limita* 🤭\n_Il suggerimento verrà chiuso e l'autore limitato per 12 ore_";
	} else if (opzione == "APP_CONFIRM") {
		testo_messaggio += "\n• *Approva*  ⚡\n_Il suggerimento verrà approvato e l'autore notificato_";
	} else if (opzione == "REOPEN_CONFIRM") {
		testo_messaggio += "\n• *Riaprire?*  🌱\n_Il suggerimento verrà riaperto (ed i voti attuali scartati)_";
	} else {
		let total_downVotes = Math.abs(sugg_infos.downVotes) + Math.abs(sugg_infos.downOnClose);
		let total_upVotes = sugg_infos.upOnClose + sugg_infos.upVotes
		if (sugg_infos.status == 0) {
			if ((sugg_infos.downOnClose + sugg_infos.upOnClose) > 0) {
				testo_messaggio += "\n• Ri-Aperto in seconda analisi\n";
				testo_messaggio += "• Creato: " + getEnlapsed_text(sugg_infos.sDate) + " fa\n";
			} else {
				testo_messaggio += "\n• Aperto da: " + getEnlapsed_text(sugg_infos.sDate) + "\n";
			}
		} else {
			testo_messaggio += "\n• Stato: "
			if (sugg_infos.status == 1) {
				testo_messaggio += "*Approvato* ⚡️\n";
			} else if (sugg_infos.status == -1) {
				testo_messaggio += "*Scartato* 🌪️\n";
			} else if (sugg_infos.status == -2) {
				testo_messaggio += "*Eliminato* 🗑\n";
			} else {
				testo_messaggio += "???\n";
			}
		}
		testo_messaggio += "• Voti positivi: " + total_upVotes + "\n";
		testo_messaggio += "• Voti negativi: " + total_downVotes + "\n";
	}

	// BOTTONI INLINE, gestiti su (al piu) 4 linee
	let prima_linea = [{ text: '🌪️', callback_data: 'SUGGESTION:CLOSE:SHOW_OPTIONS' }];
	let seconda_linea = [];

	let terza_linea = [
		{ text: '🗑', callback_data: 'SUGGESTION:AIDBUTTON:DEL_CONFIRM' },
		{ text: '🤭', callback_data: 'SUGGESTION:AIDBUTTON:LIMIT_CONFIRM' }
	];
	let quarta_linea = [];

	if (user_role >= 5) {
		if (sugg_infos.status != 0) {
			terza_linea.splice(1, 0,
				{ text: '🌱 ', callback_data: 'SUGGESTION:AIDBUTTON:REOPEN_CONFIRM' },
			);
		}

		if (sugg_infos.status != 1) {
			if (sugg_infos.status == -1) {
				prima_linea[0].text = "💭";
			}
			prima_linea.unshift({ text: '⚡', callback_data: 'SUGGESTION:AIDBUTTON:APP_CONFIRM' });
		}


	}



	// Contestualizzo le linee dei bottoni. (non ricordo esattamente il motivo, ma suppongo ce ne sia stato uno per cui ho separato bottoni e linee)
	if (opzione == "CLOSE_OPTIONS") {
		prima_linea = [
			{ text: '⮐', callback_data: 'SUGGESTION:AIDBUTTON:REFRESH' },
			{ text: '⏳', callback_data: 'SUGGESTION:CLOSE:TIME' },
			{ text: '❌', callback_data: 'SUGGESTION:CLOSE:CRIT' },
			{ text: '⭕️', callback_data: 'SUGGESTION:CLOSE:IMPOSSIBLE' },
			{ text: '🔨', callback_data: 'SUGGESTION:CLOSE:JOB' }, // 
		];
		seconda_linea = [
			{ text: '🪞', callback_data: 'SUGGESTION:CLOSE:SIMILE' },
			{ text: '⚖', callback_data: 'SUGGESTION:CLOSE:BAL' },
			{ text: '🧠', callback_data: 'SUGGESTION:CLOSE:FILO' },
			{ text: '👎', callback_data: 'SUGGESTION:CLOSE:NO' },
			{ text: '👥', callback_data: 'SUGGESTION:CLOSE:DISLIKE' },
			{ text: '💭', callback_data: 'SUGGESTION:CLOSE:OTHER' }
		]
		terza_linea = [];
		//terza_linea.splice(1, 0, );
		//terza_linea.splice(1, 0, { text: '📃', callback_data: 'SUGGESTION:AIDBUTTON:SHOW_TEXT' });
	} else if (opzione == "SHOW_TEXT") {
		terza_linea.splice(1, 0, { text: 'ⓘ', callback_data: 'SUGGESTION:AIDBUTTON:REFRESH' });
	} else if (opzione == "DEL_CONFIRM") {
		prima_linea = [];
		terza_linea = [{ text: '⮐', callback_data: 'SUGGESTION:AIDBUTTON:REFRESH' }];

		let now_date = Date.now() / 1000;
		if ((now_date - sugg_infos.sDate) < (60 * 60 * 24 * 2)) {
			terza_linea.push({ text: '✓', callback_data: 'SUGGESTION:DELETE:ANDLIMIT' });
		}
	} else if (opzione == "LIMIT_CONFIRM") {
		prima_linea = [];
		terza_linea = [{ text: '⮐', callback_data: 'SUGGESTION:AIDBUTTON:REFRESH' }, { text: '✓', callback_data: 'SUGGESTION:CLOSE:ANDLIMIT' }];
	} else if (opzione == "APP_CONFIRM") {
		prima_linea = [];
		terza_linea = [{ text: '⮐', callback_data: 'SUGGESTION:AIDBUTTON:REFRESH' }, { text: '✓', callback_data: 'SUGGESTION:OPINION:1' }];
	} else if (opzione == "REOPEN_CONFIRM") {
		prima_linea = [];
		terza_linea = [{ text: '⮐', callback_data: 'SUGGESTION:AIDBUTTON:REFRESH' }, { text: '✓', callback_data: 'SUGGESTION:OPINION:REOPEN' }];
	} else {
		terza_linea.splice(1, 0, { text: '📃', callback_data: 'SUGGESTION:AIDBUTTON:SHOW_TEXT' });
	}

	let buttons_array = [
		[{
			text: "Chiudi",
			callback_data: 'SUGGESTION:FORGET'
		}]
	];


	// Inserisco le linee
	if (terza_linea.length > 0) {
		buttons_array.unshift(terza_linea);
	}
	if (quarta_linea.length > 0) {
		buttons_array.unshift(quarta_linea);
	}
	if (seconda_linea.length > 0) {
		buttons_array.unshift(seconda_linea);
	}
	if (prima_linea.length > 0) {
		buttons_array.unshift(prima_linea);
	}




	return ({
		chat_id: mess_id,
		message_txt: testo_messaggio,
		options: {
			parse_mode: "Markdown",
			disable_web_page_preview: true,
			reply_markup: {
				inline_keyboard: buttons_array
			}
		}
	});
}

function manageDiscussionPublish(in_query, user_info) {
	return new Promise(function (manageDiscussionPublish_resolve) {
		if (typeof user_info.tmpSugg != "string" || user_info.tmpSugg.length <= 0) {
			return manageDiscussionPublish_resolve({
				query: { id: in_query.id, options: { text: "Woops!", cache_time: 2, show_alert: true } },
				toSend: simpleMessage(user_info.id, "Mi spiace, ma c'è stato un qualche errore...\nRimandami il messaggio per una nuova anteprima (:"),
				toEdit: simpleToEditMessage(in_query.message.chat.id, in_query.message.message_id, "*SCADUTO!*\n\n" + in_query.message.text)
			});

		} else if (user_info.role < 0) {
			return manageDiscussionPublish_resolve({ query: { id: in_query.id, options: { text: "🤡\nCi hai provato!", cache_time: 2, show_alert: true } } });
		} else {
			let nowDate = Date.now() / 100;
			if ((nowDate - user_info.last_discussion_date) < (60 * 60 * 8) * 10) {
				let rush_text = "👮🏿 *Quanto entusiasmo!*\n\nPer evitare lo spam in Taverna, non posso farti pubblicare più d'un messaggio anonimo ogni otto ore...";
				return manageDiscussionPublish_resolve({
					query: { id: in_query.id, options: { text: "Woops!", cache_time: 2, show_alert: true } },
					toSend: simpleMessage(user_info.id, rush_text),
					toDelete: { chat_id: in_query.message.chat.id, mess_id: in_query.message.message_id }
				});
			} else {
				return tips_handler.updateUserLastDiscussion(user_info.id, nowDate, user_info.tmpSugg).then(function (updated_discussion_date) {
					let to_return = {};

					if (updated_discussion_date > 0) {
						let taverna_id = -1001069842056; // -374985004 chat test

						let pub_res = "💡 *Proposta di Discussione*\n_da un anonimo Giocatore_\n\n";
						pub_res += user_info.tmpSugg + "\n\n" + "᳀ `" + nowDate.toString().split("").reverse().join("") + "`";

						to_return.query = { id: in_query.id, options: { text: "Pubblico...", cache_time: 1, show_alert: false } };
						to_return.toSend = simpleMessage(taverna_id, pub_res);
						to_return.toEdit = simpleToEditMessage(in_query.message.chat.id, in_query.message.message_id, "*Pubblicato in Taverna!*\n\n" + user_info.tmpSugg);
					} else {
						to_return.query = { id: in_query.id, options: { text: "Woops!", cache_time: 1, show_alert: false } };
						to_return.toSend = simpleMessage(user_info.id, "Mi spiace, non posso pubblicare la discussione al momento.\n");
						to_return.toDelete = { chat_id: in_query.message.chat.id, mess_id: in_query.message.message_id }
					}
					return manageDiscussionPublish_resolve(to_return);
				});
			}
		}

	});
}

// La funzione che risponde al comando per settrare lo pseudonimo sviluppatore (emoji)
async function impostaPseudonimoDev(messaggio) {
	let risposta = {};
	let bottoni_inline = [];
	bottoni_inline.push([{ text: '⮐', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATI:INFO' }]);


	// controllo sull'imput:
	let array_in_input = messaggio.text.split(" ").slice(1);
	let pseudonimo_tentato = array_in_input[0];
	//let è_troncato = array_in_input.length > 1;

	// Non copre assolutamente tutte le emoji e sicuramente non coprirà le future. Ma ne copre tante e c'è l'astronauta ed il tipo che si sposa. Sto
	//const emojiRegex = /<a?:.+?:\d{18}>|\p{Emoji}|\p{Extended_Pictographic}|\p{Emoji_Modifier_Base}|[\u{1F9D1}-\u{1F9DD}]|\u{200D}|👩‍🚀|🤵‍♂️/gu;
	const emojiRegex = /<a?:.+?:\d{18}>|\p{Emoji}|\p{Extended_Pictographic}|\p{Emoji_Modifier_Base}|[\u{1F0A0}-\u{1F0FF}\u{1F3B4}-\u{1F3C9}\u{1F3E0}-\u{1F3F3}\u{1F5E3}-\u{1F5E8}\u{1F6A3}-\u{1F6B5}\u{1F6C0}-\u{1F6CC}\u{1F0A1}\u{1F0B1}\u{1F0C1}\u{1F0D1}\u{1F466}\u{1F469}\u{1F9D1}-\u{1F9DD}\u{1F9D8}-\u{1F9DF}]|\u{200D}/gu;


	let è_solo_emoji = pseudonimo_tentato.replace(emojiRegex, "").length === 0;
	let conta_emoji = (pseudonimo_tentato.match(emojiRegex) || []).length;
	let condizione = ((pseudonimo_tentato.indexOf("🤖") + pseudonimo_tentato.indexOf("⚡️") + pseudonimo_tentato.indexOf("🌀") + pseudonimo_tentato.indexOf("🌪")) == -4);
	let è_ammissibile = (è_solo_emoji && condizione) ? await tips_handler.pseudonimo_libero(pseudonimo_tentato) : false;



	// Segue roba orribile, ma non mi è venuta altra idea...   EDIT: alla fine ho cambiato idea e sta roba orribile è inutile. Chissà quanto resterà…
	let array_testo = messaggio.reply_to_message.text.split("\n");
	let testo_aggiornato;
	testo_aggiornato = `*${array_testo[0]}*\n\n`; // Titolo
	testo_aggiornato += `${array_testo[2]}\n\n${array_testo[4]}\n`; // Spiegazione
	testo_aggiornato += `> \`${array_testo[5].split(" ").slice(1, 2).join(" ")}\` _${array_testo[5].split(" ").slice(2, 3).join(" ")}_ \n\n`; // comando
	testo_aggiornato += `${array_testo[7]}\n${array_testo[8]}`; // avvertenza



	// Aggiustamento del testo
	if (!è_solo_emoji) {
		testo_aggiornato += "\n\n⚠️ Attenzione!\n";
		testo_aggiornato += `> Lo pseudonimo deve essere un emoji!\n\nEsempio di comando:\n> \`/sugg 🤖\``;
	} else if (conta_emoji > 3 || pseudonimo_tentato.match(/./gu).length > 4) { //(Array.from(pseudonimo_tentato).length >= 8){ pseudonimo_tentato.match(/./gu).length
		testo_aggiornato += "\n\n🤪 Woops!\n";
		testo_aggiornato += `> Vanno bene anche più d'una emoji, ma ${pseudonimo_tentato} è un po troppo!`;
	} else if (!è_ammissibile) {
		testo_aggiornato += "\n\n😬 Woops!\n";
		testo_aggiornato += `> L'emoji scelta (${pseudonimo_tentato}) è già stata usata da un altro utente`;
	} else {
		bottoni_inline.unshift([{ text: 'Conferma candidatura', callback_data: `SUGGESTION:DEV_STUFF:INVIA_CANDIDATURA:DISCLAIMER:${pseudonimo_tentato}` }]);
		testo_aggiornato += `\n\n> Pseudonimo scelto: ${pseudonimo_tentato}`;
	}



	// Impacchettampento risposta
	risposta.toDelete = { chat_id: messaggio.chat.id, mess_id: messaggio.message_id };
	risposta.toEdit = simpleToEditMessage(messaggio.chat.id, messaggio.reply_to_message.message_id, testo_aggiornato);
	risposta.toEdit.options.reply_markup = {};
	risposta.toEdit.options.reply_markup.inline_keyboard = bottoni_inline;

	return risposta;
}

function manageDevStuff(in_query, user_info) {
	return new Promise(async function (manageDevStuff_resolve) {
		let opzioni_query = in_query.data.split(":").slice(2);

		let risposta = {}; // Tipicamente una toEdit ed una query. Alcune volte una toSend. (In due casi una seconda toEdit)
		let aggiorna_canale = {}; // se l'oggetto esiste è il messaggio da aggiornare sul canale. La seconda toEdit…

		let bottoni_inline = [];
		let testo_messaggio = "👨‍💻 ";
		let testo_query = "";
		let query_con_avviso = false;

		// Contestualizzo

		if (opzioni_query[0] == "OPT") { // Opt sono i bottoni nel messaggio di disponibilità sviluppatore
			let sugg_infos = await tips_handler.getSuggestionInfos(opzioni_query[1], user_info.id);
			let disponibilità = await disponibilità_sviluppatore(user_info, sugg_infos, `${opzioni_query.slice(2).join(":")}`);

			testo_query = disponibilità.testo_query;
			query_con_avviso = disponibilità.query_mostra_avviso;
			testo_messaggio = disponibilità.testo_messaggio;
			if (disponibilità.linea_bottoni.length > 0) {
				bottoni_inline.unshift(disponibilità.linea_bottoni);
			}


			if (typeof (disponibilità.nel_canale.chat_id) != "undefined") {
				aggiorna_canale = disponibilità.nel_canale;
			}


		} else if (opzioni_query[0] == "MAIN") { // Bottone 👨‍💻 nel sottomenu personale della bacheca
			testo_messaggio += "*Sviluppatori di Lootia*\n\n";

			bottoni_inline.push([{ text: '⮐', callback_data: 'SUGGESTION:MENU:PERSONAL' }]);
			let linea_bottoni = [];
			linea_bottoni.push({ text: "📜", url: "https://github.com/sidelux/LootBot" });
			linea_bottoni.push({ text: "💬", url: "https://t.me/SviluppatoriDiLootia" });


			// contestualizzo
			if (user_info.isDev === true) {
				// Solo per testing
				//bottoni_inline.unshift([{ text: 'Cancella candidatura', callback_data: 'SUGGESTION:DEV_STUFF:RESET:'+user_info.id }]);
				let stato_sviluppatore = user_info.dev_nick.split(":")[0];
				if (stato_sviluppatore == "attesa") {
					testo_messaggio += `La tua candidatura sta venendo esaminata dalla Fenice, ${user_info.dev_nick.split(":")[1]}`;
					bottoni_inline.unshift([{ text: 'Contatta la Fenice ⚡️', url: `https://telegram.me/fenix45?start=SviluppatoridiLootia` }]);
				} else if (stato_sviluppatore == "rifiutata") {
					testo_messaggio += `La tua candidatura è stata rifiutata dalla Fenice…`;
					bottoni_inline.unshift([{ text: 'Contatta la Fenice ⚡️', url: `https://telegram.me/fenix45?start=SviluppatoridiLootia` }]);
				} else if (stato_sviluppatore == "chat") {
					testo_messaggio += `La Fenice ha chiesto di essere contattata in privato, prima di giudicare la tua candidatura…`;
					bottoni_inline.unshift([{ text: 'Contatta la Fenice ⚡️', url: `https://telegram.me/fenix45?start=SviluppatoridiLootia` }]);
				} else {
					testo_query = `Salve, ${user_info.dev_nick}`;
					testo_messaggio = `🪪 *Sviluppatori di Lootia*, ${user_info.dev_nick}\n\n`;
				}

			} else {
				// Nuovi candidati
				testo_query = "Sviluppatori di Lootia";
				let messaggio_opensource = `⭐️\nIl sorgente di LootBot è [aperto](https://t.me/LootBotAvvisi/481)!`;
				//				let messaggio_linguaggio= `>\\_\nIl linguaggio in cui è stato scritto è javascript, estremamente flessibile e facilmente comprensibile da chiunque.`;
				let messaggio_gruppo = `💬\n C'è un gruppo dedicato a sviluppatori ed aspiranti`
				let messaggio_sviluppatore = `👨‍💻\nSe pensi di poter e voler contribuire in modo più che occasionale candidati come _sviluppatore di Lootia_`

				testo_messaggio += `${messaggio_opensource}\n\n${messaggio_gruppo}\n\n${messaggio_sviluppatore}\n\n`;


				linea_bottoni.push({ text: "👨‍💻", callback_data: "SUGGESTION:DEV_STUFF:CANDIDATI:INFO" }); //Candidati! (e l'accento ne cambia il senso ;) )

			}

			bottoni_inline.unshift(linea_bottoni);

		} else if (opzioni_query[0] == "CANDIDATI") { // Bottone 👨‍💻 Candidati
			testo_query = "Candidati";
			testo_messaggio += "*Candidati*\n\n";

			bottoni_inline.push([{ text: '⮐', callback_data: 'SUGGESTION:DEV_STUFF:MAIN' }]);

			if (user_info.isDev) {
				if (user_info.dev_nick.split(":")[0] == "attesa") {
					testo_messaggio += `La tua candidatura sta venendo esaminata dalla Fenice, ${user_info.dev_nick.split(":")[1]}`;
				} else {
					testo_messaggio += `🤪\nCome sei arrivato fin qui, ${user_info.dev_nick}?`;
				}

			} else if (opzioni_query[1] == "INFO") {
				let messaggio_candidati = `Come _sviluppatore di Lootia_, per il momento è possibile:\n\n`;
				messaggio_candidati += `• Segnalare la propria disponibilità ad implementare un [suggerimento](${channel_link_no_parse})\n`;
				messaggio_candidati += `• Pubblicare suggerimenti con lo pseudonimo da sviluppatore\n`;
				messaggio_candidati += `• Aprire e gestire topic nel gruppo di discussione\n`;

				testo_messaggio += messaggio_candidati;
				bottoni_inline.unshift([{ text: 'Candidami!', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATI:CONFERMA' }]);
			} else if (opzioni_query[1] == "CONFERMA") {
				testo_query = "Attenzione, aspirante!";
				let messaggio_conferma = "⚠️ Attenzione!\n\n";
				messaggio_conferma += "• Candidati solo se pensi realmete di poter contribuire concretamente al progetto.\n\n";
				messaggio_conferma += "• _L'abuso di questa funzione sarà giudicato ad inappellabile discrezione della Fenice_";

				testo_messaggio += messaggio_conferma;
				bottoni_inline = [[
					{ text: '⮐', callback_data: 'SUGGESTION:DEV_STUFF:MAIN' },
					{ text: '✅', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATI:SCELTA_NICK' }
				]];

			} else if (opzioni_query[1] == "SCELTA_NICK") {
				testo_query = "Scegli uno pseudonimo";

				let testo_pseudonimo = "Scegli un emoji, sarà il tuo pseudonimo!\n\n"; //2, 3
				testo_pseudonimo += "Rispondi a questo messaggio con\n"; //4
				testo_pseudonimo += "> `/sugg` _emoji_\n\n"; // 5, 6
				testo_pseudonimo += "❗️\nVerrà inclusa nella candidatura inviata alla Fenice"; // 7

				testo_messaggio += testo_pseudonimo;

			}

		} else if (opzioni_query[0] == "INVIA_CANDIDATURA") {
			testo_messaggio += "*Sviluppatori di Lootia*\n\n";
			bottoni_inline.push([{ text: '⮐', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATI:SCELTA_NICK' }]);

			if (user_info.isDev) {
				if (user_info.dev_nick.split(":")[0] == "attesa") {
					testo_messaggio += `La tua candidatura sta venendo esaminata dalla Fenice, ${user_info.dev_nick.split(":")[1]}`;
				} else {
					testo_messaggio += `🤪\nCome sei arrivato fin qui, ${user_info.dev_nick}?`;
				}
			} else if (opzioni_query[1] == "DISCLAIMER") {
				testo_query = "Controlla la tua candidatura";

				testo_messaggio += "La richiesta includerà: \n\n";
				testo_messaggio += `> Nickname: ${in_query.message.chat.username.split("_").join("\\_")}\n`;
				testo_messaggio += `> ID Telegram: ${user_info.id}\n`;
				testo_messaggio += `> Pseudonimo Sviluppatore: ${opzioni_query[2]}\n`;
				bottoni_inline.unshift([{ text: 'Invia candidatura alla Fenice!', callback_data: 'SUGGESTION:DEV_STUFF:INVIA_CANDIDATURA:CONFERMA:' + opzioni_query[2] }]);

				testo_query = "⚠️ Attenzione!\n\nNon abusare di questa funzione.\n\nInvia la candidatura solo se sai di poter contribuire con tempo e capacità"
				query_con_avviso = true;
			} else if (opzioni_query[1] == "CONFERMA") {
				testo_query = "Candidatura inviata!";
				// Candidato
				testo_messaggio += "> Candidatura inviata alla Fenice ⚡️\n\n";
				testo_messaggio += "Non appena ci saranno aggiornamenti riceverai un messaggio in questa chat"
				bottoni_inline = [[{ text: '⮐', callback_data: 'SUGGESTION:MENU:PERSONAL' }]];

				await tips_handler.pseudonimo_temporaneo(user_info.id, `attesa:${opzioni_query[2]}`, in_query.message.chat.username);
				risposta.toSend = messaggioCandidatura__amministratore(in_query.message.chat.username, user_info.id, opzioni_query[2]);
			}

		} else if (opzioni_query[0] == "CANDIDATURA") { // Gestione delle candidature, solo amministratore
			if (user_info.role < 5) {
				testo_messaggio += `🤪\nCome sei arrivato fin qui?`;
				bottoni_inline = [[
					{ text: "⨷", callback_data: 'SUGGESTION:FORGET' }
				]];
			} else {
				// Preparazione di due messaggi. toEdit per l'amministratore, toSend per lo sviluppatore
				let nuovo_stato_sviluppatore = "attesa";
				let dev_info = await tips_handler.info_sviluppatore(opzioni_query[2]);
				let pseudonimo = dev_info.pseudonimo.split(":").length != 1 ? dev_info.pseudonimo.split(":")[1] : dev_info.pseudonimo;

				let bottoni_sviluppatore = [[{ text: "⨷", callback_data: 'SUGGESTION:FORGET' }]];
				let testo_sviluppatore = testo_messaggio + " *Sviluppatori di Lootia*\n\n";

				testo_messaggio += "*Gestione Candidature*\n\n";
				testo_messaggio += `> Nickname: @${dev_info.username.split("_").join("\\_")}\n`;
				testo_messaggio += `> ID Telegram: \`${dev_info.id}\`\n`; // [](tg://user?id=${userid_candidato})
				testo_messaggio += `> Pseudonimo: ${pseudonimo}\n`;

				if (opzioni_query[1] == "RIFIUTATA") {
					nuovo_stato_sviluppatore = `rifiutata:${pseudonimo}`;
					if (dev_info.pseudonimo.split(":").length == 1) {
						testo_sviluppatore += `La Fenice t'ha rimosso dagli sviluppatori abilitati, ${pseudonimo}\n`;
					} else {
						testo_sviluppatore += "La tua candidatura è stata rifiutata dalla Fenice…\n";
					}
					testo_messaggio += `> Candidatura: Rifiutata ❌\n`;
				} else if (opzioni_query[1] == "CONTATTA_ADMIN") {
					testo_messaggio += `> Candidatura: In attesa di colloquio 💬\n`;
					if (dev_info.pseudonimo.split(":").length == 1 || dev_info.pseudonimo.split(":")[0] == "rifiutata") {
						testo_sviluppatore += `La Fenice ha bisogno di parlarti, ${pseudonimo}…\n`;
						testo_sviluppatore += `Per il momento il tuo status di sviluppatore è sospeso.\n`;
					} else if (dev_info.pseudonimo.split(":")[0] == "chat") {
						testo_sviluppatore += `Per valutare la tua candidatura La Fenice ha bisogno di parlarti, ${pseudonimo}…\n`;
					} else {
						testo_sviluppatore += "La Fenice vorrebbe conoscerti per poter valutare la tua candidatura…\n";
					}
					bottoni_sviluppatore.unshift([{ text: "Contatta la Fenice ⚡️", url: `https://telegram.me/fenix45?start=SviluppatoridiLootia` }]);
					nuovo_stato_sviluppatore = `chat:${pseudonimo}`;
				} else if (opzioni_query[1] == "ACCETTATA") {
					testo_sviluppatore += "La tua candidatura è stata accettata dalla Fenice!\n";
					bottoni_sviluppatore.unshift([{ text: "Sviluppatori di Lootia", callback_data: "SUGGESTION:DEV_STUFF:MAIN" }]);
					testo_messaggio += `> Candidatura: Accettata ✅\n`;
					nuovo_stato_sviluppatore = `${pseudonimo}`;
				}

				await tips_handler.aggiorna_stato_pseudonimo(dev_info.id, nuovo_stato_sviluppatore);

				// Messaggio per l'amministratore, il resto va nell'impacchettamento
				bottoni_inline.unshift([
					{ text: "⮐", callback_data: `SUGGESTION:DEV_STUFF:ADMIN_MENU` },
					{ text: "⨷", callback_data: 'SUGGESTION:FORGET' }
				]);


				// Messaggio per lo sviluppatore
				risposta.toSend = simpleDeletableMessage(dev_info.id, testo_sviluppatore);
				risposta.toSend.options.reply_markup.inline_keyboard = bottoni_sviluppatore;

			}
		} else if (opzioni_query[0] == "ADMIN_MENU") { // Gestione dello stato di sviluppatori e candidature (solo amministratore)
			if (user_info.role < 5) {
				testo_messaggio += `🤪\nCome sei arrivato fin qui?`;
				bottoni_inline = [[
					{ text: "⨷", callback_data: 'SUGGESTION:FORGET' }
				]];
			} else {
				testo_messaggio += " *Sviluppatori di Lootia*\n\n";
				bottoni_inline.push([
					{ text: "⮐", callback_data: 'SUGGESTION:MENU:OPZIONI_ADMIN' },
					{ text: "⨷", callback_data: 'SUGGESTION:FORGET' }
				]);


				let dev_stats = await tips_handler.lista_sviluppatori();

				// Abilitati
				if (dev_stats.abilitati.length <= 0) {
					testo_messaggio += "> Non è stato riconosciuto ancora nessuno sviluppatore…\n";
				} else {
					if (dev_stats.abilitati.length == 1) {
						testo_messaggio += "> È stato riconosciuto un solo sviluppatore…\n";
					} else {
						testo_messaggio += `> Sono stati riconosciuti ${dev_stats.abilitati.length} sviluppatori…\n`;
					}

					// MA anche no!
					// for (let i = 0; i < dev_stats.abilitati.length; i++) {
					// 	testo_messaggio += `• ${dev_stats.abilitati[i].pseudonimo} [${dev_stats.abilitati[i].id}](tg://user?id=${dev_stats.abilitati[i].id})\n`;
					// }

					bottoni_inline.push([{ text: `Sviluppatori (${dev_stats.abilitati.length})`, callback_data: 'SUGGESTION:DEV_STUFF:SHOW:ABILITATI:0' }])

				}

				// In attesa
				if (dev_stats.in_attesa.length > 0) {
					bottoni_inline.push([{ text: `In attesa (${dev_stats.in_attesa.length})`, callback_data: 'SUGGESTION:DEV_STUFF:SHOW:IN_ATTESA:0' }])
				} else {
					testo_messaggio += "\n> Nessuna nuova richiesta\n";
				}

				// Richiesta di contatto
				if (dev_stats.da_contattare.length > 0) {
					bottoni_inline.push([{ text: `Da contattare (${dev_stats.da_contattare.length})`, callback_data: 'SUGGESTION:DEV_STUFF:SHOW:DA_CONTATTARE:0' }])
				}

				// Rifiutati
				if (dev_stats.rifiutati.length > 0) {
					bottoni_inline.push([{ text: `Rifiutati (${dev_stats.rifiutati.length})`, callback_data: 'SUGGESTION:DEV_STUFF:SHOW:RIFIUTATE:0' }])
				}

				// Zombie -> potrebbe pure capitare
				if (dev_stats.zombie.length < 0) {
					testo_messaggio += `\n⚠️ Attenzione!\n> ${dev_stats.zombie.length} posizion${dev_stats.zombie.length == 1 ? "e" : "i"} da controllare…`;
					bottoni_inline.push([{ text: `Da controllare (${dev_stats.zombie.length})`, callback_data: 'SUGGESTION:DEV_STUFF:SHOW:ZOMBIE:0' }])
				}

			}
		} else if (opzioni_query[0] == "SHOW") { // Mostra una lista (sviluppatori abilitati, rifiutati, da contattare, in attesa…). La lista è di bottoni. C'è paginazione ogni 5 elementi. Quindi noproblem (solo amministratore)
			if (user_info.role < 5) {
				testo_messaggio += `🤪\nCome sei arrivato fin qui?`;
				bottoni_inline = [[
					{ text: "⨷", callback_data: 'SUGGESTION:FORGET' }
				]];
			} else {
				testo_messaggio += ` *Sviluppatori di Lootia*\n_Candidature ${opzioni_query[1].toLowerCase().split("_").join(" ")}_\n\n`;
				bottoni_inline.push([
					{ text: "⮐", callback_data: 'SUGGESTION:DEV_STUFF:ADMIN_MENU' },
					{ text: "⨷", callback_data: 'SUGGESTION:FORGET' }
				]);
				let dev_stats = await tips_handler.lista_sviluppatori();
				let lista_da_stampare = [];

				switch (opzioni_query[1]) { // Mi sa che si può fare piu fico ed in iuna sola linea usando la proprietà dell'oggetto. Al momento non ho sbatta…
					case ("ABILITATI"): {
						testo_messaggio = `👨‍💻 *Sviluppatori di Lootia*\n\n`;
						lista_da_stampare = dev_stats.abilitati;
						break;
					}
					case ("IN_ATTESA"): {
						lista_da_stampare = dev_stats.in_attesa;
						break;
					}
					case ("DA_CONTATTARE"): {
						lista_da_stampare = dev_stats.da_contattare;
						break;
					}
					case ("RIFIUTATE"): {
						lista_da_stampare = dev_stats.rifiutati;
						break;
					}
					case ("ZOMBIE"): {
						lista_da_stampare = dev_stats.zombie;
						break;
					}
				}

				let indice_pagina = Math.max(parseInt(opzioni_query[2]), 0);
				let massimo = Math.min(indice_pagina + 5, lista_da_stampare.length);


				for (let i = indice_pagina; i < massimo; i++) {
					bottoni_inline.push([
						{ text: `${lista_da_stampare[i].pseudonimo} ${lista_da_stampare[i].username} `, callback_data: 'SUGGESTION:DEV_STUFF:SHOW_DEV:' + lista_da_stampare[i].id },
					]);
				}


				// Bottoni paginazione
				if (indice_pagina > 0) {
					bottoni_inline[0].push({ text: `◀`, callback_data: `SUGGESTION:DEV_STUFF:SHOW:${opzioni_query[1]}:${indice_pagina - 5}` });
				}
				if (massimo < lista_da_stampare.length) {
					bottoni_inline[0].push({ text: `▶`, callback_data: `SUGGESTION:DEV_STUFF:SHOW:${opzioni_query[1]}:${massimo}` });
				}


			}
		} else if (opzioni_query[0] == "SHOW_DEV") { // Gestione dello stato di uno sviluppatore (solo amministratore)
			if (user_info.role < 5) {
				testo_messaggio += `🤪\nCome sei arrivato fin qui?`;
				bottoni_inline = [[
					{ text: "⨷", callback_data: 'SUGGESTION:FORGET' }
				]];
			} else {
				let pagina_indietro = "ADMIN_MENU"

				let dev_info = await tips_handler.info_sviluppatore(opzioni_query[1]);
				let stato_sviluppatore = "abilitato";
				let pseudonimo = dev_info.pseudonimo;

				if (dev_info.pseudonimo.split(":").length > 1) {
					let tmp_split = dev_info.pseudonimo.split(":");
					stato_sviluppatore = tmp_split[0];
					pseudonimo = tmp_split[1];
				}

				if (stato_sviluppatore == "abilitato") {
					pagina_indietro = "ABILITATI"; // ABILITATI IN_ATTESA DA_CONTATTARE RIFIUTATE ZOMBIE
					testo_messaggio = "*Sviluppatore abilitato*\n\n";

					bottoni_inline.push([{ text: '❌ Rimuovi', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATURA:RIFIUTATA:' + dev_info.id }]);
					bottoni_inline.push([{ text: '💬 Richiedi contatto privato', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATURA:CONTATTA_ADMIN:' + dev_info.id }]);

				} else if (stato_sviluppatore == "attesa") {
					pagina_indietro = "IN_ATTESA"; //  DA_CONTATTARE RIFIUTATE ZOMBIE
					testo_messaggio = "*Candidatura in attesa*\n\n";

					bottoni_inline.push([{ text: '❌ Rifiuta', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATURA:RIFIUTATA:' + dev_info.id }]);
					bottoni_inline.push([{ text: '💬 Richiedi contatto privato', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATURA:CONTATTA_ADMIN:' + dev_info.id }]);
					bottoni_inline.push([{ text: '✅ Accetta', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATURA:ACCETTATA:' + dev_info.id }]);


				} else if (stato_sviluppatore == "chat") {
					testo_messaggio = "*Sviluppatore da contattare*\n\n";
					bottoni_inline.push([{ text: '❌ Rifiuta', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATURA:RIFIUTATA:' + dev_info.id }]);
					bottoni_inline.push([{ text: '✅ Accetta', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATURA:ACCETTATA:' + dev_info.id }]);
					bottoni_inline.push([{ text: '💬 Richiedi contatto privato', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATURA:CONTATTA_ADMIN:' + dev_info.id }]);

					pagina_indietro = "DA_CONTATTARE"; //   
				} else if (stato_sviluppatore == "rifiutata") {
					testo_messaggio = "*Candidatura rifiutata*\n\n";
					pagina_indietro = "RIFIUTATE"; // 

					bottoni_inline.push([{ text: '💬 Richiedi contatto privato', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATURA:CONTATTA_ADMIN:' + dev_info.id }]);
					bottoni_inline.push([{ text: '🌱 Permetti una nuova candidatura', callback_data: 'SUGGESTION:DEV_STUFF:RESET:' + dev_info.id }]);


				} else if (stato_sviluppatore == "zombie") {
					testo_messaggio = "*Candidatura zombie*\n\n";
					bottoni_inline.push([{ text: '🌱 Permetti una nuova candidatura', callback_data: 'SUGGESTION:DEV_STUFF:RESET:' + dev_info.id }]);
					bottoni_inline.push([{ text: '❌ Rifiuta', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATURA:RIFIUTATA:' + dev_info.id }]);
					bottoni_inline.push([{ text: '✅ Accetta', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATURA:ACCETTATA:' + dev_info.id }]);

					pagina_indietro = "ZOMBIE"; //    
				}

				testo_messaggio += `> Nickname: @${dev_info.username.split("_").join("\\_")}\n`;
				testo_messaggio += `> ID Telegram: \`${dev_info.id}\`\n`; // [](tg://user?id=${userid_candidato})
				testo_messaggio += `> Pseudonimo: ${pseudonimo}\n`;



				bottoni_inline.unshift([
					{ text: "⮐", callback_data: `SUGGESTION:DEV_STUFF:SHOW:${pagina_indietro}:0` },
					{ text: "⨷", callback_data: 'SUGGESTION:FORGET' }
				]);

			}

		} else if (opzioni_query[0] == "RESET") { // Setta a NULL il dev_nick (condizione necessaria per mandare una candidatura)
			testo_query = "Immacolato!";
			await tips_handler.cancella_pseudonimo_temporaneo(opzioni_query[1]);
			testo_messaggio += " *Gestione candidature*\n\nL'utente può inoltrare una nuova richiesta…";
			bottoni_inline.push([{ text: '⮐', callback_data: 'SUGGESTION:MENU:REFRESH' }]);

			if (user_info.id == amministratore_suggerimenti || user_info.id != opzioni_query[1]) {
				let testo_sviluppatore = "👨‍💻 *Sviluppatori di Lootia*\n\nSe vorrai inviare una nuova candidatura, La Fenice la valuterà."
				risposta.toSend = simpleDeletableMessage(opzioni_query[1], testo_sviluppatore);
			}

		}


		// Impacchetto la risposta
		if (!risposta.hasOwnProperty("query")) {
			risposta.query = { id: in_query.id, options: { text: testo_query, cache_time: 2, show_alert: query_con_avviso } };
		}
		risposta.toEdit = simpleToEditMessage(in_query.message.chat.id, in_query.message.message_id, testo_messaggio);
		risposta.toEdit.options.reply_markup = {};
		risposta.toEdit.options.reply_markup.inline_keyboard = bottoni_inline;


		//Se ci sono 2 toEdit bisogna mandare su un array
		if (typeof (aggiorna_canale.chat_id) != "undefined") {
			let risposta_complessa = [];
			risposta_complessa.push(risposta);
			risposta_complessa.push({ toEdit: aggiorna_canale });
			return manageDevStuff_resolve(risposta_complessa);

		}

		return manageDevStuff_resolve(risposta);
	});
}


function messaggioCandidatura__amministratore(username_candidato, userid_candidato, pseudonimo) {
	// Amministratore
	let testo_amministratore = "👨‍💻 *Candidatura Sviluppatore*\n\n";
	testo_amministratore += "Salve Fenice,\nCi sarebbe la candidatura di uno sviluppatore da esaminare…\n\n";
	testo_amministratore += `> Nickname: @${username_candidato.split("_").join("\\_")}\n`;
	testo_amministratore += `> ID Telegram: \`${userid_candidato}\`\n`; // [](tg://user?id=${userid_candidato})
	testo_amministratore += `> Pseudonimo richiesto: ${pseudonimo}\n`;

	let bottoni_amministratore = [];
	bottoni_amministratore.push([{ text: '❌ Rifiuta lo pseudonimo', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATURA:RIFIUTATA:' + userid_candidato }]);
	bottoni_amministratore.push([{ text: '💬 Richiedi contatto privato', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATURA:CONTATTA_ADMIN:' + userid_candidato }]);
	bottoni_amministratore.push([{ text: '✅ Accetta la Candidatura', callback_data: 'SUGGESTION:DEV_STUFF:CANDIDATURA:ACCETTATA:' + userid_candidato }]);

	let messaggio_amministratore = simpleDeletableMessage(amministratore, testo_amministratore);
	messaggio_amministratore.options.reply_markup.inline_keyboard = bottoni_amministratore;
	return messaggio_amministratore;
}



// (: