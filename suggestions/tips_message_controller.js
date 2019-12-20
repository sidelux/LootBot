const tips_handler = require('./models/tips_message_model');
const antiflood_time = 2; // da rendere globale o da aggiornare manualmente nel model
const max_delay = 2 * antiflood_time + 1; //in secondi

const manual_log = false; //log orribile
const simple_log = false; // log orribile2, meno verbroso

const censure = true; // abilita il controllo sul testo (da rivedere!)
const maintenance = false; // analizza solo messaggi e query di theCreator
const channel_name = "Suggerimenti_per_LootBot"; // "Suggerimenti_per_LootBot" // nome del canale per pubblicare. Il bot deve esserne admin. "nrc_bot_test" per testing;
const theCreator = '16964514'; //telegram id per @nrc382
const phenix_id = '20471035'; //telegram id per @fenix45

const sugg_triggers = {
	cmd: "/suggerimenti",
	tag: "#suggerimento",
	quick: "/suggerimento"
}

const loot_link = "[LootBot](https://telegram.me/lootgamebot/)";
const channel_link_no_parse = "https://t.me/" + channel_name;
const channel_link = "[canale](t.me/" + channel_name + ")";


//MENU 
const suggestion_tag = {
	primo: ['🗺', '#loot', '#plus', '#community', "#tools"],
	secondo: ['👤', '#alchimia', '#drago', '#giocatore', '#imprese', '#team', '#talenti', '#vocazione'],
	bis: ['🎮', '#assalto', '#craft', '#contrabbandiere', '#dungeon', '#figurine', '#incarichi', '#ispezioni', '#mappe', '#mercato', '#missioni', "#top", '#viaggi'],
	ter: ['🎭', "#eventi", '#casadeigiochi', '#vette', '#globali', '#polvere', '#miniere'],
	terzo: ['⚙', '#estetica', '#meccaniche', '#bottoni', '#testi', '#comandi'],
	quarto: ['⭐️', '#novità', '#revisione']
};

//___________________________________________________________//
//CALLBACKS MANAGER********************************************
//___________________________________________________________//

function manageCallBack(query) {
	return new Promise(function (callBack_resolve) {
		if (manual_log) {
			console.log("================\nCallBack\n================");
			console.log("> Orario di inizio gestione:\t" + Date.now() / 1000);
		}
		if (maintenance && query.from.id != theCreator)
			return callBack_resolve({ query: { id: query.id, options: { text: "Bot in manutenzione straordinaria..." } } });

		let date = Date.now() / 1000;

		tips_handler.getUserInfo(query.from.id).then(function (user_info) {
			if (manual_log) { console.log(">\t\tUltima query: " + user_info.lastQDate); }

			if (user_info == -1) {
				return callBack_resolve({ query: { id: query.id, options: { text: "Uups! Il Bot ha qualche problema..." } } });
			}
			let controll = true;
			if (user_info.lastcheck > 0) {
				controll = (date - user_info.lastcheck) > 86400
			}
			if (simple_log) console.log("query da:" + query.from.username + "\nControllo: " + controll);

			tips_handler.getLootUser(query.from.username, controll, query.from.id).
			then(function (loot_user) {
				if (loot_user == null) {
					return callBack_resolve({
						toSend: invalidMessage(query.from.id, "Il server di Loot non è raggiungibile, se il problema persiste contatta pure @nrc382"),
						query: { id: query.id, options: { text: "Whoops!" } }
					});
				}
				let isAPlayer = false;
				let isTooYoung = false;

				if (loot_user == true) {
					isAPlayer = true;
				} else if (query.from.id == phenix_id) {
					isAPlayer = true;
				}
				else {
					for (let i = 0; i < loot_user.res.length; i++) {
						if (loot_user.res[i].greater_50 == 0 && query.from.id != phenix_id) {
							isTooYoung = true;
						} else if (loot_user.res[i].nickname.toLowerCase() == query.from.username.toLowerCase()) {
							isAPlayer = true;
							isTooYoung = false;
							break;
						}
					};
					if (isAPlayer == false) {
						if (manual_log) { console.log(">\t\t" + query.from.username + " non è un giocatore di loot!\n"); }
						return callBack_resolve({
							toSend: invalidMessage(query.from.id, "Devi essere un utente di " + loot_link + " per usare questo bot..."),
							query: { id: query.id, options: { text: "Whoops!" } }
						});
					} else if (isTooYoung == true) {
						return callBack_resolve({
							toSend: invalidMessage(query.from.id, "Sei troppo giovane per usare questo bot.\nAumenta prima la tua esperienza su @lootgamebot!"),
							query: { id: query.id, options: { text: "Whoops!" } }
						});
					}
				}
				if ((date - user_info.lastQDate) > antiflood_time && isAPlayer) {
					tips_handler.currQueryOf(user_info.id, date).
					then(function (updateQuery) {
						if (manual_log) { console.log("> Query Accettata!"); }

						if (updateQuery > 0) {
							let queryMenager;
							switch (query.data.split(":")[1]) {
								case "MENU": {
									queryMenager = manageMenu(query, user_info);
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
								case "FORGET": {
									queryMenager = manageForget(query, user_info);
									break;
								}
							}

							queryMenager.
							then(function (res) {
								if (manual_log) {
									let end_time = Date.now();
									console.log("> Orario di fine gestione query: " + end_time + " [esecuzione in " + (end_time - date * 1000) + " millisecondi]");
									console.log("================\nFINE CallBack\n================");
								}
								//tips_handler.currQueryOf(user_info.id, date).
								callBack_resolve(res);
							}).
							catch(function (err) { console.log(err) });
						} else {
							callBack_resolve({ query: { id: query.id, options: { text: "Upss..." } } });
							if (manual_log) {
								let end_time = Date.now();
								console.log("> Orario di fine gestione query: " + end_time + " [esecuzione in " + (end_time - date * 1000) + " millisecondi]");
								console.log("================\nFINE CallBack\n================");
							}
						}
					}).
					catch(function (err) { console.log(err) });
				} else {
					if (manual_log) { console.log("> Query NON Accettata!"); }
					callBack_resolve({ query: { id: query.id, options: { text: "Magna cum calma!\n🍪\nAspetta almeno " + antiflood_time + " secondi tra un bottone ed un altro...", show_alert: true, cache_time: 2 } } });

					if (manual_log) {
						let end_time = Date.now();
						console.log("> Orario di fine gestione query: " + end_time + " [esecuzione in " + (end_time - date * 1000) + " millisecondi]");
						console.log("================\nFINE CallBack\n================");
					}
				}
			}).catch(function (error) {
				console.log(error);
				suggestion_resolve({ toSend: simpleDeletableMessage(message.chat.id, "Ups!\nIl server di LootBot sembra essere offline...") });
			});
		}).catch(function (err) { console.log(err) });

	});
}
module.exports.manageCallBack = manageCallBack;

//___________________________________________________________//
//MESSAGE MANAGER *********************************************
//___________________________________________________________//

function suggestionManager(message) {
	return new Promise(function (suggestion_resolve) {
		//let is_private_chat = (message.chat.id == message.from.id);
		let text = message.text.toString();

		if (maintenance && message.from.id != theCreator)
			return suggestion_resolve({ toSend: invalidMessage(message.chat.id, "🤖 ❓\nBot in manutenzione straordinaria...") });


		if (message.from.id == theCreator) { //else	
			if (manual_log) { console.log("_______CREATORE!__________"); }

			if (text.indexOf("sono dio") >= 0) {
				return tips_handler.setUserRole(message.from.id, 5).
				then(function (role_set) {
					suggestion_resolve({ toSend: simpleMessage(message.chat.id, "🌟\nBentornato, Creatore!") });
				}).
				catch(function (error) { console.log(">\tErrore? "); console.log(error); });

			}
			else if (text.indexOf("sono utente") >= 0) {
				return tips_handler.setUserRole(message.from.id, 1).
				then(function (role_set) {
					suggestion_resolve({ toSend: simpleMessage(message.chat.id, "🐾\nSei ora cammuffato da semplice utente, Creatore!") });
				}).
				catch(function (error) { console.log(">\tErrore? "); console.log(error); });
			}
			else if (text.indexOf("sono mod") >= 0) {
				return tips_handler.setUserRole(message.from.id, 3).
				then(function (role_set) {
					suggestion_resolve({ toSend: simpleMessage(message.chat.id, "🛠\nSei ora cammuffato da moderatore, Creatore!") });
				}).
				catch(function (error) { console.log(">\tErrore? "); console.log(error); });

			}
			else if (text.indexOf("sono limitato") >= 0) {
				return tips_handler.setUserRole(message.from.id, 0).
				then(function (role_set) {
					suggestion_resolve({ toSend: simpleMessage(message.chat.id, "👐\nTi sei legato le mani, Creatore!") });
				}).
				catch(function (error) { console.log(">\tErrore? "); console.log(error); });
			}
			else if (text.indexOf("sono bandito") >= 0) {
				return tips_handler.setUserRole(message.from.id, -1).
				then(function (role_set) {
					suggestion_resolve({ toSend: simpleMessage(message.chat.id, "😯\nUUh! Creatore!") });
				}).
				catch(function (error) { console.log(">\tErrore? "); console.log(error); });
			}
			else if (text.indexOf("sono nazi") >= 0) {
				return tips_handler.setUserRole(message.from.id, 2).
				then(function (role_set) {
					suggestion_resolve({ toSend: simpleMessage(message.chat.id, "🦖\nSieg Heil") });
				}).
				catch(function (error) { console.log(">\tErrore? "); console.log(error); });
			}
		}

		if (typeof message.reply_to_message != 'undefined') {
			if (simple_log) console.log(message.reply_to_message.from);
			if (message.reply_to_message.from.username == 'AldegliArgonautiIlBot') {
				suggestion_resolve({ toSend: simpleMessage(message.chat.id, "🤖 *???* \nMa quello sono io!") });
			} else if (message.reply_to_message.from.is_bot) {
				suggestion_resolve({ toSend: simpleDeletableMessage(message.chat.id, "🤖*??*\nMa quello è un bot!") });
			}
		}


		if (manual_log) {
			console.log("================\nSUGGERIMENTO\n================");
			console.log("> Orario di inizio gestione:\t" + Date.now() / 1000);
			console.log("> Orario messaggio:\t" + message.date);
		}
		let start_time = Date.now() / 1000;

		if ((message.date - start_time) > max_delay) {
			if (manual_log) { console.log(">\tIl messaggio è troppo vecchio [" + (start_time - message.date) + " secondi], lo scarto."); }
			return suggestion_resolve(); 			//suggestion_resolve(invalidMessage(message.chat.id, "Ho avuto qualche problema..."));
		} else {
			if (simple_log) console.log("Chiedo info");
			tips_handler.getUserInfo(message.from.id).then(function (user_info) {

				if (simple_log) console.log("Ultimo controllo: " + user_info.lastcheck + " Booleano: " + (start_time - user_info.lastcheck));
				let controll = true;
				if (user_info.id == phenix_id) {
					controll = false;
				} else if (user_info.lastcheck > 0) {
					controll = (start_time - user_info.lastcheck) > 86400
				}
				if (simple_log) console.log("Messaggio da: " + message.from.username + ", controllo: " + controll);
				tips_handler.getLootUser(message.from.username, controll, message.from.id).then(function (loot_user) {
					if (loot_user == null) {
						return suggestion_resolve({
							toSend: invalidMessage(message.from.id, "Il server di Loot non è raggiungibile, se il problema persiste contatta pure @nrc382"),
						});
					}
					let isAPlayer = false;
					if (loot_user == true)
						isAPlayer = true;

					if (user_info == -1) {
						return suggestion_resolve({ toSend: { id: message.id, options: { text: "*Whoops!* 🤯\n_Il Bot ha qualche problema..._\n\nSe puoi, scrivi a @nrc382" } } });
					} else if (loot_user != true) {
						if (loot_user.res) {
							loot_user.res.forEach(function (user) {
								if (user.nickname.toLowerCase() == message.from.username.toLowerCase()) {
									if (manual_log) { console.log(">\t\t" + loot_user.res[0].nickname + " è " + message.from.username); }
									isAPlayer = true;
									if (user.greater_50 == 0 && message.from.id != phenix_id) {
										isAPlayer = false;
										return suggestion_resolve({
											toSend: invalidMessage(message.from.id, "Sei troppo giovane per usare questo bot.\nAumenta prima la tua esperienza su @lootgamebot!"),
										});
									}
								}
							});
						} else {
							if (message.from.id == phenix_id) {
								isAPlayer = true;
							} else if (isAPlayer == false) {
								if (manual_log) { console.log(">\t\t" + message.from.username + " non è un giocatore di lootia"); }
								return suggestion_resolve({ toSend: invalidMessage(message.chat.id, "Devi essere un utente di " + loot_link + " per usare questo bot...") });
							}
						}
					}

					if ((message.date - user_info.lastmsg) < antiflood_time) {
						if (manual_log) { console.log(">\tIl messaggio è " + (((message.date - user_info.lastmsg) > 0) ? "TROPPO recente" : "OBSOLETO") + ", lo scarto... "); }
						return suggestion_resolve();
					} else if (isAPlayer) {
						if (simple_log) { console.log(">\tIl messaggio è recente, ma non troppo... "); }

						return suggestionDispatch(user_info, message).then(function (res_message) {
							if (res_message.noMessage) { suggestion_resolve({}); }
							else if (res_message.chat_id) { suggestion_resolve({ toSend: res_message }); }
							else if (res_message.toSend || res_message.toEdit) { suggestion_resolve(res_message) }
							else { return Promise.resolve(invalidMessage(user_info.id, generic_error)); }
						}).catch(function (error) {
							console.error(">\tErrore nella dispatch:");
							console.error(error);
						}).then(function (pub_res) {
							return tips_handler.updateLast(user_info.id, start_time, false);
						}).catch(function (error) {
							console.log(">\tErrore nel'update del messaggio:");
							console.log(error);
						}).then(function (res) {
							if (manual_log) {
								let end_time = Date.now();
								console.log("> Orario di fine gestione: " + end_time + " [esecuzione in " + (end_time - start_time * 1000) + " millisecondi]");
								console.log("> Orario di impostato all'untente: " + (res * 1000) + " [differenza: " + (end_time - (res * 1000)) + " millisecondi]");
							}
							if (simple_log) console.log("================\nFINE SUGGERIMENTO\n================");
						});
					} else {
						return suggestion_resolve([]);
					}
				}).catch(function (error) {
					console.log(error);
					suggestion_resolve({ toSend: simpleDeletableMessage(message.chat.id, "Ups!\nIl server di LootBot sembra essere offline...") });
				});
			}).catch(function (error) { console.log(">\tErrore richiedendo le info per l'utente: " + message.from.id); console.log(error); });
		}
	});
}
module.exports.suggestionManager = suggestionManager;

function suggestionDispatch(user_info, message) {
	let entities = message.entities;
	let trigger = message.text.substr(entities[0].offset, entities[0].length).toLowerCase();
	let chat_id = message.chat.id;
	if (manual_log) { console.log("> Dispatch, TRIGGER: " + trigger); }

	if (message.text.length > 3500) {
		return Promise.resolve(invalidMessage(user_info.id, "Non è un po troppo lungo, questo suggerimento? 🤔"));
	} else if (message.text == trigger) {
		return mainMenu(user_info);
	} else if (trigger == sugg_triggers.tag) {
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

		return propouseInsert(user_info, text_array, tags_array, (user_info.id != message.chat.id));
	} else if (trigger == sugg_triggers.cmd || trigger == "/sugg") {
		let text_array = message.text.substr(entities[0].offset + entities[0].length).trim().replace('\n', ' ').split(" ");
		let cmd_msg = { command: text_array, target: "", comment: "" };


		if (cmd_msg.command.length == 1 && cmd_msg.command[0].length == 5 && tips_handler.isValidID(cmd_msg.command[0])) {
			if (simple_log) console.error("Casca l'asino!!");
			return ([]);
		} if (text_array[0] == "integra" || text_array[0].indexOf("revision") >= 0) {
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
			if (typeof (message.reply_to_message.forward_from) != "undefined") {
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
					if (manual_log) { console.log("> Messaggio inoltrato, codice: " + cmd_msg.target); }

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
		return commandMeneger(message.chat.id, user_info, cmd_msg);
	} else {
		const generic_error = "Cerchi di dirmi qualche cosa?\n\nManda `/suggerimenti` per il menù, o proponi un suggerimento includendo il tag `#suggerimento`";
		return Promise.resolve(invalidMessage(chat_id, generic_error));
	}
}

//___________________________________________________________//
//IMPLEMENTAZIONE *********************************************
//___________________________________________________________//

function initialize() {
	return new Promise(function (getSuggestionInfoCmd_resolve) {
		if (simple_log) console.log("> Init dei Suggerimenti...");
		tips_handler.getGlobalStats().then(function (globals) {
			if (!globals) {
				tips_handler.recreateAllTablesStruct().then(function (updated) {
					if (manual_log) console.log("Salvato!");

					if (manual_log) console.log(updated);
					return getSuggestionInfoCmd_resolve(false);

				}).catch(function (save_error) {
					console.log(save_error);
					return getSuggestionInfoCmd_resolve(false);
				});
			} else {
				if (simple_log) console.log("> Ottenute le globals_stat");

				aproximative_userNumber.total = Math.max(globals.totalUsers, 140);
				aproximative_userNumber.active = Math.max(globals.activUser, 60);
				return getSuggestionInfoCmd_resolve(true);
			}

		}).catch(function (aStrange_error) {
			console.log(aStrange_error);
		});
	});
}
module.exports.initialize = initialize;

function parseAvvisi(message_txt) {
	return new Promise(function (parseAvvisi_res) {
		let msg_array = message_txt.split("\n");
		let sugg_ids = [];

		let to_return = { esit: false, msg_text: "" };

		let tmp_code;
		for (let i = 0; i < msg_array.length; i++) {
			if (msg_array[i].charAt(0) == ">" && msg_array[i].charAt(msg_array[i].length - 1) == ")") {
				tmp_code = msg_array[i].substr((msg_array[i].length - 6), 5);

				if (tips_handler.isValidID(tmp_code)) {
					if (manual_log) console.log("> ho un codice, ->'" + tmp_code + "'");
					sugg_ids.push(tmp_code);
				}
			}
		}

		if (sugg_ids.length == 0) {
			return parseAvvisi_res(to_return);
		} else {
			to_return.esit = true;
			to_return.msg_text = "Ciao!";
			return tips_handler.getIDSOf(sugg_ids).then(function (ids_res) {
				if (simple_log) console.log("> " + ids_res);

				let tmp_infos;

				for (let i = 0; i < msg_array.length; i++) {
					if (msg_array[i].charAt(0) == "-") {
						msg_array[i] = "• *" + msg_array[i].substr(1, msg_array[i].length) + "*";
					} else if (msg_array[i].charAt(0) == ">" && msg_array[i].charAt(msg_array[i].length - 1) == ")") {
						tmp_code = msg_array[i].substr((msg_array[i].length - 6), 5);

						if (tips_handler.isValidID(tmp_code)) {
							tmp_infos = getInfoFor(tmp_code, ids_res);
							msg_array[i] = "> " + "" + msg_array[i].substr(1, msg_array[i].length - 8) + "" + "[⇨](" + channel_link_no_parse + "/" + tmp_infos.link + ")";

						}
					}
				}
				msg_array.push("\n•  *In questo Update* 💡");
				if (sugg_ids.length > 0) {
					msg_array.push("> [Suggerimenti](" + channel_link_no_parse + "/) implementati: *" + sugg_ids.length + "*");
				} else {
					msg_array.push("> Non sono stati implementati suggerimenti dal " + channel_link);
				}
				to_return.msg_text = msg_array.join("\n");
				return parseAvvisi_res(to_return);
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
//MAIN MENU *********
//________________________//

function mainMenu(user_info) {
	return new Promise(function (resolveMenu) {
		let menu_text = "💡 *Bacheca Suggerimenti*, vota sul " + channel_link + "!\n\n";
		if (simple_log) { console.log("- Richiesto Menù"); }

		switch (user_info.role) {
			case -1: {
				return resolveMenu(simpleDeletableMessage(user_info.id,
														  "\n\n😨\nSei stato limitato dall'utilizzo di questo modulo *direttamente da un moderatore*, \n" +
														  "\nprobabilmente per questo messaggio:\n" +
														  user_info.lastSugg));
			}
			case 0: {
				let now = Date.now();
				let time_enlapsed = (now / 1000) - user_info.lastSugg;
				let rest_time = 43200 - time_enlapsed; //in secondi
				if (rest_time > 0) { // to do: da finire!!!
					let to_wait;
					if (rest_time > 3600) {
						let time_toWait = Math.floor(rest_time / 3600);
						to_wait = "\n\n⏳\nDovrai aspettare almeno " + (time_toWait == 1 ? "un ora " : time_toWait + " ore") + " prima di poter riutilizzare questo bot.";
					}
					else if (rest_time > 60) {
						let time_toWait = Math.floor(rest_time / 60);
						to_wait = "\n\n⏳\nDovrai aspettare " + (time_toWait == 1 ? "circa un minuto " : "almeno" + time_toWait + " minuti") + " prima di poter riutilizzare questo bot.";
					}
					else
						to_wait = "\n\n⌛️\nDovrai aspettare ancora qualche secondo prima di poter riutilizzare questo bot.";

					let toDate = new Date((user_info.lastSugg * 1000) + (43200000));
					//let lastSuggDate = new Date(user_info.lastSugg * 1000);

					if (toDate.getHours() != 1) {
						to_wait += "\n(Fino alle " + toDate.getHours() + ":" + ('0' + toDate.getMinutes()).slice(-2);
					} else {
						to_wait += "\n(Fino al'" + toDate.getHours() + ":" + ('0' + toDate.getMinutes()).slice(-2);

					}

					if (toDate.getDate() > new Date(now).getDate()) {
						to_wait += " di domani. )";
					} else {
						to_wait += ")";
					}

					return resolveMenu(simpleDeletableMessage(user_info.id,
															  "\n\n😟\nSei stato *limitato* dall'utilizzo di questo modulo. Il tuo ultimo suggerimento è stato:\n\n" +
															  user_info.tmpSugg + "" + to_wait));
				} else {
					tips_handler.setUserRole(user_info.id, 1).
					then(function (action_res) {
						return resolveMenu(simpleDeletableMessage(user_info.id, "🌟\nSei stato riabilitato all'utilizzo di questo modulo...\n" +
																  "_L'uomo saggio non commette due volte lo stesso errore!_"))
					});
				}
				break;
			}
			case 2: {
				menu_text = "\n🧐 *Salve, professore*,\n...Hai controllato il " + channel_link + "?\n" +
					"_...Armati di revisione e pazienza, andrà tutto bene_\n\n";
				break;
			}
			case 3: {
				menu_text = "⭐️ *Sei moderatore del *" + channel_link + "\n" +
					"_...Se non hai votato un suggerimento, puoi richiederne la gestione con un tap sull'ultimo bottone_\n\n"
				break;
			}
			case 5: {
				menu_text = "🔥 *Fenice, hai pieni poteri sul *" + channel_link + "\n\n";
				break;
			}
		}

		tips_handler.getSuggestionsCount(user_info.id).then( function (sugg_count) {
			if (simple_log) console.log("> Limite: " + sugg_count.suggLimit);
			if (simple_log) console.log("> " + sugg_count);
			if (manual_log) { console.log(">\tMain menu, ottenuto sugg_count"); }
			if (sugg_count.totalSuggsN <= 0) {
				if (user_info.role < 3) {
					menu_text = "💡 *Bacheca Suggerimenti*,\nDove condividere idee e consigli su @LootGameBot\n\n";
					menu_text += "Sii il primo a proporre qualcosa, manda un messaggio con tag `#suggerimento`!";
				} else if (user_info.role <= 4) {
					menu_text = "💡 *Bacheca Suggerimenti*,\n\nSei moderatore del modulo, ma non è ancora stato proposto nulla...\n\n";
				} else {
					menu_text = "💡 *Bacheca Suggerimenti*\n\nSalve, _Fenice!_ 🔥\n\n";
				}
			} else {
				if (sugg_count.opens == 0) {
					menu_text += "Non ci sono suggerimenti aperti al momento...";
				} else {
					menu_text += suggestionMessageMenu(sugg_count, user_info.role);
				}

				if (user_info.id != phenix_id) {
					menu_text += userMenuMessage(user_info, sugg_count);
				}
			}

			if (user_info.id == phenix_id) {
				if (sugg_count.suggLimit >= 0) {
					menu_text += "\n\nHai settato a *" + sugg_count.suggLimit + "* il limite di suggerimenti che possono essere aperti contemporaneamente";
				}
			}

			let sugg_mess;

			if (sugg_count.totalSuggsN <= 0) {
				sugg_mess = simpleMessage(user_info.id, menu_text);
			} else {
				sugg_mess = simpleMenuMessage(user_info.id, menu_text, (sugg_count.opens > 0));
			}

			return resolveMenu(sugg_mess);


		}).catch(function (error) { console.log(">\tErrore durante il get dei suggerimenti aperti:"); console.log(error); });

	});
}

function suggestionMessageMenu(sugg_count) {
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
		if (sugg_count.suggLimit < 0) {
			if (sugg_count.opens == 1) {
				menu_text += sugg_count_msg.not_much + sugg_count_msg.just_one;
			}
			else {
				if (opens < 6) {
					menu_text += sugg_count_msg.not_much + sugg_count.opens;
				}
				else
					menu_text += sugg_count_msg.alot + sugg_count.opens;

				menu_text += sugg_count_msg.plural;
			}
		} else {
			if (sugg_count.suggLimit == 0) {
				menu_text = "La Fenice ha chiuso la pubblicazione di nuovi suggerimenti.";
			} else {
				if (sugg_count.opens == 1) {
					menu_text += "un suggerimento (su " + sugg_count.suggLimit + " consentiti)";
				} else {
					menu_text += sugg_count.opens + " suggerimenti (su " + sugg_count.suggLimit + " consentiti)";

				}
			}
		}
	}

	return menu_text;
}

function userMenuMessage(user_info, sugg_count) { //Da rivedere to do ********** fa cagar
	let menu_text = "";
	let expression_msg = "\n";

	menu_text += personalMsgForOpens(user_info.role, sugg_count);

	if (sugg_count.opens > 0) {

		// let totalV = (sugg_count.usr_recivedVotes.onClosed.up + (-1) * sugg_count.usr_recivedVotes.onClosed.down +
		// 	+ sugg_count.usr_recivedVotes.onApproved.up + (-1) * sugg_count.usr_recivedVotes.onApproved.down +
		// 	+ sugg_count.usr_onOpensRecived);

		let user_totalVotes = sugg_count.usr_upVotes + sugg_count.usr_downVotes;
		let user_selective = (user_totalVotes / sugg_count.opens).toPrecision(3);
		let user_point = Math.floor((sugg_count.usr_upVotes / (sugg_count.usr_downVotes != 0 ? sugg_count.usr_downVotes : 1)) * 100);

		if (sugg_count.opens == 1) {
			if (sugg_count.usr_upVotes == 1) {
				expression_msg += "\n🐸 \nHai gia votato il suggerimento aperto, positivamente.\n";
			} else if (sugg_count.usr_upVotes == -1) {
				expression_msg += "\n🐨 \nHai gia votato il suggerimento aperto, e non t'è piaciuto.\n";
			}

		} else if (user_totalVotes == 0) {
			expression_msg += "\n🐣 \nNon hai votato nessuno dei suggerimenti aperti.\n";
		} else if (user_totalVotes > sugg_count.opens / 2) {
			if (user_selective == 1 && sugg_count.opens > 3) {
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
			} else {
				if (user_point > 170) {
					expression_msg += "🐋\nSugli aperti, \nSei stato piuttosto selettivo nel votare, " +
						"limitandoti a cio che ti è piaciuto\n";
				}
				else if (user_point < 20) {
					expression_msg += "🐍\nSugli aperti, \nSei stato piuttosto selettivo nel votare, " +
						"limitandoti a criticare cio che non t'è piaciuto...\n";
				}
				else {
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
	if (usr_delay > 0) {
		expression_msg += "Il tuo delay è stato impostato a: " + usr_delay + " " + delayText;
	}

	return menu_text + expression_msg;
}

function personalMsgForOpens(u_role, sugg_count) {
	if (manual_log) { console.log(">\t\tpersonalMsgForOpens: " + u_role); }
	let menu_text = "";
	let mediumOnOpenVote = sugg_count.usr_onOpensRecived / sugg_count.usr_opens;

	if (u_role <= 0) {
		if (sugg_count.opens > 0)
			menu_text += " ma per il tuo recente comportamento non puoi votarne nessuno!";
		else
			menu_text += " ma per il tuo recente comportamento non potresti votarne nessuno!";
	} else if (sugg_count.usr_total <= 0) {
		menu_text += "\n\nNon hai ancora suggerito nulla,\nSe hai qualche idea, condividila inviando qui un messaggio con tag \`" + sugg_triggers.tag + "\`!\n";
	} else {
		const personal_msg = {
			zero_submitted: "\n\nNon hai ancora suggerito nulla,\nSe hai qualche idea, condividila inviando qui un messaggio con tag \`" + sugg_triggers.tag + "\`!\n",
			single_andOpen: { positive: "\n\nQuello che hai aperto sembra essere apprezzato, per il momento...😏\n", negative: "\n\nQuello che hai suggerito è aperto ma, ahimé, non sembra essere apprezzato per ora... 😶\n" },
			single_andClosed: { positive: "\n\nIl tuo è stato chiuso ed è stato apprezzato nel complesso 😏\n", negative: "\n\nIl tuo è stato chiuso e non sembra sia stato apprezzato 🙁\n" },
			moreThanOne: { firstLine: "\nTu ne hai proposti ", all_opens: " e sono *tutti aperti*!\n", all_close: " e sono *tutti stati chiusi*...\n", some_opens: " sono *aperti*", some_approved: " sono *stati approvati*" },
			some_positive: " sembrano essere apprezzati nel complesso...🙂\n",
			alot_positive: " nel complesso sembrano adorati dalla comunità!😍\n",
			some_negative: ", nel complesso, non stanno riscuotendo un gran successo...🙁\n",
			alot_negative: "...\nProbabilmente sarebbe stato meglio te ne fossi risparmiato qualcuno!😔\n"
		}

		if (sugg_count.usr_total == 1) {
			if (sugg_count.usr_opens == 1) {
				if (sugg_count.usr_onOpensRecived > 0)
					menu_text += personal_msg.single_andOpen.positive;
				else
					menu_text += personal_msg.single_andOpen.negative;
			} else {
				let total_recived = (sugg_count.usr_recivedVotes.onClosed.up + sugg_count.usr_recivedVotes.onClosed.down);
				total_recived += (sugg_count.usr_recivedVotes.onApproved.up + sugg_count.usr_recivedVotes.onApproved.down);

				if (sugg_count.usr_approved == 1) {
					if (total_recived > 0)
						menu_text += "\nL'unico che hai proposto è stato apprezzato dalla Fenice e dalla comunità!";
					else
						menu_text += "\nL'unico che hai proposto non è stato capito dalla comunità, ma la fenice ha apprezzato il consiglio!";

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
						menu_text += " e benché la comunità li abbia apprezzati nel complesso, nessuno è stato approvato dalla Fenice";
					} else {
						menu_text += ". \n🙄Nessuno è stato approvato dalla Fenice, e nel complesso neanche gli utenti hanno apprezzato le tue idee passate ";
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
					} else {
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
								menu_text += "ma, ahime, lo stesso non si può dire per le " + sugg_count.usr_opens + " ancora in votazione...";
							} else {
								menu_text += "ma le " + sugg_count.usr_opens + " ancora in votazione sembrano *detestate* 😱";
							}
							menu_text += negative_motivational_msg[Math.floor(Math.random() * (negative_motivational_msg.length))];
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

function generateMarkdownString() {
	if (manual_log) { console.log(">\t\trandom_tip"); }
	let text = "È attiva una semplice modalità *Markdown* " +
		"con la quale aggiungere stile ai tuoi messaggi! 🕶\n" +
		"\n> \`*\`*Grassetto*\`*\`" +
		"\n> \`_\`_Italico_\`_\`" +
		"\n> \`[link visualizzato](url)\`";

	return text;
}

function generateTagString() {
	if (manual_log) { console.log(">\t\tgenerateTagString"); }
	let onText = "✏️ Sono stati definiti alcuni tag _standard_...\n\n";
	let levels = Object.keys(suggestion_tag);
	levels.forEach(function (level) {
		let tags = Object.keys(suggestion_tag[level]);
		onText += "> " + suggestion_tag[level][tags[0]] + "\n";
		for (let i = 1; i < tags.length; i++) {
			onText += "\`" + suggestion_tag[level][tags[i]] + "\` ";
		}
		onText += "\n\n";
	});
	return (onText + "\n*Includili nei tuoi suggerimenti!️*");
}

//________________________//
//COMMAND MANAGER *********
//________________________//

function commandMeneger(chat_id, curr_user, fullCommand) {
	if (simple_log) { console.log(">commandMeneger: “" + fullCommand.command + "“ " + fullCommand.target); }

	return new Promise(function (command_resolve) {
		let toAnalize;
		if (Array.isArray(fullCommand.command.length)) {
			toAnalize = fullCommand.command.join(" ");
			if (simple_log) console.log(toAnalize);
		} else {
			toAnalize = String(fullCommand.command);
		}
		if (simple_log) { console.log("> toAnalize: “" + toAnalize); }

		if (curr_user.id == phenix_id && (fullCommand.command == "massimo" || fullCommand.command == "max")) {
			command_resolve(setMaximumAllowed(chat_id, fullCommand.target));
		} else if (toAnalize.match("recent")) {
			command_resolve(getRecentlyApproved(curr_user.id, curr_user, fullCommand));
		} else if (toAnalize.match("scartati")) {
			command_resolve(getRefusedOf(curr_user.id, curr_user, fullCommand));
		} else if (toAnalize.match("approvati")) {
			command_resolve(getApprovedOf(curr_user.id, curr_user, fullCommand));
		} else if (toAnalize.match("albo")) {
			command_resolve(getBestOf(curr_user.id));
		} else if (toAnalize.match("revision")) {
			command_resolve(askReview(curr_user.id, curr_user, fullCommand));
		} else if (toAnalize.match("aperti")) {
			command_resolve(getOpens(curr_user.id, false));
		} else if (toAnalize.match("miei")) {
			command_resolve(getOpensFor(curr_user.id));
		} else if (toAnalize.match("integra")) {
			command_resolve(integrateMessage(curr_user.id, curr_user, fullCommand));
		} else if (toAnalize.match("gestisci")) {
			command_resolve(changeOpinion(chat_id, curr_user, fullCommand));
		} else if (toAnalize.match("autore")) {
			command_resolve(getAuthorMsg(chat_id, curr_user, fullCommand));
		} else if (toAnalize.match("tag")) {
			command_resolve(simpleDeletableMessage(curr_user.id, generateTagString()));
		} else if (toAnalize.match("markdown") || toAnalize.match("stile")) {
			command_resolve(simpleDeletableMessage(curr_user.id, generateMarkdownString()));
		} else if (toAnalize.match("stat")) {
			command_resolve(getSuggestionInfoCmd(curr_user, fullCommand));
		} else if (toAnalize.match("recluta")) {
			command_resolve(manageUserCmd(chat_id, curr_user, fullCommand));
		} else if (toAnalize.match("promuovi")) {
			command_resolve(manageUserCmd(chat_id, curr_user, fullCommand));
		} else if (toAnalize.match("curiosit")) {
			command_resolve(curiosityCmd(chat_id, curr_user, fullCommand));
		} else if (toAnalize.match("inizializza")) {
			command_resolve(resetCmd(curr_user));
		} else if (toAnalize.match("limit") || toAnalize.match("dimentica")) {
			command_resolve(manageUserCmd(chat_id, curr_user, fullCommand));
		} else {
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
			if (curr_user.role == 5) {
				avaible_cmds += "\n> " + "`promuovi`";
				avaible_cmds += "\n> massimo `N` (imposta il limite)";
				avaible_cmds += "\n> `#suggerimento #annuncio` (per pubblicare un annuncio)";
			}
			avaible_cmds += "\n\nUsali preceduti dal comando:\n`/suggerimenti `";

			if (curr_user.role <= 0)
				avaible_cmds += "\n\n>😟\n *Sei stato limitato all'utilizzo di questo modulo!*";
			return command_resolve(simpleDeletableMessage(curr_user.id, avaible_cmds));
		}
	});

}

function getSuggestionInfoCmd(user_info, fullCmd) {
	return new Promise(function (getSuggestionInfoCmd_resolve) {
		if (simple_log) { console.log(">\t\tComando getSuggestionInfoCmd -> " + fullCmd.command); }
		tips_handler.getSuggestionsCount(user_info.id).
		then(function (sugg_count) {
			if (sugg_count.totalSuggsN > 0) {
				tips_handler.getGlobalStats().
				then(function (globals) {
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
							res_text += "- Tasso d'approvazione: *" + ((sugg_count.approved * 100) / (sugg_count.closed + sugg_count.approved)).toPrecision(2) + "*%\n"
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

					if (manual_log) console.log(res_text);
					return getSuggestionInfoCmd_resolve(simpleDeletableMessage(user_info.id, res_text));
				}).
				catch(function (err) { console.log(err) });
			} else {
				return getSuggestionInfoCmd_resolve(simpleDeletableMessage(user_info.id, "😶\nNon è stato ancora proposto alcun suggerimento"));
			}
		}).
		catch(function (err) { console.log(err) })

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

			if (fullCmd.target.length == 5) {
				if (manual_log) { console.log("Il target è: " + fullCmd.target); }

				if (fullCmd.command == sugg_comand_triggers.mod.limit) {
					tips_handler.getSuggestionInfos(fullCmd.target, user_info.id).then(function (sugg_infos) {
						if (manual_log) { console.log("\t\tOttenute le info sul suggerimento " + fullCmd.target + " -> autore: " + sugg_infos.author); }
						tips_handler.setUserRole(sugg_infos.author, -1).
						then(function (action_res) {
							return manageUserCmd_resolve(simpleDeletableMessage(chat_id, "L'autore del suggerimento " + fullCmd.target + " è stato bandito dall'utilizzo del *modulo suggerimenti*"));
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
							"\nPuoi usarlo inrisposta ad un qualcunque messaggio, recluterà l'autore";
					} else if (fullCmd.command == sugg_comand_triggers.mod.limit) {
						let insert = "\n";
						if (user_info.role == 5)
							insert = " *o un utente in generale (anche mod)*\n";

						limit_text = "💡\nIl comando `limita`\n" +
							"*bandisce per un tempo indefinito l'autore di un suggerimento*" + insert +
							"\nPuoi usarlo in risposta ad un suggerimento inoltrato,\nAl messaggio di un utente (in gruppo o inoltrato)" +
							"\nO specificando direttamente il codice del suggerimento (la " + suggestionCode_msg + "non è necessaria)";
					} else if (fullCmd.command == sugg_comand_triggers.mod.forget) {
						let insert = "*Toglie le limitazioni ad un utente.*\n";
						if (user_info.role == 5)
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
					let actionPromise;

					if (fullCmd.command == sugg_comand_triggers.admin.recruit)
						actionPromise = tips_handler.setUserRole(fullCmd.target, 2);
					else if (fullCmd.command == sugg_comand_triggers.mod.limit)
						actionPromise = tips_handler.setUserRole(fullCmd.target, 0);
					else if (fullCmd.command == sugg_comand_triggers.mod.forget)
						actionPromise = tips_handler.setUserRole(fullCmd.target, 1);
					else if (fullCmd.command == sugg_comand_triggers.admin.promove && user_info.role == 5)
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
								if (user_info.role == 5)
									insert = "*ristabilisce la condizione di utente (che fosse mod o limitato)*\n";

								avaible_cmds += "💡\nIl comando `dimentica`\n" +
									insert +
									"\nPer usarlo sarà necessario rispondere direttamente ad un messaggio (ancheo inoltrato)" +
									"Nota: di default, la limitazione per _suggerimento eliminato_ dura 24h, solo quella manuale (comando `limita`) è a scadenza indefinita.";

							} else {
								avaible_cmds = "\n> " + sugg_comand_triggers.mod.limit + "\n> " + sugg_comand_triggers.mod.forget;
								avaible_cmds += "\n> " + sugg_comand_triggers.admin.recruit;
								if (user_info.id == phenix_id)
									avaible_cmds += "\n> " + sugg_comand_triggers.admin.promove + "\n> " + sugg_comand_triggers.admin.init;
							}

							return manageUserCmd_resolve(simpleDeletableMessage(chat_id, cmd_error_Role + avaible_cmds));

						}

					}).catch(function (err) { console.log(err) });
				}

			}
		}
	});
}

function curiosityCmd(chat_id, user_info, fullCmd) {
	return new Promise(function (curiosityCmd_resolve) {
		if (manual_log) { console.log(">\t\tcuriosityCmd -> comando: " + fullCmd.command + ", target: " + fullCmd.target); }
		let curiosity_msg;


		if (typeof (fullCmd.target) != 'number') {
			if (user_info.role < 3) {
				curiosity_msg = "*Il comando \"curiosità\"* 💡\n\n" +
					"Ti permette d'avere un idea complessiva dell'attività di un utente sul modulo /suggerimenti\n\n" +
					"Puoi usarlo in risposta ad un messaggio inoltrato o direttamente a quello di un utente, _se il bot è Amministratore del SuperGruppo_\n\n" +
					"(In risposta ad un tuo messaggio ti porterà all'*albo personale*.)";

			} else {
				curiosity_msg = "💡\nIl comando `curiosità`\n" +
					"Ti permette di avere informazioni sul ruolo di un utente\n" +
					"Puoi usarlo in risposta ad un messaggio inoltrato o direttamente a quello di un utente _(se il bot è Amministratore del SuperGruppo)_\n";
			}
			return curiosityCmd_resolve(simpleMessage(user_info.id, curiosity_msg));
		}

		if (user_info.id == fullCmd.target) {
			tips_handler.activityOf(user_info.id).then(function (res) {

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
		} else if (user_info.role < 3) {
			if (fullCmd.target == theCreator && user_info.id != theCreator) {
				return curiosityCmd_resolve(simpleMessage(chat_id, "🤡\nQuello è _il creatore_!"));
			}
			tips_handler.getSuggestionsCount(fullCmd.target).then(function (sugg_usrInfo) {
				let usrCountPartial = sugg_usrInfo.usr_total + sugg_usrInfo.usr_upVotes + sugg_usrInfo.usr_downVotes;
				if (manual_log) { console.log(usrCountPartial); }
				if (usrCountPartial == 0 || isNaN(usrCountPartial)) {
					curiosity_msg = "🙃\nL'utente non ha avviato il bot!";
					if (user_info.id == theCreator) {
						curiosity_msg += "\n> ID: " + fullCmd.target;
					}
				} else {
					curiosity_msg = "";
					let number = 2;
					let contribution = (sugg_usrInfo.usr_total * 25) / sugg_usrInfo.totalSuggsN;


					if (sugg_usrInfo.usr_total > 0) {
						number = 1;
						curiosity_msg = "*Curiosità su:* _" + fullCmd.target_name + "_\n\n";

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
								curiosity_msg += " La Fenice ne ha approvata una gran parte... 😋";
							}

						}

					} else {
						curiosity_msg += "L'utente non ha proposto alcun suggerimento.\n";
						number = 4;
					}

					let votecount = sugg_usrInfo.opens - (sugg_usrInfo.usr_upVotes + sugg_usrInfo.usr_downVotes);

					curiosity_msg += "\nAl momento ha ";

					if (votecount == 0) {
						curiosity_msg += "votato *ogni* \`singolo\` suggerimento";
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
					curiosity_msg += "\n";

					if (sugg_usrInfo.role < 1) {
						if (number % 2 == 0) {
							curiosity_msg += "\n🦆 ...quack!";
						} else {
							curiosity_msg += "\n🐜 ...shh!";
						}
					} else if (fullCmd.target == phenix_id) {
						curiosity_msg += "\n⚡️";
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
			}).
			catch(function (err) { console.log(err); });
		} else {
			tips_handler.getUserInfo(fullCmd.target, false).then(function (sugg_usrInfo) {
				if (sugg_usrInfo == -1 || sugg_usrInfo.lastQDate + sugg_usrInfo.lastSugg == 0) {
					curiosity_msg = "🙃\nL'utente non ha avviato il modulo suggerimenti!";
					if (user_info.id == theCreator) {
						curiosity_msg += "\n> ID: " + fullCmd.target;
					}

				} else {
					if (fullCmd.target == theCreator) {
						curiosityCmd_resolve(simpleMessage(chat_id, "🤡 Guardone!"));
					}
					if (sugg_usrInfo.role == 5)
						curiosity_msg = "🔥 *Admin*\n";
					else if (sugg_usrInfo.role == 3)
						curiosity_msg = "⭐️ *Moderatore*\n";
					else if (sugg_usrInfo.role == 2)
						curiosity_msg = "🎖 *Grammar Nazi*\n";
					else if (sugg_usrInfo.role == 1)
						curiosity_msg = "👤️ *Utente*\n";
					else if (sugg_usrInfo.role == 0)
						curiosity_msg = "👤️ *Utente Limitato*\n";
					else
						curiosity_msg = "🥜️ *Utente Limitato senza scadenza!*\n";

					if (user_info.id == theCreator) {
						//						let partial_sugg = sugg_usrInfo.tmpSugg.substring(0, sugg_usrInfo.tmpSugg.length / 3);
						//						partial_sugg = partial_sugg.split('*').join("");
						//						partial_sugg = partial_sugg.split('_').join("");
						curiosity_msg += "\n> ID: " + fullCmd.target;
						//curiosity_msg += "\n> LastSugg:\n_" + partial_sugg + "/.../_";
					}
					return tips_handler.getSuggestionsCount(fullCmd.target).
					then(function (sugg_infos) {
						let delay = userPointCalc(sugg_infos);
						let delayText = "";
						if (delay > 3600) {
							delay = delay / 3600;
							delayText = "h.";
						} else {
							delay = delay / 60;
							delayText = "m.";
						}
						if (user_info.id == theCreator) {
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

						curiosityCmd_resolve(simpleMessage(chat_id, curiosity_msg));
					})


				}
				return curiosityCmd_resolve(simpleMessage(user_info.id, curiosity_msg));
			}).catch(function (err) { console.log(err); });
		}
	});
}

function integrateMessage(chat_id, curr_user, fullCommand) {
	return new Promise(function (integrateMessage_resolve) {
		if (simple_log) console.log("> Integra: " + fullCommand);
		let condition = (curr_user.id == 340271798 || curr_user.id == theCreator);// || curr_user.id == phenix_id);

		if (!condition && curr_user.role < 3) {
			return integrateMessage_resolve(simpleDeletableMessage(chat_id, "???\n\nSeriamente?"));
		} else {
			if (manual_log) console.log("Chiesto integra per : " + fullCommand.target);
			let codeArray;
			let sugg_id;
			let number;
			if (typeof (fullCommand.target) != 'undefined') {
				codeArray = fullCommand.target.split(":");
				sugg_id = codeArray[0].toUpperCase();
				number = parseInt(codeArray[1]);
			}
			if (manual_log) console.log("Dopo il parse: sugg_id -> " + sugg_id + " (" + typeof (sugg_id) + "),  number -> " + number + ", comment -> " + fullCommand.comment);

			if (typeof (sugg_id) == 'string' && fullCommand.comment.length > 0) {
				if (simple_log) console.log("Riconosciuto! -> Suggerimento " + sugg_id);
				if (manual_log) console.log("Integrazione: " + fullCommand.comment);

				tips_handler.getSuggestionInfos(sugg_id, curr_user.id).
				then(function (sugg_infos) {

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
					} else if (number < 0 && sugg_infos.msg_id == 0) {
						return integrateMessage_resolve(
							simpleDeletableMessage(
								chat_id,
								"😕\nNon hai specificato il numero del messaggio, e non sono riuscito a recuperarlo dal database...")
						);
					} else if (sugg_infos.msg_id != 0) {
						number = sugg_infos.msg_id;
					}

					if (simple_log) console.log("Riconosciuto! -> messaggio n. " + number);

					let integrateMsg = {};
					let msg = sugg_infos.sugg_text + "\n";

					if (curr_user.id == 340271798) {
						if (sugg_infos.sugg_text.indexOf("#tools") >= 0) {
							msg += "\n💾️* Risposta del Tools*"
						} else {
							return integrateMessage_resolve(simpleDeletableMessage(340271798, "😕\nIl suggerimento " + sugg_id + " non è per te, Deloo..."));
						}
					}
					else if (curr_user.id == phenix_id) {
						msg += "\n⚡️* Risposta dalla Fenice*";
					} else if (curr_user.role == 3) {
						msg += "\n⭐️* Risposta da un moderatore*";
					} else if (curr_user.id == theCreator) {
						msg += "\n🤖* Risposta dal bot dei Suggerimenti*";
					}

					msg += "\n" + fullCommand.comment.charAt(0).toUpperCase() + fullCommand.comment.slice(1);

					tips_handler.updateSuggestionText(sugg_id, msg).
					then(function (save_res) {
						msg += "\n\n" + suggestionCode_msg + "\`" + sugg_id + "\`";

						if (sugg_infos.status != 0) {
							if (sugg_infos.status == -1) {
								msg = "#chiuso\n" + msg;
							} else if (sugg_infos.status == 1) {
								msg = "#approvato\n" + msg;
							}

							if (sugg_infos.upOnClose > sugg_infos.downOnClose)
								msg += "\n\n📈";
							else
								msg += "\n\n📉";

							msg += " *Report:*\n";
							if (sugg_infos.upOnClose == 0 && sugg_infos.downOnClose == 0)
								msg += "> Questo suggerimento non ha ricevuto voti!";
							else if (sugg_infos.upOnClose > 0)
								msg += "> " + sugg_infos.upOnClose + (sugg_infos.upOnClose == 1 ? " voto positivo" : " voti positivi");
							if (sugg_infos.downOnClose < 0) {
								if (sugg_infos.upOnClose > 0)
									msg += "\n";
								msg += "> " + ((-1) * sugg_infos.downOnClose) + (sugg_infos.downOnClose == -1 ? " voto negativo" : " voti negativi");
							}


							integrateMsg.toEdit = simpleToEditMessage("@" + channel_name, number, msg);
						}
						else {
							integrateMsg.toEdit = suggestionEditedMessage("@" + channel_name, number, msg, sugg_infos);
						}
						integrateMsg.toSend = simpleDeletableMessage(curr_user.id, "🙂\nHo aggiunto il tuo commento al [suggerimento](" + channel_link_no_parse + "/" + number + ") `" + save_res + "`");
						return integrateMessage_resolve(integrateMsg);
					})



				}).catch(function (err) {
					console.log("errore!");

					console.log(err);
				})



			} else {
				let text = "Il comando integra è in fase embrionale...\n\n"
				text += "Permette di aggiungere un commento ad un messaggio pubblicato sul canale.\n";
				text += "Per usarlo,\n• Puoi specificare:\n";
				text += "  `IDSugg:Numero` `TESTO`\n";
				text += "\n• O semplicemente rispondere ad un messaggio che includa il codice suggerimento...\n";
				text += "\n*La modifica verrà applicata senza conferme!*";
				text += "\n\n";
				text += "_Il numero del messaggio puoi ricavarlo dall'ultima parte del link fornito da telegram_";

				return integrateMessage_resolve(simpleDeletableMessage(curr_user.id, text));
			}

		}
	});
}

function changeOpinion(chat_id, curr_user, fullCommand) {
	return new Promise(function (changeOpinion_resolve) {
		let condition = (curr_user.id != theCreator && curr_user.id != 340271798);
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
				tips_handler.getSuggestionInfos(sugg_id, curr_user.id).
				then(function (sugg_infos) {

					if (sugg_infos == -1) {
						return changeOpinion_resolve(
							simpleDeletableMessage(
								chat_id,
								"😕\nNon ho trovato il suggerimento " + sugg_id + " nel database...")
						);

					}
					if (number < 0 && sugg_infos.msg_id == 0) {
						return changeOpinion_resolve(
							simpleDeletableMessage(
								chat_id,
								"😕\nNon hai specificato il numero del messaggio, e non sono riuscito a recuperarlo dal database...")
						);
					}
					if (sugg_infos.msg_id != 0) {
						number = sugg_infos.msg_id;
					}

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

					if (manual_log) console.log(sugg_infos);

					let partial_sugg = sugg_infos.sugg_text.substring(0, (sugg_infos.sugg_text.length * 3) / 5);
					partial_sugg = partial_sugg.split('*').join("");
					partial_sugg = partial_sugg.split('`').join("");
					partial_sugg = partial_sugg.split('_').join("");
					partial_sugg = partial_sugg.split('\n').join(" ");
					let msg_text = "⚙ *Gestione Manuale*\n\n";
					msg_text += suggestionCode_msg + "`" + sugg_id.toUpperCase() + "` [⤴️](" + channel_link_no_parse + "/" + number + ") \n\n";
					msg_text += "«_" + partial_sugg + "… _»\n";
					msg_text += "\n> Stato: ";
					if (sugg_infos.status == 0) {
						msg_text += "*Aperto* 🍀\n";
						msg_text += "> Voti positivi: " + sugg_infos.upVotes + "\n";
						msg_text += "> Voti negativi: " + Math.abs(sugg_infos.downVotes) + "\n";
					}
					else {
						if (sugg_infos.status == 1) {
							msg_text += "*Approvato* ⚡️\n";
						}
						else if (sugg_infos.status == -1) {
							msg_text += "*Scartato* 🌪️\n";
						}
						msg_text += "> Voti positivi: " + sugg_infos.upOnClose + "\n";
						msg_text += "> Voti negativi: " + Math.abs(sugg_infos.downOnClose) + "\n";
					}
					msg_text += "\n🔘 " + number + "";

					return changeOpinion_resolve(opinionMessage(chat_id, sugg_infos.status, msg_text));
				}).catch(function (err) {
					console.log(err);
				})
			} else {
				return changeOpinion_resolve(
					simpleDeletableMessage(
						chat_id,
						"Anche il comando `gestisci` è in fase embrionale...\n\nPermette di cambiare opinione su un suggerimento o modificarne il testo..." +
						"\nPer usarlo, puoi specificare l'id suggerimento *o* rispondere direttamente ad un messaggio che lo includa.\n"
					)
				);
			}

		}
	});
}

function getOpens(id, toVote) {
	return new Promise(function (getOpens_resolve) {
		tips_handler.getOpensSuggestions(id).
		then(function (currentS) {
			if (currentS == null) {
				getOpens_resolve(simpleDeletableMessage(id, "Woops! :("));
			} else {
				let message = "...";
				if (currentS.opens.length == 0) {
					if (id == phenix_id)
						message = "😌 Ahhh!\nNon ci sono piu suggerimenti aperti.";
					else
						message = "Al momento non ci sono suggerimenti aperti...";
				} else if (currentS.opens.length == 1) {
					if (toVote == false) {
						message = "*È aperto un solo suggerimento,*\n\n";
					} else {
						if (currentS.votedByUser.length == 0) {
							message = "*C'è un solo suggerimento*\n   _...che non hai votato_\n\n";
						} else {
							message = "😌 Hai gia votato per l'unico suggerimento aperto!\n\n";
						}

					}
				} else {
					if (id == phenix_id) {
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
							message = "😌 Hai votato tutti i suggerimenti aperti!\n";
						} else if (toVoteN == 1) {
							message = "* Di " + currentS.opens.length + " suggerimenti aperti,*\n   _...ce n'è solo uno che non hai votato_\n\n";
						} else if (toVoteN > 1) {
							message = "*Ci sono " + toVoteN + " suggerimenti*\n   _...che non hai votato_\n\n";
						} else {
							message = "*Mumble...*\nCi sono " + currentS.opens.length + " suggerimenti aperti e... ne hai votati " + currentS.votedByUser.length + "... ?";
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
								text = "Dell'"
							} else {
								text = "Del ";
							}
							text += suggDate.getDate() + "." + (suggDate.getMonth() + 1) + " alle " + suggDate.getHours() + ":" + (("0" + suggDate.getMinutes()).slice(-2));
						}
						line += "      [" + text + "](" + channel_link_no_parse + "/" + currentS.opens[i].number + ")";
						if (manual_log) console.log(text + " id: " + currentS.opens[i].number);

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

				getOpens_resolve(simpleDeletableMessage(id, message));
			}

		}
			).catch(function (err) {
			console.log(err);
		})
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
					message += "Non hai proposto alcun suggerimento...\n";
				} else {
					if (recents.length == 1) {
						message += "*Hai proposto un solo suggerimento*\n\n";
						message += "> " + generatePartialString(recents[0].text) + "\n";
						stateText = recents[0].state == 0 ? "🍀 Aperto" : recents[0].state == 1 ? "⚡️ Approvato" : "🌪 Scartato";
						message += "  [" + stateText + "](" + channel_link_no_parse + "/" + recents[0].id + ")\n";

					} else {
						message += "*Ecco " + recents.length + " dei tuoi suggerimenti*\n   _...piu recenti_\n\n";
						for (let i = 0; i < recents.length; i++) {
							message += "> " + generatePartialString(recents[i].text) + "\n";
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
		if (curr_user.id == theCreator && typeof fullCommand.target == 'number') {
			myTarget = fullCommand.target;
		}
		tips_handler.getApprovedOf(myTarget).then(function (res) {
			if (res) {
				if (res.length == 0) {
					getApprovedOf_resolve(simpleDeletableMessage(chat_id, "🙁\nNessun tuo suggerimento è stato approvato..."));
				} else {
					let mess = "🏅 *Ecco " + res.length + " dei tuoi migliori suggerimenti*\n";
					if (curr_user.id == theCreator && myTarget != theCreator) {
						mess = "🏅 *Ecco " + res.length + " dei suoi migliori suggerimenti*\n";
					}
					mess += " _...approvati dalla Fenice!_\n\n";
					for (let i = 0; i < res.length; i++) {
						mess += "> " + generatePartialString(res[i].text) + " [/.../](" + channel_link_no_parse + "/" + res[i].id + ") (" + res[i].votes + ")\n";
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
		if (typeof newLimit == NaN) {
			setMaximumAllowed_resolve(simpleDeletableMessage(chat_id, "Edo, non sono riuscito a capire il nuovo limite...\n(" + target + ")"));
		} else {
			tips_handler.setSuggestionLimit(newLimit).then(function (res) {
				if (res == -1) {
					setMaximumAllowed_resolve(simpleDeletableMessage(chat_id, "😉\nHo rimosso il limite ai suggerimenti"));
				} else {
					setMaximumAllowed_resolve(simpleDeletableMessage(chat_id, "😉\nNon accetterò più di " + newLimit + " suggerimenti fino a nuovo ordine!"));
				}
			});
		}
	});
}

function getRecentlyApproved(chat_id, curr_user, fullCommand) {
	return new Promise(function (getRecentlyApproved_resolve) {
		tips_handler.getRecentlyApproved().then(function (res) {
			if (res == -1) {
				getRecentlyApproved_resolve(simpleDeletableMessage(chat_id, "🙁\nC'è stato un errore. Se puoi segnala a @nrc382"));
			} else {
				if (res.length == 0) {

					getRecentlyApproved_resolve(simpleDeletableMessage(chat_id, "😶\n...Non è ancora stato approvato alcun suggerimento!"));
				} else {
					let mess = "⚡ *Ecco gli ultimi suggerimenti*\n _...approvati dalla Fenice!_\n\n";
					let sugg_partial;

					for (let i = 0; i < res.length; i++) {
						sugg_partial = generatePartialString(res[i].text);

						mess += "> " + sugg_partial + "...\n";
						mess += "   [" + "↑" + res[i].upVotes + ", " + res[i].downVotes + "↓](" + channel_link_no_parse + "/" + res[i].id + ")\n";

					}
					getRecentlyApproved_resolve(simpleDeletableMessage(chat_id, mess));
				}
			}

		});
	});
}

function getRefusedOf(chat_id, curr_user, fullCommand) {
	return new Promise(function (getRefusedOf_resolve) {
		let myTarget = curr_user.id
		if (curr_user.id == theCreator && typeof fullCommand.target == 'number') {
			myTarget = fullCommand.target;
			if (simple_log) console.log("> cambio...");
		}
		if (simple_log) console.log("> Target ->" + myTarget + " tipo: " + typeof fullCommand.target);

		tips_handler.getRefusedOf(myTarget).then(function (res) {
			if (res) {
				if (res.length == 0) {
					getRefusedOf_resolve(simpleDeletableMessage(chat_id, "😊\nNessun tuo suggerimento è stato scartato..."));
				} else {
					let mess = "🌑 *Ecco " + res.length + " dei tuoi migliori suggerimenti*\n";
					if (curr_user.id == theCreator && myTarget != theCreator) {
						mess = "🌑 *Ecco " + res.length + " dei suoi migliori suggerimenti*\n";
					}
					mess += " _...scartati dalla Fenice!_\n\n";
					let sugg_partial;
					for (let i = 0; i < res.length; i++) {
						sugg_partial = generatePartialString(res[i].text);
						mess += "> " + sugg_partial + " [/.../](" + channel_link_no_parse + "/" + res[i].id + ")\n";
					}
					getRefusedOf_resolve(simpleDeletableMessage(chat_id, mess));
				}

			} else {
				getRefusedOf_resolve(simpleDeletableMessage(chat_id, "Whoops... È successo qualche casino.\nSe vuoi puoi contattare @nrc382"));
			}
		});

	});
}

function getBestOf(chat_id) {
	return new Promise(function (getBestOf_resolve) {
		tips_handler.getBestSuggestions().then(function (res) {
			if ((res.dropped.length + res.audaci.length + res.notAppreciated.length) == 0) {
				return getBestOf_resolve(simpleDeletableMessage(chat_id, "*Woops!*\n_La Fenice_ non ha ancora gestito alcun suggerimento..."));
			}

			let mess = "🔰 *Albo dei Suggerimenti*\n";
			mess += " _per voti positivi ricevuti dagli utenti_\n\n";
			if (res.dropped != null) {
				mess += "*Scartati *🌪\n";
				for (let i = 0; i < res.dropped.length; i++) {
					if (res.dropped[i].author_id == chat_id) {
						mess += "> ✶ ";
					} else {
						mess += "> ";
					}
					mess += generatePartialString(res.dropped[i].text) + " [/.../](" + channel_link_no_parse + "/" + res.dropped[i].id + ")\n";
				}
			}
			if (res.dropped != null) {
				if (res.dropped != null) {
					mess += "\n";
				}
				mess += "*Approvati* ⚡️\n";
				for (let i = 0; i < res.accepted.length; i++) {
					if (res.accepted[i].author_id == chat_id) {
						mess += "> ✶ ";
					} else {
						mess += "> ";
					}
					mess += generatePartialString(res.accepted[i].text) + " [/.../](" + channel_link_no_parse + "/" + res.accepted[i].id + ")\n";
				}
			}
			if (res.audaci != null) {
				mess += "\n*I Suggerimenti più audaci *🌚\n";
				for (let i = 0; i < res.audaci.length; i++) {
					if (res.audaci[i].author_id == chat_id) {
						mess += "> ✶ ";
					} else {
						mess += "> ";
					}
					mess += Math.abs(res.audaci[i].votes) + ": ";
					mess += generatePartialString(res.audaci[i].text) + " [/.../](" + channel_link_no_parse + "/" + res.audaci[i].id + ")\n";
				}

			}
			if (res.notAppreciated != null) {
				mess += "\n*I Suggerimenti meno apprezzati* 🥀\n";
				for (let i = 0; i < res.notAppreciated.length; i++) {
					if (res.notAppreciated[i].author_id == chat_id) {
						mess += "> ✶ ";
					} else {
						mess += "> ";
					}
					mess += generatePartialString(res.notAppreciated[i].text) + " [/.../](" + channel_link_no_parse + "/" + res.notAppreciated[i].id + ")\n";
				}

			}


			getBestOf_resolve(simpleDeletableMessage(chat_id, mess));
		});

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
				tips_handler.getSuggestionInfos(sugg_id, curr_user.id).
				then(function (sugg_infos) {
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
						return askReview_resolve(
							simpleDeletableMessage(
								chat_id,
								"😕\nSpecifica la tua revisione:\n`/suggerimenti revisione` TESTOREVISIONE")
						);
					}
					if (simple_log) console.log("Alla revisione: sugg_id -> " + sugg_id + ",  number -> " + number + " (" + typeof (number) + ")");


					let msg_text = "📖 *Revisione Manuale* (Beta)\n\n";
					msg_text += suggestionCode_msg + "`" + sugg_id.toUpperCase() + "` [⤴️](" + channel_link_no_parse + "/" + number + ") \n\n";
					msg_text += fullCommand.comment;
					msg_text += "\n\n> Stato: ";
					if (sugg_infos.status == 0) {
						msg_text += "*Aperto*\n";
						msg_text += "> Voti positivi: " + sugg_infos.upVotes + "\n";
						msg_text += "> Voti negativi: " + Math.abs(sugg_infos.downVotes) + "\n";
					}
					else {
						if (sugg_infos.status == 1) {
							msg_text += "*Approvato* ⚡️\n";
						}
						else if (sugg_infos.status == -1) {
							msg_text += "*Scartato* 🌪️\n";
						} else {
							msg_text += "*Errore*, inoltra a @nrc382\n";
						}
						msg_text += "> Voti positivi: " + sugg_infos.upOnClose + "\n";
						msg_text += "> Voti negativi: " + Math.abs(sugg_infos.downOnClose) + "\n";
					}
					msg_text += "\n🔘 " + number + "";

					tips_handler.saveReview(curr_user.id, fullCommand.comment.trim()).
					then(function (res) {
						if (res == curr_user.id) {
							return askReview_resolve(reviewMessage(chat_id, sugg_infos.status, msg_text));
						}
						else {
							askReview_resolve(simpleDeletableMessage(chat_id, "Errore salvando il messaggio...\nSegnala a @nrc382"));
						}
					})
				}).catch(function (err) {
					console.log(err);
				})


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
	return new Promise(function (getAuthorMsg_resolve) {
		if (curr_user.id != theCreator) {
			getAuthorMsg_resolve(simpleMessage(chat_id, "???"));
		} else {
			tips_handler.getSuggestionInfos(fullCommand.target, curr_user.id).
			then(function (sugg_info) {
				if (sugg_info == null) {
					getAuthorMsg_resolve(simpleDeletableMessage(chat_id, "*Whoops!*\nSicuro che `" + fullCommand.target.toUpperCase() + "` sia un codice corretto?"));
				}
				tips_handler.getUserInfo(sugg_info.author).then(function (author_infos) {
					let msg = "📄 Suggerimento [" + fullCommand.target + "]" + "(" + channel_link_no_parse + "/" + sugg_info.msg_id + ")";
					if (sugg_info.status >= 0) {
						if (sugg_info.status == 0) {
							msg += "\nUn suggerimento che a giudicare dai voti ";
							if (sugg_info.totalVotes <= 2) {
								msg += "avremmo potuto risparmiarci. ";
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
					msg += "\n> Il suo profilo ([👤](tg://user?id=" + sugg_info.author + "))";

					getAuthorMsg_resolve(simpleDeletableMessage(chat_id, msg));
				});
			});
		}

	});
}

function resetCmd(user_info) {
	if (manual_log) { console.log(">\t\tresetCmd"); }
	return new Promise(function (reset_resolve) {
		if (user_info.role == 5) {
			tips_handler.initialize().
			then(function (init_res) { return tips_handler.setUserRole(theCreator, 5) }).
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
const quickInsert_firstLine = "📝*Controlla il tuo suggerimento*\n\n";
const simpleInsert_firstLine = "👁‍🗨*Anteprima del suggerimento*\n\n";
const suggestionCode_msg = "🌀 ";
const unableToInsert_msg = "🤭\n*Devi aver fatto qualche cosa di grave,*\n_t'è stato impedito di inserire nuovi suggerimenti..._";


const private_tags = ["#approvato", "#chiuso"];
const private_moji = ["🌪", "⚡️", "🌀"];

function getTagsArray() {
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
		if (censure) {
			if (suggestion_text.length < 3) {
				return reviewInsert_resolve(-3);
			}
			// else if (entities.indexOf("#tools") >= 0) {
			// 	return reviewInsert_resolve(-4);
			// } 
			else {
				//if (manual_log) { console.log("Testo: (" + suggestion_text.length + " parole)\n" + suggestion_text.join(" ")); console.log("Entità: \n" + entities); }
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

				if (entities.length >= 1) {
					if (entities.length > 4)
						return reviewInsert_resolve(-2);

					let tags_array = getTagsArray();
					let out_tags = [];
					entities.forEach(function (used_tag) {
						if (tags_array.indexOf(used_tag) < 0) {
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
						} else if ((tmp_word.indexOf("⚡️") + tmp_word.indexOf("🌀") + tmp_word.indexOf("🌪")) > -3) {
							let res = ["«"]
							res.push(tmp_word);
							res.push("»");
							return reviewInsert_resolve(res);
						}
					}
				}

				tips_handler.getBannedWords().then(function (bannedArray) { //to do *** array di sugg_id e index (nel model)
					let sugg_id = "nrc";
					let index = -1;
					if (manual_log) { console.log(">\tOttenuta la lista delle parole bandite [" + bannedArray.length + "]"); }

					for (var text_count = 0; text_count < suggestion_text.length; text_count++) {
						if (simple_log) console.log("Analizzo: " + suggestion_text[text_count]);
						if (suggestion_text[text_count].length <= 0) {
							console.log("Scarto: " + suggestion_text[text_count]);
							suggestion_text.splice(text_count, 1);
						} else if (text_count < (suggestion_text.length - 2) && suggestion_text[text_count].toLowerCase() == "suggerimento") {
							if (suggestion_text[text_count + 1].length >= 5 && !isNaN(parseInt(suggestion_text[text_count + 1].substring(0, 3)))) {
								sugg_id = suggestion_text[text_count + 1].substring(0, 5);
								index = text_count;
							}
						} else if (suggestion_text[text_count].length >= 3) {
							for (var banned_count = 0; banned_count < bannedArray.length; banned_count++) {
								// qui si potrebbe mettere l'autocompleate del link suggerimento
								//console.log("- comparo: "+suggestion_text[text_count].toLowerCase()+" e "+ bannedArray[banned_count].banditw+" ["+suggestion_text[text_count].toLowerCase().indexOf(bannedArray[banned_count].banditw)+"]");
								if (suggestion_text[text_count].toLowerCase() != "flaridion" && suggestion_text[text_count].toLowerCase().indexOf(bannedArray[banned_count].banditw) >= 0) {
									return reviewInsert_resolve(["!", suggestion_text[text_count]]);
								}
							}

						}
					}
					tips_handler.getIDOf(sugg_id).then(function (sugg_messID) {
						if (sugg_messID.length == 1) {
							let finalText = "[suggerimento]";
							if (sugg_messID[0].id > 0) {
								finalText += "(" + channel_link_no_parse + "/" + sugg_messID[0].id + ")";
							}
							finalText += " `" + sugg_id + "`";

							suggestion_text[index] = finalText;
							suggestion_text.splice(index + 1, 1);
							return reviewInsert_resolve(entities.join(" ") + "\n" + suggestion_text.join(" ").split("\n ").join("\n").trim());
						} else {
							if (simple_log) console.log(sugg_messID);
							if (index > 0) {
								suggestion_text[index + 1] = "`" + suggestion_text[index + 1] + "` (❗️)";
							}
							return reviewInsert_resolve(entities.join(" ") + "\n" + suggestion_text.join(" ").split("\n ").join("\n").trim());
						}
					})
				}).catch(function (err) { console.log(err); return reviewInsert_resolve(false); });
			}
			//return reviewInsert_resolve(entities);
		}
	});
}

function userPointCalc(suggStats) {
	let becauseApprovedRatio = Math.round(300 * (suggStats.usr_approved > 0 ? (suggStats.usr_approved / suggStats.usr_total) : suggStats.usr_total)) * 2;
	let becauseRecent = suggStats.usr_recents * 1800 + (suggStats.suggLimit > 0 ? 3600 / suggStats.suggLimit : 0);
	let becauseOpens = suggStats.usr_opens * 3600;
	let approvedBonus = suggStats.usr_approved * 30;
	let voteBonus = suggStats.usr_onOpensRecived * 5;

	if (simple_log) console.log("Delay Totale: " + Math.round(becauseOpens + becauseApprovedRatio + becauseRecent - approvedBonus - voteBonus));

	return Math.round(becauseOpens + becauseApprovedRatio + becauseRecent - approvedBonus - voteBonus);
}

function userRushManager(user_info) { // to do *** ma che è sta cagata? è mooolto piu eazy
	return new Promise(function (userRushManager_resolve) {
		let condition = (user_info.id == theCreator) || (user_info.id == phenix_id); //|| user_info.id == 399772013; 
		if (!condition && (user_info.lastSugg != 0 && user_info.role < 5)) {
			tips_handler.getSuggestionsCount(user_info.id).
			then(function (sugg_count) {
				if (simple_log) console.log("Limite: " + sugg_count.suggLimit + ", Aperti: " + sugg_count.opens);
				if (sugg_count.suggLimit - (sugg_count.opens) <= 0) {
					userRushManager_resolve("😶\n_La Fenice_ ha impostato a " + sugg_count.suggLimit +
											" il limite dei suggerimenti che possono essere aperti contemporaneamente." +
											"\nProva a riproporre la tua idea tra un po'...");
				} else {
					let time_enlapsed = (Date.now() / 1000) - user_info.lastSugg;
					let new_coolDown = userPointCalc(sugg_count);
					if (simple_log) {
						console.log(">\t\tIl cooldown per " + user_info.id + " è: " + new_coolDown);
						console.log(">\t\tSono passati: " + time_enlapsed + " secondi dall'ultimo messaggio...");
					}

					if (time_enlapsed < new_coolDown) {
						let towait = (new_coolDown - time_enlapsed) / 60;
						if (manual_log) { console.log(">\tL'utente ha mandato un suggerimento di recente: " + towait); }
						let hours = towait / 60;
						let time_str;
						if (hours < 2)
							time_str = (towait >= 2 ? Math.floor(towait) + " minuti" : Math.floor(towait * 60) + " secondi");
						else
							time_str = Math.round(hours) + " ore";

						let allert = "\n\n*NOTA*\nConsiderata la mole di suggerimenti proposti al giorno, sto provando a gestire diversamente il delay per utente.\n";
						allert += "Se pensi che " + time_str + " sia un tempo sbilanciato per la tua attività sul canale, segnala a @nrc382 :)";
						userRushManager_resolve("*Wow!* 😲\nÈ bello tu abbia tante idee...\nMa sarebbe meglio aspettassi almeno " + time_str + " prima di chiedere la pubblicazione di un nuovo suggerimento." + allert);
					} else {
						userRushManager_resolve(true);
					}
				}
			});
		} else {
			userRushManager_resolve(true);
		}
	})
}

function propouseInsert(user_info, text, entities, isQuick) {
	if (manual_log) { console.log(">\tpropouseInsert"); }
	if (simple_log) { console.log("- Richiesta inserimento: -> tags:" + entities.join(" ")); }

	return new Promise(function (propouseInsert_resolve, propouseInsert_reject) {
		let condition_urgent = entities.indexOf("#manutenzione");
		if (condition_urgent >= 0 && user_info.id == theCreator) {
			return propouseInsert_resolve(insertMessage(user_info.id, text.join(" ")));
		}
		else {
			if (simple_log) { console.log("- Controllo annuncio"); }

			condition_urgent = (user_info.id == phenix_id) || (user_info.id == theCreator);
			if (condition_urgent) {
				let message = "";
				if (entities.indexOf("#annuncio") >= 0) {
					if (simple_log) { console.log("- è un annuncio"); }
					message = "🔥 #Annuncio `della Fenice`\n\n" + text.join(" ").split("\n ").join("\n").trim()

				} else if (entities.indexOf("#salve") >= 0) {
					if (simple_log) console.log("- è un annuncio");
					message = "#Annuncio `dal Bot` 🤖\n\n" + text.join(" ").split("\n ").join("\n").trim();
				}
				if (message.length > 0) {
					return tips_handler.saveTmp_Suggestion(user_info.id, message).
					then(function (res) {
						return propouseInsert_resolve(insertMessage(user_info.id, message));
					});
				}
			}
		}
		if (simple_log) { console.log("- NON è un annuncio"); }

		if (user_info.role < 1) {
			return propouseInsert_resolve(simpleDeletableMessage(user_info.id, unableToInsert_msg + "😶\nNope!\nManda `/suggerimenti` per maggiori informazioni..."));
		}
		if (manual_log) { console.log(">\t\tUltimo suggerimento: " + user_info.lastSugg + ", check: " + (user_info.lastSugg != 0 && user_info.role < 5)); }

		userRushManager(user_info).then(function (rus_res) {
			if (rus_res != true) { // ******+ to do -> bottone tags
				return propouseInsert_resolve(simpleDeletableMessage(user_info.id, rus_res));
			}
			if (manual_log) {
				console.log(">\tCensura " + (censure == true ? "" : "non ") + "attiva");
				console.log(">\tQuickInsert -> " + isQuick);
				console.log(">\tIl messaggio ha " + text.length + " parole");
			}
			reviewInsert(text, entities).then(function (review_res) {
				if (review_res == -3) {
					return propouseInsert_resolve(invalidMessage(user_info.id, "Un po corto per essere un suggerimento...\nIntendevi ...cosa?"));
				} else if (review_res == -4) {
					return propouseInsert_resolve(invalidMessage(user_info.id, "Deloo e gli altri stanno lavorando ad una soluzione che riporti il tools.\nPer il momento i suggerimenti su questo bot sono sospesi."));
				} else if (review_res == -5) {
					return propouseInsert_resolve(invalidMessage(user_info.id, "Sembrerebbe quasi tu sia a caccia di bug!\nNon noscondere i tags tra i marcatori di stile..."));
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
									"🙄\nPer evitare confusione, non posso farti usare _"
									+ review_res.join(" ") + "_ nel tuo suggerimento...\n\nManda: " +
									"`/suggerimenti tags` per una lista dei tag in uso nel " +
									channel_link + "")
							);
						} else if (entities.length == 2) {
							return propouseInsert_resolve(
								invalidMessage(
									user_info.id,
									"🙄\nPer favore,\nCerca di usare piu di un tag ed in maniera coerente. ")
							);
						}
					} else {
						if (review_res == 'emoji') {
							return propouseInsert_resolve(invalidMessage(user_info.id, "Sicurmente _in buona fede_,\nMa hai usato delle emoji riservate nel tuo messaggio.\nCosì non può essere pubblicato...  😔"));
						} else if (review_res == -2) {
							return propouseInsert_resolve(invalidMessage(user_info.id, "Per rendere piu comoda a tutti la consultazione dei suggerimenti sul " + channel_link + ",\n " + generateTagString()));
						} else if (typeof (review_res) == 'string') {
							//res_text[0] = res_text[0].charAt(0).toUpperCase() + res_text[0].slice(1);
							tips_handler.saveTmp_Suggestion(user_info.id, review_res).
							then(function (res) { return propouseInsert_resolve(insertMessage(user_info.id, (isQuick == true ? quickInsert_firstLine : simpleInsert_firstLine) + review_res)); });
						}

					}
				}
			}).
			catch(function (err) { console.log(err); });
		});
	});
}

function manageOpinion(query, user_info) { // to do *** cacca
	if (manual_log) { console.log(">\manageOpinion"); }

	return new Promise(function (manageOpinion_resolve) {
		let request = query.data.split(":");
		let sugg_id = resolveCode(query.message.text);
		let number = parseInt(query.message.text.substring(query.message.text.indexOf("🔘 ") + "🔘 ".length).trim());
		if (simple_log) { console.log("- Richiesta modifica per suggerimento: " + sugg_id); }

		tips_handler.getSuggestionInfos(sugg_id, user_info.id).
		then(function (sugg_info) {
			if (sugg_info.msg_id == 0) {
				if (simple_log) { console.log("- Non Trovato id reale : fornito -> " + number); }
				if (!(number > 0)) {
					return manageOpinion_resolve(simpleDeletableMessage(
						chat_id,
						"😕\nNon sono riuscito a recuperare il numero del messaggio, dovrai specificarlo manualmente...")
												);
				}
			}

			if (request[2] == "EDIT") {
				return manageOpinion_resolve(simpleDeletableMessage(
					chat_id,
					"😕\nLa funzione non è ancora attiva...\nPressa @nrc382 ;)")
											);
			} else {
				if (simple_log) { console.log("- Richiesto cambio di opinione, nuova: -> " + request[2]); }

				tips_handler.setSuggestionStatus(sugg_id, request[2]).
				then(function (res) {
					if (res == -1) {
						return manageOpinion_resolve(simpleDeletableMessage(
							chat_id,
							"😕\nSegnala a @nrc382...\n[errore 212-6]")
													);
					}

					let final_text = "";
					let send_text = "Il [suggerimento](" + channel_link_no_parse + "/" + number + ") è ora ";

					let up = sugg_info.upOnClose + sugg_info.upVotes;
					let down = sugg_info.downOnClose + sugg_info.downVotes;
					if (simple_log) console.log("> Voti ricevuti: " + up + "up, " + down + "down");

					if (request[2] > 0) {
						final_text += "#approvato\n";
					}
					else {
						final_text += "#chiuso\n";
					}
					send_text += final_text;

					let insert = "";
					if (user_info.id == 340271798) { //deloo 
						if (request[2] > 0) {
							insert += "💾️ Il Tools ha apprezzato questo suggerimento.\n";
						} else {
							insert += "💾️ Il Tools ha scartato questo suggerimento.\n";
						}
					}

					final_text += insert + sugg_info.sugg_text.trim() + "\n\n" + suggestionCode_msg + "\`" + sugg_id.toUpperCase() + "\`";


					if (up > Math.abs(down))
						final_text += "\n\n📈";
					else
						final_text += "\n\n📉";

					final_text += " *Report:*\n";

					final_text += "> " + up + (up == 1 ? " voto positivo" : " voti positivi");
					final_text += "\n> " + Math.abs(down) + (Math.abs(down) == 1 ? " voto negativo" : " voti negativi");

					if (request[2] > 0) {
						final_text += "\n#piaciuto in seconda analisi\n";
					}
					else {
						final_text += "\n#scartato in seconda analisi\n";
					}


					let publishRes = {
						query: { id: query.id, options: { text: "Aggiorno..." } },
						toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id },
						toEdit: simpleToEditMessage("@" + channel_name, number, final_text),
						toSend: simpleDeletableMessage(user_info.id, send_text)
					};
					return manageOpinion_resolve(publishRes);

				})

			}

		}).catch(function (err) {
			if (simple_log) console.error(err);
			return manageOpinion_resolve({ query: { id: query.id, options: { text: "Whoops, Errore!\nSegnala a @nrc382", cache_time: 2, show_alert: true } } });
		});


	});
}

function manageMenu(query, user_info) {
	return new Promise(function (manageMenu_resolve) {
		let queryQ = query.data.split(":")[2];
		if (queryQ === "REFRESH") {
			mainMenu(user_info).then(function (res) {
				let menuRes;
				if (typeof res != 'object') {
					menuRes = {
						query: { id: query.id, options: { text: "Controllo sul canale...", cache_time: 0 } },
						toSend: simpleDeletableMessage(user_info.id, "Mumble\nFunzione in fase di test....")
					};

				} else {
					if (simple_log) {
						console.log(res.chat_id);
						console.log(query.message);
					}
					res.mess_id = query.message.message_id;
					menuRes = {
						query: { id: query.id, options: { text: "Aggiorno...", cache_time: 0 } },
						toEdit: res
					};
				}
				manageMenu_resolve(menuRes);

			}).catch(function (err) {
				if (simple_log) console.error(err);
				menuRes = {
					query: { id: query.id, options: { text: "C'è stato un errore!", cache_time: 0 } }
				};
				manageMenu_resolve(menuRes);

			});
		} else if (queryQ === "GET_OPENS") {
			getOpens(user_info.id, false).then(function (res) {
				let menuRes = {
					query: { id: query.id, options: { text: "Controllo sul canale...", cache_time: 0 } },
					toSend: res
				};
				manageMenu_resolve(menuRes);

			}); //
		} else if (queryQ === "GET_TOVOTE") {
			getOpens(user_info.id, true).then(function (res) {
				let menuRes = {
					query: { id: query.id, options: { text: "Controllo sul canale...", cache_time: 0 } },
					toSend: res
				};
				manageMenu_resolve(menuRes);

			});
		} else if (queryQ === "GLOBAL_RECENT") {
			getRecentlyApproved(user_info.id, user_info, { command: "approvati", target: "", comment: "" }).then(function (res) {
				let menuRes = {
					query: { id: query.id, options: { text: "Controllo nel database...", cache_time: 0 } },
					toSend: res
				};
				manageMenu_resolve(menuRes);

			});

		} else if (queryQ === "PERSONAL_RECENT") {
			getOpensFor(user_info.id).then(function (res) {
				let menuRes = {
					query: { id: query.id, options: { text: "Controllo nel database...", cache_time: 0 } },
					toSend: res
				};
				manageMenu_resolve(menuRes);

			});

		}



	});

}

function managePublish(in_query, user_info) {
	if (manual_log) { console.log(">\tmanagePublish"); }
	if (simple_log) { console.log("- Richiesta pubblicazione, testo: -> " + user_info.tmpSugg); }

	return new Promise(function (managePublish_resolve) {
		if (typeof user_info.tmpSugg != "string" || user_info.tmpSugg.length <= 0) {
			return managePublish_resolve({
				query: { id: in_query.id, options: { text: "Woops!", cache_time: 2, show_alert: true } },
				toSend: simpleMessage(user_info.id, "Mi spiace, ma c'è stato un qualche errore...\nRimandami il messaggio per una nuova anteprima (:"),
				toEdit: simpleToEditMessage(in_query.message.chat.id, in_query.message.message_id, "*SCADUTO!*\n\n" + in_query.query)
			});

		} else if (user_info.role > 0) {
			if (manual_log) { console.log(in_query.message.text); }
			let condition_urgent = ((user_info.id == phenix_id) || (user_info.id == theCreator));
			if (condition_urgent) {
				if (in_query.message.text.indexOf("🔥") == 0) {
					let publishRes = {
						query: { id: in_query.id, options: { text: "Pubblico l'annuncio..." } },
						toSend: simpleMessage("@" + channel_name, user_info.tmpSugg),
						toEdit: simpleToEditMessage(in_query.message.chat.id, in_query.message.message_id, "*Annuncio pubblicato!*\n" + user_info.tmpSugg)
					};
					return managePublish_resolve(publishRes);
				} else if (in_query.message.text.indexOf("🤖") == 0) {
					let publishRes = {
						query: { id: in_query.id, options: { text: "Pubblico l'annuncio..." } },
						toSend: simpleMessage("@" + channel_name, user_info.tmpSugg),
						toEdit: simpleToEditMessage(in_query.message.chat.id, in_query.message.message_id, "*Annuncio pubblicato!*\n" + user_info.tmpSugg)
					};
					return managePublish_resolve(publishRes);
				}
			}

			userRushManager(user_info).then(function (rus_res) {
				if (rus_res != true)
					return managePublish_resolve(simpleDeletableMessage(user_info.id, rus_res));

				//controlli
				tips_handler.insertSuggestion(user_info.id, user_info.tmpSugg).
				then(function (new_suggestion) {
					if (new_suggestion == false) {
						return managePublish_resolve(simpleDeletableMessage(theCreator, "Aiaiai...\nSon finiti gli id?"));
					} else if (new_suggestion) {
						let publishRes = {
							query: { id: in_query.id, options: { text: "Pubblico il suggerimento..." } },
							toSend: suggestionMessage(user_info.tmpSugg + "\n\n" + suggestionCode_msg + "\`" + new_suggestion.SUGGESTION_ID + "\`"),
							toEdit: simpleToEditMessage(in_query.message.chat.id, in_query.message.message_id, "*Suggerimento " + new_suggestion.SUGGESTION_ID + "*\n\n" + new_suggestion.STEXT)
						};
						let newdate = Date.now() / 1000;
						tips_handler.updateLast(user_info.id, newdate, true).
						catch(function (err) { console.log(err); }).
						then(tips_handler.updateLast(user_info.id, newdate, false)).
						catch(function (err) { console.log(err); }).
						then(function (update_res) {
							return managePublish_resolve(publishRes);
						}).
						catch(function (err) { console.log(err); });
					} else {
						return managePublish_resolve(simpleDeletableMessage(theCreator, "Si è verificato un grave probema..."));
					}
					//else
					//return insertMessage(user_id, "Problemi. _Sempre problemi..._\n:(");
				});
			});

		} else {
			return managePublish_resolve({ query: { id: in_query.id, options: { text: "🤡\nCi hai provato!", cache_time: 2, show_alert: true } } });
		}
	});

}

function manageVote(query, user_info, vote) {
	if (manual_log) { console.log(">\tmanageVote"); }
	return new Promise(function (manageVote_resolve) {
		if (user_info.role > 0) {
			let suggestion_id = resolveCode(query.message.text);
			if (simple_log) { console.log("- Votazione " + vote + " per il suggerimento: " + suggestion_id); }

			tips_handler.getSuggestionInfos(suggestion_id, user_info.id).
			then(function (infos) {
				let voteSugg = {};
				let final_text = "";

				if (infos.status != 0) {
					if (infos.status == 1) {
						final_text += "#piaciuto alla fenice ⚡";
					} else {
						final_text += "#chiuso";
					}
					final_text += "\n" + infos.sugg_text + "\n\n" + suggestionCode_msg + "\`" + suggestion_id + "\`";

					if (infos.totalVotes > 0)
						final_text += "\n\n📈";
					else
						final_text += "\n\n📉";

					final_text += " *Report:*\n";

					if (infos.upOnClose > 0) {
						final_text += "> " + infos.upOnClose + (infos.upOnClose == 1 ? " voto positivo" : " voti positivi") + "\n";
					}
					if (infos.downOnClose < 0) {
						final_text += "> " + ((-1) * infos.downOnClose) + (infos.downOnClose == -1 ? " voto negativo" : " voti negativi");
					}

					voteSugg.toEdit = simpleToEditMessage(query.message.chat.id, query.message.message_id, final_text);
					voteSugg.query = { id: query.id, options: { text: "Il suggerimento non è piu aperto!", cache_time: 2 } }
					return manageVote_resolve(voteSugg);
				} else {
					tips_handler.setMsgID(infos.msg_id, suggestion_id, query.message.message_id).then(function (set_res) {
						tips_handler.insertVote(user_info.id, suggestion_id, vote, infos.author).
						then(function (insertRes) {
							if (manual_log) console.log(insertRes);
							if (user_info.id == phenix_id) {
								if (simple_log) console.log("> Votazione di Edo -> " + vote);
								if (vote == 1) {
									final_text += "#approvato";
								} else if (vote == -1) {
									final_text += "#chiuso";
								}
								voteSugg.query = { id: query.id, options: { text: final_text, cache_time: 2 } };
								final_text += "\n" + infos.sugg_text + "\n\n" + suggestionCode_msg + "\`" + suggestion_id + "\`";

								if (infos.totalVotes > 0)
									final_text += "\n\n📈";
								else
									final_text += "\n\n📉";

								final_text += " *Report:*\n";
								if (infos.upVotes > 0)
									final_text += "> " + infos.upVotes + (infos.upVotes == 1 ? " voto positivo" : " voti positivi");
								if (infos.downVotes < 0) {
									if (infos.upVotes > 0)
										final_text += "\n";
									final_text += "> " + ((-1) * infos.downVotes) + (infos.downVotes == -1 ? " voto negativo" : " voti negativi");
								}

								let totalCountedVotes = (infos.upVotes + (-1) * infos.downVotes);
								if (vote == 1) {
									final_text += "\n#piaciuto alla fenice ⚡";

									author_msg = "😊 Wow!\nUn tuo [suggerimento](" + channel_link_no_parse + "/" +
										query.message.message_id + ") è stato *approvato* dalla Fenice ⚡";
									if (infos.totalVotes > 1) {
										author_msg += " dopo che " + ((totalCountedVotes < 10) ? "appena " : "") + totalCountedVotes
											+ " utenti lo avevano votato";
										if (infos.upVotes > infos.totalVotes - (infos.totalVotes / 20))
											author_msg += ", praticamente tutti positivamente!!";
										else {
											author_msg += " (di questi solo " + ((-1) * infos.downVotes) + " negativamente)";
										}
										author_msg += "\n*Benfatto* 🥂";
									} else {
										author_msg += "\n...in netta controtendenza, hai proposto qualcosa di evidentemente interessante.\n\nQuesta volta hai segnato _doppio punteggio_,\n*Benfatto!* 🍻";
									}

								} else if (vote == -1) {
									final_text += "\n#scartato dalla Fenice 🌪️ ";

									author_msg = "😢 Sigh!\nUn tuo [suggerimento](" + channel_link_no_parse + "/" +
										query.message.message_id + ") è stato scartato dalla Fenice...\n";
									if (infos.totalVotes > 0) {
										author_msg += "Nel complesso è piaciuto agli altri utenti, ma probabilmente è stato considerato difficilmente realizzabile o sbilanciato.\n" +
											"\nPiuttosto che tentare di recriminare _chissa cosa,_ cerca di capire MA soprattutto ricorda:\n*L'ultima parola spetta alla fenice!* ⚡️";
									} else {
										author_msg += "Considerando che nel complesso non è piaciuto nemmeno agli altri utenti, forse faresti meglio a valutare bene le meccaniche del gioco _prima di proporre il prossimo_";
									}
								}
								tips_handler.closeSuggestion(suggestion_id, vote).then(function (close_res) {
									if (simple_log) console.log("> Chiuso suggerimento " + close_res[0]);
									voteSugg.toSend = simpleDeletableMessage(infos.author, author_msg);
									voteSugg.toEdit = simpleToEditMessage(query.message.chat.id, query.message.message_id, final_text);
									return manageVote_resolve(voteSugg);
								});


							} else {
								final_text = "";

								if (infos.upVotes == 0 && infos.downVotes == 0) {
									if (query.message.entities.length > 0) {
										query.message.entities.forEach(function (ent) {
											let curr_tag = query.message.text.substr(ent.offset, ent.length);
											if (ent.type == 'hashtag' && curr_tag == "#tools") {
												if (infos.upVotes == 1) { //
													if (simple_log) { console.log("-> messaggio per Deloo!"); }
													voteSugg.toSend = delooMessage(query.message.message_id, suggestion_id);
												}
											}
										});
									}
								}

								final_text += infos.sugg_text + "\n\n" + suggestionCode_msg + "\`" + suggestion_id + "\`";

								final_text += proportionTextCalc((infos.upVotes + infos.downVotes * (-1)));

								if (infos.usr_prevVote == 0) {
									voteSugg.query = {
										id: query.id,
										options: {
											text: ((vote > 0) ? voteButton.up + " " + infos.upVotes : voteButton.down + " " + (-1) * infos.downVotes) + "  +1",
											cache_time: 2
										}
									};
									infos.totalVotes += vote;
								} else {
									voteSugg.query = { id: query.id, options: { text: "Voto rimosso...", cache_time: 2 } };
									infos.totalVotes -= infos.usr_prevVote;
								}
								if (vote == 1) {
									infos.upVotes += 1;
								} else if (vote == -1) {
									infos.downVotes -= 1;
								}

								voteSugg.toEdit = suggestionEditedMessage(query.message.chat.id, query.message.message_id, final_text, infos);
								return manageVote_resolve(voteSugg);
							}
						}).
						catch(function (err) { console.error(err); });
					});

				}
			}).
			catch(function (err) { console.error(err); });
		} else {
			return manageVote_resolve({ query: { id: query.id, options: { text: "😞 Paenitet!\nNon ti è consentito nemmeno votare ", cache_time: 2, show_alert: true } } });
		}
	});
}

function manageReview(query, user_info) { // to do *** cacca grossa
	if (manual_log) { console.log(">\tmanageReview"); }

	return new Promise(function (manageReview_resolve) {
		let request = query.data.split(":");
		if (manual_log) console.log(request);
		let sugg_id = resolveCode(query.message.text);
		let number = parseInt(query.message.text.substring(query.message.text.indexOf("🔘 ") + "🔘 ".length).trim());
		let newStatus;
		if (simple_log) { console.log("- Richiesta review per suggerimento: " + sugg_id); }

		tips_handler.getSuggestionInfos(sugg_id, user_info.id).
		then(function (sugg_info) {

			if (sugg_info.msg_id == 0) {
				if (simple_log) { console.log("- Non Trovato id reale : fornito-> " + number); }
				if (!(number > 0)) {
					return manageReview_resolve(simpleDeletableMessage(
						chat_id,
						"😕\nNon sono riuscito a recuperare il numero del messaggio, dovrai specificarlo manualmente...")
											   );
				}
			}


			newStatus = sugg_info.status;
			if (request[2]) {
				newStatus = request[2];
			}

			if (simple_log) { console.log("- Richiesta review di " + sugg_id + " status: " + newStatus); }

			tips_handler.setSuggestionStatus(sugg_id, newStatus).then(function (res) {

				if (res == -1 || user_info.lastReview.length <= 0) {
					return manageReview_resolve(
						simpleDeletableMessage(chat_id, "😕\nSegnala a @nrc382...\nProblemi cercando il suggerimento " + sugg_id)
					);
				}

				let send_text = "🙂\nIl [suggerimento](" + channel_link_no_parse + "/" + number + ") è stato aggiornato...";
				let final_text = "\n🎖 *Modificato da un revisore...*\n\n" + user_info.lastReview + "\n\n" + suggestionCode_msg + "\`" + sugg_id + "\`";

				let publishRes = {
					query: { id: query.id, options: { text: "Aggiorno..." } },
					toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id },
					toSend: simpleDeletableMessage(user_info.id, send_text)
				};

				if (sugg_info.status != 0) {
					if (simple_log) { console.log("- Suggerimento chiuso =" + sugg_info.status); }

					if (sugg_info.status == 1) {
						final_text = "#approvato\n" + final_text;
					} else {
						final_text = "#chiuso\n" + final_text;
					}

					if (sugg_info.upOnClose > Math.abs(sugg_info.downOnClose))
						final_text += "\n\n📈";
					else
						final_text += "\n\n📉";

					final_text += " *Report:*\n";

					final_text += "> " + sugg_info.upOnClose + (sugg_info.upOnClose == 1 ? " voto positivo" : " voti positivi");
					final_text += "\n> " + Math.abs(sugg_info.downOnClose) + (Math.abs(sugg_info.downOnClose) == 1 ? " voto negativo" : " voti negativi");

					publishRes.toEdit = simpleToEditMessage("@" + channel_name, number, final_text);
				} else {

					if (simple_log) { console.log("- Suggerimento aperto =" + sugg_info.status); }

					publishRes.toEdit = suggestionEditedMessage("@" + channel_name, number, final_text, sugg_info);
					if (simple_log) console.log(publishRes.toEdit);
				}

				tips_handler.updateSuggestionText(sugg_id, "\n🎖 *Modificato da un revisore...*\n\n" + user_info.lastReview).
				then(function (res) {
					return manageReview_resolve(publishRes);
				});


			})



		}).catch(function (err) {
			if (simple_log) console.log(err);
			return manageReview_resolve({ query: { id: query.id, options: { text: "Whoops, Errore!\nERRORE GRAVE 😳\nSegnala a @nrc382", cache_time: 2, show_alert: true } } });
		});


	});
}

function manageForget(query, user_info) {
	return new Promise(function (manageForget_resolve) {
		let publishRes = {
			toDelete: { chat_id: query.message.chat.id, mess_id: query.message.message_id },
			query: { id: query.id, options: { text: "Ok!", cache_time: 0 } }
		};
		return manageForget_resolve(publishRes);

	});


}

function manageAidButton(query, user_info) {
	if (manual_log) { console.log(">\manageAidButton: forUserID " + user_info.id); }
	if (simple_log) { console.log("- AidButton"); }


	return new Promise(function (manageAidButton_resolve) {
		let suggestion_id = resolveCode(query.message.text);
		tips_handler.getSuggestionInfos(suggestion_id, user_info.id).
		then(function (sugg_infos) {
			if (user_info.role >= 3) {
				if (sugg_infos.usr_prevVote == 0) {
					let partial_sugg = sugg_infos.sugg_text.substring(0, (sugg_infos.sugg_text.length * 3) / 5);
					partial_sugg = partial_sugg.split('*').join("");
					partial_sugg = partial_sugg.split('_').join("");
					let text = "*Gestione di: *" + suggestionCode_msg + suggestion_id + "\n\n" +
						"«_" + partial_sugg.trim() + "_ /.../»" +
						"\n\n*Sulla limitazione:*" +
						"\n_Se seguente l'eliminazione porta al ban illimitato dell'autore" +
						"\nSe seguente la chiusura, alla limitazione di 12h.\n" +
						"\nÈ sempre possibile utilizzare i comandi limita e dimentica_\n" +
						"\n*Sul suggerimento:*\n" +
						"> Voti positivi: " + sugg_infos.upVotes + "\n" +
						"> Voti negativi: " + sugg_infos.downVotes + "\n" +
						"> ID: " + query.message.message_id;
					let deleteSugg = {};
					deleteSugg.query = { id: query.id, options: { text: "Gestione di: " + suggestion_id, cache_time: 2 } };
					deleteSugg.toSend = manageSuggestionMessage(user_info.id, text, suggestion_id);

					return manageAidButton_resolve(deleteSugg);
				} else {
					let query_msg = "👥\nSu " + (sugg_infos.upVotes + Math.abs(sugg_infos.downVotes)) + " voti";
					query_msg += "\n• Favorevoli: " + sugg_infos.upVotes; //+sugg_infos.downVotes*(-1)+" "+voteButton.down+"     [👤 ";
					query_msg += "\n• Contrari: " + Math.abs(sugg_infos.downVotes) + "\n\n";
					let sugg = {};
					if (sugg_infos.usr_prevVote == 0) {
						query_msg += "❕\nNon hai votato questo suggerimento";
					} else if (sugg_infos.usr_prevVote > 0) {
						query_msg += voteButton.up_moji + "\nTu hai votato positivamente!";
					} else {
						query_msg += voteButton.down_moji + "\nTu hai votato negativamente...";
					}
					return manageAidButton_resolve({ query: { id: query.id, options: { text: query_msg, cache_time: 2, show_alert: true } } });
				}
			}
			else {
				let query_msg = "👥\nSu " + (sugg_infos.upVotes + Math.abs(sugg_infos.downVotes)) + " voti\n";
				query_msg += "\n• Favorevoli: " + sugg_infos.upVotes; //+sugg_infos.downVotes*(-1)+" "+voteButton.down+"     [👤 ";
				query_msg += "\n• Contrari: " + Math.abs(sugg_infos.downVotes) + "\n\n";
				let sugg = {};
				if (sugg_infos.usr_prevVote == 0) {
					query_msg = "❕\nNon hai votato questo suggerimento";
				} else if (sugg_infos.usr_prevVote > 0) {
					query_msg += voteButton.up_moji + "\nHai votato positivamente!";
				} else {
					query_msg += voteButton.down_moji + "\nHai votato negativamente...";
				}
				sugg.query = { id: query.id, options: { text: query_msg, cache_time: 2, show_alert: true } };

				let final_text = "";

				final_text += sugg_infos.sugg_text + "\n\n" + suggestionCode_msg + "\`" + suggestion_id + "\` ";
				final_text += proportionTextCalc((sugg_infos.upVotes + sugg_infos.downVotes * (-1)));

				sugg.toEdit = suggestionEditedMessage(query.message.chat.id, query.message.message_id, final_text, sugg_infos);

				if (simple_log) { console.log("- AidQueryMessage -> " + query_msg); }
				return manageAidButton_resolve(sugg);
			}
		});
	});
}

function manageDelete(query, user_info, set_role, close) {
	if (manual_log) { console.log(">\tmanageDelete"); }
	if (simple_log) { console.log("- Eliminazione richiesta da -> " + user_info.id); }


	return new Promise(function (manageDelete_resolve) {
		if (user_info.role <= 2) {
			let delSugg = {};
			delSugg.query = { id: query.id, options: { text: "Appena proposto!" } };
			if (query.message.chat.id == user_info.id) {
				delSugg.query = { id: query.id, options: { text: "Ci hai provato!" } };
				delSugg.toDelete = { chat_id: user_info.id, mess_id: query.message.message_id };
			}
			return manageDelete_resolve(delSugg);

		}

		let suggestion_id = resolveCode(query.message.text);
		let toDelmess_id = query.message.text.substring(query.message.text.indexOf(" ID: ") + " ID: ".length).trim();
		let console_messInsert = "eliminazione";
		let new_role;
		let close_res = -2;


		if (manual_log) { console.log(">\t\tChiedo " + console_messInsert + " per " + suggestion_id + ", id messaggio: " + toDelmess_id); }

		tips_handler.getSuggestionInfos(suggestion_id, user_info.id).then(function (sugg_infos) {
			if (sugg_infos) {
				tips_handler.getUserInfo(sugg_infos.author).then(function (author_info) {
					if (close == true) {
						if (set_role == 0)
							new_role = 0;
						else
							new_role = author_info.role;
						console_messInsert = "chiusura";
						close_res = -1;
					} else {
						if (set_role == -1) {
							new_role = -1;
						} else {
							new_role = author_info.role;
						}
					}
					tips_handler.setUserRole(sugg_infos.author, new_role).
					then(function (limit_res) {
						if (manual_log) { console.log(">\t\t" + sugg_infos.author + " è ora con ruolo: " + limit_res); }
						tips_handler.closeSuggestion(suggestion_id, close_res).
						then(function (drop_res) {
							let deleteSugg = {};
							let query_messInsert = " eliminato! [" + Math.abs(drop_res[1]) + " voti]";

							if (close == true) {
								query_messInsert = " chiuso! [" + Math.abs(drop_res[1]) + " voti]";

								let final_text = suggestionCode_msg + suggestion_id;
								let total_votes = sugg_infos.upVotes + Math.abs(sugg_infos.downVotes);
								let toHotnumber = 30;
								if (aproximative_userNumber.active != 0)
									toHotnumber = (aproximative_userNumber.active / 2) + 1;


								final_text = " #chiuso\n" + sugg_infos.sugg_text + "\n\n" + suggestionCode_msg + "\`" + suggestion_id + "\`\n";

								if (manual_log) { console.log(">\t\tVoti ricevuti: " + sugg_infos.totalVotes); }

								if (sugg_infos.totalVotes > 0)
									final_text += "\n\n📈";
								else
									final_text += "\n\n📉";

								final_text += "\n*Report:*\n";
								if (sugg_infos.upVotes == 0 && sugg_infos.downVotes == 0)
									final_text += "Questo suggerimento non ha ricevuto voti!";
								else {
									if (sugg_infos.upVotes + sugg_infos.upOnClose > 0)
										final_text += "> " + sugg_infos.upVotes + (sugg_infos.upVotes == 1 ? " voto positivo" : " voti positivi");
									if (abs(sugg_infos.downVotes) + abs(sugg_infos.downOnClose) > 0) {
										if (sugg_infos.upVotes + sugg_infos.upOnClose > 0)
											final_text += "\n";
										final_text += "> " + ((-1) * sugg_infos.downVotes) + (sugg_infos.downVotes == -1 ? " voto negativo" : " voti negativi");
									}
									if (total_votes > toHotnumber)
										final_text += "  " + voteButton.hot;
									else if (sugg_infos.downVotes == 0) {
										final_text += "  🌱";
									}
								}


								deleteSugg.toEdit = simpleToEditMessage("@" + channel_name, toDelmess_id, final_text);
								deleteSugg.toDelete = { chat_id: query.message.chat.id, mess_id: query.message.message_id };

							} else {
								if (query.message.chat.id == user_info.id) {
									deleteSugg.toEdit = simpleToEditMessage(
										query.message.chat.id,
										query.message.message_id,
										query.message.text + "\n*Rimosso!*");
									deleteSugg.toDelete = { chat_id: "@" + channel_name, mess_id: toDelmess_id };
								} else {
									deleteSugg.toDelete = { chat_id: "@" + channel_name, mess_id: query.message.message_id };
								}
							}

							if (drop_res[0].length == 5) {
								deleteSugg.query = { id: query.id, options: { text: "Suggerimento " + suggestion_id + query_messInsert, cache_time: 2 } };
							} else {
								deleteSugg.query = { id: query.id, options: { text: suggestion_id + " non era nel database...", cache_time: 2 } };
							}
							if (simple_log) { console.log("- DeleteQueryMessage -> " + query_messInsert); }
							return manageDelete_resolve(deleteSugg);
						});

					});
				});
			}
		});
	});
}

function resolveCode(text) {
	let suggestion_id = text.substring((text.indexOf(suggestionCode_msg) + suggestionCode_msg.length)).trim().substring(0, 5);
	if (manual_log) { console.log(">\t\tRicavato codice: " + suggestion_id); }
	return (suggestion_id.replace("\`", ""));
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
	//let total = Math.round((aproximative_userNumber.active * 10) / aproximative_userNumber.total); // attivi su totali
	//let quorum = Math.round((votes * 10) / aproximative_userNumber.active); // in decimi, votanti su attivi
	//let onTotal = Math.round((votes * 10) / aproximative_userNumber.total); // in decimi, votanti su totali

	let proportion = Math.min(100, ((votes * 100) / aproximative_userNumber.active).toFixed(1)); // in centesimi, votanti su attivi

	final_text += "\n\n> *Partecipazione:* ";
	if (proportion < 1) {
		final_text += " ~1%\n";
	} else
		final_text += " " + proportion + "%\n";

	// if (onTotal > 0)
	// 	final_text += "- Sul totale: " + onTotal + "/10\n";
	// else
	// 	final_text += "- Sul totale < 1/10\n";

	// if(total < 1)
	// 	final_text += "- Rapporto di attività: < 1/10\n";
	// else
	// 	final_text += "- Rapporto di attività: "+ total+ "/10";


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


	let max = sugg_partial.join(" ").length / sugg_partial.length;
	if (max < 4) {
		max = Math.min(6, (sugg_partial.length - 1));
	} else {
		max = Math.min(5, (sugg_partial.length - 1));
	}

	if (sugg_partial[max].length <= 5) {
		if (typeof sugg_partial[max + 1] != 'undefined' && sugg_partial[max + 1].length >= 5) {
			max = Math.min((max + 1), sugg_partial.length);
		} else {
			max = Math.min((max - 1), sugg_partial.length);
		}
	}
	//max = Math.min(max, sugg_partial.length);
	sugg_partial = sugg_partial.slice(0, max + 1);

	return sugg_partial.join(" ").split("*").join("").split("_").join("").split("`").join("");
}

//________________________//
//MESSAGE MANAGER *******
//________________________//

var aproximative_userNumber = { total: 0, active: 0 };


function simpleMenuMessage(mess_id, text, hasOpens) {
	if (manual_log) { console.log(">\t\tsimpleMenuMessage"); }
	let menu_button = [];
	if (mess_id != phenix_id) {
		if (hasOpens) {
			menu_button.push(
				[{
					text: "Aperti",
					callback_data: 'SUGGESTION:MENU:GET_OPENS'
				},
				 {
					 text: "🔄",
					 callback_data: 'SUGGESTION:MENU:REFRESH'
				 },
				 {
					 text: "Da Votare",
					 callback_data: 'SUGGESTION:MENU:GET_TOVOTE'
				 }
				]
			)
		} else {
			menu_button.push([{
				text: "🔄",
				callback_data: 'SUGGESTION:MENU:REFRESH'
			}]);
		}
		menu_button.push(
			[{
				text: "⚡️ Approvati",
				callback_data: 'SUGGESTION:MENU:GLOBAL_RECENT'
			},
			 {
				 text: "📜 Storico",
				 callback_data: 'SUGGESTION:MENU:PERSONAL_RECENT'
			 }
			]
		);
	} else {
		if (hasOpens) {

			menu_button.push([ //
				{
					text: "Aperti",
					callback_data: 'SUGGESTION:MENU:GET_OPENS'
				},
				{
					text: "🔄",
					callback_data: 'SUGGESTION:MENU:REFRESH'
				}]);
		} else {
			menu_button.push([{
				text: "🔄",
				callback_data: 'SUGGESTION:MENU:REFRESH'
			}]);
		}
		menu_button.push([{
			text: "Ultimi Approvati ⚡️",
			callback_data: 'SUGGESTION:MENU:GLOBAL_RECENT'
		}]);
	}



	let menu_options = {
		parse_mode: "Markdown",
		disable_web_page_preview: true,
		reply_markup: {
			inline_keyboard: menu_button
		}
	};

	let menu_mess = {
		chat_id: mess_id,
		message_txt: text,
		options: menu_options
	};

	return menu_mess;
}

function simpleDeletableMessage(mess_id, text) {
	if (manual_log) { console.log(">\t\tsimpleMessage"); }
	let mess_button = [];

	mess_button.push([{
		text: "Ok",
		callback_data: 'SUGGESTION:FORGET'
	}]);
	let cmd_options = {
		parse_mode: "Markdown",
		disable_web_page_preview: true,
		reply_markup: {
			inline_keyboard: mess_button
		}
	};

	let simple_msg = {
		chat_id: mess_id,
		message_txt: text,
		options: cmd_options
	};

	return simple_msg;
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

function insertMessage(mess_id, text) {
	if (manual_log) { console.log(">\t\tinsertMessage"); }

	let insert_button = [];
	insert_button.push([{
		text: 'Pubblica!',
		callback_data: 'SUGGESTION:PUBLISH'
	}]);
	insert_button.push([{
		text: "Annulla",
		callback_data: 'SUGGESTION:FORGET'
	}]);

	let insert_options = {
		parse_mode: "Markdown",
		disable_web_page_preview: true,
		reply_markup: {
			inline_keyboard: insert_button
		}
	};

	let insert_msg = {
		chat_id: mess_id,
		message_txt: text,
		options: insert_options
	};

	return insert_msg;
}

function delooMessage(message_id, sugg_id) {
	let text = "🙃\n*Hey Delooo!*\nC'è una nuova [proposta](" + channel_link_no_parse + "/" +
		message_id + ") per il tools pubblicata sul " + channel_link + " dei suggerimenti.";

	text += suggestionCode_msg + "`" + sugg_id.toUpperCase() + "`";
	text += "\n🔘 " + message_id + "";
	text += "";

	let insert_button = [];
	let buttonText;
	if (status == 1) {
		insert_button.push([{
			text: "Scarta 🌪️",
			callback_data: 'SUGGESTION:OPINION:-1'
		}]);
	}
	else if (status == -1) {
		insert_button.push([{
			text: "Approva ⚡️",
			callback_data: 'SUGGESTION:OPINION:1'
		}]);
	}
	if (status == 0) {
		insert_button.push([{
			text: 'Scarta 🌪️ ',
			callback_data: 'SUGGESTION:OPINION:-1'
		},
							{
								text: 'Approva ⚡',
								callback_data: 'SUGGESTION:OPINION:1'
							}
						   ]);
	}

	let insert_options = {
		parse_mode: "Markdown",
		disable_web_page_preview: true,
		reply_markup: {
			inline_keyboard: insert_button
		}
	};

	let insert_msg = {
		chat_id: 340271798,
		message_txt: text,
		options: insert_options
	};

	return insert_msg;
}

function opinionMessage(mess_id, status, msg_text) {
	if (manual_log) { console.log(">\t\topinionMessage"); }
	let insert_button = [];

	// if (status == 1) {
	// 	insert_button.push([{
	// 		text: "Scarta 🌪️",
	// 		callback_data: 'SUGGESTION:OPINION:-1'
	// 	}]);
	// }
	// else if (status == -1) {
	// 	insert_button.push([{
	// 		text: "Approva ⚡️",
	// 		callback_data: 'SUGGESTION:OPINION:1'
	// 	}]);
	// } else if (status == 0) {
	// 	insert_button.push([{
	// 		text: 'Scarta 🌪️ ',
	// 		callback_data: 'SUGGESTION:OPINION:-1'
	// 	},
	// 	{
	// 		text: 'Approva ⚡',
	// 		callback_data: 'SUGGESTION:OPINION:1'
	// 	}
	// 	]);
	// }

	insert_button.push([{
		text: 'Scarta 🌪️ ',
		callback_data: 'SUGGESTION:OPINION:-1'
	},
						{
							text: 'Approva ⚡',
							callback_data: 'SUGGESTION:OPINION:1'
						}
					   ]);
	//	insert_button.push([{
	//		text: "Modifica Testo",
	//		callback_data: 'SUGGESTION:OPINION:EDIT'
	//	}]);
	insert_button.push([{
		text: "Annulla",
		callback_data: 'SUGGESTION:FORGET'
	}]);

	let insert_options = {
		parse_mode: "Markdown",
		disable_web_page_preview: true,
		reply_markup: {
			inline_keyboard: insert_button
		}
	};

	let insert_msg = {
		chat_id: mess_id,
		message_txt: msg_text,
		options: insert_options
	};

	return insert_msg;

}

function reviewMessage(mess_id, status, msg_text) {
	if (manual_log) { console.log(">\t\treviewMessage"); }
	let insert_button = [];
	let buttonText;

	insert_button.push([{
		text: "Aggiorna il Testo",
		callback_data: 'SUGGESTION:REVIEW'
	}]);
	insert_button.push([{
		text: "Annulla",
		callback_data: 'SUGGESTION:FORGET'
	}]);

	let insert_options = {
		parse_mode: "Markdown",
		disable_web_page_preview: true,
		reply_markup: {
			inline_keyboard: insert_button
		}
	};

	let insert_msg = {
		chat_id: mess_id,
		message_txt: msg_text,
		options: insert_options
	};

	return insert_msg;

}

function manageSuggestionMessage(mess_id, text, sugg_id) {
	if (manual_log) { console.log(">\t\tmanageSuggestionMessage"); }

	let insert_button = [];
	insert_button.push([{
		text: 'Elimina ',
		callback_data: 'SUGGESTION:DELETE'
	},
						{
							text: '🗑 e Limita',
							callback_data: 'SUGGESTION:DELETE:ANDLIMIT'
						}
					   ]);
	insert_button.push([{
		text: 'Chiudi ',
		callback_data: 'SUGGESTION:CLOSE'
	},
						{
							text: '🚫 e Limita',
							callback_data: 'SUGGESTION:CLOSE:ANDLIMIT'
						}]
					  );
	insert_button.push([{
		text: "Annulla",
		callback_data: 'SUGGESTION:FORGET'
	}]);

	let insert_options = {
		parse_mode: "Markdown",
		disable_web_page_preview: true,
		reply_markup: {
			inline_keyboard: insert_button
		}
	};

	let insert_msg = {
		chat_id: mess_id,
		message_txt: text,
		options: insert_options
	};

	return insert_msg;
}

function simpleToEditMessage(chatId, messId, text) {
	if (manual_log) { console.log(">\t\tsimpleToEditMessage"); }

	let cmd_options = {
		parse_mode: "Markdown",
		disable_web_page_preview: true
	};

	let simpleEdited_msg = {
		chat_id: chatId,
		mess_id: messId,
		message_txt: text,
		options: cmd_options
	};

	return simpleEdited_msg;
}

function suggestionEditedMessage(chatId, messId, text, infos) {
	let votes_text = "";
	let votes_msg = "";
	//infos.totalVotes += Math.abs(infos.usr_prevVote);

	if (infos.totalVotes == 0) {
		votes_msg = "Neutralità ❕";
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

		if (infos.totalVotes > 0) {
			num = infos.upVotes;
		} else {
			num = Math.abs(infos.downVotes);
		}

		if (((num % 2)) + ((totalCount % 2)) > 0) {
			fraction = reduceFraction((num - (num % 2)), (totalCount - (totalCount % 2)));
		}
		else {
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

	if (infos.totalVotes > 0) {
		if (infos.totalVotes < 11)
			votes_msg += voteButton.up_moji + " " + votes_text + " 😶 ";
		else if (infos.totalVotes < (margin + margin / 4))
			votes_msg += voteButton.up_moji + " " + votes_text + " 🙂 ";
		else
			votes_msg += voteButton.up_moji + " " + votes_text + " 😍 ";
	} else if (infos.totalVotes < 0) {
		if (infos.totalVotes > -11)
			votes_msg += voteButton.down_moji + " " + votes_text + " 😕 ";
		else if (infos.totalVotes > -(margin + margin / 4))
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
	if (manual_log) console.log(">\t\tsuggestionEditedMessage  butt_msg-> " + votes_msg);


	let suggestion_button = [];
	suggestion_button.push([
		{
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
			callback_data: 'SUGGESTION:AIDBUTTON'
		}
	]);

	let suggestion_options = {
		parse_mode: "Markdown",
		disable_web_page_preview: true,
		reply_markup: {
			inline_keyboard: suggestion_button
		}
	};

	let suggestion_msg = {
		chat_id: chatId,
		mess_id: messId,
		message_txt: text,
		options: suggestion_options
	};

	return suggestion_msg;
}

function suggestionMessage(text) {
	if (manual_log) { console.log(">\t\tsuggestionMessage"); }

	let suggestion_button = [];
	suggestion_button.push([
		{
			text: voteButton.up,
			callback_data: 'SUGGESTION:UPVOTE'
		},
		{
			text: voteButton.down,
			callback_data: 'SUGGESTION:DOWNVOTE'
		}], [
		{
			text: ("Appena proposto!"),
			callback_data: 'SUGGESTION:DELETE'
		}]);


	let suggestion_options = {
		parse_mode: "Markdown",
		disable_web_page_preview: true,
		reply_markup: {
			inline_keyboard: suggestion_button
		}
	};

	let suggestion_msg = {
		chat_id: "@" + channel_name,
		message_txt: text,
		options: suggestion_options
	};
	return suggestion_msg;
}

function invalidMessage(mess_id, res_message) {
	if (manual_log) { console.log(">\t\tinvalidMessage"); }
	let menu_button = [];
	menu_button.push([{
		text: "Ok",
		callback_data: 'SUGGESTION:FORGET'
	}]);


	let standard_options = {
		parse_mode: "Markdown",
		disable_web_page_preview: true,
		reply_markup: {
			inline_keyboard: menu_button
		}
	};
	let invalid_mess = {
		chat_id: mess_id,
		message_txt: "*Whoops!* 🙃" + "\n" + res_message,
		options: standard_options
	};
	return invalid_mess;
}

// (: