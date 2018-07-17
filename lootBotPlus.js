process.env["NTBA_FIX_319"] = 1;

process.on('uncaughtException', function (error) {
	console.log("\x1b[31m", "Exception: ", error, "\x1b[0m");
});

process.on('unhandledRejection', function (error, p) {
	if ((error.message.indexOf("Too Many Requests") == -1) && (error.message.indexOf("message is not modified") == -1))
		console.log("\x1b[31m","Error: ", error.message, "\x1b[0m");
});

var config = require('./config.js');
var TelegramBot = require('node-telegram-bot-api');
var ms = require("ms");
var mysql = require('mysql');
var mysql_sync = require('sync-mysql');
var readline = require('readline');
var math = require('mathjs');
var express = require('express');
var http = require('http');
var https = require('https');
var fs = require('fs');
var bodyParser = require('body-parser');

var token = config.plustoken;

var bot = new TelegramBot(token);
var app = express();

var path = "/plus/bot" + token;
var port = 25002;

var options = {
	"allowed_updates": ["inline_query", "chosen_inline_result", "callback_query"],
	"max_connections": 80
}
bot.setWebHook('https://fenixweb.net:8443' + path, options);
app.listen(port);

app.use(bodyParser.json());
app.post(path, function(req, res) {
	bot.processUpdate(req.body);
	res.sendStatus(200);
});

var check = [];
var globaltime = Math.round(new Date() / 1000);
var timevar = [];
var timevarSpam = [];
var timevarFlood = [];
var rankList = [20, 50, 75, 100, 150, 200, 500, 750, 1000, 1500];

console.log('Avvio bot...');

var connection = mysql.createConnection({
	host: config.dbhost,
	user: config.dbuser,
	password: config.dbpassword,
	database: config.dbdatabase
});
connection.connect();

var connection_sync = new mysql_sync({
	host: config.dbhost,
	user: config.dbuser,
	password: config.dbpassword,
	database: config.dbdatabase
});

process.on('SIGINT', function() {
	console.log("Spegnimento bot...");
	connection.end();
	process.exit();
});

process.on('SIGTERM', function() {
	console.log("Spegnimento bot...");
	connection.end();
	process.exit();
});

bot.on('polling_error', function(error) {
	console.log(error);
});

var mergeMessages = [];

bot.on('edited_message', function (message) {
	connection.query('SELECT always, compact FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length > 0) {
			if (rows[0].compact == 1) {
				if ((mergeMessages[message.chat.id] != undefined) && (mergeMessages[message.chat.id] != "")){
					if (mergeMessages[message.chat.id].split(";")[0] == message.from.id){
						var lastIdx = mergeMessages[message.chat.id].lastIndexOf(";");
						mergeMessages[message.chat.id] = mergeMessages[message.chat.id].substr(0, lastIdx+1);
						mergeMessages[message.chat.id] += message.text;
					}
				}
			}
		}
	});
});

bot.on('message', function (message) {
	if (message.text != undefined) {		
		if (message.text.startsWith("/"))
			console.log(getNow("it") + " - " + message.from.username + ": " + message.text);

		if ((message.from.id != 20471035) && (message.chat.id == -1001097316494)){
			if (!message.text.startsWith("Negozio di")) {
				var time = Math.round((Date.now()+ms("7 days"))/1000);
				bot.kickChatMember(message.chat.id, message.from.id, {until_date: time}).then(function (result) {
					bot.sendMessage(message.chat.id, message.from.username + ", non puoi scrivere in questo gruppo, sei stato bannato per 7 giorni.");
					bot.sendMessage(message.from.id, "Sei stato bannato dal gruppo Loot Negozi per 7 giorni perchè non hai postato un negozio");
				});
				bot.deleteMessage(message.chat.id, message.message_id).then(function (result) {
					if (result != true)
						console.log("Errore cancellazione messaggio " + message.chat.id + " " + message.message_id);
				});
			}else{
				connection.query('INSERT INTO plus_history (account_id) VALUES (' + message.from.id + ')', function (err, rows, fields) {
					if (err) throw err;
					connection.query('SELECT id FROM plus_history WHERE account_id = ' + message.from.id + " ORDER BY id DESC LIMIT 2", function (err, rows, fields) {
						if (err) throw err;

						if (Object.keys(rows).length > 1) {
							if (rows[0].id-rows[1].id < 10){
								bot.kickChatMember(message.chat.id, message.from.id).then(function (result) {
									bot.sendMessage(message.chat.id, message.from.username + ", hai postato un negozio troppo vicino all'ultimo, sei stato kickato.");
									bot.sendMessage(message.from.id, "Sei stato kickato dal gruppo Loot Negozi perchè hai postato un negozio troppo vicino all'ultimo");
									bot.unbanChatMember(message.chat.id, message.from.id);
								});
								bot.deleteMessage(message.chat.id, message.message_id).then(function (result) {
									if (result != true)
										console.log("Errore cancellazione messaggio " + message.chat.id + " " + message.message_id);
								});
							}else{
								connection.query('DELETE FROM plus_history WHERE account_id = ' + message.from.id + ' AND id != ' + rows[0].id, function (err, rows, fields) {
									if (err) throw err;
								});
							}
						}
					});
				});
			}
		}
		if (message.text.toLowerCase().indexOf("errore:") != -1){
			if (message.text.toLowerCase().indexOf("#arena") == -1)
				bot.sendMessage("@lnotify", "#Mtproto " + message.from.username + ": " + message.text);
		}
	}

	if (message.chat.id < 0) {
		connection.query('SELECT chat_id FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0) {
				bot.getChatMembersCount(message.chat.id).then(function (cnt) {
					connection.query('INSERT INTO plus_groups (name, chat_id, members) VALUES ("' + connection.escape(message.chat.title) + '","' + message.chat.id + '",' + cnt + ')', function (err, rows, fields) {
						if (err) throw err;
						console.log("Gruppo aggiunto: " + message.chat.title);
					});
				});
			} else {
				bot.getChatMembersCount(message.chat.id).then(function (cnt) {
					var d = new Date();
					var long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

					message.chat.title = message.chat.title.replace(/[^\w\s]/gi, '');

					connection.query('UPDATE plus_groups SET name = "' + message.chat.title + '", members = ' + cnt + ', last_update = "' + long_date + '" WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
						if (err) throw err;
					});
				});
			}
		});
		connection.query('SELECT always, compact FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
			if (err) throw err;

			if (message.new_chat_members != undefined) {
				if (message.new_chat_member.is_bot == 0)
					checkStatus(message, message.new_chat_member.username, message.new_chat_member.id, 0);
			}else{
				if (Object.keys(rows).length > 0) {
					if (rows[0].always == 1) {
						if (message.from.is_bot == 0)
							checkStatus(message, message.from.username, message.from.id, 1);
					}
					if (rows[0].compact == 1) {
						if ((message.from.is_bot == 0) && (message.text != undefined)){
							if ((message.reply_to_message == undefined) && (!message.text.startsWith("/")) && (message.forward_from == undefined)){
								if ((mergeMessages[message.chat.id] != undefined) && (mergeMessages[message.chat.id] != "")){
									if (mergeMessages[message.chat.id].split(";")[0] == message.from.id){
										bot.deleteMessage(message.chat.id, mergeMessages[message.chat.id].split(";")[1]);
										bot.deleteMessage(message.chat.id, message.message_id);
										var newText = mergeMessages[message.chat.id].split(";")[2] + "\n" + message.text;
										bot.sendMessage(message.chat.id, "@" + message.from.username + " <i>scrive</i>:\n" + newText, html).then(function (data) {
											mergeMessages[message.chat.id] = message.from.id + ";" + data.message_id + ";" + newText;
										});
									} else
										mergeMessages[message.chat.id] = message.from.id + ";" + message.message_id + ";" + message.text;
								} else
									mergeMessages[message.chat.id] = message.from.id + ";" + message.message_id + ";" + message.text;
							}else
								mergeMessages[message.chat.id] = "";	// ignora le risposte, i comandi e gli inoltri
						}else
							mergeMessages[message.chat.id] = "";	// ignora i bot
					}
				}
			}
		});
	}

	if (message.from.username != undefined){
		connection.query('SELECT account_id FROM plus_players WHERE account_id = ' + message.from.id, function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0) {
				connection.query('INSERT INTO plus_players (account_id, nickname) VALUES (' + message.from.id + ',"' + message.from.username + '")', function (err, rows, fields) {
					if (err) throw err;
					console.log(message.from.username + " aggiunto");
				});
			}else{
				connection.query('SELECT real_name, gender FROM player WHERE account_id = "' + message.from.id + '"', function (err, rows, fields) {
					if (err) throw err;

					if (Object.keys(rows).length > 0) {
						if ((rows[0].real_name == null) || (rows[0].gender == null)){
							connection.query('UPDATE plus_players SET nickname = "' + message.from.username + '" WHERE account_id = ' + message.from.id, function (err, rows, fields) {
								if (err) throw err;
							});
						}else{
							connection.query('UPDATE plus_players SET nickname = "' + message.from.username + '", gender = "' + rows[0].gender + '", real_name = "' + rows[0].real_name + '" WHERE account_id = ' + message.from.id, function (err, rows, fields) {
								if (err) throw err;
							});
						}
					}
				});
			}
		});
	}
});

function cutText(text) {
	var len = Object.keys(text).length;
	if (len > 20) {
		var start = text.substring(0, 8);
		var end = text.substring(len - 8, len);

		text = start + "..." + end;
	}
	return text;
}

function checkSpam(message) {
	var isOk = true;
	if (timevarSpam[message.from.id] != undefined) {
		diff = new Date() / 1000 - timevarSpam[message.from.id];
		if (diff < 1) {
			console.log("SPAM Utente " + message.from.username + " - " + diff);
			isOk = false;
		}
	}
	timevarSpam[message.from.id] = Math.round(new Date() / 1000);

	return isOk;
}

function checkFlood(message) {
	var isOk = true;
	if (timevarFlood[message.from.id] != undefined) {
		diff = new Date() / 1000 - timevarFlood[message.from.id];
		if (diff < 0.4) {
			console.log("FLOOD Utente " + message.from.username + " - " + diff);
			isOk = false;
		}
	}
	timevarFlood[message.from.id] = Math.round(new Date() / 1000);

	return isOk;
}

/* abilitare da botfather in caso
bot.on("chosen_inline_result", function (query) {
	console.log(query);
});
*/

bot.on("inline_query", function (query) {
	var code = parseInt(query.query);

	if ((code == "") || (isNaN(code))) {
		return;
	}

	connection.query('SELECT public_shop.id, quantity, item.name, price, player_id, massive FROM public_shop, item WHERE item.id = item_id AND code = ' + code, function (err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0) {
			return;
		}

		var iKeys = [];
		var name = "";
		var total_qnt = 0;
		var total_price = 0;
		for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
			name = cutText(rows[i].name);
			iKeys.push([{
				text: name + " (" + rows[i].quantity + ") - " + formatNumber(rows[i].price) + " §",
				callback_data: rows[i].id.toString()
			}]);
			total_qnt += parseInt(rows[i].quantity);
			total_price += parseInt(rows[i].price*rows[i].quantity);
		}

		if (rows[0].massive == 1){
			iKeys.push([{
				text: "💰 Compra tutto - " + formatNumber(total_price) + " §",
				callback_data: "all:" + code.toString()
			}]);
		}

		iKeys.push([{
			text: "♻️ Aggiorna",
			callback_data: "update:" + code.toString()
		}]);

		connection.query('SELECT nickname FROM player WHERE id = ' + rows[0].player_id, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				return;
			}

			var text = "Negozio di " + rows[0].nickname + "!";
			var desc = total_qnt + " oggetti in vendita";

			bot.answerInlineQuery(query.id, [{
				id: '0',
				type: 'article',
				title: 'Pubblica Negozio',
				description: desc,
				message_text: text,
				reply_markup: {
					inline_keyboard: iKeys
				}
			}]);
		});
	});
});

var mark = {
	parse_mode: "Markdown"
};

var html = {
	parse_mode: "HTML",
	disable_web_page_preview: true
};

callNTimes(60000, function () {
	checkLottery();
	checkAuction();
	checkShop();
	checkShopNotification();
	checkMarket();
	checkMarketDirect();
});

bot.onText(/^\/start/, function (message) {
	bot.sendMessage(message.chat.id, "Questo è un bot di supporto a @lootgamebot, è utile nei gruppi. Scrivi / per visualizzare tutti i comandi disponibili!");
});

bot.onText(/^\/comandigiocatore/, function (message) {
	bot.sendMessage(message.chat.id, 	"*Comandi disponibili per il giocatore*\n" +
					"/giocatore - Mostra la scheda giocatore\n" +
					"/zaino - Mostra gli oggetti contenuti nello zaino\n" +
					"/oggetto - Mostra i dettagli di un oggetto posseduto\n" +
					"/oggetti - Mostra i dettagli di più oggetti posseduti\n" +
					"/scrigni - Mostra gli scrigni posseduti\n" +
					"/valorezaino - Mostra il valore complessivo degli oggetti posseduti\n" +
					"/gruzzolo - Mostra le monete possedute\n" +
					"/creazioni - Mostra i punti creazione ottenuti\n" +
					"/spia - Spia un giocatore mostrando la scheda giocatore\n" +
					"/ispeziona - Ispeziona un giocatore", mark);
});

bot.onText(/^\/comandioggetto/, function (message) {
	bot.sendMessage(message.chat.id, 	"*Comandi disponibili per gestire gli oggetti*\n" +
					"/necessari - Mostra gli oggetti necessari alla creazione di un creabile\n" +
					"/prezzo - Mostra gli ultimi prezzi di vendita di un oggetto\n" +
					"/totale - Mostra gli ultimi prezzi utilizzando i prezzi degli oggetti utilizzati per crearlo\n" +
					"/ricerca - Cerca l'oggetto nei canali di vendita", mark);
});

bot.onText(/^\/comandilotteria/, function (message) {
	bot.sendMessage(message.chat.id, 	"*Comandi disponibili per gestire le lotterie*\n" +
					"/statolotteria - Mostra lo stato di una lotteria\n" +
					"/crealotteria - Permette di creare una lotteria con iscrizione gratuita\n" +
					"/crealotteriap - Permette di creare una lotteria con iscrizione a pagamento\n" +
					"/lotteria - Iscrive alla lotteria con iscrizione gratuita\n" +
					"/lotteriap - Iscrive alla lotteria con iscrizione a pagamento\n" +
					"/dlotteria - Disiscrive dalla lotteria con iscrizione gratuita\n" +
					"/dlotteriap - Disiscrive dalla lotteria con iscrizione a pagamento\n" +
					"/lotterie - Mostra tutte le lotterie disponibili\n" +
					"/estrazione - Forza l'estrazione di una lotteria\n" +
					"/cancellalotteria - Elimina una lotteria in corso", mark);
});

bot.onText(/^\/comandiasta/, function (message) {
	bot.sendMessage(message.chat.id, 	"*Comandi disponibili per gestire le aste*\n" +
					"/statoasta - Mostra lo stato di un'asta\n" +
					"/creaasta - Permette di creare un'asta\n" +
					"/pubblicaasta - Permette di pubblicare l'asta con i relativi pulsanti\n" +
					"/asta - Iscrive ad un'asta\n" +
					"/aste - Mostra tutte le aste disponibili\n" +
					"/cancellaasta - Elimina un'asta in corso", mark);
});

bot.onText(/^\/comandinegozio/, function (message) {
	bot.sendMessage(message.chat.id, 	"*Comandi disponibili per gestire i negozi*\n" +
					"/negozio - Crea un negozio per la vendita di oggetti\n" +
					"/privacy - Modifica la privacy del negozio da pubblico a privato e vice versa\n" +
					"/massivo - Modifica la possibilità di acquistare in modo massivo dal negozio\n" +
					"/negozioa - Permette di aggiungere oggetti al negozio\n" +
					"/negozior - Permette di rimuovere oggetti dal negozio\n" +
					"/negoziom - Permette di modificare oggetti inseriti nel negozio\n" +
					"/negoziou - Permette di prolungare la scadenza del negozio\n" +
					"/negozi - Mostra tutti i propri negozi disponibili\n" +
					"/cancellanegozio - Elimina il negozio", mark);
});

bot.onText(/^\/comandicommercio/, function (message) {
	bot.sendMessage(message.chat.id, 	"*Comandi disponibili per commerciare*\n" +
					"/offri - Crea una vendita riservata verso un altro giocatore\n" +
					"/accettav - Acetta una vendita riservata\n" +
					"/rifiutav - Rifiuta una vendita riservata\n" +
					"/scambia - Crea uno scambio riservato verso un altro giocatore\n" +
					"/accettas - Accetta lo scambio riservato\n" +
					"/rifiutas - Rifiuta lo scambio riservato\n" +
					"/paga - Invia monete ad un altro giocatore", mark);
});

bot.onText(/^\/comanditeam/, function (message) {
	bot.sendMessage(message.chat.id, 	"*Comandi disponibili per i team*\n" +
					"/chiamaparty - Invia un messaggio taggando tutti i membri del proprio party (escluso il chiamante)\n" +
					"/chiamaparty<numero> - Invia un messaggio taggando tutti i membri del party <numero> (solo per amministratori)\n" +
					"/votaparty - Invia un messaggio taggando solo i membri del proprio party che devono ancora votare\n" +
					"/scalata - Invia un messaggio taggando solo i membri del team che devono ancora attaccare il boss attuale", mark);
});

bot.onText(/^\/comandigenerali/, function (message) {
	bot.sendMessage(message.chat.id, 	"*Comandi generali*\n" +
					"/ping - Verifica se il bot è online\n" +
					"/statistiche - Mostra le statistiche di Loot Bot\n" +
					"/scuola - Mostra un link per accedere al gruppo scuola\n" +
					"/gruppi - Mostra tutti i gruppi pubblici\n" +
					"/mercatini - Mostra i mercatini degli utenti\n" +
					"/comandigruppo - Mostra i comandi per gestire gli utenti nei gruppi\n" +
					"/token - Permette di ottenere un token per accedere alle Loot Bot API\n" +
					"/notifiche - Permette di disattivare le notifiche di una particolare sezione del bot\n" +
					"/calcola - Gestisce calcoli anche avanzati utilizzando funzioni (in inglese)", mark);
});

bot.onText(/^\/calcola (.+)|^\/calcola/, function (message, match) {

	if (match[1] == undefined){
		bot.sendMessage(message.chat.id, "Inserisci un operazione da risolvere. Esempio: /calcola 1+2");
		return;
	}

	//var evalValue = match[1].replace(/[^\-\+\/\*\^\(\)x0-9]/g, "");
	var evalValue = match[1];
	try {
		var result = math.eval(evalValue);
		bot.sendMessage(message.chat.id, "Risultato: " + result);
	} catch(error) {
		bot.sendMessage(message.chat.id, "Errore: " + error.message);
		console.error("Errore calcola: " + error.message);
	}
});

bot.onText(/^\/birra/, function (message) {
	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;
		var money = rows[0].money;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		if (money < 100) {
			bot.sendMessage(message.chat.id, "Non puoi permetterti nemmeno una birra >_>");
		} else {
			connection.query('UPDATE player SET money = money-100 WHERE id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				bot.sendMessage(message.chat.id, "🍺");
			});
			connection.query('UPDATE config SET food = food+1', function (err, rows, fields) {
				if (err) throw err;
			});
		}
	});
});

bot.onText(/^\/pollo/, function (message) {
	bot.sendMessage(message.chat.id, "🐓");
})

bot.onText(/^\/marketban (.+)/, function (message, match) {
	match[1] = match[1].replace("@", "");
	if (message.from.id == 20471035) {
		connection.query('SELECT id, market_ban, nickname, id, account_id FROM player WHERE nickname = "' + match[1] + '"', function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, "Non ho trovato nessun utente con quel nickname.");
				return;
			}

			if (rows[0].market_ban == 0) {
				connection.query('UPDATE player SET market_ban = 1 WHERE id = ' + rows[0].id, function (err, rows, fields) {
					if (err) throw err;
				});

				bot.sendMessage(message.chat.id, rows[0].nickname + " bannato dal mercato.");
			} else {
				connection.query('UPDATE player SET market_ban = 0 WHERE id = ' + rows[0].id, function (err, rows, fields) {
					if (err) throw err;
				});

				bot.sendMessage(message.chat.id, rows[0].nickname + " sbannato dal mercato.");
			}
		});
	};
});

bot.onText(/^\/([0-9]+)+birre$/, function (message, match) {

	match[1] = parseInt(match[1]);
	if (match[1] < 1)
		match[1] = 1;

	if (message.from.id != 20471035) {
		if (match[1] > 10) {
			bot.sendMessage(message.chat.id, "nope.");
			return;
		}
	}

	var t = "";
	for (var i = 0; i < match[1]; i++) {
		t += "🍺";
	}

	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;
		var money = rows[0].money;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		if (money < (100 * match[1])) {
			bot.sendMessage(message.chat.id, "Non puoi permetterti tutte queste birre >_>");
		} else {
			connection.query('UPDATE player SET money = money-' + (100 * match[1]) + ' WHERE id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				bot.sendMessage(message.chat.id, t);
			});

			connection.query('UPDATE config SET food = food+' + match[1], function (err, rows, fields) {
				if (err) throw err;
			});
		};
	});
});

bot.onText(/^\/duebirre/, function (message) {
	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;
		var money = rows[0].money;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		if (money < 200) {
			bot.sendMessage(message.chat.id, "Non puoi permetterti nemmeno una birra >_>");
		} else {
			connection.query('UPDATE player SET money = money-200 WHERE id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				bot.sendMessage(message.chat.id, "🍻");
			});
			connection.query('UPDATE config SET food = food+2', function (err, rows, fields) {
				if (err) throw err;
			});
		}
	});
});

bot.onText(/^\/popcorn/, function (message) {
	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;
		var money = rows[0].money;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		if (money < 100) {
			bot.sendMessage(message.chat.id, "Il flame potrai godertelo un'altra volta...");
		} else {
			connection.query('UPDATE player SET money = money-100 WHERE id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				bot.sendMessage(message.chat.id, "🍿");
			});
			connection.query('UPDATE config SET food = food+1', function (err, rows, fields) {
				if (err) throw err;
			});
		}
	});
});

bot.onText(/^\/ovetto/, function (message) {
	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;
		var money = rows[0].money;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		if (money < 100) {
			bot.sendMessage(message.chat.id, "Ma che bello cucinare senza comprare le uova :>");
		} else {
			connection.query('UPDATE player SET money = money-100 WHERE id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				bot.sendMessage(message.chat.id, "🍳");
			});
			connection.query('UPDATE config SET food = food+1', function (err, rows, fields) {
				if (err) throw err;
			});
		}
	});
});

bot.onText(/^\/salmone/, function (message) {
	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;
		var money = rows[0].money;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		if (money < 100) {
			bot.sendMessage(message.chat.id, "Nemmeno due spicci per un piccolo salmone :c");
		} else {
			connection.query('UPDATE player SET money = money-100 WHERE id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				bot.sendMessage(message.chat.id, "🐟");
			});
			connection.query('UPDATE config SET food = food+1', function (err, rows, fields) {
				if (err) throw err;
			});
		}
	});
});

bot.onText(/^\/whisky/, function (message) {
	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;
		var money = rows[0].money;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		if (money < 100) {
			bot.sendMessage(message.chat.id, "Vorresti eh, ubriacone");
		} else {
			connection.query('UPDATE player SET money = money-100 WHERE id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				bot.sendMessage(message.chat.id, "🥃");
			});
			connection.query('UPDATE config SET food = food+1', function (err, rows, fields) {
				if (err) throw err;
			});
		}
	});
});

bot.onText(/^\/cibi/, function (message) {
	connection.query('SELECT food FROM config', function (err, rows, fields) {
		if (err) throw err;
		bot.sendMessage(message.chat.id, "Sono stati acquistati " + formatNumber(rows[0].food) + " cibi per un totale di " + formatNumber(rows[0].food * 100) + " §!");
	});
});

bot.onText(/^\/gban ([^\s]+) (.+)|^\/gban/, function (message, match) {
	if (message.from.id == 20471035) {

		if (match[1] == undefined) {
			if (message.reply_to_message != undefined) {
				match[1] = message.reply_to_message.from.username;
			}else{
				bot.sendMessage(message.chat.id, "Sintassi: /gban nickname motivo (ban dal gioco, anche in risposta)");
				return;
			}
		}

		if (match[2] == undefined) {
			match[2] == "...";
		}

		connection.query('SELECT nickname, id, account_id FROM player WHERE nickname = "' + match[1].replace("@", "") + '"', function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, "Non ho trovato nessun utente con quel nickname.");
				return;
			}

			var nick = rows[0].nickname;
			var account_id = rows[0].account_id;

			connection.query('INSERT INTO banlist (account_id, reason) VALUES (' + rows[0].account_id + ',"' + match[2] + '")', function (err, rows, fields) {
				if (err) throw err;
			});

			connection.query('DELETE FROM public_shop WHERE player_id = ' + rows[0].id, function (err, rows, fields) {
				if (err) throw err;
			});
			connection.query('UPDATE player SET market_ban = 1, boss_id = NULL, mission_party = 0 WHERE id = ' + rows[0].id, function (err, rows, fields) {
				if (err) throw err;
			});
			connection.query('DELETE FROM team_player WHERE player_id = ' + rows[0].id, function (err, rows, fields) {
				if (err) throw err;
			});
			connection.query('UPDATE token SET token = NULL, status = "REVOKED" WHERE player_id = ' + rows[0].id, function (err, rows, fields) {
				if (err) throw err;
			});
			connection.query('DELETE FROM mission_team_party_player WHERE player_id = ' + rows[0].id, function (err, rows, fields) {
				if (err) throw err;
			});

			bot.kickChatMember(message.chat.id, account_id).then(function (result) {
				bot.sendMessage(message.chat.id, nick + " (" + account_id + ") bannato da chat e game.");
			});
		});
	};
});

bot.onText(/^\/gb (.+)|^\/gb$/, function (message, match) {
	if (message.chat.id > 0)
		return;

	if (match[1] == undefined) {
		if (message.reply_to_message != undefined) {
			match[1] = message.reply_to_message.from.username;
		}else{
			bot.sendMessage(message.chat.id, "Sintassi: /gb nickname (ban dai gruppi)");
			return;
		}
	}

	var chat_id = message.chat.id;
	if ((chat_id == "-1001069842056") || (chat_id == "-1001064571576") || (chat_id == "-1001050459665") || (chat_id == "-1001064797183") || (chat_id == "-1001097316494")) {
		bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
			if ((data.status == "creator") || (data.status == "administrator")) {				
				connection.query('SELECT nickname, id, account_id, group_ban FROM player WHERE nickname = "' + match[1].replace("@", "") + '"', function (err, rows, fields) {
					if (err) throw err;

					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, "Non ho trovato nessun utente con quel nickname.");
						return;
					}

					var nick = rows[0].nickname;
					var account_id = rows[0].account_id;

					if (rows[0].group_ban == 0) {
						connection.query('UPDATE player SET group_ban = 1 WHERE id = ' + rows[0].id, function (err, rows, fields) {
							if (err) throw err;
						});
						bot.sendMessage(message.chat.id, nick + " (" + account_id + ") bannato dai gruppi.");

						connection.query("SELECT chat_id FROM plus_groups WHERE groupban = 1", function (err, rows, fields) {
							if (err) throw err;

							for (i = 0; i < Object.keys(rows).length; i++) {
								bot.kickChatMember(rows[i].chat_id, account_id);
							}
						});
					} else {
						if (chat_id == "-1001064797183"){
							connection.query('UPDATE player SET group_ban = 0 WHERE id = ' + rows[0].id, function (err, rows, fields){
								if (err) throw err;
							});
							bot.sendMessage(message.chat.id, nick + " (" + account_id + ") sbannato dai gruppi.");

							connection.query("SELECT chat_id FROM plus_groups WHERE groupban = 1", function (err, rows, fields) {
								if (err) throw err;

								for (i = 0; i < Object.keys(rows).length; i++) {
									bot.unbanChatMember(rows[i].chat_id, account_id);
								}
							});
						}
					}
				});
			};
		});
	}
});

bot.onText(/^\/det (.+)/, function (message, match) {
	var nick = match[1];

	if (message.from.id == 20471035) {
		connection.query('SELECT * FROM player WHERE nickname = "' + nick + '"', function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0) {
				bot.sendMessage(message.chat.id, JSON.stringify(rows, null, 4));
			} else {
				bot.sendMessage(message.chat.id, "Boh!");
			}
		});
	}
});

bot.onText(/^\/chatid/, function (message, match) {
	bot.sendMessage(message.chat.id, message.chat.id);
});

bot.onText(/^\/last (.+)/, function (message, match) {
	var nick = match[1];

	if (message.from.id == 20471035) {
		connection.query('SELECT time FROM last_command, player WHERE last_command.account_id = player.account_id AND player.nickname = "' + nick + '"', function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0) {
				var d = new Date(rows[0].time);
				var long_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds()) + " " + addZero(d.getDate()) + "/" + addZero(d.getMonth()+1) + "/" + d.getFullYear();
				bot.sendMessage(message.chat.id, long_date);
			} else {
				bot.sendMessage(message.chat.id, "Boh!");
			}
		});
	};
});

bot.onText(/^\/ping/, function (message, match) {
	bot.sendMessage(message.chat.id, "_Pong_", mark);
});

bot.onText(/^\/pinfo (.+)/, function (message, match) {
	if (message.from.id != 20471035){
		return;
	}
	connection.query('SELECT * FROM plus_players WHERE nickname = "' + match[1] + '"', function (err, rows, fields) {
		if (err) throw err;
		bot.sendMessage(message.from.id, "<b>ID Account:</b> " + rows[0].account_id + "\n<b>Nome utente:</b> " + rows[0].nickname + "\n<b>Ultimo comando:</b> " + toDate("it", rows[0].last_update) + "\n<b>Nome e sesso:</b> " + rows[0].real_name + " (" + rows[0].gender + ")", html);
	});
});

bot.onText(/^\/info$/, function (message) {
	var reply = "";

	if (message.reply_to_message != undefined) {
		var date2 = new Date(message.reply_to_message.date * 1000);
		reply = "\n*REPLY TO*\n" +
			"Message ID: " + message.reply_to_message.message_id + "\n" +
			"User ID: " + message.reply_to_message.from.id + "\n" +
			"User Name: " + message.reply_to_message.from.first_name + "\n" +
			"User @: " + message.reply_to_message.from.username + "\n" +
			"Chat ID: " + message.reply_to_message.chat.id + "\n" +
			"Chat Name: " + ((message.reply_to_message.chat.first_name == undefined) ? "???" : message.reply_to_message.chat.first_name) + "\n" +
			"Chat @: " + ((message.reply_to_message.chat.username == undefined) ? "???" : message.reply_to_message.chat.username) + "\n" +
			"Chat Type: " + message.reply_to_message.chat.type + "\n" +
			"Date: " + toDate("it", date2);
	}

	var date = new Date(message.date * 1000);
	bot.sendMessage(message.chat.id, "Message ID: " + message.message_id + "\n" +
					"User ID: " + message.from.id + "\n" +
					"User Name: " + message.from.first_name + "\n" +
					"User @: " + message.from.username + "\n" +
					"Chat ID: " + message.chat.id + "\n" +
					"Chat Name: " + ((message.chat.first_name == undefined) ? "???" : message.chat.first_name) + "\n" +
					"Chat @: " + ((message.chat.username == undefined) ? "???" : message.chat.username) + "\n" +
					"Chat Type: " + message.chat.type + "\n" +
					"Date: " + toDate("it", date) + "\n" + reply, mark);
});

function toDate(lang, d) {
	if (lang == "it") {
		var datetime = addZero(d.getDate()) + "/" + addZero(d.getMonth() + 1) + "/" + d.getFullYear() + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
	} else if (lang == "en") {
		var datetime = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
	} else {
		var datetime = "Lingua non specificata";
	}
	return datetime;
}

bot.onText(/\/printsticker/, function (message) {
	bot.getStickerSet("Rango_v2").then(function (data) {
		console.log(data.stickers);
	});
});

bot.onText(/^\/gruppi/, function (message) {
	bot.getChatMembersCount(-1001069842056).then(function (data) {
		var c1 = data; //taverna
		console.log("Next Mercato");

		bot.getChatMembersCount(-1001064571576).then(function (data) {
			var c2 = data; //mercato
			console.log("Next Lotteria");

			bot.getChatMembersCount(-1001087936894).then(function (data) {
				var c3 = data; //lootteria
				console.log("Next Flame");

				bot.getChatMembersCount(-1001078754923).then(function (data) {
					var c4 = data; //flame
					console.log("Next Scuola")

					bot.getChatMembersCount(-1001086845014).then(function (data) {
						var c6 = data; //scuola
						console.log("Next Notturno");

						bot.getChatMembersCount(-1001075644786).then(function (data) {
							var c8 = data; //notturno
							console.log("Next Scommesse");

							bot.getChatMembersCount(-1001124038417).then(function (data) {
								var c9 = data; //scommesse
								console.log("Next Contrabbandiere");

								bot.getChatMembersCount(-1001123874487).then(function (data) {
									var c10 = data; //contrabbando
									console.log("Next Raffles");

									bot.getChatMembersCount(-1001131584245).then(function (data) {
										var c11 = data; //raffles
										console.log("Next Negozi");

										bot.getChatMembersCount(-1001097316494).then(function (data) {
											var c12 = data; //negozi
											console.log("Next Test");

											bot.getChatMembersCount(-1001050459665).then(function (data) {
												var c13 = data; //testi
												console.log("Next Gelateria");

												bot.getChatMembersCount(-1001127554674).then(function (data) {
													var c14 = data; //gelateria
													console.log("Next Ade");

													bot.getChatMembersCount(-1001214216152).then(function (data) {
														var c16 = data; //ade
														console.log("Next Music");

														bot.getChatMembersCount(-1001167682606).then(function (data) {
															var c17 = data; //music

															if (message.chat.id < 0)
																bot.sendMessage(message.chat.id, "_Messaggio inviato in privato_", mark);

															bot.sendMessage(message.from.id, "<b>Ufficiali</b>\n" +
																			"Canale principale per aggiornamenti: @LootBotAvvisi\n" +

																			"\n<b>Bot</b>\n" +
																			"Liste oggetti e alberi automatici: @craftlootbot\n" +
																			"Qualcuno sempre a disposizione: @OracoloLootBot\n" +
																			"Calcolo Loot Combat Rating: @lootcrbot\n" +
																			"Tool per mercato e cronologie: @ToolsForLootBot\n" +
																			"Quotazioni oggetti in tempo reale: @Loot_Quotes_Bot\n" +
																			"@DichisUtilityBot\n" +

																			"\n<b>Altro</b>\n" +
																			"<a href='https://discord.gg/ea5tSEj'>Canale Discord</a>\n" +
																			"<a href='telegra.ph/Mini-Guida-alle-LootBot-API-11-24'>LootBot Api</a>\n" +

																			"\n<b>Siti</b>\n" +
																			"<a href='http://beegotsy.altervista.org/lootbot/'>#SonoPoveroFaccioGuide</a> - Materiali necessari, guida, e altre funzionalità in sviluppo\n" +

																			"\n<b>Gruppi</b>\n" +
																			"<a href='https://telegram.me/joinchat/AThc-z_EfojvcE8mbGw1Cw'>Taverna</a> (" + c1 + ") - Di tutto un po'\n" +
																			"<a href='https://telegram.me/joinchat/AThc-z90Erh4M2O8Mk5QLw'>Mercato</a> (" + c2 + ") - Solo scambi!\n" +
																			"<a href='https://telegram.me/joinchat/AThc-z6cvhH-w2JWq9Ioew'>Testi Missioni</a> (" + c13 + ") - Proponi testi!\n" +
																			"<a href='https://telegram.me/joinchat/AThc-0FnuI5vlb4Hm53W_w'>Negozi</a> (" + c12 + ") - Solo i vostri negozi!\n" +
																			"<a href='https://t.me/joinchat/Dl2UwEDYmX6z5jf7vHhG9Q'>Lootteria</a> (" + c3 + ") - Riservato alle Lotterie\n" +
																			"<a href='https://t.me/joinchat/AAAAAEBMfmv2x_z3vAVNeg'>Loot Flame</a> (" + c4 + ") - Nessun filtro, solo flame\n" +
																			"@LootNotturno (" + c8 + ") - Per i giocatori notturni (Livello minimo: 15)\n" +
																			"<a href='https://telegram.me/joinchat/EXFobEDH8FbDpQ4MTmw-mQ'>LootBot School</a> (" + c6 + ") - Impara le basi del gioco per iniziare con una marcia in più!\n" +
																			"@LootScommesse (" + c9 + ") - Scommetti sul contenuto degli scrigni\n" +
																			"<a href='https://t.me/joinchat/DOs98UL89rdYL_PFGukbJw'>Vicolo del Contrabbando</a> (" + c10 + ") - Chiedi aiuto per le richieste del contrabbandiere!\n" +
																			"<a href='https://t.me/joinchat/AAAAAEM1HnIQeWI32RwzXw'>Gelateria</a> (" + c14 + ") - Gruppo OT con tanto di gelato (Livello minimo: 10)\n" +
																			"<a href='https://t.me/joinchat/CXTRTAtsjVG_AhJb3FjW5w'>Gruppo Scommesse 2</a> Gruppo ignorante dove arriverai a giocarti la casa a dadi e il cagnolino a testa o croce\n" +
																			"<a href='https://t.me/joinchat/B0siAkhfd9ieAbo1PyL3zA'>Ade's Mappers</a> (" + c16 + ") - Gruppo creato allo scopo di aiutarsi per le mappe dei dungeon di loot!\n" +
																			"<a href='https://t.me/joinchat/EDP-JUWZbC6SZ-f0ieaoLg'>Loot Music</a> (" + c17 + ") - La musica ed il diverimento di Lootia!\n" +

																			"\n<b>Canali</b>\n" +
																			"@wikilootbot - Guide essenziali e mirate per iniziare a giocare a Loot Bot!\n" +
																			"@LootBotPolls - Sondaggi su qualsiasi cosa inerente a Loot!\n" +
																			"@LootReport - Segnala un comportamento scorretto nella community!\n" +
																			"@YellowBetsLoot - YellowPlay for YellowWin\n" +
																			"@yellowlootshop - Join for eventi free!\n" +

																			"\nVisita anche /mercatini. Per comparire qua chiedi all'amministratore.", html);
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});
});

bot.onText(/^\/mercatini/, function (message) {
	if (message.chat.id < 0)
		bot.sendMessage(message.chat.id, "_Messaggio inviato in privato_", mark);

	bot.sendMessage(message.from.id, "<b>Valutazione Mercatini</b>\n@lootadvisor\n\n" +
					"<b>Mercatini</b>\n" +
					"@LEMPORIOdiLootbot - Il primo negozio di Loot!\n" +
					"@fancazzisti_shop - Vendita oggetti per grandi, piccini e poveri\n" +
					"@SoloCoseBellee - Prezzi belli per veri poverelli!\n" +
					"@LootTatori - Store per veri Guerrieri!\n" +
					"@dogestore - Such Prices! So Cheap! Much Items! #DogeCraft\n" +
					"@lootspar - il risparmio è dietro l'angolo\n" +
					"@AngoloRottureLootBot - Tutte le rarità a basso costo!\n" +
					"@roomlootbot - Un mercatino che sembra una stanza!\n" +
					"@Zaino_Dell_Imperatore - Prezzi basati sul bot Loot Quotazioni!\n" +
					"@paupershop - Un negozio di LootBot per poveri\n" +
					"@mercaloot - Negozio Honesto\n" +
					"@EdicolaDiLootia - Sempre più conveniente 👍\n" +

					"\nVisita anche /gruppi. Per comparire qua chiedi all'amministratore.", html);
});

bot.onText(/^\/chiamaparty$/, function (message, match) {

	if (!checkSpam(message))
		return;

	if (message.chat.id > 0){
		bot.sendMessage(message.from.id, "Questo comando può essere usato solo nei gruppi");
		return;
	}

	connection.query('SELECT team_id, party_id, player_id FROM mission_team_party_player WHERE player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0){
			bot.sendMessage(message.from.id, "Non sei in team o in un party");
			return;
		}

		var party_id = rows[0].party_id;
		var team_id = rows[0].team_id;
		var player_id = rows[0].player_id;

		connection.query('SELECT wait, assigned_to FROM mission_team_party WHERE party_id = ' + party_id + ' AND team_id = ' + team_id, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0){
				console.log("Errore party");
				return;	
			}

			connection.query('SELECT P.nickname FROM mission_team_party_player T, player P WHERE T.player_id = P.id AND T.party_id = ' + party_id + ' AND T.team_id = ' + team_id + ' AND P.id != ' + player_id, function (err, rows, fields) {
				if (err) throw err;

				var nicklist = "";

				for (i = 0; i < Object.keys(rows).length; i++)
					nicklist += "@" + rows[i].nickname + " ";

				bot.sendMessage(message.chat.id, "<b>" + message.from.username + "</b> chiama i suoi compagni di party!\n" + nicklist, html);
			});
		});
	});
});

bot.onText(/^\/chiamaparty([0-9])$/, function (message, match) {

	if (!checkSpam(message))
		return;

	if (message.chat.id > 0){
		bot.sendMessage(message.from.id, "Questo comando può essere usato solo nei gruppi");
		return;
	}
	
	var party_id = parseInt(match[1]);
	
	if ((isNaN(party_id)) || (party_id < 1)){
		bot.sendMessage(message.from.id, "Numero party non valido");
		return;
	}

	connection.query('SELECT team_id, role FROM team_player WHERE player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0){
			bot.sendMessage(message.from.id, "Non sei in team");
			return;
		}

		var role = rows[0].role;
		var team_id = rows[0].team_id;
		var sym = "";
		
		if (rows[0].role == 0){
			bot.sendMessage(message.from.id, "Solo l'amministratore o il vice possono utilizzare questa funzione");
			return;
		} else if (rows[0].role == 1)
			sym = " 👑";
		else if (rows[0].role == 2)
			sym = " 🔰";

		connection.query('SELECT 1 FROM mission_team_party WHERE party_id = ' + party_id + ' AND team_id = ' + team_id, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0){
				console.log("Il numero del party inserito non esiste");
				return;	
			}

			connection.query('SELECT P.nickname FROM mission_team_party_player T, player P WHERE T.player_id = P.id AND T.party_id = ' + party_id + ' AND T.team_id = ' + team_id, function (err, rows, fields) {
				if (err) throw err;

				var nicklist = "";

				for (i = 0; i < Object.keys(rows).length; i++)
					nicklist += "@" + rows[i].nickname + " ";

				bot.sendMessage(message.chat.id, "<b>" + message.from.username + "</b>" + sym + " chiama i componenti del party " + party_id + "!\n" + nicklist, html);
			});
		});
	});
});

bot.onText(/^\/votaparty$/, function (message, match) {

	if (!checkSpam(message))
		return;

	if (message.chat.id > 0){
		bot.sendMessage(message.from.id, "Questo comando può essere usato solo nei gruppi");
		return;
	}

	connection.query('SELECT team_id, party_id, player_id FROM mission_team_party_player WHERE player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0){
			bot.sendMessage(message.from.id, "Non sei in team o in un party");
			return;
		}

		var party_id = rows[0].party_id;
		var team_id = rows[0].team_id;
		var player_id = rows[0].player_id;

		connection.query('SELECT part_id, wait, assigned_to FROM mission_team_party WHERE party_id = ' + party_id + ' AND team_id = ' + team_id, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0){
				console.log("Errore party");
				return;	
			}

			if ((rows[0].part_id == 0) && (rows[0].wait == 0)){
				bot.sendMessage(message.chat.id, "Il party è in attesa dell'inizio incarico!");
				return;
			}

			connection.query('SELECT P.nickname FROM mission_team_party_player T, player P WHERE T.player_id = P.id AND T.party_id = ' + party_id + ' AND T.team_id = ' + team_id + ' AND P.id != ' + player_id + ' AND answ_id = 0', function (err, rows, fields) {
				if (err) throw err;

				var nicklist = "";

				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Non manca nessun compagno!");
					return;
				}

				for (i = 0; i < Object.keys(rows).length; i++) {
					nicklist += "@" + rows[i].nickname + " ";
				}

				bot.sendMessage(message.chat.id, "<b>" + message.from.username + "</b> incita i suoi compagni di party a votare!\n" + nicklist, html);
			});
		});
	});
});

bot.onText(/^\/scalata/, function (message, match) {

	if (!checkSpam(message)) {
		return;
	}

	if (message.chat.id > 0){
		bot.sendMessage(message.from.id, "Questo comando può essere usato solo nei gruppi");
		return;
	}

	connection.query('SELECT team_id, player_id FROM team_player WHERE player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0){
			bot.sendMessage(message.from.id, "Non sei in team");
			return;
		}

		var team_id = rows[0].team_id;
		var player_id = rows[0].player_id;

		connection.query('SELECT id FROM boss_team WHERE team_id = ' + team_id + ' AND killedby IS NULL ORDER BY boss_id LIMIT 1', function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0){
				bot.sendMessage(message.from.id, "Nessun boss in corso");
				return;
			}

			var boss_id = rows[0].id;

			connection.query('SELECT P.nickname FROM player P, team_player T LEFT JOIN boss_damage B ON T.player_id = B.player_id AND B.boss_id = ' + boss_id + ' WHERE T.team_id = ' + team_id + ' AND T.player_id != ' + player_id + ' AND B.player_id IS NULL AND T.player_id = P.id AND suspended = 0 AND holiday = 0 GROUP BY T.player_id', function (err, rows, fields) {
				if (err) throw err;

				var nicklist = "";

				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Non manca nessun compagno valido!");
					return;
				}

				for (i = 0; i < Object.keys(rows).length; i++)
					nicklist += "@" + rows[i].nickname + " ";

				bot.sendMessage(message.chat.id, "<b>" + message.from.username + "</b> incita i suoi compagni di team ad attaccare il boss!\n" + nicklist, html);
			});
		});
	});
});

bot.onText(/^\/cid/, function (message) {
	bot.sendMessage(message.chat.id, message.chat.id);
});

bot.onText(/^\/token/, function (message) {

	if (message.chat.id < 0) {
		bot.sendMessage(message.chat.id, "Puoi usare questo comando solo in privato", mark);
		return;
	}

	connection.query('SELECT id, account_id, exp, reborn FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;
		var lev = Math.floor(rows[0].exp / 10);
		var reborn = rows[0].reborn;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if ((lev < 50) && (reborn == 1)) {
			bot.sendMessage(message.chat.id, "Raggiungi almeno il livello 50 per richiedere il token", mark);
			return;
		}

		connection.query('SELECT token FROM token WHERE player_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err;

			var token = "Non ancora richiesto";
			if (Object.keys(rows).length > 0) {
				token = rows[0].token;
				if (token == null)
					token = "Revocato";
			}

			var iKeys = [];
			iKeys.push([{
				text: "Richiedi/Rinnova",
				callback_data: "token_new"
			}]);
			iKeys.push([{
				text: "Revoca",
				callback_data: "token_del"
			}]);

			bot.sendMessage(message.chat.id, "Richiedi il token per utilizzare le Api, in caso di utilizzo non consono, verrai bannato dal gioco. Tienitelo per te!\nToken attuale: <code>" + token + "</code>\n\nGuida: http://telegra.ph/Guida-alle-LootBot-API-04-06", {
				parse_mode: 'HTML',
				disable_web_page_preview: true,
				reply_markup: {
					inline_keyboard: iKeys
				}
			});
		});
	});
});

bot.onText(/^\/comandigruppo/, function (message) {
	bot.sendMessage(message.chat.id, "Questi comandi sono utilizzabili solo dagli amministratori, visualizza un riepilogo con /riassunto\n\n" +
					"*Benvenuto*\n" +
					"/setwelcome testo - Imposta il testo di benvenuto, usa \\n per andare a capo (massimo 1024 caratteri)\n" +
					"/welcome on-off - Abilita o disabilita il messaggio di benvenuto\n" +
					"\n*Variabili disponibili*:\n" +
					"#giocatore# - #livello# - #rinascita# - #iscritto# - #drago#\n" +
					"Esempio: Benvenuto #giocatore#!\n\n" +
					"*Filtro livello*\n" +
					"/setmin livello - Imposta il livello minimo\n" +
					"/setmax livello - Imposta il livello massimo\n" +
					"/level on-off - Abilita o disabilita il filtro livello\n" +
					"Per specificare la rinascita incrementare il livello di 100, 250 o 450 a seconda della rinascita\n\n" +
					"*Filtro bannato*\n" +
					"/kickbanned on-off - Abilita o disabilita il filtro bannato\n\n" +
					"*Filtro non iscritto*\n" +
					"/kickreg on-off - Abilita o disabilita il filtro non iscritto\n\n" +
					"*Filtro ban dai gruppi*\n" +
					"/groupban on-off - Abilita o disabilita il filtro group ban\n\n" +
					"*Filtro foto/documenti postati nei gruppi*\n" +
					"/photodocs on-off - Abilita o disabilita il filtro foto/documenti per livello < 50\n\n" +
					"*Compattatore messaggi (beta)*\n" +
					"/compact on-off - Abilita o disabilita il compattamento automatico dei messaggi\n\n" +
					"*Attiva i filtri per ogni messaggio*\n" +
					"/hardmode on-off - Abilita o disabilita il controllo filtri per ogni messaggio\n" +
					"\n\n_Altri comandi a breve_", mark);
});

bot.onText(/^\/riassunto/, function (message, match) {
	if (message.chat.id > 0)
		return;

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == "creator") || (data.status == "administrator")) {
			connection.query('SELECT * FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length > 0) {
					var welcome_text = rows[0].welcome_text;
					if (welcome_text == null) {
						welcome_text = "Non impostato";
					}
					var welcome = (rows[0].welcome) ? "✅" : "❌";
					var level = (rows[0].level) ? "✅" : "❌";
					var min_lev = rows[0].min_lev;
					var max_lev = rows[0].max_lev;
					var kickban = (rows[0].kickban) ? "✅" : "❌";
					var kickreg = (rows[0].kickreg) ? "✅" : "❌";
					var always = (rows[0].always) ? "✅" : "❌";
					var groupban = (rows[0].groupban) ? "✅" : "❌";
					var photodocs = (rows[0].photodocs) ? "✅" : "❌";
					var compact = (rows[0].compact) ? "✅" : "❌";

					bot.sendMessage(message.chat.id, "<b>Impostazioni gruppo:</b>\n" +
									"Messaggio di benvenuto: " + welcome_text + "\n" +
									"Benvenuto: " + welcome + "\n" +
									"Filtro livello: " + level + " (" + min_lev + "-" + max_lev + ")\n" +
									"Filtro bannato: " + kickban + "\n" +
									"Filtro non registrato: " + kickreg + "\n" +
									"Group ban automatico: " + groupban + "\n" +
									"Filtro foto/documenti: " + photodocs + "\n" +
									"Compattatore: " + compact + "\n" +
									"Hard mode: " + always + "\n", html);
				} else {
					bot.sendMessage(message.chat.id, "Il gruppo non è memorizzato nel plus, contatta l'amministratore");
				}
			});
		};
	});
});

bot.onText(/^\/setmin (.+)/, function (message, match) {
	if (message.chat.id > 0)
		return;

	if (isNaN(parseInt(match[1]))) {
		bot.sendMessage(message.chat.id, "Valore non valido");
		return;
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == "creator") || (data.status == "administrator")) {
			var text = parseInt(match[1]);
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Errore impostazione livello");
				} else {
					connection.query('UPDATE plus_groups SET min_lev = ' + text + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Livello minimo impostato correttamente, ricordati di abilitarlo con /level on");
					});
				}
			});
		}
	});
});

bot.onText(/^\/setmax (.+)/, function (message, match) {
	if (message.chat.id > 0)
		return;

	if (isNaN(parseInt(match[1]))) {
		bot.sendMessage(message.chat.id, "Valore non valido");
		return;
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == "creator") || (data.status == "administrator")) {
			var text = parseInt(match[1]);
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Errore impostazione livello");
				} else {
					connection.query('UPDATE plus_groups SET max_lev = ' + text + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Livello massimo impostato correttamente, ricordati di abilitarlo con /level on");
					});
				}
			});
		}
	});
});

bot.onText(/^\/level (.+)/, function (message, match) {
	if (message.chat.id > 0)
		return;

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == "creator") || (data.status == "administrator")) {
			var text = match[1];
			connection.query('SELECT min_lev, max_lev FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Errore impostazione livello");
				} else {

					if ((text == "on") || (text == "off")) {
						var val = 0;
						if (text == "on") {
							bot.sendMessage(message.chat.id, "Filtro livello abilitato: MIN " + rows[0].min_lev + ", MAX " + rows[0].max_lev + "\nRicorda di impostare il bot come amministratore");
							val = 1;
						} else {
							bot.sendMessage(message.chat.id, "Filtro livello disabilitato");
							val = 0;
						}
						connection.query('UPDATE plus_groups SET level = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err;
						});
					} else {
						bot.sendMessage(message.chat.id, "Parametro non valido, on/off.");
					}
				}
			});
		}
	});
});

bot.onText(/^\/kickbanned (.+)/, function (message, match) {
	if (message.chat.id > 0)
		return;

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == "creator") || (data.status == "administrator")) {
			var text = match[1];
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Errore impostazione kick bannato");
				} else {

					if ((text == "on") || (text == "off")) {
						var val = 0;
						if (text == "on") {
							bot.sendMessage(message.chat.id, "Filtro bannato abilitato\nRicorda di impostare il bot come amministratore");
							val = 1;
						} else {
							bot.sendMessage(message.chat.id, "Filtro bannato disabilitato");
							val = 0;
						}
						connection.query('UPDATE plus_groups SET kickban = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err;
						});
					} else {
						bot.sendMessage(message.chat.id, "Parametro non valido, on/off.");
					}
				}
			});
		}
	});
});

bot.onText(/^\/kickreg (.+)/, function (message, match) {
	if (message.chat.id > 0)
		return;

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == "creator") || (data.status == "administrator")) {
			var text = match[1];
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Errore impostazione kick non iscritto");
				} else {

					if ((text == "on") || (text == "off")) {
						var val = 0;
						if (text == "on") {
							bot.sendMessage(message.chat.id, "Filtro non iscritto abilitato\nRicorda di impostare il bot come amministratore");
							val = 1;
						} else {
							bot.sendMessage(message.chat.id, "Filtro non iscritto disabilitato");
							val = 0;
						}
						connection.query('UPDATE plus_groups SET kickreg = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err;
						});
					} else {
						bot.sendMessage(message.chat.id, "Parametro non valido, on/off.");
					}
				}
			});
		}
	});
});

bot.onText(/^\/groupban (.+)/, function (message, match) {
	if (message.chat.id > 0)
		return;

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == "creator") || (data.status == "administrator")) {
			var text = match[1];
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Errore impostazione group ban");
				} else {

					if ((text == "on") || (text == "off")) {
						var val = 0;
						if (text == "on") {
							bot.sendMessage(message.chat.id, "Filtro group ban abilitato\nRicorda di impostare il bot come amministratore");
							val = 1;
						} else {
							bot.sendMessage(message.chat.id, "Filtro group ban disabilitato");
							val = 0;
						}
						connection.query('UPDATE plus_groups SET groupban = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err;
						});
					} else {
						bot.sendMessage(message.chat.id, "Parametro non valido, on/off.");
					}
				}
			});
		}
	});
});

bot.onText(/^\/photodocs (.+)/, function (message, match) {
	if (message.chat.id > 0)
		return;

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == "creator") || (data.status == "administrator")) {
			var text = match[1];
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Errore impostazione filtro foto/documenti");
				} else {

					if ((text == "on") || (text == "off")) {
						var val = 0;
						if (text == "on") {
							bot.sendMessage(message.chat.id, "Filtro foto/documenti abilitato, ricorda di attivare l'/hardmode!");
							val = 1;
						} else {
							bot.sendMessage(message.chat.id, "Filtro foto/documenti disabilitato");
							val = 0;
						}
						connection.query('UPDATE plus_groups SET photodocs = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err;
						});
					} else {
						bot.sendMessage(message.chat.id, "Parametro non valido, on/off.");
					}
				}
			});
		}
	});
});

bot.onText(/^\/compact (.+)/, function (message, match) {
	if (message.chat.id > 0)
		return;

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == "creator") || (data.status == "administrator")) {
			var text = match[1];
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Errore impostazione compattatore");
				} else {

					if ((text == "on") || (text == "off")) {
						var val = 0;
						if (text == "on") {
							bot.sendMessage(message.chat.id, "Compattatore abilitato\nRicorda di impostare il bot come amministratore");
							val = 1;
						} else {
							bot.sendMessage(message.chat.id, "Compattatore disabilitato");
							val = 0;
						}
						connection.query('UPDATE plus_groups SET compact = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err;
						});
					} else {
						bot.sendMessage(message.chat.id, "Parametro non valido, on/off.");
					}
				}
			});
		}
	});
});

bot.onText(/^\/hardmode (.+)/, function (message, match) {
	if (message.chat.id > 0) {
		return;
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == "creator") || (data.status == "administrator")) {
			var text = match[1];
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Errore impostazione hard mode");
				} else {

					if ((text == "on") || (text == "off")) {
						var val = 0;
						if (text == "on") {
							bot.sendMessage(message.chat.id, "Filtro controllo intensivo abilitato\nRicorda di impostare il bot come amministratore");
							val = 1;
						} else {
							bot.sendMessage(message.chat.id, "Filtro controllo intensivo disabilitato");
							val = 0;
						}
						connection.query('UPDATE plus_groups SET always = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err;
						});
					} else {
						bot.sendMessage(message.chat.id, "Parametro non valido, on/off.");
					}
				}
			});
		}
	});
});

bot.onText(/^\/setwelcome (.+)/, function (message, match) {
	if (message.chat.id > 0) {
		return;
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == "creator") || (data.status == "administrator")) {
			var text = match[1];
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Errore impostazione benvenuto");
				} else {
					connection.query('UPDATE plus_groups SET welcome_text = "' + text + '" WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Messaggio di benvenuto impostato correttamente, ricordati di abilitarlo con /welcome on");
					});
				}
			});
		}
	});
});

bot.onText(/^\/welcome (.+)/, function (message, match) {
	if (message.chat.id > 0) {
		return;
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == "creator") || (data.status == "administrator")) {
			var text = match[1];
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Errore impostazione benvenuto");
				} else {

					if ((text == "on") || (text == "off")) {
						var val = 0;
						if (text == "on") {
							bot.sendMessage(message.chat.id, "Messaggio di benvenuto abilitato");
							val = 1;
						} else {
							bot.sendMessage(message.chat.id, "Messaggio di benvenuto disabilitato");
							val = 0;
						}
						connection.query('UPDATE plus_groups SET welcome = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err;
						});
					} else {
						bot.sendMessage(message.chat.id, "Parametro non valido, on/off.");
					}
				}
			});
		}
	});
});

function checkStatus(message, nickname, accountid, type) {
	connection.query('SELECT id, exp, reborn, nickname, market_ban, group_ban FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
		if (err) throw err;

		var exist = 0;
		var exp = 0;
		var lev = 0;
		var reb = 0;
		var player_id = 0;
		var market = 0;
		var group_ban = 0;

		if (Object.keys(rows).length > 0) {
			exist = 1;
			exp = rows[0].exp;
			lev = Math.floor(exp / 10);
			reb = rows[0].reborn;

			player_id = rows[0].id;
			nickname = rows[0].nickname;
			market = rows[0].market_ban;
			group_ban = rows[0].group_ban;
		}else
			nickname = "Utente";

		accountid = (accountid).toString();

		connection.query('SELECT * FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				console.log("Gruppo non memorizzato");
				return;
			}

			var chat_id = rows[0].chat_id;
			var group_name = rows[0].name.trim();

			if (player_id == 1)
				return;

			var non = rows[0].kickreg;
			if (non == 1) {
				if (exist == 0) {
					bot.kickChatMember(message.chat.id, accountid).then(function (result) {
						if (result != false) {
							bot.sendMessage(message.chat.id, nickname + " non è iscritto, l'ho bannato");
							bot.sendMessage(message.from.id, "Sei stato bannato dal gruppo " + group_name + " a causa del fatto che non sei registrato al gioco");
						}
					});
					return;
				}
			}

			var gb = rows[0].groupban;
			if (gb == 1) {
				if ((group_ban == 1) && (exist == 1)){
					bot.kickChatMember(message.chat.id, accountid).then(function (result) {
						if (result != false) {
							bot.sendMessage(message.chat.id, nickname + " è bannato dai gruppi, l'ho bannato");
							bot.sendMessage(message.from.id, "Sei stato bannato dal gruppo " + group_name + " a causa del ban da tutti i gruppi");
						}
					});
					return;
				}
			}

			var bon = rows[0].kickban;
			if (bon == 1) {
				if (exist == 1) {
					if (isBanned(accountid) != null) {
						bot.kickChatMember(message.chat.id, accountid).then(function (result) {
							if (result != false) {
								bot.sendMessage(message.chat.id, nickname + " è bannato dal gioco, l'ho bannato");
								bot.sendMessage(message.from.id, "Sei stato bannato dal gruppo " + group_name + " a causa del ban dal gioco");
							}
						});
						return;
					}
				}
			}

			var photodocs = rows[0].photodocs;
			if (photodocs == 1){
				if (exist == 1) {
					if (message.photo != undefined){
						if (getRealLevel(reb, lev) < 50){
							bot.deleteMessage(chat_id, message.message_id).then(function (result) {
								if (result != false) {
									bot.sendMessage(message.chat.id, message.from.username + ", devi aver superato il livello 50 per postare foto in questo gruppo.");
								}
							});
						}
					}
					if (message.document != undefined){
						if (getRealLevel(reb, lev) < 50){
							bot.deleteMessage(chat_id, message.message_id).then(function (result) {
								if (result != false) {
									bot.sendMessage(message.chat.id, message.from.username + ", devi aver superato il livello 50 per postare documenti in questo gruppo.");
								}
							});
						}
					}
				}
			}

			var min = rows[0].min_lev;
			var max = rows[0].max_lev;
			var lon = rows[0].level;
			var levReal = getRealLevel(reb, lev);

			if (lon == 1) {
				if (exist == 1) {
					if ((levReal < min) || (levReal > max)) {
						bot.kickChatMember(message.chat.id, accountid).then(function (result) {
							if (result != "False") {
								bot.sendMessage(message.chat.id, nickname + " non rispetta i requisiti del livello (" + levReal + "), l'ho bannato");
								bot.sendMessage(message.from.id, "Sei stato bannato dal gruppo " + group_name + " a causa dei requisiti relativi al livello minimo o massimo");
							}
						});
						return;
					};
				};
			}

			if (type == 0) {
				var welcome = rows[0].welcome_text;
				var on = rows[0].welcome;

				if ((on == 1) && (exist == 1) && (welcome != null)) {
					connection.query('SELECT name, type FROM dragon WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err;

						if (Object.keys(rows).length > 0) {
							welcome = welcome.replace(new RegExp("#drago#", "g"), rows[0].name + " " + rows[0].type);
						} else {
							welcome = welcome.replace(new RegExp("#drago#", "g"), "-");
						}

						welcome = welcome.replace(new RegExp("#giocatore#", "g"), nickname);
						welcome = welcome.replace(new RegExp("#livello#", "g"), lev);
						welcome = welcome.replace(new RegExp("#rinascita#", "g"), reb - 1);
						if (isBanned(accountid) != null) {
							welcome = welcome.replace(new RegExp("#iscritto#", "g"), "🚫"); //Bannato
						} else {
							if (market == 1) {
								welcome = welcome.replace(new RegExp("#iscritto#", "g"), "❌"); //Bannato dal mercato
							} else {
								welcome = welcome.replace(new RegExp("#iscritto#", "g"), "👍"); //Iscritto
							}
						}
						if (chat_id == "-1001069842056") {
							if ((lev < 30) && (reb == 1)) {
								welcome += "\nPer imparare le basi del gioco, entra nella <a href='https://telegram.me/joinchat/EXFobEDH8FbDpQ4MTmw-mQ'>LootBot School</a>!";
							}
						}
						bot.sendMessage(message.chat.id, welcome, html);
					});
				};
			};
		});
	});
};

function getRealLevel(reb, lev) {
	if (reb == 2) {
		lev += 100;
	}
	if (reb == 3) {
		lev += 100;
		lev += 150;
	}
	if (reb == 4) {
		lev += 100;
		lev += 150;
		lev += 200;
	}
	if (reb == 5) {
		lev += 100;
		lev += 150;
		lev += 200;
		lev += 300;
	}
	return lev;
}

bot.onText(/^\/teamall/i, function (message, match) {
	if (message.from.id != 20471035){
		return;
	}
	connection.query('SELECT id FROM team WHERE players > 1', function (err, rows, fields) {
		if (err) throw err;
		for (var j = 0, len = Object.keys(rows).length; j < len; j++) {
			connection.query('SELECT team.name, player.reborn, player.nickname, FLOOR(player.exp/10) As level FROM team, team_player, player WHERE team.id = team_player.team_id AND team_player.player_id = player.id AND team.id = ' + rows[j].id + ' ORDER BY player.reborn, player.exp DESC', function (err, rows, fields) {
				if (err) throw err;
				var mediaTeam = 0;
				for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
					mediaTeam += parseInt(getRealLevel(rows[i].reborn, rows[i].level));
				}
				mediaTeam = mediaTeam / Object.keys(rows).length;

				var sup = 0;
				var sum = 0;
				var lev = 0;
				var dev = 0;
				var calc = 0;
				var text = rows[0].name + ": ";
				for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
					lev = getRealLevel(rows[i].reborn, rows[i].level);
					sum += Math.pow(Math.abs(mediaTeam - lev), 2);
				}
				dev = Math.sqrt(sum / Object.keys(rows).length);

				for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
					lev = getRealLevel(rows[i].reborn, rows[i].level);
					calc = Math.round((lev - mediaTeam) / dev * 100) / 100;
					if (isNaN(calc) || (calc < 0))
						calc = 0;
					if (calc > 2.9) {
						text += rows[i].nickname + " (" + lev + ", " + calc + ")\n";
						sup++;
					}
				}

				if (sup > 0)
					bot.sendMessage(message.chat.id, text, html);
			});
		};
	});
});

bot.onText(/^\/team (.+)/i, function (message, match) {
	if (message.from.id != 20471035){
		return;
	}
	connection.query('SELECT team.name, player.reborn, player.nickname, FLOOR(player.exp/10) As level FROM team, team_player, player WHERE team.id = team_player.team_id AND team_player.player_id = player.id AND team.name = "' + match[1] + '" ORDER BY player.reborn, player.exp DESC', function (err, rows, fields) {
		if (err) throw err;
		var mediaTeam = 0;
		for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
			mediaTeam += parseInt(getRealLevel(rows[i].reborn, rows[i].level));
		}
		mediaTeam = mediaTeam / Object.keys(rows).length;

		var sup = 0;
		var sum = 0;
		var lev = 0;
		var dev = 0;
		var calc = 0;
		var text = rows[0].name + " (" + Math.round(mediaTeam) + "):\n\n";
		for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
			lev = getRealLevel(rows[i].reborn, rows[i].level);
			sum += Math.pow(Math.abs(mediaTeam - lev), 2);
		}
		dev = Math.sqrt(sum / Object.keys(rows).length);

		for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
			lev = getRealLevel(rows[i].reborn, rows[i].level);
			calc = Math.round((lev - mediaTeam) / dev * 100) / 100;
			if (isNaN(calc) || (calc < 0))
				calc = 0;
			if (calc > 2.9) {
				text += rows[i].nickname + " (" + lev + ", " + calc + ")\n";
				sup++;
			} else {
				text += rows[i].nickname + " (" + lev + ", " + calc + ")\n";
			}
		}
		text += "\nNon validi: " + sup + "/" + Object.keys(rows).length;
		text += "\nDeviazione: " + Math.round(dev);

		bot.sendMessage(message.chat.id, text, html);
	});
});

bot.onText(/^\/contrabb (.+)/i, function (message, match) {
	if (message.from.id != 20471035){
		return;
	}
	connection.query('SELECT id, base_sum, price_sum, name, value FROM item WHERE name = "' + match[1] + '"', function (err, rows, fields) {
		if (err) throw err;
		var val = parseInt(rows[0].base_sum);
		var price_sum = parseInt(rows[0].price_sum);

		var price = val + price_sum;// + rows[0].value;
		var mid = price;
		price = price * (1.5 + (Math.random() * 0.5));

		bot.sendMessage(message.chat.id, "Somma base: " + formatNumber(val) + " + " + "Somma costi: " + formatNumber(price_sum) + "\n= " + formatNumber(mid) + "\n * random(1.5-2.0)\n= " + formatNumber(Math.round(price)));
	});
});

bot.onText(/^\/rimod ([^\s]+) ([^\s]+)/i, function (message, match) {
	var x = 0;
	var y = 0;
	for (i = 0; i < match[1]; i++) {
		y = x;
		x += Math.round(funz(x) * match[2]);
	}

	var res = Math.round(x);
	var unit = Math.round(x - y);
	bot.sendMessage(message.chat.id, "Punti: " + formatNumber(res) + " (" + formatNumber(unit) + ")\nExp: " + formatNumber(res * 30) + " (" + formatNumber(unit * 30) + ")\nMonete: " + formatNumber(res * 1000000) + " (" + formatNumber(unit * 1000000) + ")\n(Calcolo arrotondato)");
});

function funz(x) {
	return 1 + (Math.pow(x, 1.8)) / 100000;
}

bot.onText(/^\/dai_fake (.+)/i, function (message, match) {
	if (message.from.id == 20471035){
		var split = match[1].split(",");

		var options = {parse_mode: 'Markdown'};
		if (message.reply_to_message != undefined)
			options = {parse_mode: 'Markdown', reply_to_message_id: message.reply_to_message.message_id};

		bot.sendMessage(message.chat.id, "*" + split[0] + "*, hai ricevuto 1x *" + split[1] + "*!", options);
	}
});

bot.onText(/^\/msg (.+)/i, function (message, match) {
	if (message.from.id == 20471035){

		var options = {parse_mode: 'Markdown'};
		if (message.reply_to_message != undefined)
			options = {parse_mode: 'Markdown', reply_to_message_id: message.reply_to_message.message_id};

		bot.sendMessage(message.chat.id, match[1], options);
	}
});

bot.onText(/^\/rune (.+)/i, function (message, match) {

	if (match[1].indexOf(",") == -1)
		return;

	var split = match[1].split(" ");

	var my_comb = split[0];
	var combi = split[1];

	//da qua

	var num = [];
	var end = "";
	var end_num = 0;

	var final1 = 0;
	var final2 = 0;
	var final_n1 = "";
	var final_n2 = "";
	var couple1 = 0;
	var couple2 = 0;

	var dcouple1 = 0;
	var dcouple2 = 0;
	var dcouple1b = 0;
	var dcouple2b = 0;
	var dcoupled1 = 0;
	var dcoupled2 = 0;
	var dcoupleSolo1 = 0;
	var dcoupleSolo2 = 0;

	var triple1 = 0;
	var triple2 = 0;
	var triple_a1 = 0;
	var triple_a2 = 0;
	var triple_b1 = 0;
	var triple_b2 = 0;
	var triple_d1 = 0;
	var triple_d2 = 0;

	var full1_d = 0;
	var full1_t = 0;
	var full1 = 0;
	var full2 = 0;
	var quad1 = 0;
	var quad2 = 0;
	var dquad1 = 0;
	var dquad2 = 0;
	var penta1 = 0;
	var penta2 = 0;
	var scalef1 = 0;
	var scalef2 = 0;
	var scales1 = 0;
	var scales2 = 0;

	for (i = 0; i < 2; i++) {

		if (i == 0) {
			num = my_comb.split("");
		} else {
			num = combi.split("");
		}
		num.sort();

		end = "";
		end_num = 0;

		//Cinque di un tipo
		if ((num[0] == num[1]) && (num[1] == num[2]) && (num[2] == num[3]) && (num[3] == num[4])) {
			end = "Cinque di un tipo";
			end_num = 8;
		}

		if ((i == 0) && (end_num == 8)) {
			penta1 = num[0];
		} else {
			penta2 = num[0];
		}

		if (end_num == 0) {
			//Quattro di un tipo
			var dquad = 0;
			if ((num[0] == num[1]) && (num[1] == num[2]) && (num[2] == num[3])) {
				end = "Quattro di un tipo";
				end_num = 7;
				dquad = num[4];
			}
			if ((num[1] == num[2]) && (num[2] == num[3]) && (num[3] == num[4])) {
				end = "Quattro di un tipo";
				end_num = 7;
				dquad = [0];
			}

			if ((i == 0) && (end_num == 7)) {
				quad1 = num[1];
				dquad1 = dquad;
			} else {
				quad2 = num[1];
				dquad2 = dquad;
			}
		}

		if (end_num == 0) {
			//Scala di 6
			if ((num[0] == 2) && (num[1] == 3) && (num[2] == 4) && (num[3] == 5) && (num[4] == 6)) {
				end = "Scala di 6";
				end_num = 6;
			}

			if ((i == 0) && (end_num == 6)) {
				scales1 = num[0];
			} else {
				scales2 = num[0];
			}
		}

		if (end_num == 0) {
			//Scala di 5
			if ((num[0] == 1) && (num[1] == 2) && (num[2] == 3) && (num[3] == 4) && (num[4] == 5)) {
				end = "Scala di 5";
				end_num = 5;
			}

			if ((i == 0) && (end_num == 5)) {
				scalef1 = num[0];
			} else {
				scalef2 = num[0];
			}
		}

		if (end_num == 0) {
			//Full House
			var full = 0;
			var fullDouble = 0;
			var fullTris = 0;
			var array_full = [];

			if ((num[0] == num[1]) && (num[1] == num[2])) {
				full++;
				fullTris = num[0];
				array_full.push(num[3]);
				array_full.push(num[4]);
			} else if ((num[1] == num[2]) && (num[2] == num[3])) {
				full++;
				fullTris = num[1];
				array_full.push(num[0]);
				array_full.push(num[4]);
			} else if ((num[2] == num[3]) && (num[3] == num[4])) {
				full++;
				fullTris = num[2];
				array_full.push(num[0]);
				array_full.push(num[1]);
			}

			if (full == 1) {
				if (array_full[0] == array_full[1]) {
					full++;
					fullDouble = array_full[0];
				}

				if (fullDouble != fullTris) {
					if (full == 2) {
						end = "Full";
						end_num = 4;
					}
					if ((i == 0) && (end_num == 4)) {
						full1_d = fullDouble;
						full1_t = fullTris;
					} else {
						if (fullTris == full1_t) {
							full2 = fullDouble;
							full1 = full1_d;
						} else {
							full2 = fullTris;
							full1 = full1_t;
						}
					}
				}
			}
		}

		if (end_num == 0) {
			//Tre di un tipo
			var triple = 0;
			var triple_d = 0;
			if ((num[0] == num[1]) && (num[1] == num[2])) {
				end = "Tre di un tipo";
				end_num = 3;
				triple = num[0];

				if (i == 0) {
					triple_a1 = num[3];
					triple_a2 = num[4];
				} else {
					triple_b1 = num[3];
					triple_b2 = num[4];
				}
			}
			if ((num[1] == num[2]) && (num[2] == num[3])) {
				end = "Tre di un tipo";
				end_num = 3;
				triple = num[1];

				if (i == 0) {
					triple_a1 = num[0];
					triple_a2 = num[4];
				} else {
					triple_b1 = num[0];
					triple_b2 = num[4];
				}
			}
			if ((num[2] == num[3]) && (num[3] == num[4])) {
				end = "Tre di un tipo";
				end_num = 3;
				triple = num[2];

				if (i == 0) {
					triple_a1 = num[0];
					triple_a2 = num[1];
				} else {
					triple_b1 = num[0];
					triple_b2 = num[1];
				}
			}

			if ((i == 0) && (end_num == 3)) {
				triple1 = triple;
			} else {
				triple2 = triple;

				if (triple_a2 == triple_b2) {
					if (triple_a1 >= triple_b1) {
						triple_d1 = triple_a1;
						triple_d2 = 0;
					} else {
						triple_d1 = 0;
						triple_d2 = triple_b1;
					}
				} else {
					if (triple_a2 >= triple_b2) {
						triple_d1 = triple_a2;
						triple_d2 = 0;
					} else {
						triple_d1 = 0;
						triple_d2 = triple_b2;
					}
				}
			}
		}

		if (end_num == 0) {
			//Doppia Coppia
			var double = 0;
			var doubleN = 0;
			var doubleN2 = 0;
			if (num[0] == num[1]) {
				double++;
				doubleN = num[0];
			}
			if (num[1] == num[2]) {
				double++;
				if (double == 2)
					doubleN2 = doubleN;
				if (num[1] > doubleN)
					doubleN = num[1];
			}
			if (num[2] == num[3]) {
				double++;
				if (double == 2)
					doubleN2 = doubleN;
				if (num[2] > doubleN)
					doubleN = num[2];
			}
			if (num[3] == num[4]) {
				double++;
				if (double == 2)
					doubleN2 = doubleN;
				if (num[3] > doubleN)
					doubleN = num[3];
			}
			if (double == 2) {
				end = "Doppia Coppia";
				end_num = 2;
			}

			var checkN = 0;

			if ((i == 0) && (end_num == 2)) {
				dcouple1 = doubleN;
				dcouple1b = doubleN2;

				for (k = 0; k < 5; k++) {
					checkN = 0;
					for (j = 0; j < 5; j++) {
						if (num[k] == num[j])
							checkN++;
					}
					if (checkN == 1)
						dcoupleSolo1 = num[k];
				}
			} else {
				dcouple2 = doubleN;
				dcouple2b = doubleN2;

				for (k = 0; k < 5; k++) {
					checkN = 0;
					for (j = 0; j < 5; j++) {
						if (num[k] == num[j])
							checkN++;
					}
					if (checkN == 1)
						dcoupleSolo2 = num[k];
				}
			}
		}

		if (end_num == 0) {
			//Coppia
			var coup = 0;
			if (num[0] == num[1]) {
				end = "Coppia";
				end_num = 1;
				coup = num[0];
			}
			if (num[1] == num[2]) {
				end = "Coppia";
				end_num = 1;
				coup = num[1];
			}
			if (num[2] == num[3]) {
				end = "Coppia";
				end_num = 1;
				coup = num[2];
			}
			if (num[3] == num[4]) {
				end = "Coppia";
				end_num = 1;
				coup = num[3];
			}

			if ((i == 0) && (end_num == 1)) {
				couple1 = coup;
			} else {
				couple2 = coup;
			}
		}

		if (i == 0) {
			final1 = end_num;
			final_n1 = end;
		} else {
			final2 = end_num;
			final_n2 = end;
		}
	}

	var text = "Punti 1: " + final1 + " (" + final_n1 + ")\nPunti 2: " + final2 + " (" + final_n2 + ")";
	console.log(text);

	if ((final1 == 1) && (final2 == 1)) { //Coppia
		if (couple1 >= couple2) {
			final1++;
		} else {
			final2++;
		}
	}
	if ((final1 == 2) && (final2 == 2)) { //Doppia Coppia

		console.log(dcouple1, dcouple2, dcouple1b, dcouple2b, dcoupleSolo1, dcoupleSolo2);

		if (dcouple1 > dcouple2) {
			final1++;
		} else if (dcouple1 == dcouple2) {
			if (dcouple1b > dcouple2b) {
				final1++;
			} else if (dcouple1b == dcouple2b) {
				if (dcoupleSolo1 >= dcoupleSolo2)
					final1++;
				else
					final2++;
			} else {
				final2++;
			}
		} else {
			final2++;
		}
	}
	if ((final1 == 3) && (final2 == 3)) { //Tris
		if (triple1 == triple2) {
			if (triple_d1 >= triple_d2) {
				final1++;
			} else {
				final2++;
			}
		} else {
			if (triple1 >= triple2) {
				final1++;
			} else {
				final2++;
			}
		}
	}
	if ((final1 == 4) && (final2 == 4)) { //Full
		if (full1 >= full2) {
			final1++;
		} else {
			final2++;
		}
	}
	if ((final1 == 5) && (final2 == 5)) { //Scala 5
		if (scalef1 >= scalef2) {
			final1++;
		} else {
			final2++;
		}
	}
	if ((final1 == 6) && (final2 == 6)) { //Scala 6
		if (scales1 >= scales2) {
			final1++;
		} else {
			final2++;
		}
	}
	if ((final1 == 7) && (final2 == 7)) { //Quattro uguali
		if (quad1 > quad2) {
			final1++;
		} else {
			if (quad1 == quad2) {
				if (dquad1 >= dquad2) {
					final1++;
				} else {
					final2++;
				}
			} else {
				final2++;
			}
		}
	}
	if ((final1 == 8) && (final2 == 8)) { //Cinque uguali
		if (penta1 >= penta2) {
			final1++;
		} else {
			final2++;
		}
	}

	if ((final1 == 0) && (final2 == 0)){
		var n1 = my_comb.split("").sort().join("");
		var n2 = combi.split("").sort().join("");
		if (n2 > n1){
			final2++;
		}else{
			final1++;
		}
	}

	if (final1 > final2)
		bot.sendMessage(message.chat.id, text + "\nVince 1 (" + final1 + ", " + final2 + ")");
	else
		bot.sendMessage(message.chat.id, text + "\nVince 2 (" + final1 + ", " + final2 + ")");
});

bot.onText(/^\/iscritto (.+)|^\/iscritto/i, function (message, match) {
	var n = "";
	n = match[1];

	if ((n == undefined) || (n == ""))
		n = message.from.username;

	if (message.reply_to_message != undefined)
		n = message.reply_to_message.from.username;

	n = n.replace("@", "");

	connection.query('SELECT market_ban, account_id FROM player WHERE nickname = "' + n + '"', function (err, rows, fields) {
		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.chat.id, "👎", mark);
		} else {
			var banReason = isBanned(rows[0].account_id);
			if (banReason != null) {
				bot.sendMessage(message.chat.id, "🚫", mark);
			} else {
				if (rows[0].market_ban == 0) {
					bot.sendMessage(message.chat.id, "👍", mark);
				} else {
					bot.sendMessage(message.chat.id, "❌", mark);
				}
			}
		}
	});
});



bot.onText(/^\/cancellalotteria/, function (message) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		connection.query('SELECT id, item_id, price, time_end FROM public_lottery WHERE creator_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0) {
				var lottery_id = rows[0].id;
				var item_id = rows[0].item_id;
				var price = rows[0].price;
				var time_end = new Date(rows[0].time_end);

				var time_creation = time_end.setHours(time_end.getHours() - 48);
				var now = new Date();
				var diff = Math.round(((now - time_creation) / 1000) / 60);

				diff = Math.abs(diff);

				if (diff > 15) {
					bot.sendMessage(message.chat.id, "Puoi annullare la lotteria solo entro 15 minuti dopo averla creata");
					return;
				}

				connection.query('SELECT player_id FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
					if (err) throw err;

					for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
						connection.query('UPDATE player SET money = money + ' + price + ' WHERE id = ' + rows[i].player_id, function (err, rows, fields) {
							if (err) throw err;
						});
					};

					connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
						if (err) throw err;
						connection.query('DELETE FROM public_lottery WHERE id = ' + lottery_id, function (err, rows, fields) {
							if (err) throw err;
							addItem(player_id, item_id);
							bot.sendMessage(message.chat.id, "Hai annullato la lotteria in corso");
							console.log("Lotteria terminata manualmente");
						});
					});
				});
			} else {
				bot.sendMessage(message.chat.id, "Non stai gestendo nessuna lotteria");
				return;
			}
		});
	});
});

bot.onText(/^\/creaasta(?!p) ([^\s]+) (.+)|^\/creaasta(?!p)$/, function (message, match) {
	if ((message.chat.id == "-1001069842056") || (message.chat.id == "-1001064571576")) {
		bot.sendMessage(message.chat.id, "Non possono essere create aste in questo gruppo");
		return;
	}

	var prezzo = parseInt(match[1]);
	var oggetto = match[2];
	if ((oggetto == undefined) || (oggetto == "") || (prezzo == undefined) || (prezzo == 0) || (isNaN(prezzo))) {
		bot.sendMessage(message.chat.id, "Per inserire un'asta utilizza la seguente sintassi: /creaasta PrezzoBase NomeOggetto, l'oggetto viene rimosso dall'inventario appena creata l'asta");
		return;
	}

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		connection.query('SELECT 1 FROM auction_list WHERE creator_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0) {
				bot.sendMessage(message.chat.id, "Puoi gestire solo un'asta alla volta");
				return;
			}

			connection.query('SELECT 1 FROM auction_list WHERE chat_id = -1001069842056', function (err, rows, fields) {
				if (err) throw err;
				if ((Object.keys(rows).length > 0) && (message.chat.id == -1001069842056)) {
					bot.sendMessage(message.chat.id, "In questo gruppo può esistere solamente un'asta alla volta");
					return;
				}

				connection.query('SELECT item.allow_sell, item.id, item.value FROM inventory, item WHERE inventory.item_id = item.id AND item.name = "' + oggetto + '" AND inventory.player_id = ' + player_id + ' AND inventory.quantity > 0', function (err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, "Devi possedere l'oggetto per creare un'asta");
						return;
					}

					if (rows[0].allow_sell == 0) {
						bot.sendMessage(message.chat.id, "Questo oggetto non può essere messo all'asta");
						return;
					}

					if ((prezzo > parseInt(rows[0].value)) || (prezzo < Math.round(rows[0].value / 100))) {
						bot.sendMessage(message.chat.id, "Il prezzo inserito non è valido, max: " + parseInt(rows[0].value) + ", min: " + Math.round(rows[0].value / 100));
						return;
					}

					var item_id = rows[0].id;
					delItem(player_id, item_id, 1);


					var d = new Date();
					var start_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
					d.setMinutes(d.getMinutes() + 60);
					var long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

					connection.query('INSERT INTO auction_list (chat_id, creator_id, item_id, last_price, time_end, time_start) VALUES (' + message.chat.id + ',' + player_id + ',' + item_id + ',' + prezzo + ',"' + long_date + '","' + start_date + '")', function (err, rows, fields) {
						if (err) throw err;

						connection.query('SELECT id FROM auction_list WHERE creator_id = ' + player_id, function (err, rows, fields) {
							if (err) throw err;

							var id = rows[0].id;
							var iKeys = [];
							iKeys.push([{
								text: "+100",
								callback_data: "asta:" + id + ":" + "100"
							}]);
							iKeys.push([{
								text: "+1k",
								callback_data: "asta:" + id + ":" + "1000"
							}]);
							iKeys.push([{
								text: "+10k",
								callback_data: "asta:" + id + ":" + "10000"
							}]);

							bot.sendMessage(message.chat.id, "<b>Asta per " + oggetto + "</b>\n\n<b>Offerta</b>: " + prezzo + " §\n\nAppena pubblicata, scade tra 1 ore, ogni offerta consente 2 ore per rilanciare.", {
								parse_mode: 'HTML',
								reply_markup: {
									inline_keyboard: iKeys
								}
							});
						});
					});
				});
			});
		});
	});
});

bot.onText(/^\/pubblicaasta (.+)|^\/pubblicaasta/, function (message, match) {

	var nick = "";

	if (match[1] == undefined) {
		nick = message.from.username;
	} else {
		nick = match[1];
	}

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		connection.query('SELECT auction_list.id, last_price, holiday, creator_id, last_player, item_id, time_end, nickname, market_ban FROM auction_list, player WHERE player.id = auction_list.creator_id AND auction_list.creator_id = (SELECT id FROM player WHERE nickname = "' + nick + '")', function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				if (nick == message.from.username) {
					bot.sendMessage(message.chat.id, "Non hai aperto nessuna asta");
				} else {
					bot.sendMessage(message.chat.id, "L'utente non ha aperto nessuna asta");
				}
				return;
			}

			if (rows[0].market_ban == 1) {
				bot.sendMessage(message.chat.id, "L'utente è bannato dal mercato", mark);
				return;
			}

			var creator_nickname = rows[0].nickname;
			var last_player = rows[0].last_player;
			var last_player_nickname = "";
			var last_price = rows[0].last_price;
			var itemName = "";

			var d = new Date(rows[0].time_end);
			var long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
			var short_date = addZero(d.getHours()) + ":" + addZero(d.getMinutes()) + ":" + addZero(d.getSeconds());

			var id = rows[0].id;

			connection.query('SELECT name FROM item WHERE id = ' + rows[0].item_id, function (err, rows, fields) {
				if (err) throw err;

				itemName = rows[0].name;

				connection.query('SELECT nickname FROM player WHERE id = ' + last_player, function (err, rows, fields) {
					if (err) throw err;

					if (Object.keys(rows).length == 0) {
						last_player_nickname = "-";
					} else {
						last_player_nickname = rows[0].nickname;
					}

					var iKeys = [];
					iKeys.push([{
						text: "+10",
						callback_data: "asta:" + id + ":" + "100"
					}]);
					iKeys.push([{
						text: "+1k",
						callback_data: "asta:" + id + ":" + "1000"
					}]);
					iKeys.push([{
						text: "+10k",
						callback_data: "asta:" + id + ":" + "10000"
					}]);

					var text = "<b>Asta per " + itemName + "</b>\n\n<b>Creatore</b>: " + creator_nickname + "\n<b>Offerta</b>: " + formatNumber(last_price) + " §\n<b>Offerente:</b> " + last_player_nickname + "\n<b>Scade alle:</b> " + short_date;

					bot.sendMessage(message.chat.id, text, {
						parse_mode: 'HTML',
						reply_markup: {
							inline_keyboard: iKeys
						}
					});
				});
			});
		});
	});
});

bot.onText(/^\/cancellaasta/, function (message) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		connection.query('SELECT id, item_id, last_price, last_player, time_start FROM auction_list WHERE creator_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0) {
				var auction_id = rows[0].id;
				var item_id = rows[0].item_id;
				var last_price = rows[0].last_price;
				var last_player = rows[0].last_player;
				var time_start = new Date(rows[0].time_start);

				var now = new Date();
				var diff = Math.round(((now - time_start) / 1000) / 60);

				diff = Math.abs(diff);

				if (diff > 5) {
					bot.sendMessage(message.chat.id, "Puoi annullare l'asta solo entro 5 minuti dopo averla creata");
					return;
				}

				connection.query('UPDATE player SET money = money + ' + last_price + ' WHERE id = ' + last_player, function (err, rows, fields) {
					if (err) throw err;
					connection.query('DELETE FROM auction_list WHERE id = ' + auction_id, function (err, rows, fields) {
						if (err) throw err;
						addItem(player_id, item_id);
						bot.sendMessage(message.chat.id, "Hai annullato l'asta in corso");
						console.log("Asta terminata manualmente");
					});
				});
			} else {
				bot.sendMessage(message.chat.id, "Non stai gestendo nessuna asta");
				return;
			}
		});
	});
});

bot.onText(/^\/asta(?!p) ([^\s]+) (.+)|^\/asta(?!p)/, function (message, match) {
	if ((message.chat.id == "-1001069842056") || (message.chat.id == "-1001064571576")) {
		bot.sendMessage(message.chat.id, "Non puoi partecipare alle aste in questo gruppo");
		return;
	}

	var prezzo = parseInt(match[1]);
	var nickname = match[2];
	if ((nickname == undefined) || (nickname == "") || (prezzo == undefined) || (isNaN(prezzo))) {
		bot.sendMessage(message.chat.id, "Per partecipare ad un asta utilizza la seguente sintassi: /asta Prezzo @nickname, mentre /creaasta per iniziarne una nuova");
		return;
	}

	nickname = nickname.replace("@", "");

	connection.query('SELECT id, money, account_id, market_ban FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;
		var money = rows[0].money;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		connection.query('SELECT id FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, "Il nickname che hai inserito non esiste, riprova");
				return;
			}

			var creator_id = rows[0].id;
			connection.query('SELECT id, last_price, item_id, time_end, last_player FROM auction_list WHERE creator_id = ' + creator_id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Il nickname che hai inserito non è associato a nessuna asta, riprova");
					return;
				}

				var last_price = rows[0].last_price;
				var auction_id = rows[0].id;
				var last_player = rows[0].last_player;
				var itemId = rows[0].item_id;

				if (money < prezzo) {
					bot.sendMessage(message.chat.id, "Non hai abbastanza credito per rialzare di " + prezzo + " §");
					return;
				}

				if (prezzo <= last_price) {
					bot.sendMessage(message.chat.id, "L'offerta attuale è " + formatNumber(last_price) + " §, rialza.");
					return;
				}

				if (player_id == creator_id) {
					bot.sendMessage(message.chat.id, "Non puoi rialzare la tua asta!");
					return;
				}

				connection.query('SELECT name FROM item WHERE id = ' + itemId, function (err, rows, fields) {
					if (err) throw err;
					var itemName = rows[0].name;

					connection.query('SELECT account_id FROM player WHERE id = ' + last_player, function (err, rows, fields) {
						if (err) throw err;
						if (Object.keys(rows).length > 0) {
							var account_id = rows[0].account_id;
							connection.query('UPDATE player SET money = money + ' + last_price + ' WHERE id = ' + last_player, function (err, rows, fields) {
								if (err) throw err;
								bot.sendMessage(account_id, "Sei stato superato nell'asta di " + nickname + " per " + itemName + ", dove *" + message.from.username + "* ha offerto *" + prezzo + "* §", mark);
							});
						}
					});

					var d = new Date();
					d.setMinutes(d.getMinutes() + 120);
					var long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

					connection.query('UPDATE auction_list SET time_end = "' + long_date + '", last_price = ' + prezzo + ', last_player = ' + player_id + ' WHERE id = ' + auction_id, function (err, rows, fields) {
						if (err) throw err;
						connection.query('UPDATE player SET money = money - ' + prezzo + ' WHERE id = ' + player_id, function (err, rows, fields) {
							if (err) throw err;
							bot.sendMessage(message.chat.id, message.from.username + ", hai offerto <b>" + prezzo + "</b> § per " + itemName, html);
						});
					});
				});
			});
		});
	});
});

bot.onText(/^\/negozi$/, function (message, match) {

	if (!checkSpam(message))
		return;

	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;
		var text = "I tuoi negozi:\n\n";

		connection.query('SELECT item.name, public_shop.public, public_shop.code, public_shop.price, public_shop.time_end, public_shop.quantity, public_shop.massive FROM public_shop, item WHERE item.id = public_shop.item_id AND player_id = ' + player_id + ' ORDER BY time_end, code ASC', function (err, rows, fields) {
			if (err) throw err;

			var d = new Date();
			var isPublic = "";
			var isMassive = "";

			if (Object.keys(rows).length > 0) {
				d = new Date(rows[0].time_end);

				if (rows[0].public == 0)
					isPublic = "Privato";
				else
					isPublic = "Pubblico";

				if (rows[0].massive == 0)
					isMassive = ", Massivo Disabilitato";
				else
					isMassive = ", Massivo Abilitato";

				text += "<code>" + rows[0].code + "</code> (Scadenza: " + toDate("it", d) + ") <i>" + isPublic + isMassive + "</i>\n";
				for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
					if ((i > 0) && (rows[i].code != rows[i - 1].code)) {
						d = new Date(rows[i].time_end);
						if (rows[i].public == 0)
							isPublic = "Privato";
						else
							isPublic = "Pubblico";
						text += "\n<code>" + rows[i].code + "</code> (Scadenza: " + toDate("it", d) + ") <i>" + isPublic + "</i>\n";
					}
					text += "> " + rows[i].quantity + "x " + rows[i].name + " (" + formatNumber(rows[i].price) + " §)\n";
				}

				if ((Object.keys(text).length > 4000) || (message.from.id == 20471035)) {
					text = "";
					d = new Date(rows[0].time_end);

					if (rows[0].public == 0)
						isPublic = "Privato";
					else
						isPublic = "Pubblico";

					text += "<code>" + rows[0].code + "</code> (Scadenza: " + toDate("it", d) + ") <i>" + isPublic + "</i>\n";
					for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
						if ((i > 0) && (rows[i].code != rows[i - 1].code)) {

							bot.sendMessage(message.chat.id, text, html);
							text = "";

							d = new Date(rows[i].time_end);
							if (rows[i].public == 0)
								isPublic = "Privato";
							else
								isPublic = "Pubblico";
							text += "\n<code>" + rows[i].code + "</code> (Scadenza: " + toDate("it", d) + ") <i>" + isPublic + "</i>\n";
						}
						text += "> " + rows[i].quantity + "x " + rows[i].name + " (" + formatNumber(rows[i].price) + " §)\n";
					}
					bot.sendMessage(message.chat.id, text, html);
				} else
					bot.sendMessage(message.chat.id, text, html);
			} else
				bot.sendMessage(message.chat.id, "Non hai nessun negozio aperto");
		});
	});
});

bot.onText(/^\/privacy (.+)/, function (message, match) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var code = match[1];
		var player_id = rows[0].id;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if ((code == undefined) || (code == "")) {
			bot.sendMessage(message.chat.id, "La sintassi è: /privacy CODICE, puoi anche usare /privacy tutti");
			return;
		}

		if (code == "tutti") {
			connection.query('SELECT player_id, public FROM public_shop WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Non possiedi nessun negozio");
					return;
				}

				var public = rows[0].public;

				if (public == 0) {
					connection.query('UPDATE public_shop SET public = 1 WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Tutti i negozi impostati come _pubblici_!", mark);
					});
				} else if (public == 1) {
					connection.query('UPDATE public_shop SET public = 0 WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Tutti i negozi impostati come _privati_!", mark);
					});
				}
			});
			return;
		}

		code = parseInt(code);
		if (isNaN(code)){
			bot.sendMessage(message.chat.id, "Codice non valido");
			return;
		}

		connection.query('SELECT player_id, public FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, "Non esiste un negozio con quel codice");
				return;
			}

			if (player_id != rows[0].player_id) {
				bot.sendMessage(message.chat.id, "Non sei l'amministratore del negozio");
				return;
			}

			var public = rows[0].public;

			if (public == 0) {
				connection.query('UPDATE public_shop SET public = 1 WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(message.chat.id, "Il negozio è stato impostato _pubblico_!", mark);
				});
			} else if (public == 1) {
				connection.query('UPDATE public_shop SET public = 0 WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(message.chat.id, "Il negozio è stato impostato _privato_!", mark);
				});
			}
		});
	});
});

bot.onText(/^\/massivo (.+)/, function (message, match) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var code = match[1];
		var player_id = rows[0].id;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if ((code == undefined) || (code == "")) {
			bot.sendMessage(message.chat.id, "La sintassi è: /massivo CODICE, puoi anche usare /massivo tutti");
			return;
		}

		if (code == "tutti") {
			connection.query('SELECT player_id, massive FROM public_shop WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Non possiedi nessun negozio");
					return;
				}

				var massive = rows[0].massive;

				if (massive == 0) {
					connection.query('UPDATE public_shop SET massive = 1 WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Tutti i negozi _abilitati_ all'acquisto massivo!", mark);
					});
				} else if (massive == 1) {
					connection.query('UPDATE public_shop SET massive = 0 WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Tutti i negozi _disabilitati_ all'acquisto massivo!", mark);
					});
				}
			});
			return;
		}

		connection.query('SELECT player_id, massive FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, "Non esiste un negozio con quel codice");
				return;
			}

			if (player_id != rows[0].player_id) {
				bot.sendMessage(message.chat.id, "Non sei l'amministratore del negozio");
				return;
			}

			var massive = rows[0].massive;

			code = parseInt(code);
			if (isNaN(code)){
				bot.sendMessage(message.chat.id, "Non sei l'amministratore del negozio");
				return;
			}
			if (massive == 0) {
				connection.query('UPDATE public_shop SET massive = 1 WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(message.chat.id, "Il negozio è _abilitato_ all'acquisto massivo!", mark);
				});
			} else if (massive == 1) {
				connection.query('UPDATE public_shop SET massive = 0 WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(message.chat.id, "Il negozio è _disabilitato_ all'acquisto massivo!", mark);
				});
			}
		});
	});
});

bot.onText(/^\/negozio(?!a|r) (.+)|^\/negozio(?!a|r)$|^\/negozioa$|^\/negozior$|^\/negozioa ([^\s]+) (.+)|^\/negozior ([^\s]+) (.+)|^\/negoziom$|^\/negoziom ([^\s]+) (.+)|^\/negoziou (.+)/, function (message, match) {

	if (!checkSpam(message))
		return;

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (message.chat.id < 0) {
			bot.sendMessage(message.chat.id, "Non puoi gestire un negozio in un gruppo");
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		var func = "";
		if (message.text.indexOf("negozioa") != -1) {
			var code = parseInt(match[2]);
			var text = match[3];

			func = "add";

			if ((text == undefined) || (text == "") || (isNaN(code))) {
				bot.sendMessage(message.chat.id, "Sintassi: /negozioa codice oggetto:prezzo:quantità,oggetto:prezzo:quantità,oggetto:prezzo:quantità.");
				return;
			}
		} else if (message.text.indexOf("negozior") != -1) {
			var code = parseInt(match[4]);
			var text = match[5];

			func = "remove";

			if ((text == undefined) || (text == "") || (isNaN(code))) {
				bot.sendMessage(message.chat.id, "Sintassi: /negozior codice oggetto,oggetto,oggetto.");
				return;
			}
		} else if (message.text.indexOf("negoziom") != -1) {
			var code = parseInt(match[6]);
			var text = match[7];

			func = "update";

			if ((text == undefined) || (text == "") || (isNaN(code))) {
				bot.sendMessage(message.chat.id, "Sintassi: /negoziom codice oggetto:nuovoprezzo:nuovaquantità,oggetto:nuovoprezzo:nuovaquantità.");
				return;
			}
		} else if (message.text.indexOf("negoziou") != -1) {
			var text = match[8];

			func = "refresh";

			if ((text == undefined) || (text == "")) {
				bot.sendMessage(message.chat.id, "Sintassi: /negoziou codice,codice,codice.");
				return;
			}
		} else {
			var codeOk = 0;
			var code = 0;
			while (codeOk == 0){
				code = Math.floor(1000000 + Math.random() * 9000000);
				var exist = connection_sync.query("SELECT 1 FROM public_shop WHERE code = " + code)
				if (Object.keys(exist).length == 0)
					codeOk = 1;
			}

			var text = match[1];

			func = "new";

			if ((text == undefined) || (text == "")) {
				bot.sendMessage(message.chat.id, "Sintassi: /negozio oggetto:prezzo:quantità,oggetto:prezzo:quantità,oggetto:prezzo:quantità.");
				return;
			}
		}

		var privacy = 0;
		var massive = 1;
		if (text.indexOf("#") != -1) {
			privacy = 1;
			text = text.replace("#", "");
		}
		if (text.indexOf("!") != -1) {
			massive = 0;
			text = text.replace("!", "");
		}

		var d = new Date();
		d.setDate(d.getDate() + 4);
		var long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

		var elements = text.split(",");

		if (func == "refresh") {
			var arrLen = Object.keys(elements).length;
			if (arrLen < 1) {
				bot.sendMessage(message.chat.id, "Specifica almeno un codice negozio");
				return;
			}

			if (elements[0] == "tutti") {
				d.setDate(d.getDate() - 2);
				long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

				connection.query('UPDATE public_shop SET time_end = "' + long_date + '" WHERE player_id = ' + player_id, function (err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(message.chat.id, "Tutti i negozi rinnovati per 2 giorni");
				});
				return;
			}

			var code = 0;
			for (var i = 0; i < arrLen; i++) {
				code = elements[i];
				var shopQuery = connection.query('SELECT 1 FROM public_shop WHERE code = ' + code + ' AND player_id = ' + player_id);
				if (Object.keys(shopQuery).length > 0) {
					connection.query('UPDATE public_shop SET time_end = "' + long_date + '" WHERE code = ' + code, function (err, rows, fields) {
						if (err) throw err;
					});
					bot.sendMessage(message.chat.id, "Negozio " + code + " rinnovato per 4 giorni");
				} else
					bot.sendMessage(message.chat.id, "Non hai il permesso per rinnovare il negozio oppure non esiste (" + code + ")");
			}
			return;
		}

		connection.query('SELECT * FROM public_shop WHERE code = ' + code + ' AND player_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err;

			if ((Object.keys(rows).length == 0) && ((func == "add") || (func == "remove") || (func == "update"))){
				bot.sendMessage(message.chat.id, "Nessun negozio trovato con quel codice, oppure non sei l'amministratore");
				return;
			}

			var len = Object.keys(elements).length;
			if (len > 10) {
				bot.sendMessage(message.chat.id, "Massimo 10 oggetti grazie!");
				return;
			}

			if (((Object.keys(rows).length + len) > 10) && (func == "add")) {
				bot.sendMessage(message.chat.id, "Massimo 10 oggetti grazie!");
				return;
			}

			var items = [];
			var prices = [];
			var quantities = [];

			if (len == 0) {
				bot.sendMessage(message.chat.id, "Errore, controlla la sintassi");
				return;
			}

			var splitted = [];
			var text = "";

			var re = new RegExp("^[0-9]*$");

			if (func == "remove") {
				text = "Riassunto oggetti rimossi:\n";

				var cnt = 0;
				var item_id = 0;
				var item_name = "";

				for (var i = 0; i < len; i++) {
					var itemQuery = connection_sync.query('SELECT id, name FROM item WHERE name = "' + elements[i] + '"');
					if (Object.keys(itemQuery).length == 0)
						text += "Oggetto non trovato: " + elements[i] + "\n";
					else{
						item_id = itemQuery[0].id;
						item_name = itemQuery[0].name;
						var shopQuery = connection_sync.query('SELECT id FROM public_shop WHERE item_id = ' + item_id + ' AND code = ' + code);
						if (Object.keys(shopQuery).length == 0)
							text += "Oggetto non presente nel negozio: " + item_name + "\n";
						else{
							connection.query('DELETE FROM public_shop WHERE id = ' + shopQuery[0].id, function (err, rows, fields) {
								if (err) throw err;
							});
							text += "Oggetto rimosso: " + item_name + "\n";
							cnt++;
						}
					}
				}

				if (cnt == 0)
					text += "Nessun oggetto rimosso";
				else{
					connection.query('UPDATE public_shop SET time_end = "' + long_date + '" WHERE code = ' + code, function (err, rows, fields) {
						if (err) throw err;
					});
				}
			} else if (func == "update") {
				text = "Riassunto oggetti modificati:\n";

				var splitted = [];
				var item = 0;
				var price = 0;
				var quantity = 0;
				var cnt = 0;
				var item_id = 0;
				var item_value = 0;
				var item_name = "";

				for (var i = 0; i < len; i++) {
					splitted = elements[i].split(":");

					item = splitted[0].trim();
					if (splitted[1] == undefined)
						price = 0;
					else
						price = parseInt(splitted[1].replace(/[^\w\s]/gi, '').trim());
					if (splitted[2] == undefined)
						quantity = 1;
					else
						quantity = parseInt(splitted[2].replace(/[^\w\s]/gi, '').trim());

					if (isNaN(price))
						price = 0;

					if (isNaN(quantity))
						quantity = 1;

					if ((price < 0) || (re.test(price) == false)) {
						bot.sendMessage(message.chat.id, "Il prezzo " + formatNumber(price) + " non è valido");
						break;
						return;
					}

					if ((quantity < 0) || (re.test(quantity) == false)) {
						bot.sendMessage(message.chat.id, "La quantità " + quantità + " non è valida");
						break;
						return;
					}

					var itemQuery = connection_sync.query('SELECT id, name, craftable, value FROM item WHERE name = "' + item + '"');
					if (Object.keys(itemQuery).length == 0)
						text += "Oggetto non trovato: " + item + "\n";
					else{
						item_name = itemQuery[0].name;
						item_id = itemQuery[0].id;
						item_value = itemQuery[0].value;
						if (price < item_value){
							text += "Oggetto impostato prezzo minimo: " + item_name + " (" + formatNumber(item_value) + ")\n";
							price = item_value;
						}
						if (price > 1000000000){
							text += "Oggetto impostato prezzo massimo: " + item_name + " (" + formatNumber(1000000000) + ")\n";
							price = 1000000000;
						}

						if ((quantity == 0) || (quantity == "")){
							text += "Oggetto impostato quantità: " + item_name + " (1)\n";
							quantity = 1;
						}

						var shopQuery = connection_sync.query('SELECT id FROM public_shop WHERE item_id = ' + item_id + ' AND code = ' + code);
						if (Object.keys(shopQuery).length == 0)
							text += "Oggetto non presente nel negozio: " + item_name + "\n";
						else{
							connection.query('UPDATE public_shop SET price = ' + price + ', quantity = ' + quantity + ' WHERE id = ' + shopQuery[0].id, function (err, rows, fields) {
								if (err) throw err;
							});
							text += "Oggetto aggiornato: " + quantity + "x " + item_name + " a " + formatNumber(price) + "§\n";
							cnt++;
						}
					}
				}

				if (cnt == 0)
					text += "Nessun oggetto aggiornato";
				else{
					connection.query('UPDATE public_shop SET time_end = "' + long_date + '" WHERE code = ' + code, function (err, rows, fields) {
						if (err) throw err;
					});
				}
			} else if ((func == "add") || (func == "new")) {
				text = "Riassunto oggetti aggiunti:\n";

				connection.query('UPDATE public_shop SET time_end = "' + long_date + '" WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err;
				});

				var splitted = [];
				var item = 0;
				var price = 0;
				var quantity = 0;
				var cnt = 0;
				var item_id = 0;
				var item_value = 0;
				var item_name = "";
				var cnt = 0;

				for (var i = 0; i < len; i++) {
					splitted = elements[i].split(":");

					item = splitted[0].trim();
					if (splitted[1] == undefined)
						price = 0;
					else
						price = parseInt(splitted[1].replace(/[^\w\s]/gi, '').trim());
					if (splitted[2] == undefined)
						quantity = 1;
					else
						quantity = parseInt(splitted[2].replace(/[^\w\s]/gi, '').trim());

					if (isNaN(price))
						price = 0;

					if (isNaN(quantity))
						quantity = 1;

					if ((price < 0) || (re.test(price) == false)) {
						bot.sendMessage(message.chat.id, "Il prezzo " + formatNumber(price) + " non è valido");
						break;
						return;
					}

					if ((quantity < 0) || (re.test(quantity) == false)) {
						bot.sendMessage(message.chat.id, "La quantità " + quantity + " non è valida");
						break;
						return;
					}

					var itemQuery = connection_sync.query('SELECT id, name, craftable, value, allow_sell FROM item WHERE name = "' + item + '"');
					if (Object.keys(itemQuery).length == 0)
						text += "Oggetto non trovato: " + item + "\n";
					else{
						item_name = itemQuery[0].name;
						if (itemQuery[0].allow_sell == 0)
							text += "Oggetto non vendibile: " + item_name + "\n";
						else {
							item_id = itemQuery[0].id;
							item_value = itemQuery[0].value;
							if (price < item_value){
								text += "Oggetto impostato prezzo minimo: " + item_name + " (" + formatNumber(item_value) + ")\n";
								price = item_value;
							}

							if (price > 1000000000){
								text += "Oggetto impostato prezzo massimo: " + item_name + " (" + formatNumber(1000000000) + ")\n";
								price = 1000000000;
							}

							if ((quantity == 0) || (quantity == "")){
								text += "Oggetto impostato quantità: " + item_name + " (1)\n";
								quantity = 1;
							}

							var paramQuery = connection_sync.query('SELECT public, massive FROM public_shop WHERE code = ' + code);
							var shopQuery = connection_sync.query('SELECT id, public, massive FROM public_shop WHERE item_id = ' + item_id + ' AND code = ' + code);
							if (Object.keys(shopQuery).length > 0)
								text += "Oggetto già presente: " + item_name + "\n";
							else{
								if (func == "add") {
									privacy = paramQuery[0].public;
									massive = paramQuery[0].massive;
								}
								connection.query('INSERT INTO public_shop (player_id, code, item_id, price, quantity, time_end, public, massive) VALUES (' + player_id + ',' + code + ',' + item_id + ',' + price + ',' + quantity + ',"' + long_date + '",' + privacy + ',' + massive + ')', function (err, rows, fields) {
									if (err) throw err;
								});

								text += "Oggetto aggiunto: " + quantity + "x " + item_name + " a " + formatNumber(price) + " §\n";
								cnt++;
							}
						}
					}
				}

				if (cnt == 0)
					text += "Nessun oggetto aggiunto";
				else{
					if (func == "new") {
						text += "\nPrivacy negozio: " + ((privacy == 1) ? "_Pubblico_" : "_Privato_");
						text += "\nAcquisto massivo: " + ((massive == 1) ? "_Abilitato_" : "_Disabilitato_");
					}
				}
			}

			if (cnt > 0){
				text += "\nScadrà il " + toDate("it", d);
				text += "\n\nInline: `@lootplusbot " + code + "`";

				var iKeys = [];
				iKeys.push([{
					text: "Condividi Negozio",
					switch_inline_query: code
				}]);

				bot.sendMessage(message.chat.id, text, {
					parse_mode: 'Markdown',
					reply_markup: {
						inline_keyboard: iKeys
					}
				});
			}else
				bot.sendMessage(message.chat.id, text, mark);
		});
	});
});

bot.onText(/^\/cancellanegozio (.+)|^\/cancellanegozio$/, function (message, match) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var code = match[1];
		var player_id = rows[0].id;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (message.reply_to_message != undefined) {
			var cod = message.reply_to_message.text.match(/[0-9]{7,11}/g);
			if (cod[0] != undefined)
				code = cod[0];
		}

		if ((code == undefined) || (code == "")) {
			bot.sendMessage(message.chat.id, "La sintassi è: /cancellanegozio CODICE, puoi anche usare /cancellanegozio tutti/privati/pubblici. Se usato in risposta il messaggio principale deve contenere il codice negozio intero");
			return;
		}

		if (code == "tutti") {
			connection.query('SELECT player_id FROM public_shop WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Non possiedi nessun negozio");
					return;
				}
				connection.query('DELETE FROM public_shop WHERE player_id = ' + player_id, function (err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(message.chat.id, "Tutti i negozi sono stati eliminati!");
				});
			});
			return;
		}

		if (code == "privati") {
			connection.query('SELECT player_id FROM public_shop WHERE public = 0 AND player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Non possiedi nessun negozio privato");
					return;
				}
				connection.query('DELETE FROM public_shop WHERE public = 0 AND player_id = ' + player_id, function (err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(message.chat.id, "Tutti i negozi privati sono stati eliminati!");
				});
			});
			return;
		}

		if (code == "pubblici") {
			connection.query('SELECT player_id FROM public_shop WHERE public = 1 AND player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Non possiedi nessun negozio pubblico");
					return;
				}
				connection.query('DELETE FROM public_shop WHERE public = 1 AND player_id = ' + player_id, function (err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(message.chat.id, "Tutti i negozi pubblici sono stati eliminati!");
				});
			});
			return;
		}

		if (isNaN(code)){
			bot.sendMessage(message.chat.id, "Codice negozio non valido");
			return;
		}

		connection.query('SELECT player_id FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, "Non esiste un negozio con quel codice");
				return;
			}

			if (player_id != rows[0].player_id) {
				bot.sendMessage(message.chat.id, "Non sei l'amministratore del negozio");
				return;
			}

			connection.query('DELETE FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
				if (err) throw err;
				bot.sendMessage(message.chat.id, "Il negozio è stato eliminato!");
			});
		});
	});
});

function genToken(player_id) {
	var randPassword = Array(16).fill("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz").map(function (x) {
		return x[Math.floor(Math.random() * x.length)]
	}).join('');
	return randPassword + player_id;
}

bot.on('callback_query', function (message) {
	connection.query('SELECT account_id, market_ban, money, id, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0){
			bot.answerCallbackQuery(message.id, {text: 'Non sei registrato al gioco!'});
			return;
		}

		var player_id = rows[0].id;
		var money = rows[0].money;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.from.id, text, mark);
			return;
		}

		if (message.data.indexOf("token_new") != -1) {
			connection.query('SELECT id FROM token WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;

				var token = genToken(player_id);

				if (Object.keys(rows).length == 0) {
					connection.query('INSERT INTO token (player_id, token, status) VALUES (' + player_id + ',"' + token + '","OK")', function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.from.id, "Il token è stato generato con successo: <code>" + token + "</code>", html);
					});
				} else {
					connection.query('UPDATE token SET token = "' + token + '", status = "UPDATED" WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.from.id, "Il token è stato rinnovato con successo: <code>" + token + "</code>", html);
					});
				}
			});
			return;
		}

		if (message.data.indexOf("token_del") != -1) {
			connection.query('SELECT id FROM token WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.from.id, "Nessun token impostato");
				} else {
					connection.query('UPDATE token SET token = NULL, status = "REVOKED" WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.from.id, "Il token è stato revocato con successo");
					});
				}
			});
			return;
		}

		if (message.data.indexOf("asta") != -1) {
			var split = message.data.split(":");
			var auction_id = parseInt(split[1]);
			var offer = parseInt(split[2]);

			if (rows[0].market_ban == 1)
				return;

			if (rows[0].holiday == 1)
				return;

			var money = rows[0].money;
			var player_id = rows[0].id;

			connection.query('SELECT auction_list.id, last_price, creator_id, last_player, item_id, time_end, nickname FROM auction_list, player WHERE player.id = auction_list.creator_id AND auction_list.id = ' + auction_id, function (err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length == 0) {
					bot.answerCallbackQuery(message.id, {text: 'L\'asta non esiste più'});
					return;
				}

				var last_price = parseInt(rows[0].last_price);
				var auction_id = rows[0].id;
				var last_player = rows[0].last_player;
				var itemId = rows[0].item_id;
				var creator_nickname = rows[0].nickname;
				var creator_id = rows[0].creator_id;
				var price = last_price + offer;

				if (money < price) {
					bot.answerCallbackQuery(message.id, {text: 'Non hai abbastanza credito, ti servono ' + formatNumber(price) + ' §'});
					return;
				}

				if (player_id == creator_id) {
					bot.answerCallbackQuery(message.id, {text: 'Non puoi rialzare la tua asta'});
					return;
				}

				if (player_id == last_player) {
					bot.answerCallbackQuery(message.id, {text: 'Non puoi rialzare la tua offerta'});
					return;
				}

				connection.query('SELECT name FROM item WHERE id = ' + itemId, function (err, rows, fields) {
					if (err) throw err;
					var itemName = rows[0].name;

					connection.query('SELECT account_id FROM player WHERE id = ' + last_player, function (err, rows, fields) {
						if (err) throw err;
						if (Object.keys(rows).length > 0) {
							var account_id = rows[0].account_id;
							connection.query('UPDATE player SET money = money + ' + last_price + ' WHERE id = ' + last_player, function (err, rows, fields) {
								if (err) throw err;
								bot.sendMessage(account_id, "Sei stato superato nell'asta di " + creator_nickname + " per " + itemName + ", dove *" + message.from.username + "* ha offerto *" + formatNumber(price) + "* §", mark);
							});
						}
					});

					var d = new Date();
					d.setMinutes(d.getMinutes() + 120);
					var long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
					var short_date = addZero(d.getHours()) + ":" + addZero(d.getMinutes()) + ":" + addZero(d.getSeconds());

					connection.query('UPDATE auction_list SET time_end = "' + long_date + '", last_price = ' + price + ', last_player = ' + player_id + ' WHERE id = ' + auction_id, function (err, rows, fields) {
						if (err) throw err;
						connection.query('UPDATE player SET money = money - ' + price + ' WHERE id = ' + player_id, function (err, rows, fields) {
							if (err) throw err;

							bot.answerCallbackQuery(message.id, {text: 'Hai offerto ' + formatNumber(price) + ' § per ' + itemName});

							var iKeys = [];
							iKeys.push([{
								text: "+100",
								callback_data: "asta:" + auction_id + ":" + "100"
							}]);
							iKeys.push([{
								text: "+1k",
								callback_data: "asta:" + auction_id + ":" + "1000"
							}]);
							iKeys.push([{
								text: "+10k",
								callback_data: "asta:" + auction_id + ":" + "10000"
							}]);

							var text = "<b>Asta per " + itemName + "</b>\n\n<b>Creatore</b>: " + creator_nickname + "\n<b>Offerta</b>: " + formatNumber(price) + " §\n<b>Offerente:</b> " + message.from.username + "\n<b>Scade alle:</b> " + short_date;

							bot.editMessageText(text, {
								chat_id: message.message.chat.id,
								message_id: message.message.message_id,
								parse_mode: 'HTML',
								reply_markup: {
									inline_keyboard: iKeys
								}
							});
						});
					});
				});
			});
			return;
		}

		var index = check.indexOf(message.from.id);
		var shop_id = message.data;
		var diff = 0;

		if ((shop_id.indexOf(":") == -1) || (shop_id.indexOf("all") != -1)) {
			if (index == -1) {
				check.push(message.from.id);
				bot.answerCallbackQuery(message.id, {text: 'Premi ancora per confermare'});
				return;
			} else
				index = check.indexOf(message.from.id);

			if (timevar[message.from.id] != undefined) {
				diff = Math.round(new Date() / 1000) - timevar[message.from.id];
				if (diff < 2) {
					bot.answerCallbackQuery(message.id, {text: 'Attendi 2 secondi e riprova'});
					return;
				}
			}
			timevar[message.from.id] = Math.round(new Date() / 1000);
		}

		if (rows[0].market_ban == 1) {
			bot.answerCallbackQuery(message.id, {text: 'Sei bannato dal mercato!'});
			return;
		}

		if (rows[0].holiday == 1) {
			bot.answerCallbackQuery(message.id, {text: 'Sei in modalità vacanza!'});
			return;
		}

		var isUpdate = 0;

		if (shop_id.indexOf(":") != -1) {
			var split = shop_id.split(":");
			var code = split[1];

			if (split[0] == "update"){
				updateShop(message, code);
				check.splice(index, 1);
			}else if (split[0] == "all"){
				connection.query('SELECT SUM(quantity) As cnt FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err;

					if (rows[0].cnt == 0){
						bot.answerCallbackQuery(message.id, {text: "Il negozio è vuoto"});
						check.splice(index, 1);
						return;
					}

					connection.query('SELECT player_id, price, item_id, quantity, massive FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
						if (err) throw err;

						if (Object.keys(rows).length == 0){
							bot.answerCallbackQuery(message.id, {text: "Il codice negozio non esiste"});
							check.splice(index, 1);
							return;
						}

						if (rows[0].massive == 0){
							bot.answerCallbackQuery(message.id, {text: "Acquisto massivo disabilitato per questo negozio"});
							check.splice(index, 1);
							return;
						}

						var player_id2 = rows[0].player_id;
						var total_price = 0;

						for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
							var item = connection_sync.query('SELECT item.name, inventory.quantity FROM inventory, item WHERE inventory.item_id = item.id AND item.id = ' + rows[i].item_id + ' AND inventory.player_id = ' + rows[i].player_id + ' AND inventory.quantity > 0');

							if (Object.keys(item).length == 0) {
								bot.answerCallbackQuery(message.id, {text: "Il proprietario non possiede tutti gli oggetti!"});
								check.splice(index, 1);
								return;
							}
							if (rows[i].quantity < 1) {
								bot.answerCallbackQuery(message.id, {text: "Sono finite le scorte per " + item[0].name});
								check.splice(index, 1);
								return;
							}
							if (item[0].quantity < rows[i].quantity) {
								bot.answerCallbackQuery(message.id, {text: "Il proprietario non possiede abbastanza " + item[0].name});
								check.splice(index, 1);
								return;
							}
							total_price += rows[i].price*rows[i].quantity;
						}

						if (money - total_price < 0) {
							bot.answerCallbackQuery(message.id, {text: 'Non hai abbastanza credito, ti servono ' + formatNumber(total_price) + ' §!'});
							check.splice(index, 1);
							return;
						}

						connection.query('SELECT nickname, account_id, market_ban FROM player WHERE id = ' + player_id2, function (err, rows, fields) {
							if (err) throw err;

							var player2 = rows[0].nickname;
							var chat_id2 = rows[0].account_id;

							var banReason = isBanned(rows[0].account_id);
							if (banReason != null) {
								bot.answerCallbackQuery(message.id, {text: 'Non puoi acquistare da un giocatore bannato'});
								check.splice(index, 1);
								return;
							}

							if (rows[0].market_ban == 1) {
								bot.answerCallbackQuery(message.id, {text: 'Non puoi acquistare da un giocatore escluso dal mercato'});
								check.splice(index, 1);
								return;
							}

							if (player_id == player_id2) {
								bot.answerCallbackQuery(message.id, {text: 'Non puoi acquistare da te stesso!'});
								check.splice(index, 1);
								return;
							}

							connection.query('UPDATE player SET money = money + ' + total_price + ' WHERE id = ' + player_id2, function (err, rows, fields) {
								if (err) throw err;
								if (rows.affectedRows == 0) {
									bot.answerCallbackQuery(message.id, {text: 'Errore durante l\'acquisto, riprova'});
									check.splice(index, 1);
									return;
								}
								connection.query('UPDATE player SET money = money - ' + total_price + ' WHERE money > 0 AND id = ' + player_id, function (err, rows, fields) {
									if (err) throw err;
									if (rows.affectedRows == 0) {
										bot.answerCallbackQuery(message.id, {text: 'Errore durante l\'acquisto, riprova'});
										check.splice(index, 1);
										return;
									}

									connection.query('SELECT player_id, price, item_id, quantity FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
										if (err) throw err;

										var d2 = new Date();
										var long_date = d2.getFullYear() + "-" + addZero(d2.getMonth() + 1) + "-" + addZero(d2.getDate()) + " " + addZero(d2.getHours()) + ':' + addZero(d2.getMinutes()) + ':' + addZero(d2.getSeconds());

										var text = "Hai acquistato il negozio di " + player2 + " contenente:\n";
										var len = Object.keys(rows).length;

										//console.log("Acquisto completo negozio:");
										for (var i = 0; i < len; i++) {
											if (rows[i].quantity > 0){
												addItem(player_id, rows[i].item_id, rows[i].quantity);
												delItem(player_id2, rows[i].item_id, rows[i].quantity);
												var item = connection_sync.query('SELECT name FROM item WHERE id = ' + rows[i].item_id);
												text += "> " + formatNumber(rows[i].quantity) + "x " + item[0].name + " per " + formatNumber(rows[i].quantity*rows[i].price) + " §\n";

												//console.log(formatNumber(rows[i].quantity) + "x " + item[0].name + " per " + formatNumber(rows[i].quantity*rows[i].price));

												connection.query('INSERT INTO market_direct_history (item_id, price, quantity, time, from_id, to_id, type) VALUES (' + rows[i].item_id + ',' + rows[i].price + ',' + rows[i].quantity + ',"' + long_date + '",' + player_id2 + ',' + player_id + ',2)', function (err, rows, fields) {
													if (err) throw err;
												});
											}
										}
										text += "\nPer un totale di " + formatNumber(total_price) + " §\n";

										console.log(getNow("it") + " - Acquisto di tutto il negozio da parte di " + message.from.username + " (" + shop_id + ", " + total_price + " §)");

										connection.query('UPDATE public_shop SET quantity = 0 WHERE quantity > 0 AND code = ' + code, function (err, rows, fields) {
											if (err) throw err;
											if (rows.affectedRows == 0) {
												bot.answerCallbackQuery(message.id, {text: 'Errore durante l\'acquisto, riprova'});
												return;
											}

											bot.sendMessage(message.from.id, text);
											bot.answerCallbackQuery(message.id, {text: 'Acquisto completato per ' + formatNumber(total_price) + ' §!'});

											connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + player_id2 + ' AND type = 2', function (err, rows, fields) {
												if (err) throw err;
												var notify = 0;
												if (Object.keys(rows).length == 0) {
													notify = 1;
												} else {
													if (rows[0].deny == 0) {
														notify = 1;
													}
												}
												if (notify == 1) {
													bot.sendMessage(chat_id2, message.from.username + " ha acquistato tutto il tuo negozio (" + code + ") per " + formatNumber(total_price) + " §!\nDi conseguenza tutte le quantità sono state impostate a zero.");
												};
											});

											updateShop(message, code);
											check.splice(index, 1);
										});
									});
								});
							});
						});
					});
				});
			}
			return;
		}

		connection.query('SELECT player_id, price, item_id, quantity, code FROM public_shop WHERE id = ' + shop_id, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				bot.answerCallbackQuery(message.id, {text: 'L\'oggetto è stato rimosso, aggiorna il negozio!'});
				check.splice(index, 1);
				return;
			}

			var player_id2 = rows[0].player_id;
			var price = rows[0].price;
			var item_id = rows[0].item_id;
			var quantity = rows[0].quantity;
			var code = rows[0].code;

			connection.query('SELECT nickname, account_id, market_ban FROM player WHERE id = ' + player_id2, function (err, rows, fields) {
				if (err) throw err;

				var player2 = rows[0].nickname;
				var chat_id2 = rows[0].account_id;

				var banReason = isBanned(rows[0].account_id);
				if (banReason != null) {
					bot.answerCallbackQuery(message.id, {text: 'Non puoi acquistare da un giocatore bannato'});
					check.splice(index, 1);
					return;
				}

				if (rows[0].market_ban == 1) {
					bot.answerCallbackQuery(message.id, {text: 'Non puoi acquistare da un giocatore escluso dal mercato'});
					check.splice(index, 1);
					return;
				}

				if (money - price < 0) {
					bot.answerCallbackQuery(message.id, {text: 'Non hai abbastanza monete!'});
					check.splice(index, 1);
					return;
				}

				if (quantity < 1) {
					bot.answerCallbackQuery(message.id, {text: 'Sono finite le scorte dell\'oggetto richiesto!'});
					check.splice(index, 1);
					return;
				}

				if (player_id == player_id2) {
					bot.answerCallbackQuery(message.id, {text: 'Non puoi acquistare da te stesso!'});
					check.splice(index, 1);
					return;
				}

				connection.query('SELECT item.name, inventory.quantity FROM inventory, item WHERE inventory.item_id = item.id AND item.id = ' + item_id + ' AND inventory.player_id = ' + player_id2 + ' AND inventory.quantity > 0', function (err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length == 0) {
						bot.answerCallbackQuery(message.id, {text: 'Il proprietario del negozio non possiede l\'oggetto'});
						check.splice(index, 1);
						return;
					}
					if (rows[0].quantity == 0) {
						bot.answerCallbackQuery(message.id, {text: 'Il proprietario del negozio non possiede l\'oggetto'});
						check.splice(index, 1);
						return;
					}

					var item_name = rows[0].name;

					connection.query('UPDATE player SET money = money + ' + price + ' WHERE id = ' + player_id2, function (err, rows, fields) {
						if (err) throw err;
						if (rows.affectedRows == 0) {
							bot.answerCallbackQuery(message.id, {text: 'Errore durante l\'acquisto, riprova'});
							check.splice(index, 1);
							return;
						}
						connection.query('UPDATE player SET money = money - ' + price + ' WHERE money > 0 AND id = ' + player_id, function (err, rows, fields) {
							if (err) throw err;
							if (rows.affectedRows == 0) {
								bot.answerCallbackQuery(message.id, {text: 'Errore durante l\'acquisto, riprova'});
								check.splice(index, 1);
								return;
							}
							connection.query('UPDATE public_shop SET quantity = quantity - 1 WHERE quantity > 0 AND id = ' + shop_id, function (err, rows, fields) {
								if (err) throw err;
								if (rows.affectedRows == 0) {
									bot.answerCallbackQuery(message.id, {text: 'Errore durante l\'acquisto, riprova'});
									check.splice(index, 1);
									return;
								}

								delItem(player_id2, item_id, 1);
								addItem(player_id, item_id);

								bot.answerCallbackQuery(message.id, {text: 'Acquistato ' + item_name + ' per ' + formatNumber(price) + ' §!'});

								connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + player_id2 + ' AND type = 2', function (err, rows, fields) {
									if (err) throw err;
									var notify = 0;
									if (Object.keys(rows).length == 0) {
										notify = 1;
									} else {
										if (rows[0].deny == 0) {
											notify = 1;
										}
									}
									if (notify == 1) {
										bot.sendMessage(chat_id2, message.from.username + " ha acquistato " + item_name + " per " + formatNumber(price) + " § dal tuo negozio (" + code + ")!");
									};
								});								

								if (quantity - 1 == 0)
									bot.sendMessage(chat_id2, "Le scorte di " + item_name + " sono terminate!");

								var d2 = new Date();
								var long_date = d2.getFullYear() + "-" + addZero(d2.getMonth() + 1) + "-" + addZero(d2.getDate()) + " " + addZero(d2.getHours()) + ':' + addZero(d2.getMinutes()) + ':' + addZero(d2.getSeconds());

								connection.query('INSERT INTO market_direct_history (item_id, price, time, from_id, to_id, type) VALUES (' + item_id + ',' + price + ',"' + long_date + '",' + player_id2 + ',' + player_id + ',2)', function (err, rows, fields) {
									if (err) throw err;
								});

								console.log(getNow("it") + " - Acquisto da parte di " + message.from.username + " (" + shop_id + ", " + item_name + ", " + price + " §)");

								updateShop(message, code);

								check.splice(index, 1);
								if (Object.keys(check).length > 100)
									check = [];
							});
						});
					});
				});
			});
		});
	});
});

function updateShop(message, code){
	connection.query('SELECT public_shop.id, player.nickname, quantity, item.name, price, massive FROM public_shop, item, player WHERE player.id = public_shop.player_id AND item.id = item_id AND code = ' + code, function (err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0) {
			bot.editMessageText("Questo negozio è stato cancellato :(", {
				inline_message_id: message.inline_message_id
			});
			return;
		}

		var iKeys = [];
		var name = "";
		var total_price = 0;
		for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
			name = cutText(rows[i].name);
			iKeys.push([{
				text: name + " (" + rows[i].quantity + ") - " + formatNumber(rows[i].price) + " §",
				callback_data: rows[i].id.toString()
			}]);
			total_price += parseInt(rows[i].price*rows[i].quantity);
		}

		if (rows[0].massive == 1){
			iKeys.push([{
				text: "💰 Compra tutto - " + formatNumber(total_price) + " §",
				callback_data: "all:" + code.toString()
			}]);
		}

		iKeys.push([{
			text: "♻️ Aggiorna",
			callback_data: "update:" + code.toString()
		}]);

		var d = new Date();
		var short_date = addZero(d.getHours()) + ":" + addZero(d.getMinutes()) + ":" + addZero(d.getSeconds());

		var text = "Negozio di " + rows[0].nickname + " aggiornato alle " + short_date + "!";

		bot.editMessageText(text, {
			inline_message_id: message.inline_message_id,
			reply_markup: {
				inline_keyboard: iKeys
			}
		});
		bot.answerCallbackQuery(message.id, {text: 'Negozio aggiornato!'});
	});
}

bot.onText(/^\/crealotteria(?!p) (.+)|^\/crealotteria(?!p)$/, function (message, match) {
	var oggetto = match[1];
	if ((oggetto == undefined) || (oggetto == "")) {
		bot.sendMessage(message.chat.id, "Per inserire una lotteria utilizza la seguente sintassi: /crealotteria NomeOggetto, l'oggetto viene rimosso dall'inventario appena creata la lotteria e il numero di partecipanti minimo è 5");
		return;
	}

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		connection.query('SELECT 1 FROM public_lottery WHERE creator_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0) {
				bot.sendMessage(message.chat.id, "Puoi gestire solo una lotteria alla volta");
				return;
			}

			connection.query('SELECT 1 FROM public_lottery WHERE chat_id = -1001069842056', function (err, rows, fields) {
				if (err) throw err;
				if ((Object.keys(rows).length > 0) && (message.chat.id == -1001069842056)) {
					bot.sendMessage(message.chat.id, "In questo gruppo può esistere solamente una lotteria alla volta");
					return;
				}


				connection.query('SELECT item.allow_sell, item.id FROM inventory, item WHERE inventory.item_id = item.id AND item.name = "' + oggetto + '" AND inventory.player_id = ' + player_id + ' AND inventory.quantity > 0', function (err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, "Devi possedere l'oggetto per creare una lotteria");
						return;
					}

					if (rows[0].allow_sell == 0) {
						bot.sendMessage(message.chat.id, "Questo oggetto non può essere utilizzato per una lotteria");
						return;
					}

					var item_id = rows[0].id;
					delItem(player_id, item_id, 1);

					var d = new Date();
					d.setHours(d.getHours() + 48);
					var long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

					connection.query('INSERT INTO public_lottery (chat_id, creator_id, item_id, time_end) VALUES (' + message.chat.id + ',' + player_id + ',' + item_id + ',"' + long_date + '")', function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Lotteria creata! Usa /lotteria @" + message.from.username + " per iscriverti e /estrazione per estrarre il vincitore. Partecipanti minimi: 5.\nScadrà tra 48 ore.");
					});
				});
			});
		});
	});
});

bot.onText(/^\/crealotteriap ([^\s]+) (.+)|^\/crealotteriap$/, function (message, match) {
	if ((message.chat.id == "-1001069842056") || (message.chat.id == "-1001064571576")) {
		bot.sendMessage(message.chat.id, "Non possono essere create lotterie in questo gruppo");
		return;
	}

	var oggetto = match[2];
	var prezzo = match[1];
	if ((oggetto == undefined) || (oggetto == "") || (isNaN(prezzo)) || (prezzo == 0)) {
		bot.sendMessage(message.chat.id, "Per inserire una lotteria a pagamento utilizza la seguente sintassi: /crealotteriap Prezzo NomeOggetto, l'oggetto viene rimosso dall'inventario appena creata la lotteria e il numero di partecipanti minimo è 5. Se la lotteria viene annullata le monete vengono restituite.", mark);
		return;
	}

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		connection.query('SELECT 1 FROM public_lottery WHERE creator_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0) {
				bot.sendMessage(message.chat.id, "Puoi gestire solo una lotteria alla volta");
				return;
			}

			connection.query('SELECT 1 FROM public_lottery WHERE chat_id = -1001069842056', function (err, rows, fields) {
				if (err) throw err;
				if ((Object.keys(rows).length > 0) && (message.chat.id == -1001069842056)) {
					bot.sendMessage(message.chat.id, "In questo gruppo può esistere solamente una lotteria alla volta");
					return;
				}

				connection.query('SELECT item.id, item.allow_sell, item.value, item.rarity FROM inventory, item WHERE inventory.item_id = item.id AND item.name = "' + oggetto + '" AND inventory.player_id = ' + player_id + ' AND inventory.quantity > 0', function (err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, "Devi possedere l'oggetto per creare una lotteria");
						return;
					}

					if ((rows[0].allow_sell == 0) || (rows[0].rarity == "IN")) {
						bot.sendMessage(message.chat.id, "Questo oggetto non può essere utilizzato per una lotteria a pagamento");
						return;
					}

					var item_id = rows[0].id;

					if ((prezzo > parseInt(rows[0].value)) || (prezzo < Math.round(rows[0].value / 100))) {
						bot.sendMessage(message.chat.id, "Il prezzo inserito non è valido, max: " + parseInt(rows[0].value) + ", min: " + Math.round(rows[0].value / 100));
						return;
					}

					var d = new Date();
					d.setHours(d.getHours() + 48);
					var long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

					delItem(player_id, item_id, 1);

					connection.query('INSERT INTO public_lottery (chat_id, creator_id, item_id, price, time_end) VALUES (' + message.chat.id + ',' + player_id + ',' + item_id + ',' + prezzo + ',"' + long_date + '")', function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Lotteria creata! Usa /lotteriap @" + message.from.username + " per iscriverti e /estrazione per estrarre il vincitore. Partecipanti minimi: 5\nPrezzo partecipazione: " + formatNumber(prezzo) + " §.\nScadrà tra 48 ore.");
					});
				});
			});
		});
	});
});

bot.onText(/^\/estrazione/, function (message) {

	/*
	if (message.from.id != 20471035){
		bot.sendMessage(message.chat.id, "L'estrazione manuale è al momento disabilitata", mark)
		return;
	}
	*/

	if (!checkSpam(message)) {
		return;
	}

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...", mark)
			return;
		}

		connection.query('SELECT id, item_id, money FROM public_lottery WHERE creator_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, "Non esiste nessuna lotteria creata da te");
				return;
			}

			var lottery_id = rows[0].id;
			var item_id = rows[0].item_id;
			var money = rows[0].money;

			connection.query('SELECT player_id FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
				if (err) throw err;
				var num = Object.keys(rows).length;
				if (Object.keys(rows).length < 5) {
					bot.sendMessage(message.chat.id, "Non ci sono abbastanza partecipanti per l'estrazione: " + Object.keys(rows).length + "/5");
					return;
				}
				var rand = Math.round(Math.random() * (Object.keys(rows).length - 1));
				//console.log("Estrazione: " + rand);
				var extracted = rows[rand].player_id;
				connection.query('SELECT nickname FROM player WHERE id = ' + extracted, function (err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, "Non ho trovato il giocatore estratto!");
						return;
					}

					var nickname = rows[0].nickname;
					addItem(extracted, item_id);
					connection.query('SELECT item.name FROM item WHERE id = ' + item_id, function (err, rows, fields) {
						if (err) throw err;
						var itemName = rows[0].name;
						var extra = "";
						if (money > 0) {
							extra = " ed un ammontare pari a " + money + " §";
						}
						bot.sendMessage(message.chat.id, "Estrazione per " + itemName + " con " + num + " partecipanti" + extra + "!\n\nIl vincitore è: @" + nickname + "!");

						connection.query('UPDATE player SET money = money+' + money + ' WHERE id = ' + player_id, function (err, rows, fields) {
							if (err) throw err;
							//console.log("Consegnati " + money + " § al creatore");
						});

						var d = new Date();
						var long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

						connection.query('INSERT INTO public_lottery_history (creator_id, player_id, item_id, money, time) VALUES (' + player_id + ',' + extracted + ',' + item_id + ',' + money + ',"' + long_date + '")', function (err, rows, fields) {
							if (err) throw err;
						});

						connection.query('SELECT chat_id, nickname, account_id FROM public_lottery_players, player WHERE player.id = player_id AND lottery_id = ' + lottery_id, function (err, rows, fields) {
							if (err) throw err;
							for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
								if (rows[i].nickname != nickname) {
									bot.sendMessage(rows[i].chat_id, "Estrazione per " + itemName + " terminata, purtroppo hai perso!");
								} else {
									bot.sendMessage(rows[i].chat_id, "Estrazione per " + itemName + " terminata, HAI VINTO!");
								}
							}
							connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
								if (err) throw err;
								connection.query('DELETE FROM public_lottery WHERE id = ' + lottery_id, function (err, rows, fields) {
									if (err) throw err;
									//console.log("Lotteria terminata");
								});
							});
						});
					});
				});
			});
		});
	});
});

bot.onText(/^\/lotterie/, function (message) {

	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;

		connection.query('SELECT player.nickname, item.name, P.price, (SELECT COUNT(id) FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = P.id) As subs FROM player, item, public_lottery P WHERE P.item_id = item.id AND P.creator_id = player.id ORDER BY price', function (err, rows, fields) {
			if (err) throw err;
			var text = "Non ci sono lotterie disponibili";
			var p = "";
			var s = "";
			var free = 1;
			if (Object.keys(rows).length > 0) {
				text = "<b>Lotterie gratis:</b>\n";
				for (var i = 0, len = Object.keys(rows).length; i < len; i++) {

					if ((rows[i].price > 0) && (free == 1)) {
						free = 0;
						text += "\n<b>Lotterie a pagamento:</b>\n";
					}

					if (rows[i].price == 0) {
						p = "";
					} else {
						p = " (" + formatNumber(rows[i].price) + " §)";
					}
					if (rows[i].subs == 0) {
						s = "";
					} else {
						s = " ✅";
					}
					text += "> " + rows[i].nickname + " - " + rows[i].name + p + s + "\n";
				}

				text += "\nPer iscriverti ad una lotteria usa /lotteria o /lotteriap";
				bot.sendMessage(message.chat.id, text, html);
			}
		});
	});
});

bot.onText(/^\/paga (.+)|^\/paga/i, function (message, match) {

	if (!checkSpam(message))
		return;

	var syntax = "Sintassi: '/paga prezzo,acquirente,messaggio(facoltativo)' (senza acquirente in caso di risposta)";
	var text = "";

	if (message.text.indexOf(" ") != -1)
		text = message.text.substring(message.text.indexOf(" ") + 1, message.text.lenght);
	else {
		bot.sendMessage(message.from.id, syntax);
		return;
	}

	if (message.reply_to_message != undefined)
		text = text + "," + message.reply_to_message.from.username;

	var elements = text.split(",");

	if ((Object.keys(elements).length < 2) || (Object.keys(elements).length > 3)) {
		bot.sendMessage(message.from.id, "Numero parametri errato: " + Object.keys(elements).length + " su 2/3\n" + syntax);
		return;
	}

	var price = parseInt(elements[0].replace(/\D+/gi, '').trim());
	var buyer = elements[1].replace('@', '').trim();

	var custom_message = "";
	if (message.reply_to_message != undefined)
		custom_message = elements[0].replace(/[0-9]/gi, '').trim();
	else{
		if (Object.keys(elements).length == 3)
			custom_message = elements[2];
	}

	if (buyer == "") {
		bot.sendMessage(message.from.id, "Il parametro acquirente è obbligatorio");
		return;
	}
	if (isNaN(price)) {
		bot.sendMessage(message.from.id, "Il parametro prezzo non è valido");
		return;
	}
	if (price <= 0) {
		bot.sendMessage(message.from.id, "Il parametro prezzo deve essere maggiore di zero");
		return;
	}

	connection.query('SELECT account_id, id, money, holiday, market_ban, exp, reborn FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}
		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}
		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...");
			return;
		}

		if ((Math.floor(rows[0].exp/10) < 50) && (rows[0].reborn == 1)){
			bot.sendMessage(message.from.id, "Questo comando è utilizzabile solo dal livello 50");
			return;
		}

		var player_id = rows[0].id;
		var mymoney = rows[0].money;

		if (mymoney < price) {
			bot.sendMessage(message.from.id, "Non hai abbastanza credito a disposizione");
			return;
		}

		connection.query('SELECT money, id, chat_id, market_ban, account_id FROM player WHERE nickname = "' + buyer + '"', function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, "L'acquirente inserito non esiste");
				return;
			}

			if (message.from.id != 20471035) {
				if (buyer.toLowerCase() == message.from.username.toLowerCase()) {
					bot.sendMessage(message.from.id, "Non puoi inviare monete a te stesso");
					return;
				}
			}

			var banReason = isBanned(rows[0].account_id);
			if (banReason != null) {
				bot.sendMessage(message.from.id, "Il destinatario è bannato dal gioco");
				return;
			}

			if (rows[0].market_ban == 1) {
				bot.sendMessage(message.from.id, "Il destinatario è bannato dal mercato");
				return;
			}

			if ((parseInt(rows[0].money)+price) > 1000000000){
				bot.sendMessage(message.from.id, "Il destinatario raggiungerebbe il limite alle monete possedute con questa cifra, riprova");
				return;
			}

			var player_id2 = rows[0].id;
			var chat_id = rows[0].account_id;

			var d2 = new Date();
			var long_date = d2.getFullYear() + "-" + addZero(d2.getMonth() + 1) + "-" + addZero(d2.getDate()) + " " + addZero(d2.getHours()) + ':' + addZero(d2.getMinutes()) + ':' + addZero(d2.getSeconds());

			connection.query('INSERT INTO pay_history (from_id, to_id, price, hist_time) VALUES (' + player_id + ',' + player_id2 + ',' + price + ',"' + long_date + '")', function (err, rows, fields) {
				if (err) throw err;
				connection.query('UPDATE player SET money = money - ' + price + ' WHERE id = ' + player_id, function (err, rows, fields) {
					if (err) throw err;
					connection.query('UPDATE player SET money = money + ' + price + ' WHERE id = ' + player_id2, function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.from.id, message.from.username + ", hai inviato <b>" + formatNumber(price) + " §</b> a " + buyer, html);
						bot.sendMessage(chat_id, "Hai ricevuto <b>" + formatNumber(price) + " §</b> da " + message.from.username + "!\n<i>" + custom_message + "</i>", html);
					});
				});
			});
		});
	});
});

bot.onText(/^\/annullav/i, function (message) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;

		connection.query('SELECT item_id FROM market_direct WHERE player_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, "Nessun offerta da annullare");
				return;
			}

			var item_id = rows[0].item_id;
			addItem(player_id, item_id);
			connection.query('DELETE FROM market_direct WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				bot.sendMessage(message.from.id, "Offerta annullata!");
			});
		});
	});
});

bot.onText(/^\/offri/i, function (message) {
	var text = "";
	var item = "";
	var price = 0;
	var time = 0;
	var buyer = "";

	var syntax = "Sintassi: '/offri oggetto,prezzo,acquirente' (senza acquirente in caso di risposta)";

	if (message.text.indexOf(" ") != -1) {
		text = message.text.substring(message.text.indexOf(" ") + 1, message.text.lenght);
	} else {
		bot.sendMessage(message.from.id, syntax);
		return;
	}

	var elements = text.split(",");

	if (Object.keys(elements).length == 1) {
		elements.push("1");
	}

	if (message.reply_to_message != undefined) {
		elements.push(message.reply_to_message.from.username);
	}

	if (Object.keys(elements).length != 3) {
		bot.sendMessage(message.from.id, "Numero parametri errato nell'offerta: " + Object.keys(elements).length + " su 3\n" + syntax);
		return;
	}

	if (Object.keys(elements).length < 3) {
		bot.sendMessage(message.from.id, "Numero parametri non sufficiente nell'offerta: " + Object.keys(elements).length + " su 3\n" + syntax);
		return;
	}

	item = elements[0].trim();
	price = parseInt(elements[1].replace(/[^\w\s]/gi, '').trim());
	buyer = elements[2].replace('@', '').trim();

	if (item == "") {
		bot.sendMessage(message.from.id, "Il parametro oggetto è obbligatorio");
		return;
	}
	if (buyer == "") {
		bot.sendMessage(message.from.id, "Il parametro acquirente è obbligatorio");
		return;
	}
	if ((isNaN(price) || price > 100000000)) {
		bot.sendMessage(message.from.id, "Il parametro prezzo non è valido");
		return;
	}

	connection.query('SELECT account_id, holiday, market_ban, id, money FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}
		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}
		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...");
			return;
		}

		var player_id = rows[0].id;
		var mymoney = rows[0].money;

		connection.query('SELECT id FROM market_direct WHERE player_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length > 0) {
				bot.sendMessage(message.from.id, "Puoi inserire solo una vendita alla volta");
				return;
			}

			connection.query('SELECT player_id, datetime FROM plus_shop_timeout WHERE player_id2 = ' + player_id, function (err, rows, fields) {
				if (err) throw err;

				var timeout_date = "";
				var timeout_id = 0;
				var now = new Date();
				if (Object.keys(rows).length > 0) {
					timeout_date = new Date(rows[0].datetime);
					timeout_id = rows[0].player_id;
				}

				connection.query('SELECT item.allow_sell, item.value, item.id, item.name, inventory.quantity FROM item, inventory WHERE item.id = inventory.item_id AND item.name = "' + item + '" AND inventory.player_id = ' + player_id + ' AND inventory.quantity > 0', function (err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.from.id, "Non possiedi l'oggetto che hai inserito.");
						return;
					}
					if (rows[0].quantity == 0){
						bot.sendMessage(message.from.id, "Non possiedi l'oggetto che hai inserito.");
						return;
					}
					if (rows[0].allow_sell == 0) {
						bot.sendMessage(message.chat.id, "Questo oggetto non può essere venduto");
						return;
					}

					var item_val = parseInt(rows[0].value);
					var item_id = parseInt(rows[0].id);
					var item_name = rows[0].name;

					var d2 = new Date();
					d2.setMinutes(d2.getMinutes() + 30);
					var long_date = d2.getFullYear() + "-" + addZero(d2.getMonth() + 1) + "-" + addZero(d2.getDate()) + " " + addZero(d2.getHours()) + ':' + addZero(d2.getMinutes()) + ':' + addZero(d2.getSeconds());
					var short_date = addZero(d2.getHours()) + ':' + addZero(d2.getMinutes());

					connection.query('SELECT COUNT(nickname) As cnt, id, nickname FROM player WHERE nickname = "' + buyer + '"', function (err, rows, fields) {
						if (err) throw err;

						if (rows[0].cnt == 0) {
							bot.sendMessage(message.from.id, "L'acquirente inserito non esiste");
							return;
						}

						if (price < item_val) {
							bot.sendMessage(message.from.id, "Prezzo per " + item_name + " impostato al minimo: " + formatNumber(item_val) + " §");
							price = item_val;
						}

						if (message.from.id != 20471035) {
							if (buyer.toLowerCase() == message.from.username.toLowerCase()) {
								bot.sendMessage(message.from.id, "Non puoi vendere a te stesso");
								return;
							}
						}

						if (timeout_id == rows[0].id) {
							if (timeout_date < now) {
								connection.query('DELETE FROM plus_shop_timeout WHERE player_id2 = ' + player_id, function (err, rows, fields) {
									if (err) throw err;
								});
							} else {
								bot.sendMessage(message.from.id, "Attendi un po' di tempo prima di poter commerciare ancora con questo utente");
								return;
							}
						}

						var nick = rows[0].nickname;

						connection.query('SELECT COUNT(id) As qnt FROM market_direct WHERE buyer = ' + rows[0].id, function (err, rows, fields) {
							if (err) throw err;

							if (rows[0].qnt > 0) {
								bot.sendMessage(message.chat.id, "Questo utente ha già una vendita in corso");
								return;
							}

							connection.query('SELECT chat_id, id, account_id FROM player WHERE nickname = "' + buyer + '"', function (err, rows, fields) {
								if (err) throw err;
								bot.sendMessage(rows[0].account_id, message.from.username + " vuole completare con te questa vendita:\n" +
												"> " + item + " per " + formatNumber(price) + " §\n" +
												"Usa /accettav o /rifiutav");
								var toId = rows[0].id;

								delItem(player_id, item_id, 1);

								connection.query('INSERT INTO market_direct VALUES (DEFAULT, ' + player_id + ',"' + item_id + '",' + price + ',"' + long_date + '",' + toId + ')', function (err, rows, fields) {
									if (err) throw err;
									bot.sendMessage(message.chat.id, "La messa in vendita da parte di " + message.from.username + " per " + item_name + " a " + formatNumber(price) + " § verso " + nick + " è stata registrata (scadenza: " + short_date + ")\n" + message.from.username + " puoi annullarla con /annullav");
								});
							});
						});
					});
				});
			});
		});
	});
});

bot.onText(/^\/rifiutav/i, function (message) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;

		connection.query('SELECT player_id, item_id FROM market_direct WHERE buyer = ' + player_id, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, "Nessuna vendita da rifiutare");
				return;
			}

			var creator_id = rows[0].player_id;
			var item_id = rows[0].item_id;
			addItem(creator_id, item_id);
			connection.query('DELETE FROM market_direct WHERE player_id = ' + creator_id, function (err, rows, fields) {
				if (err) throw err;
				bot.sendMessage(message.from.id, "Vendita rifiutata!");
				connection.query('SELECT id, chat_id FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(rows[0].chat_id, message.from.username + " ha rifiutato la tua vendita!");

					var d = new Date();
					d.setMinutes(d.getMinutes() + 10);
					var long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

					connection.query('INSERT INTO plus_shop_timeout (player_id, player_id2, datetime) VALUES (' + player_id + ',' + rows[0].id + ',"' + long_date + '")', function (err, rows, fields) {
						if (err) throw err;
					});
				});
			});
		});
	});
});

bot.onText(/^\/annullas/i, function (message) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;

		connection.query('SELECT item_1_id FROM market WHERE player_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, "Nessuno scambio da annullare");
				return;
			}

			var item_id = rows[0].item_1_id;
			addItem(player_id, item_id);
			connection.query('DELETE FROM market WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				bot.sendMessage(message.from.id, "Offerta annullata!");
			});
		});
	});
});

bot.onText(/^\/scambia/i, function (message) {
	connection.query('SELECT account_id, market_ban, holiday, id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			var text = "Il tuo account è stato *bannato* per il seguente motivo: _" + banReason + "_";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}
		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...");
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		var player_id = rows[0].id;
		var text = "";
		var item1 = "";
		var item2 = "";
		var buyer = "";

		var syntax = "Sintassi: '/scambia oggetto1,oggetto2,acquirente' (senza acquirente in caso di risposta)";

		if (message.text.indexOf(" ") != -1) {
			text = message.text.substring(message.text.indexOf(" ") + 1, message.text.lenght);
		} else {
			bot.sendMessage(message.from.id, syntax);
			return;
		}

		if (message.reply_to_message != undefined) {
			text = text + "," + message.reply_to_message.from.username;
		}

		var elements = text.split(",");

		if (Object.keys(elements).length != 3) {
			bot.sendMessage(message.from.id, "Numero parametri errato nell'offerta: " + Object.keys(elements).length + " su 3\n" + syntax);
			return;
		}

		item1 = elements[0].trim();
		item2 = elements[1].trim();
		buyer = elements[2].replace('@', '').trim();

		if (item1 == "") {
			bot.sendMessage(message.from.id, "Il parametro oggetto 1 è obbligatorio");
			return;
		}
		if (item2 == "") {
			bot.sendMessage(message.from.id, "Il parametro oggetto 2 è obbligatorio");
			return;
		}
		if (item1.toLowerCase() == item2.toLowerCase()) {
			bot.sendMessage(message.from.id, "Non puoi inserire due oggetti uguali");
			return;
		}
		if (buyer == "") {
			bot.sendMessage(message.from.id, "Il parametro acquirente è obbligatorio");
			return;
		}

		connection.query('SELECT id FROM market WHERE player_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length > 0) {
				bot.sendMessage(message.from.id, "Puoi inserire solo uno scambio alla volta");
				return;
			}

			connection.query('SELECT player_id, datetime FROM plus_shop_timeout WHERE player_id2 = ' + player_id, function (err, rows, fields) {
				if (err) throw err;

				var timeout_date = "";
				var timeout_id = 0;
				var now = new Date();
				if (Object.keys(rows).length > 0) {
					timeout_date = new Date(rows[0].datetime);
					timeout_id = rows[0].player_id;
				}

				connection.query('SELECT COUNT(nickname) As cnt, id FROM player WHERE nickname = "' + buyer + '"', function (err, rows, fields) {
					if (err) throw err;

					if (rows[0].cnt == 0) {
						bot.sendMessage(message.from.id, "L'acquirente inserito non esiste");
						return;
					}

					if (message.from.id != 20471035) {
						if (buyer.toLowerCase() == message.from.username.toLowerCase()) {
							bot.sendMessage(message.from.id, "Non puoi scambiare a te stesso");
							return;
						}
					}

					connection.query('SELECT COUNT(id) As qnt FROM market WHERE buyer = ' + rows[0].id, function (err, rows, fields) {
						if (err) throw err;

						if (rows[0].qnt > 0) {
							bot.sendMessage(message.chat.id, "Questo utente ha già uno scambio in corso");
							return;
						}

						if (timeout_id == rows[0].id) {
							if (timeout_date < now) {
								connection.query('DELETE FROM plus_shop_timeout WHERE player_id2 = ' + player_id, function (err, rows, fields) {
									if (err) throw err;
								});
							} else {
								bot.sendMessage(message.from.id, "Attendi un po' di tempo prima di poter commerciare ancora con questo utente");
								return;
							}
						}

						var d2 = new Date();
						d2.setMinutes(d2.getMinutes() + 30);
						var long_date = d2.getFullYear() + "-" + addZero(d2.getMonth() + 1) + "-" + addZero(d2.getDate()) + " " + addZero(d2.getHours()) + ':' + addZero(d2.getMinutes()) + ':' + addZero(d2.getSeconds());
						var short_date = addZero(d2.getHours()) + ':' + addZero(d2.getMinutes());

						connection.query('SELECT item.id, item.allow_sell FROM item, inventory WHERE item.id = inventory.item_id AND item.name = "' + item1 + '" AND inventory.player_id = ' + player_id + ' AND inventory.quantity > 0', function (err, rows, fields) {
							if (err) throw err;
							if (Object.keys(rows).length == 0) {
								bot.sendMessage(message.from.id, "L'oggetto " + item1 + " non è presente nel tuo inventario o non è consentito.");
								return;
							}

							if (rows[0].allow_sell == 0) {
								bot.sendMessage(message.chat.id, "Questo oggetto non può essere scambiato");
								return;
							}

							var item1_id = rows[0].id;

							connection.query('SELECT item.id, item.allow_sell FROM item WHERE item.name = "' + item2 + '"', function (err, rows, fields) {
								if (err) throw err;
								if (Object.keys(rows).length == 0) {
									bot.sendMessage(message.from.id, "L'oggetto " + item2 + " che hai indicato non esiste o non è consentito.");
									return;
								}

								if (rows[0].allow_sell == 0) {
									bot.sendMessage(message.chat.id, "Questo oggetto non può essere scambiato");
									return;
								}

								var item2_id = rows[0].id;

								connection.query('SELECT chat_id, account_id, id, nickname FROM player WHERE nickname = "' + buyer + '"', function (err, rows, fields) {
									if (err) throw err;

									bot.sendMessage(rows[0].account_id, message.from.username + " vuole completare con te questo scambio:\n" +
													"> " + item1 + " per " + item2 + "\n" +
													"Usa /accettas o /rifiutas");
									var buyer_id = rows[0].id;
									var nick = rows[0].nickname;

									connection.query('INSERT INTO market VALUES (DEFAULT, ' + player_id + ', ' + item1_id + ',' + item2_id + ',"' + long_date + '",' + buyer_id + ')', function (err, rows, fields) {
										if (err) throw err;

										delItem(player_id, item1_id, 1);

										bot.sendMessage(message.chat.id, "Lo scambio dove " + message.from.username + " offre " + item1 + " e " + nick + " offre " + item2 + " è stato registrato (scadenza: " + short_date + ")\n" + message.from.username + " puoi annullarla con /annullas");
									});
								});
							});
						});
					});
				});
			});
		});
	});
});

bot.onText(/^\/accettav/i, function (message) {

	if (!checkSpam(message)) {
		return;
	}

	connection.query('SELECT exp, holiday, id, money, account_id, market_ban FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}
		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}
		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...");
			return;
		}

		var player_id = rows[0].id;
		var my_money = rows[0].money;

		connection.query('SELECT id, item_id, money, buyer, player_id FROM market_direct WHERE buyer = ' + player_id, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, "La vendita non è disponibile.");
				return;
			} else {
				var marketid = rows[0].id;
				var item_id = rows[0].item_id;
				var money = rows[0].money;
				var buyer_id = rows[0].buyer;
				var player_id2 = rows[0].player_id;

				if (player_id == player_id2) {
					bot.sendMessage(message.from.id, "Non puoi concludere un acquisto con te stesso");
					return;
				}

				if (my_money < money) {
					bot.sendMessage(message.from.id, "Non hai abbastanza credito per completare l'acquisto.");
					return;
				} else {
					connection.query('SELECT id, chat_id, account_id, nickname FROM player WHERE id = ' + player_id2, function (err, rows, fields) {
						if (err) throw err;

						var player_id2 = rows[0].id;
						var chat_id2 = rows[0].account_id;
						var nick2 = rows[0].nickname;

						connection.query('DELETE FROM market_direct WHERE id = ' + marketid, function (err, rows, fields) {
							if (err) throw err;
							connection.query('UPDATE player SET money = money-' + money + ' WHERE id = ' + player_id, function (err, rows, fields) {
								if (err) throw err;
								connection.query('UPDATE player SET money = money+' + money + ' WHERE id = ' + player_id2, function (err, rows, fields) {
									if (err) throw err;

									addItem(player_id, item_id);

									connection.query('SELECT name FROM item WHERE id = ' + item_id, function (err, rows, fields) {
										if (err) throw err;
										bot.sendMessage(chat_id2, message.from.username + " ha acquistato " + rows[0].name + " per " + formatNumber(money) + " §!");
										bot.sendMessage(message.chat.id, message.from.username + ", hai completato l'acquisto con " + nick2 + " per " + formatNumber(money) + " §!");

										if (buyer_id == -1)
											buyer_id = null;

										var d = new Date();
										var long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
										connection.query('INSERT INTO market_direct_history (item_id, price, time, from_id, to_id, buyer, type) VALUES (' + item_id + ',' + money + ',"' + long_date + '",' + player_id2 + ',' + player_id + ',' + buyer_id + ',1)', function (err, rows, fields) {
											if (err) throw err;
										});
									});
								});
							});
						});
					});
				}
			}
		});
	});
});

bot.onText(/^\/rifiutas/i, function (message) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;

		connection.query('SELECT player_id, item_1_id FROM market WHERE buyer = ' + player_id, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, "Nessuno scambio da rifiutare");
				return;
			}

			var creator_id = rows[0].player_id;
			var item_id = rows[0].item_1_id;
			addItem(creator_id, item_id);
			connection.query('DELETE FROM market WHERE player_id = ' + creator_id, function (err, rows, fields) {
				if (err) throw err;
				bot.sendMessage(message.from.id, "Scambio rifiutato!");
				connection.query('SELECT id, chat_id FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(rows[0].chat_id, message.from.username + " ha rifiutato il tuo scambio!");

					var d = new Date();
					d.setMinutes(d.getMinutes() + 10);
					var long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

					connection.query('INSERT INTO plus_shop_timeout (player_id, player_id2, datetime) VALUES (' + player_id + ',' + rows[0].id + ',"' + long_date + '")', function (err, rows, fields) {
						if (err) throw err;
					});
				});
			});
		});
	});
});

bot.onText(/^\/accettas/i, function (message) {

	if (!checkSpam(message)) {
		return;
	}

	connection.query('SELECT id, exp, holiday, account_id, market_ban FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}
		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}
		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...");
			return;
		}

		var player_id = rows[0].id;

		connection.query('SELECT * FROM market WHERE buyer = ' + player_id, function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, "Lo scambio non è disponibile.");
				return;
			} else {
				var marketid = rows[0].id;
				var item1 = rows[0].item_1_id;
				var item2 = rows[0].item_2_id;
				var buyer_id = rows[0].buyer;
				var player_id2 = rows[0].player_id;

				if (player_id == player_id2) {
					bot.sendMessage(message.from.id, "Non puoi concludere un acquisto con te stesso");
					return;
				}

				connection.query('SELECT item.id, item.name FROM item, inventory WHERE item.id = inventory.item_id AND inventory.item_id = ' + item2 + ' AND inventory.player_id = ' + player_id + ' AND inventory.quantity > 0', function (err, rows, fields) {
					if (err) throw err;

					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.from.id, "Non possiedi l'oggetto richiesto.");
						return;
					}

					connection.query('SELECT id, chat_id, account_id, nickname FROM player WHERE id = ' + player_id2, function (err, rows, fields) {
						if (err) throw err;
						if (Object.keys(rows).length == 0) {
							bot.sendMessage(message.from.id, "Non ho trovato il giocatore con cui completare lo scambio!");
							return;
						}

						var player_id2 = rows[0].id;
						var chat_id2 = rows[0].account_id;
						var nick2 = rows[0].nickname;

						connection.query('DELETE FROM market WHERE id = ' + marketid, function (err, rows, fields) {
							if (err) throw err;
							addItem(player_id, item1);
							addItem(player_id2, item2);
							delItem(player_id, item2, 1);

							if (buyer_id == -1)
								buyer_id = null;

							var d = new Date();
							var long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
							connection.query('INSERT INTO market_history (item_1, item_2, time, from_id, to_id, buyer) VALUES (' + item1 + ',' + item2 + ',"' + long_date + '",' + player_id2 + ',' + player_id + ',' + buyer_id + ')', function (err, rows, fields) {
								if (err) throw err;
							});

							bot.sendMessage(message.chat.id, message.from.username + ", hai completato lo scambio con " + nick2 + "!");
							bot.sendMessage(chat_id2, "Il giocatore " + message.from.username + " ha accettato la tua offerta di scambio!");
						});
					});
				});
			}
		});
	});
});

bot.onText(/^\/aste/, function (message) {
	connection.query('SELECT player.nickname, item.name, auction_list.time_end, auction_list.last_price FROM player, item, auction_list WHERE auction_list.item_id = item.id AND auction_list.creator_id = player.id', function (err, rows, fields) {
		if (err) throw err;
		var text = "Non ci sono aste disponibili";
		var p = "";
		if (Object.keys(rows).length > 0) {
			text = "Aste disponibili:\n";
			var now = new Date();
			var diff = 0;
			var time_end = new Date();

			for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
				time_end = new Date(rows[i].time_end);
				min = Math.round(((time_end - now) / 1000) / 60);

				text += "> " + rows[i].nickname + " - " + rows[i].name + " (offerta: " + rows[i].last_price + " §, scade tra " + min + " minuti)" + "\n";
			}
		}
		bot.sendMessage(message.chat.id, text);
	});
});

bot.onText(/^\/lotteria(?!p) (.+)|^\/lotteria(?!p)/, function (message, match) {

	if (!checkSpam(message)) {
		return;
	}

	var nickname = match[1];
	if ((nickname == undefined) || (nickname == "")) {
		bot.sendMessage(message.chat.id, "Per partecipare ad una lotteria utilizza la seguente sintassi: /lotteria @nickname, mentre /crealotteria per iniziarne una nuova. Puoi anche usare /lotteria tutte");
		return;
	}

	nickname = nickname.replace("@", "");

	connection.query('SELECT id, market_ban, money, account_id, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;
		var money = rows[0].money;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		if (nickname == "tutte") {
			connection.query('SELECT L.creator_id, L.id, L.price, P.chat_id, P.nickname FROM public_lottery L, player P WHERE P.id = L.creator_id AND L.price = 0 AND L.creator_id != ' + player_id, function (err, rows, fields) {
				if (err) throw err;

				var len = Object.keys(rows).length;
				var count = 0;

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Non ci sono lotterie gratuite disponibili!");
					return;
				}

				var lottery_id = 0;
				var one = 0;
				var creator_chat = 0;
				var creator_id = 0;
				var notify = 0;

				for (var i = 0; i < len; i++) {
					lottery_id = rows[i].id;
					creator_chat = rows[i].chat_id;
					creator_id = rows[i].creator_id;

					connection.query('SELECT * FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, function (err, rows, fields) {
						if (err) throw err;
						if (Object.keys(rows).length == 0) {
							one = 1;
							connection.query('INSERT INTO public_lottery_players (lottery_id, player_id) VALUES (' + this.lottery_id + ',' + this.player_id + ')', function (err, rows, fields) {
								if (err) throw err;

								count++;

								connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + creator_id + ' AND type = 1', function (err, rows, fields) {
									if (err) throw err;
									notify = 0;
									if (Object.keys(rows).length == 0) {
										notify = 1;
									} else {
										if (rows[0].deny == 0) {
											notify = 1;
										}
									}
									if (notify == 1) {
										bot.sendMessage(this.creator_chat, message.from.username + " si è registrato alla tua lotteria gratuita!");
									}
								}.bind({
									creator_chat: this.creator_chat
								}));

								if (this.i + 1 == this.len) {
									bot.sendMessage(message.chat.id, "Ti sei registrato correttamente a " + count + " lotterie gratuite!");
								};
							}.bind({
								i: this.i,
								len: this.len,
								creator_chat: this.creator_chat
							}));
						}
						if ((this.i + 1 == this.len) && (one == 0)) {
							bot.sendMessage(message.chat.id, "Sei già registrato a tutte le lotterie gratuite!");
						};
					}.bind({
						player_id: player_id,
						lottery_id: lottery_id,
						i: i,
						len: len,
						creator_chat: creator_chat
					}));
				}
			});
			return;
		}

		connection.query('SELECT id FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, "Il nickname che hai inserito non esiste, riprova");
				return;
			}
			var creator_id = rows[0].id;

			connection.query('SELECT id, price FROM public_lottery WHERE creator_id = ' + creator_id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Il nickname che hai inserito non è associato a nessuna lotteria, riprova");
					return;
				}

				var price = rows[0].price;
				var lottery_id = rows[0].id;

				if (price > 0) {
					bot.sendMessage(message.chat.id, "Questa è una lotteria a pagamento, usa /lotteriap per iscriverti");
					return;
				}

				if (player_id == creator_id) {
					connection.query('SELECT 1 FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Ci sono attualmente " + Object.keys(rows).length + " partecipanti");
					});
					return;
				}

				connection.query('SELECT 1 FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, function (err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length > 0) {
						bot.sendMessage(message.chat.id, "Sei già registrato a questa lotteria!");
						return;
					}
					connection.query('INSERT INTO public_lottery_players (lottery_id, player_id) VALUES (' + lottery_id + ',' + player_id + ')', function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Ti sei registrato correttamente alla lotteria!\nPer rimuovere la registrazione usa /dlotteria");

						connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + creator_id + ' AND type = 1', function (err, rows, fields) {
							if (err) throw err;
							var notify = 0;
							if (Object.keys(rows).length == 0) {
								notify = 1;
							} else {
								if (rows[0].deny == 0) {
									notify = 1;
								}
							}
							if (notify == 1) {
								connection.query('SELECT chat_id FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
									if (err) throw err;
									bot.sendMessage(rows[0].chat_id, message.from.username + " si è registrato alla tua lotteria gratuita!");
								});
							};
						});
					});
				});
			});
		});
	});
});

bot.onText(/^\/dlotteria(?!p) (.+)|^\/dlotteria(?!p)/, function (message, match) {

	if (!checkSpam(message)) {
		return;
	}

	var nickname = match[1];
	if ((nickname == undefined) || (nickname == "")) {
		bot.sendMessage(message.chat.id, "Per eliminare la partecipazione ad una lotteria utilizza la seguente sintassi: /dlotteria @nickname");
		return;
	}

	nickname = nickname.replace("@", "");

	connection.query('SELECT id, market_ban, money, account_id, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;
		var money = rows[0].money;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		connection.query('SELECT id FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, "Il nickname che hai inserito non esiste, riprova");
				return;
			}
			var creator_id = rows[0].id;

			connection.query('SELECT id, price FROM public_lottery WHERE creator_id = ' + creator_id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Il nickname che hai inserito non è associato a nessuna lotteria, riprova");
					return;
				}

				var price = rows[0].price;
				var lottery_id = rows[0].id;

				if (price > 0) {
					bot.sendMessage(message.chat.id, "Questa è una lotteria a pagamento, usa /dlotteriap per rimuovere l'iscrizione");
					return;
				}

				connection.query('SELECT 1 FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, function (err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, "Non sei registrato a questa lotteria!");
						return;
					}
					connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id + ' AND player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Hai rimosso la registrazione alla lotteria!");

						connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + creator_id + ' AND type = 1', function (err, rows, fields) {
							if (err) throw err;
							var notify = 0;
							if (Object.keys(rows).length == 0) {
								notify = 1;
							} else {
								if (rows[0].deny == 0) {
									notify = 1;
								}
							}
							if (notify == 1) {
								connection.query('SELECT chat_id FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
									if (err) throw err;
									bot.sendMessage(rows[0].chat_id, message.from.username + " ha rimosso la registrazione alla tua lotteria gratuita!");
								});
							};
						});
					});
				});
			});
		});
	});
});

bot.onText(/^\/statolotteria (.+)|^\/statolotteria/, function (message, match) {
	var nickname = match[1];
	if ((nickname == undefined) || (nickname == "")) {
		bot.sendMessage(message.chat.id, "Per ricevere informazioni su una lotteria utilizza la seguente sintassi: /statolotteria @nickname");
		return;
	}

	nickname = nickname.replace("@", "");

	connection.query('SELECT id, nickname FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.chat.id, "Il nickname che hai inserito non esiste, riprova");
			return;
		}

		var creator_id = rows[0].id;
		var nick = rows[0].nickname;

		connection.query('SELECT id, price, item_id, time_end FROM public_lottery WHERE creator_id = ' + creator_id, function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, "Il nickname che hai inserito non è associato a nessuna lotteria, riprova");
				return;
			}

			var d = new Date(rows[0].time_end);
			var long_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds()) + " del " + addZero(d.getDate()) + "/" + addZero(d.getMonth() + 1) + "/" + d.getFullYear();

			var price = rows[0].price;
			var itemId = rows[0].item_id;
			var priceText = "No";
			if (price > 0) {
				priceText = "Si (" + formatNumber(price) + " §)";
			}

			var lottery_id = rows[0].id;

			connection.query('SELECT name, rarity FROM item WHERE id = ' + itemId, function (err, rows, fields) {
				if (err) throw err;

				var name = rows[0].name;
				var rarity = " (" + rows[0].rarity + ")"

				connection.query('SELECT COUNT(*) As num FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
					if (err) throw err;

					var players = rows[0].num;

					var text = "Informazioni Lotteria:\n\nGestore: " + nick +
						"\nOggetto: " + name + rarity +
						"\nA pagamento: " + priceText +
						"\nPartecipanti: " + players +
						"\nScade alle: " + long_date;
					bot.sendMessage(message.chat.id, text);
				});
			});
		});
	});
});

bot.onText(/^\/statoasta (.+)|^\/statoasta/, function (message, match) {
	var nickname = match[1];
	if ((nickname == undefined) || (nickname == "")) {
		bot.sendMessage(message.chat.id, "Per ricevere informazioni su un asta utilizza la seguente sintassi: /statoasta @nickname");
		return;
	}

	nickname = nickname.replace("@", "");

	connection.query('SELECT id, nickname FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.chat.id, "Il nickname che hai inserito non esiste, riprova");
			return;
		}

		var creator_id = rows[0].id;
		var nick = rows[0].nickname;

		connection.query('SELECT id, last_price, last_player, item_id, time_end FROM auction_list WHERE creator_id = ' + creator_id, function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, "Il nickname che hai inserito non è associato a nessuna asta, riprova");
				return;
			}

			var d = new Date(rows[0].time_end);
			var long_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds()) + " del " + addZero(d.getDate()) + "/" + addZero(d.getMonth() + 1) + "/" + d.getFullYear();

			var itemId = rows[0].item_id;
			var last_price = rows[0].last_price;
			var last_player = rows[0].last_player;

			connection.query('SELECT name, rarity FROM item WHERE id = ' + itemId, function (err, rows, fields) {
				if (err) throw err;

				var name = rows[0].name;
				var rarity = " (" + rows[0].rarity + ")"

				connection.query('SELECT nickname FROM player WHERE id = ' + last_player, function (err, rows, fields) {
					if (err) throw err;

					var nickname = "";

					if (Object.keys(rows).length == 0) {
						nickname = "Nessuno";
					} else {
						nickname = rows[0].nickname;
					}

					var text = "Informazioni Asta:\n\nGestore: " + nick +
						"\nOggetto: " + name + rarity +
						"\nOfferente: " + nickname +
						"\nOfferta: " + formatNumber(last_price) + " §" +
						"\nScade alle: " + long_date;
					bot.sendMessage(message.chat.id, text);
				});
			});
		});
	});
});

bot.onText(/^\/lotteriap (.+)|^\/lotteriap/, function (message, match) {
	if ((message.chat.id == "-1001069842056") || (message.chat.id == "-1001064571576")) {
		return;
	}

	if (!checkSpam(message)) {
		return;
	}

	var nickname = match[1];
	if ((nickname == undefined) || (nickname == "")) {
		bot.sendMessage(message.chat.id, "Per partecipare ad una lotteria utilizza la seguente sintassi: /lotteriap @nickname, mentre /crealotteriap per iniziarne una nuova. Puoi anche usare /lotteriap tutte");
		return;
	}

	nickname = nickname.replace("@", "");

	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;
		var money = rows[0].money;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		if (nickname == "tutte") {
			connection.query('SELECT L.creator_id, player.chat_id, L.id, L.price, (SELECT COUNT(id) FROM public_lottery_players P WHERE P.lottery_id = L.id AND P.player_id = ' + player_id + ') As sub FROM public_lottery L, player WHERE player.id = L.creator_id AND L.price > 0 AND L.creator_id != ' + player_id + ' HAVING sub = 0', function (err, rows, fields) {
				if (err) throw err;

				if ((Object.keys(rows).length == 0) || (rows[0].tot == 0)) {
					bot.sendMessage(message.chat.id, "Non ci sono lotterie a pagamento disponibili!");
					return;
				}

				var tot = 0;

				for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
					tot += rows[i].price;
				}

				if (money < tot) {
					bot.sendMessage(message.chat.id, "Non hai abbastanza monete per partecipare a tutte le lotterie, ti servono " + formatNumber(tot) + " §!");
					return;
				}

				var len = Object.keys(rows).length;
				var count = 0;

				var lottery_id = 0;
				var price = 0;
				var one = 0;
				var creator_chat = 0;
				var creator_id = 0;
				var notify = 0;

				for (var i = 0; i < len; i++) {
					lottery_id = rows[i].id;
					price = rows[i].price;
					creator_chat = rows[i].chat_id;
					creator_id = rows[i].creator_id;

					connection.query('SELECT * FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, function (err, rows, fields) {
						if (err) throw err;
						if (Object.keys(rows).length == 0) {
							one = 1;
							connection.query('INSERT INTO public_lottery_players (lottery_id, player_id) VALUES (' + this.lottery_id + ',' + this.player_id + ')', function (err, rows, fields) {
								if (err) throw err;

								count++;

								connection.query('UPDATE public_lottery SET money = money+' + this.price + ' WHERE id = ' + this.lottery_id, function (err, rows, fields) {
									if (err) throw err;
								});

								connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + creator_id + ' AND type = 1', function (err, rows, fields) {
									if (err) throw err;
									notify = 0;
									if (Object.keys(rows).length == 0) {
										notify = 1;
									} else {
										if (rows[0].deny == 0) {
											notify = 1;
										}
									}
									if (notify == 1) {
										bot.sendMessage(this.creator_chat, message.from.username + " si è registrato alla tua lotteria a pagamento!");
									}
								}.bind({
									creator_chat: this.creator_chat
								}));

								if (this.i + 1 == this.len) {
									bot.sendMessage(message.chat.id, "Ti sei registrato correttamente a " + count + " lotterie a pagamento spendendo " + formatNumber(tot) + " §!");
									connection.query('UPDATE player SET money = money-' + tot + ' WHERE id = ' + player_id, function (err, rows, fields) {
										if (err) throw err;
									});
								};
							}.bind({
								i: this.i,
								len: this.len,
								price: this.price,
								lottery_id: this.lottery_id,
								creator_chat: this.creator_chat
							}));
						}
						if ((this.i + 1 == this.len) && (one == 0)) {
							bot.sendMessage(message.chat.id, "Sei già registrato a tutte le lotterie a pagamento!");
						};
					}.bind({
						player_id: player_id,
						lottery_id: lottery_id,
						i: i,
						len: len,
						price: price,
						creator_chat: creator_chat
					}));
				}
			});
			return;
		}

		connection.query('SELECT id FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, "Il nickname che hai inserito non esiste, riprova");
				return;
			}
			var creator_id = rows[0].id;

			connection.query('SELECT id, price FROM public_lottery WHERE creator_id = ' + creator_id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Il nickname che hai inserito non è associato a nessuna lotteria, riprova");
					return;
				}

				var price = rows[0].price;
				var lottery_id = rows[0].id;

				if (player_id == creator_id) {
					connection.query('SELECT 1 FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Ci sono attualmente " + Object.keys(rows).length + " partecipanti");
					});
					return;
				}

				if (price == 0) {
					bot.sendMessage(message.chat.id, "Questa è una lotteria non a pagamento, usa /lotteria per partecipare");
					return;
				}

				if (money - price <= 0) {
					bot.sendMessage(message.chat.id, "Non hai abbastanza monete per partecipare");
					return;
				}

				connection.query('SELECT 1 FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, function (err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length > 0) {
						bot.sendMessage(message.chat.id, "Sei già registrato a questa lotteria!");
						return;
					}
					connection.query('INSERT INTO public_lottery_players (lottery_id, player_id) VALUES (' + lottery_id + ',' + player_id + ')', function (err, rows, fields) {
						if (err) throw err;
						if (price != 0) {
							connection.query('UPDATE player SET money = money-' + price + ' WHERE id = ' + player_id, function (err, rows, fields) {
								if (err) throw err;
							});
							connection.query('UPDATE public_lottery SET money = money+' + price + ' WHERE id = ' + lottery_id, function (err, rows, fields) {
								if (err) throw err;
							});
							bot.sendMessage(message.chat.id, "Ti sei registrato alla lotteria al prezzo di " + formatNumber(price) + " §!\nPer rimuovere la registrazione usa /dlotteriap");

							connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + creator_id + ' AND type = 1', function (err, rows, fields) {
								if (err) throw err;
								var notify = 0;
								if (Object.keys(rows).length == 0) {
									notify = 1;
								} else {
									if (rows[0].deny == 0) {
										notify = 1;
									}
								}
								if (notify == 1) {
									connection.query('SELECT chat_id FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
										if (err) throw err;
										bot.sendMessage(rows[0].chat_id, message.from.username + " si è registrato alla tua lotteria a pagamento!");
									});
								};
							});
						}
					});
				});
			});
		});
	});
});

bot.onText(/^\/dlotteriap (.+)|^\/dlotteriap/, function (message, match) {
	if ((message.chat.id == "-1001069842056") || (message.chat.id == "-1001064571576")) {
		return;
	}

	if (!checkSpam(message)) {
		return;
	}

	var nickname = match[1];
	if ((nickname == undefined) || (nickname == "")) {
		bot.sendMessage(message.chat.id, "Per rimuovere la partecipazione ad una lotteria a pagamento utilizza la seguente sintassi: /dlotteriap @nickname");
		return;
	}

	nickname = nickname.replace("@", "");

	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;
		var money = rows[0].money;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, "...")
			return;
		}

		connection.query('SELECT id FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, "Il nickname che hai inserito non esiste, riprova");
				return;
			}
			var creator_id = rows[0].id;

			connection.query('SELECT id, price FROM public_lottery WHERE creator_id = ' + creator_id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Il nickname che hai inserito non è associato a nessuna lotteria, riprova");
					return;
				}

				var price = rows[0].price;
				var lottery_id = rows[0].id;

				if (price == 0) {
					bot.sendMessage(message.chat.id, "Questa è una lotteria non a pagamento, usa /dlotteria per rimuovere la registrazione");
					return;
				}

				connection.query('SELECT 1 FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, function (err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, "Non sei registrato a questa lotteria!");
						return;
					}
					connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id + ' AND player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err;
						if (price != 0) {
							connection.query('UPDATE player SET money = money+' + price + ' WHERE id = ' + player_id, function (err, rows, fields) {
								if (err) throw err;
							});
							connection.query('UPDATE public_lottery SET money = money-' + price + ' WHERE id = ' + lottery_id, function (err, rows, fields) {
								if (err) throw err;
							});
							bot.sendMessage(message.chat.id, "Hai rimosso la registrazione alla lotteria e hai recuperato " + formatNumber(price) + " §!");

							connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + creator_id + ' AND type = 1', function (err, rows, fields) {
								if (err) throw err;
								var notify = 0;
								if (Object.keys(rows).length == 0) {
									notify = 1;
								} else {
									if (rows[0].deny == 0) {
										notify = 1;
									}
								}
								if (notify == 1) {
									connection.query('SELECT chat_id FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
										if (err) throw err;
										bot.sendMessage(rows[0].chat_id, message.from.username + " ha rimosso la registrazione alla tua lotteria a pagamento!");
									});
								};
							});
						}
					});
				});
			});
		});
	});
});

bot.onText(/^\/scuola/, function (message) {
	bot.sendMessage(message.chat.id, "Entra nella scuola per giovani avventurieri: https://t.me/joinchat/AAAAAEDH8FbelcVFTmw-mQ", html);
});

bot.onText(/^\/statistiche/, function (message) {
	connection.query('SELECT MAX(id) As tot, SUM(achievement_count) As achievement, SUM(dungeon_count) As dungeon_tot, SUM(money) As money, SUM(craft_count) As craft, SUM(mission_count) As miss2 FROM player', function (err, rows, fields) {
		if (err) throw err;
		var tot = rows[0].tot;
		var achievement = rows[0].achievement;
		var money = rows[0].money;
		var craft = rows[0].craft;
		var miss2 = rows[0].miss2;
		var dungeon_tot = rows[0].dungeon_tot;
		connection.query('SELECT COUNT(*) As miss FROM player WHERE mission_id != 0', function (err, rows, fields) {
			if (err) throw err;
			var miss = rows[0].miss;

			connection.query('SELECT SUM(quantity) As inv FROM inventory', function (err, rows, fields) {
				if (err) throw err;
				var inv = rows[0].inv;
				connection.query('SELECT COUNT(id) As dragon FROM dragon', function (err, rows, fields) {
					if (err) throw err;
					var dragon = rows[0].dragon;
					connection.query('SELECT SUM(quantity) As chest FROM inventory_chest', function (err, rows, fields) {
						if (err) throw err;
						var chest = rows[0].chest;
						connection.query('SELECT MAX(id) As heist, COUNT(*) As heistn FROM heist', function (err, rows, fields) {
							if (err) throw err;
							var heist = rows[0].heist;
							var heistn = rows[0].heistn;
							connection.query('SELECT COUNT(*) As travel FROM player WHERE travel_id != 0', function (err, rows, fields) {
								if (err) throw err;
								var travel = rows[0].travel;
								connection.query('SELECT SUM(damage) As dmg FROM boss_damage', function (err, rows, fields) {
									if (err) throw err;
									var dmg = rows[0].dmg;
									connection.query('SELECT MAX(id) As teamn FROM team', function (err, rows, fields) {
										if (err) throw err;
										var teamn = rows[0].teamn;
										connection.query('SELECT SUM(IV.quantity) As u FROM item I, inventory IV WHERE I.id = IV.item_id AND I.rarity = "U"', function (err, rows, fields) {
											if (err) throw err;
											var u = rows[0].u;
											var d = new Date();
											var today = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate());
											connection.query('SELECT COUNT(*) As active FROM `last_command` WHERE time LIKE "' + today + '%"', function (err, rows, fields) {
												if (err) throw err;
												var act = rows[0].active;

												connection.query('SELECT SUM(quantity) As cnt FROM inventory WHERE item_id = 646', function (err, rows, fields) {
													if (err) throw err;
													var dust = rows[0].cnt;
													connection.query('SELECT `AUTO_INCREMENT` As lottery FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "public_lottery"', function (err, rows, fields) {
														if (err) throw err;
														var lottery = rows[0].lottery;
														connection.query('SELECT `AUTO_INCREMENT` As shop FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "public_shop"', function (err, rows, fields) {
															if (err) throw err;
															var shop = rows[0].shop;
															connection.query('SELECT `AUTO_INCREMENT` As daily FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "daily_chest"', function (err, rows, fields) {
																if (err) throw err;
																var daily = rows[0].daily;
																connection.query('SELECT `AUTO_INCREMENT` As dungeon FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "dungeon_list"', function (err, rows, fields) {
																	if (err) throw err;
																	var dungeon = rows[0].dungeon;
																	connection.query('SELECT `AUTO_INCREMENT` As room FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "dungeon_rooms"', function (err, rows, fields) {
																		if (err) throw err;
																		var room = rows[0].room;
																		connection.query('SELECT SUM(ability_level) As ablevel FROM `ability`', function (err, rows, fields) {
																			if (err) throw err;
																			var ablevel = rows[0].ablevel;
																			connection.query('SELECT `AUTO_INCREMENT` As invite FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "referral_list"', function (err, rows, fields) {
																				if (err) throw err;
																				var invite = rows[0].invite;
																				connection.query('SELECT TRUNCATE(SUM(CASE WHEN fail = 0 THEN 1 ELSE 0 END)/COUNT(*)*100,0) As perc FROM heist_history', function (err, rows, fields) {
																					if (err) throw err;
																					var perc = rows[0].perc;
																					connection.query('SELECT COUNT(*) As groups, SUM(members) As members FROM plus_groups WHERE last_update < NOW() - INTERVAL 1 WEEK', function (err, rows, fields) {
																						if (err) throw err;
																						var groups = rows[0].groups;
																						var members = rows[0].members;
																						connection.query('SELECT SUM(mana_1+mana_2+mana_3) As mana FROM event_mana_status', function (err, rows, fields) {
																							if (err) throw err;
																							var mana = rows[0].mana;
																							connection.query('SELECT SUM(quantity) As mag FROM magic', function (err, rows, fields) {
																								if (err) throw err;
																								var magic = rows[0].mag;
																								connection.query('SELECT `AUTO_INCREMENT` As search FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "search_history"', function (err, rows, fields) {
																									if (err) throw err;
																									var search = rows[0].search;
																									connection.query('SELECT `AUTO_INCREMENT` As top_log FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "dragon_top_log"', function (err, rows, fields) {
																										if (err) throw err;
																										var top_log = rows[0].top_log;
																										connection.query('SELECT SUM(quantity) As shop_tot FROM market_direct_history WHERE type = 2', function (err, rows, fields) {
																											if (err) throw err;
																											var shop_tot = rows[0].shop_tot;

																											connection.query('SELECT SUM(pay) As cnt FROM game_house_stats', function (err, rows, fields) {
																												if (err) throw err;
																												var house_tot = rows[0].cnt;

																												connection.query('SELECT SUM(mission_count) As cnt FROM team', function (err, rows, fields) {
																													if (err) throw err;
																													var mission_team = rows[0].cnt;

																													connection.query('SELECT COUNT(id) As cnt FROM artifacts', function (err, rows, fields) {
																														if (err) throw err;
																														var artifacts = rows[0].cnt;

																														bot.sendMessage(message.chat.id, "*Statistiche:*\n\n" +
																																		"*Giocatori registrati:* " + formatNumber(tot) + "\n" +
																																		"*Missioni in corso*: " + miss + "\n" +
																																		"*Missioni completate*: " + formatNumber(miss2) + "\n" +
																																		"*Viaggi in corso*: " + travel + "\n" +
																																		"*Utenti attivi (1):* " + formatNumber(act) + "\n" +
																																		"*Monete attuali*: " + formatNumber(money) + " §\n" +
																																		"*Oggetti*: " + formatNumber(inv) + "\n" +
																																		"*Scrigni attuali*: " + formatNumber(chest) + "\n" +
																																		"*Creazioni*: " + formatNumber(craft) + "\n" +
																																		"*Draghi*: " + formatNumber(dragon) + "\n" +
																																		"*Team:* " + formatNumber(teamn) + "\n" +
																																		"*Ispezioni/In corso/Rapporto:* " + formatNumber(heist) + "/" + heistn + "/" + perc + "%\n" +
																																		"*Danni ai boss attuali:* " + formatNumber(dmg) + "\n" +
																																		"*Lotterie:* " + formatNumber(lottery) + "\n" +
																																		"*Oggetti nei negozi:* " + formatNumber(shop) + "\n" +
																																		"*Oggetti acquistati:* " + formatNumber(shop_tot) + "\n" +
																																		"*Scrigni giornalieri consegnati:* " + formatNumber(daily) + "\n" +
																																		"*Dungeon completati:* " + formatNumber(dungeon_tot) + "\n" +
																																		"*Dungeon creati:* " + formatNumber(dungeon) + "\n" +
																																		"*Stanze create:* " + formatNumber(room) + "\n" +
																																		"*Livelli skill:* " + formatNumber(ablevel) + "\n" +
																																		"*Utenti invitati:* " + formatNumber(invite) + "\n" +
																																		"*Mana grezzo:* " + formatNumber(mana) + "\n" +
																																		"*Polvere:* " + formatNumber(dust) + "\n" +
																																		"*Incantesimi:* " + formatNumber(magic) + "\n" +
																																		"*Oggetti cercati:* " + formatNumber(search) + "\n" +
																																		"*Imprese completate:* " + formatNumber(achievement) + "\n" +
																																		"*Spese Casa dei Giochi:* " + formatNumber(house_tot) + " §\n" +
																																		"*Battaglie nella Vetta:* " + formatNumber(top_log) + "\n" +
																																		"*Incarichi completati:* " + formatNumber(mission_team) + "\n" +
																																		"*Artefatti ottenuti:* " + formatNumber(artifacts) + "\n" +

																																		"\n*Gruppi attivi (2):* " + formatNumber(groups) + "\n" +
																																		"*Membri nei gruppi attivi (2):* " + formatNumber(members) + "\n" +

																																		"\n(1) Utenti che hanno inviato un comando oggi\n(2) Utenti/gruppi che hanno inviato un comando nell'ultima settimana", mark);
																													});
																												});
																											});
																										});
																									});
																								});
																							});
																						});
																					});
																				});
																			});
																		});
																	});
																});
															});
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});
});

bot.onText(/^\/valorezaino (.+)|^\/valorezaino/, function (message, match) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;
		if (match[1] == undefined) {

			if (player_id == 1){
				bot.sendMessage(message.chat.id, message.from.username + ", il tuo zaino vale <b>troppi</b> §", html);
				return;
			}

			connection.query('SELECT SUM(I.value*IV.quantity) As val FROM item I, inventory IV WHERE I.id = IV.item_id AND IV.player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;

				if (rows[0].val == null)
					rows[0].val = 0;

				var sym = "";
				if ((new Date().getDate() == 1) && (new Date().getMonth() == 3)){
					rows[0].val = Math.round(getRandomArbitrary(0, 10000000000));
					sym = " 👀";
				}

				bot.sendMessage(message.chat.id, message.from.username + ", il tuo zaino vale <b>" + formatNumber(rows[0].val) + "</b> §" + sym, html);
			});
		} else {
			connection.query('SELECT SUM(I.value*IV.quantity) As val FROM item I, inventory IV WHERE I.id = IV.item_id AND rarity = "' + match[1] + '" AND IV.player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;
				if (rows[0].val == null) {
					bot.sendMessage(message.chat.id, "Rarità non valida o non possiedi oggetti");
					return;
				}

				var sym = "";
				if ((new Date().getDate() == 1) && (new Date().getMonth() == 3)){
					rows[0].val = Math.round(getRandomArbitrary(0, 500000000));
					sym = " 👀";
				}

				bot.sendMessage(message.chat.id, message.from.username + ", il tuo zaino per rarità " + match[1].toUpperCase() + " vale <b>" + formatNumber(rows[0].val) + "</b> §" + sym, html);
			});
		}
	});
});

bot.onText(/^\/creazioni/, function (message, match) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;
		connection.query('SELECT craft_count, craft_week FROM player WHERE id = ' + player_id, function (err, rows, fields) {
			if (err) throw err;

			bot.sendMessage(message.chat.id, message.from.username + ", hai ottenuto <b>" + formatNumber(rows[0].craft_count) + "</b> punti creazione totali, <b>" + formatNumber(rows[0].craft_week) + "</b> settimanali", html);
		});
	});
});

bot.onText(/^\/checkmarket (.+)/, function (message, match) {

	if (message.chat.id != -1001064797183){
		if (message.from.id != 20471035) {
			return;
		}
	}

	connection.query('SELECT id, nickname FROM player WHERE nickname = "' + match[1] + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;
		var nickname = rows[0].nickname;

		connection.query('SELECT P1.nickname As fromNick, P2.nickname As toNick, COUNT(from_id) As transac, (SELECT COUNT(to_id) FROM market_direct_history H WHERE (H.from_id = ' + player_id + ' OR H.to_id = ' + player_id + ')) As tot, ROUND(COUNT(from_id)/(SELECT COUNT(to_id) FROM market_direct_history H WHERE (H.from_id = ' + player_id + ' OR H.to_id = ' + player_id + '))*100, 2) As perc FROM market_direct_history H INNER JOIN player P1 ON P1.id = H.from_id INNER JOIN player P2 ON P2.id = H.to_id WHERE (H.from_id = ' + player_id + ' OR H.to_id = ' + player_id + ') GROUP BY from_id, to_id ORDER BY perc DESC', function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0){
				bot.sendMessage(message.chat.id, "Nessuna transazione");
				return;
			}

			var text = "Transazioni per " + nickname + ":\n";
			var len = Object.keys(rows).length;
			if (len > 50)
				len = 50;
			for (var i = 0; i < len; i++) {
				text += rows[i].fromNick + " > " + rows[i].toNick + " (" + rows[i].transac + ") " + rows[i].perc + "%\n";
			}
			bot.sendMessage(message.chat.id, text);
		});
	});
});

bot.onText(/^\/checkmarketAll (.+)|^\/checkmarketAll/, function (message, match) {

	if (message.chat.id != -1001064797183){
		if (message.from.id != 20471035) {
			return;
		}
	}

	if (match[1] == undefined)
		match[1] = 90;

	var player_id = 0;
	var nickname = "";
	var text = "Transazioni sospette (>= " + match[1] + "%, almeno 50) per gli utenti attivi:\n";
	var len = 0;
	var cnt = 0;

	console.log("Inizio controllo...");
	connection.query('SELECT P.id, P.nickname FROM last_command L, player P WHERE L.account_id = P.account_id AND L.time > NOW() - INTERVAL 1 WEEK', function (err, rows, fields) {
		if (err) throw err;

		console.log("Controllo transazioni sospette per " + Object.keys(rows).length + " utenti");
		for (var j = 0; j < Object.keys(rows).length; j++) {

			player_id = rows[j].id;
			nickname = rows[j].nickname;

			var transactions = connection_sync.query('SELECT P1.nickname As fromNick, P2.nickname As toNick, COUNT(from_id) As transac, (SELECT COUNT(to_id) FROM market_direct_history H WHERE (H.from_id = ' + player_id + ' OR H.to_id = ' + player_id + ')) As tot, ROUND(COUNT(from_id)/(SELECT COUNT(to_id) FROM market_direct_history H WHERE (H.from_id = ' + player_id + ' OR H.to_id = ' + player_id + '))*100, 2) As perc FROM market_direct_history H INNER JOIN player P1 ON P1.id = H.from_id INNER JOIN player P2 ON P2.id = H.to_id WHERE  (H.from_id = ' + player_id + ' OR H.to_id = ' + player_id + ') GROUP BY from_id, to_id ORDER BY perc DESC');

			len = Object.keys(transactions).length;
			if (len > 50)
				len = 50;
			var transaction = "";
			for (var i = 0; i < len; i++) {
				if ((transactions[i].perc > match[1]) && (transactions[i].transac > 50)){
					transaction = transactions[i].fromNick + " > " + transactions[i].toNick + " (" + transactions[i].transac + ") " + transactions[i].perc + "%";
					text += transaction + "\n";
					console.log(transaction);
				}
				cnt++;
			}
		}
		if (cnt > 0)
			bot.sendMessage(message.chat.id, text);
		else
			bot.sendMessage(message.chat.id, text + "Nessun risultato");
		console.log("Fine");
	});
});

bot.onText(/^\/gruzzolo/, function (message) {
	connection.query('SELECT id, money FROM player WHERE id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err;
		if (rows[0].id == 1){
			bot.sendMessage(message.chat.id, message.from.username + ", possiedi <b>troppissimi</b> §", html);
			return;
		}
		bot.sendMessage(message.chat.id, message.from.username + ", possiedi <b>" + formatNumber(rows[0].money) + "</b> §", html);
	});
});

bot.onText(/^\/oggetto (.+)|^\/oggetto/, function (message, match) {
	var oggetto = match[1];
	if (oggetto == undefined) {
		bot.sendMessage(message.chat.id, "Inserisci il nome dell'oggetto (es. /oggetto Spada Antimateria) per visualizzare quanti ne possiedi");
		return;
	}
	connection.query('SELECT * FROM item WHERE name = "' + oggetto + '"', function (err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length > 0) {
			var id = rows[0].id;
			var name = rows[0].name;
			var value = rows[0].value;
			var est = rows[0].estimate;
			var power = rows[0].power;
			var power_s = rows[0].power_shield;
			var power_a = rows[0].power_armor;
			var rarity = rows[0].rarity;
			var critical = rows[0].critical;

			connection.query('SELECT inventory.quantity As num FROM inventory, item WHERE item.id = inventory.item_id AND item.name = "' + oggetto + '" AND inventory.player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '") AND quantity > 0', function (err, rows, fields) {
				if (err) throw err;

				var posseduti = 0;
				if (Object.keys(rows).length > 0)
					posseduti = rows[0].num;

				connection.query('SELECT SUM(quantity) As num, (SELECT SUM(quantity) FROM inventory) As tot FROM inventory WHERE item_id = ' + id, function (err, rows, fields) {
					if (err) throw err;

					var diff = Math.round((rows[0].num / rows[0].tot) * 100 * 1000) / 1000 + "%";

					var pow = "";
					if (power != 0) {
						pow = "\n*Giocatore:* " + power + ", " + critical + "%";
					} else if (power_a != 0) {
						pow = "\n*Giocatore:* " + power_a + ", " + critical + "%";
					} else if (power_s != 0) {
						pow = "\n*Giocatore:* " + power_s + ", " + critical + "%";
					}

					bot.sendMessage(message.chat.id, "*Nome oggetto:* " + name + "\n" +
									"*Rarità:* " + rarity + pow + "\n" +
									"*Prezzo base:* " + formatNumber(value) + " §\n" +
									(est != 0 ? "*Valore:* " + formatNumber(est) + " §\n" : "") +
									"*Posseduti:* " + formatNumber(posseduti) + "\n" +
									"*Diffusione:* " + diff, mark);
				});
			});
		} else {
			bot.sendMessage(message.chat.id, "Non ho trovato l'oggetto specificato");
		}
	});
});

function cleanArray(actual) {
	var newArray = new Array();
	for (var i = 0; i < actual.length; i++) {
		if (actual[i]) {
			newArray.push(actual[i]);
		}
	}
	return newArray;
}

bot.onText(/^\/oggetti (.+)|^\/oggetti/, function (message, match) {

	var oggetto = match[1];
	var oggetti = [];
	if (oggetto == undefined) {
		bot.sendMessage(message.chat.id, "Inserisci il nome parziale dell'oggetto (es. /oggetti Spada Anti) per visualizzare la lista e la quantità, per una ricerca precisa usa l'asterisco");
		return;
	}

	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;
		var text = "";
		var intro = "";
		var name = "";
		var rarity = "";
		var posseduti = 0;

		if (oggetto.indexOf(",") != -1) {
			oggetti = oggetto.split(",");
			oggetti = cleanArray(oggetti);
		} else {
			oggetti.push(oggetto);
		}

		var len = Object.keys(oggetti).length;
		var ogg = "";
		var query = "";
		var part = "";

		intro += "<b>" + message.from.username + "</b> possiedi:";

		for (var i = 0; i < len; i++) {
			ogg = oggetti[i].trim();
			part = 'like "%' + ogg + '%"';
			if (ogg.indexOf("*") != -1) {
				ogg = ogg.replace("*", "");
				part = '= "' + ogg + '"';
			}

			query = 'SELECT item.name, item.rarity, inventory.quantity As num FROM item, inventory WHERE item.name ' + part + ' AND inventory.item_id = item.id AND inventory.player_id = ' + player_id + ' AND inventory.quantity > 0';
			connection.query(query, function (err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length > 0) {
					for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
						name = rows[i].name;
						rarity = rows[i].rarity;
						posseduti = rows[i].num;
						text += "\n> " + name + " (" + rarity + ", " + formatNumber(posseduti) + ")";
					}
				}

				if (this.i + 1 == this.len) {
					if (Object.keys(text).length > 0) {
						if (Object.keys(text).length < 4000) {
							bot.sendMessage(message.chat.id, intro + text, html);
						} else {
							bot.sendMessage(message.chat.id, "Troppi risultati, prova con un filtro più limitato");
						}
					} else {
						bot.sendMessage(message.chat.id, "Non possiedi nessun oggetto con i filtri specificati");
					}
				}
			}.bind({
				i: i,
				len: len
			}));
		};
	});
});

bot.onText(/^\/ricerca (.+)|^\/ricerca/, function (message, match) {

	if (!checkSpam(message)) {
		return;
	}

	var oggetto = match[1];
	if (oggetto == undefined) {
		bot.sendMessage(message.chat.id, "Inserisci il nome dell'oggetto (es. /ricerca Spada Antimateria) per cercare in tutte le vendite e scambi");
		return;
	}

	/*
	if (message.from.id != 20471035){
		bot.sendMessage(message.chat.id, "Manutenzione funzione");
		return;
	}
	*/

	var o = oggetto.trim();
	var oggetti = [];
	var ogg = "";

	if (o.indexOf(",") != -1) {
		oggetti = o.split(",");
		oggetti = cleanArray(oggetti);
	} else {
		oggetti.push(o);
	}

	var len = Object.keys(oggetti).length;
	var plur = "i";
	if (len == 1) {
		plur = "o";
	}
	var text = "Risultati ricerca di " + len + " oggett" + plur + ":\n";

	if (len > 3) {
		bot.sendMessage(message.chat.id, "Massimo 3 oggetti grazie!");
		return;
	}

	for (var i = 0; i < len; i++) {
		ogg = oggetti[i].trim();
		connection.query('SELECT id, name FROM item WHERE name = "' + ogg + '"', function (err, rows, fields) {
			if (err) throw err;

			var itemId = 0;
			var itemName = "";

			if (Object.keys(rows).length > 0) {
				itemId = rows[0].id;
				itemName = rows[0].name;
			}

			connection.query('SELECT player.nickname, public_lottery.price FROM public_lottery, player WHERE player.id = public_lottery.creator_id AND item_id = ' + itemId, function (err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length > 0) {
					text += "\n<b>Lotterie</b> per " + this.itemName + ":\n";
					for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
						if (rows[i].price == 0) {
							rows[i].price = "Gratis";
						} else {
							rows[i].price = formatNumber(rows[i].price) + " §";
						}
						text += "> " + rows[i].nickname + " (" + formatNumber(rows[i].price) + " - Lotteria)\n";
					}
				}

				connection.query('SELECT price FROM market_pack WHERE item_id = ' + this.itemId, function (err, rows, fields) {
					if (err) throw err;

					if (Object.keys(rows).length > 0) {
						text += "\n<b>Pacchetti</b> per " + this.itemName + ":\n";
						for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
							text += "> Mercante Pazzo (" + formatNumber(rows[i].price) + " § - Pacchetto)\n";
						}
					}

					connection.query('SELECT player.nickname, public_shop.code, public_shop.price FROM public_shop JOIN ( SELECT public_shop.code, MIN(public_shop.price) As minPrice, player.nickname FROM public_shop, player, inventory WHERE inventory.player_id = player.id AND inventory.item_id = ' + itemId + ' AND inventory.quantity > 0 AND public_shop.public = 1 AND public_shop.quantity > 0 AND player.id = public_shop.player_id AND public_shop.item_id = ' + itemId + ' GROUP BY nickname ) As t2, player, inventory WHERE inventory.player_id = player.id AND inventory.item_id = ' + itemId + ' AND inventory.quantity > 0 AND public_shop.public = 1 AND public_shop.quantity > 0 AND player.id = public_shop.player_id AND public_shop.item_id = ' + itemId + ' AND public_shop.price = t2.minPrice AND player.nickname = t2.nickname ORDER BY public_shop.price ASC', function (err, rows, fields) {
						if (err) throw err;
						if (Object.keys(rows).length > 0) {
							text += "\n<b>Negozi</b> per " + this.itemName + ":\n";
							for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
								text += "> " + rows[i].nickname + " (" + formatNumber(rows[i].price) + " § - <code>" + rows[i].code + "</code>)\n";
							}
						}

						if (this.i + 1 == this.len) {
							if (Object.keys(text).length > 50) {
								if (Object.keys(text).length < 4000) {
									bot.sendMessage(message.chat.id, text, html);
								} else {
									bot.sendMessage(message.chat.id, "Troppi risultati, prova con un filtro più limitato");
								}
							} else {
								bot.sendMessage(message.chat.id, "Non ho trovato nessun offerta in corso per gli oggetti specificati");
							}
						}
					}.bind({
						i: this.i,
						len: this.len,
						itemId: this.itemId,
						itemName: this.itemName
					}));
				}.bind({
					i: this.i,
					len: this.len,
					itemId: this.itemId,
					itemName: this.itemName
				}));
			}.bind({
				i: this.i,
				len: this.len,
				itemId: itemId,
				itemName: itemName
			}));
		}.bind({
			i: i,
			len: len
		}));
	};
});

bot.onText(/^\/necessari (.+)|^\/necessari/, function (message, match) {
	var oggetto = match[1];
	if (oggetto == undefined) {
		bot.sendMessage(message.chat.id, "Inserisci il nome dell'oggetto (es. /necessari Spada Antimateria) per visualizzare tutti i materiali necessari");
		return;
	}

	connection.query('SELECT id, name, searchable FROM item WHERE name = "' + oggetto + '"', function (err, rows, fields) {
		if (err) throw err;

		var main = "";
		var mainId = 0;

		if (Object.keys(rows).length > 0) {
			main = rows[0].name;
			mainId = rows[0].id;
		} else {
			bot.sendMessage(message.chat.id, "L'oggetto non esiste!");
			return;
		}

		if (rows[0].searchable == 0) {
			bot.sendMessage(message.chat.id, "L'oggetto è nascosto!");
			return;
		}

		connection.query('SELECT material_1, material_2, material_3 FROM craft WHERE material_result = ' + mainId, function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0) {
				connection.query('SELECT name, rarity, searchable FROM item WHERE id IN (' + rows[0].material_1 + ',' + rows[0].material_2 + ',' + rows[0].material_3 + ')', function (err, rows, fields) {
					if (err) throw err;
					var text = "Oggetti necessari per *" + main + "*:\n";
					text += "> " + rows[0].name + " (" + rows[0].rarity + ")\n";
					text += "> " + rows[1].name + " (" + rows[1].rarity + ")\n";
					text += "> " + rows[2].name + " (" + rows[2].rarity + ")\n";
					bot.sendMessage(message.chat.id, text, mark);
				});
			} else {
				bot.sendMessage(message.chat.id, "L'oggetto non è creabile!");
			}
		});
	});
});

bot.onText(/^\/notifiche (.+)|^\/notifiche/, function (message, match) {
	if (match[1] == undefined) {
		bot.sendMessage(message.chat.id, "Usa /notifiche <funzione> per disattivare le notifiche relative a quella funzione. Funzioni possibili:\n- lotterie\n- negozi");
		return;
	}

	var func = match[1];
	var type = 0;
	if (func == "lotterie") {
		type = 1;
	}else if (func == "negozi") {
		type = 2;
	} else {
		bot.sendMessage(message.chat.id, "Funzione non valida, riprova");
		return;
	}

	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;
		connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + player_id + ' AND type = ' + type, function (err, rows, fields) {
			if (err) throw err;
			var deny = 0;

			if (Object.keys(rows).length > 0) {
				deny = rows[0].deny;
				if (deny == 0) {
					connection.query('UPDATE plus_notify SET deny = 1 WHERE player_id = "' + player_id + '" AND type = ' + type, function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Le notifiche relative alle " + func.toLowerCase() + " sono state disattivate");
					});
				} else {
					connection.query('UPDATE plus_notify SET deny = 0 WHERE player_id = "' + player_id + '" AND type = ' + type, function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Le notifiche relative alle " + func.toLowerCase() + " sono state riattivate");
					});
				}
			} else {
				connection.query('INSERT INTO plus_notify (player_id, type, deny) VALUES (' + player_id + ',' + type + ',1)', function (err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(message.chat.id, "Le notifiche relative alle " + func.toLowerCase() + " sono state disattivate");
				});
			}
		});
	});
});

bot.onText(/^\/prezzo (.+)|^\/prezzo/, function (message, match) {
	var oggetto = match[1];
	if (oggetto == undefined) {
		bot.sendMessage(message.chat.id, "Inserisci il nome dell'oggetto (es. /prezzo Spada Antimateria) per conoscerne gli ultimi prezzi");
		return;
	}

	if (message.chat.id < 0) {
		bot.sendMessage(message.chat.id, "_Messaggio inviato in privato_", mark);
	}

	connection.query('SELECT quantity, price, (SELECT nickname FROM market_direct_history, player WHERE player.id = from_id AND item_id = (SELECT id FROM item WHERE name = "' + oggetto + '") LIMIT 1) As fromId, (SELECT nickname FROM market_direct_history, player WHERE player.id = to_id AND item_id = (SELECT id FROM item WHERE name = "' + oggetto + '") LIMIT 1) As toId, (SELECT SUM(quantity) FROM market_direct_history WHERE item_id = (SELECT id FROM item WHERE name = "' + oggetto + '")) As cnt, market_direct_history.time FROM market_direct_history WHERE item_id = (SELECT id FROM item WHERE name = "' + oggetto + '") ORDER BY id DESC', function (err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length > 0) {
			var text = "Ultimi prezzi trovati per " + oggetto + ":";

			var len = 10;
			if (Object.keys(rows).length < len) {
				len = Object.keys(rows).length;
			}

			var long_date = "";
			var d = new Date();
			for (var i = 0; i < len; i++) {
				d = new Date(rows[i].time);
				long_date = " alle " + addZero(d.getHours()) + ":" + addZero(d.getMinutes()) + ":" + addZero(d.getSeconds()) + " del " + addZero(d.getDate()) + "/" + addZero(d.getMonth() + 1) + "/" + d.getFullYear();
				text += "\n> " + rows[i].quantity + "x " + formatNumber(Math.round(rows[i].price)) + " § " + long_date;
			}
			bot.sendMessage(message.from.id, text + "\nVenduto " + rows[0].cnt + " volte");
		} else {
			bot.sendMessage(message.from.id, "Non ho trovato l'ultimo prezzo dell'oggetto specificato");
		}
	});
});

bot.onText(/^\/totale (.+)|^\/totale/, function (message, match) {
	var oggetto = match[1];
	if (oggetto == undefined) {
		bot.sendMessage(message.chat.id, "Inserisci il nome dell'oggetto (es. /totale Spada Antimateria) per calcolarne gli ultimi prezzi sommando i materiali necessari");
		return;
	}

	if (message.chat.id < 0) {
		bot.sendMessage(message.chat.id, "_Messaggio inviato in privato_", mark);
	}

	connection.query('SELECT material_1, material_2, material_3 FROM craft WHERE material_result = (SELECT id FROM item WHERE name = "' + oggetto + '" LIMIT 1)', function (err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.from.id, "L'oggetto inserito non esiste o non è creabile");
			return;
		}

		var material_1 = rows[0].material_1;
		var material_2 = rows[0].material_2;
		var material_3 = rows[0].material_3;

		var m1 = [];
		var m2 = [];
		var m3 = [];

		connection.query('SELECT price, (SELECT nickname FROM market_direct_history, player WHERE player.id = from_id AND item_id = ' + material_1 + ' LIMIT 1) As fromId, (SELECT nickname FROM market_direct_history, player WHERE player.id = to_id AND item_id = ' + material_1 + ' LIMIT 1) As toId, (SELECT SUM(quantity) FROM market_direct_history WHERE item_id = ' + material_1 + ') As cnt FROM market_direct_history WHERE item_id = ' + material_1 + ' ORDER BY id DESC', function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0) {
				var text = "Prezzi calcolati per " + oggetto + " (basato sulle ultime 100 transazioni):";

				var len = 10;
				if (Object.keys(rows).length < len) {
					len = Object.keys(rows).length;
				}

				for (var i = 0; i < len; i++) {
					m1.push([Math.round(rows[i].price)]);
				}

				connection.query('SELECT price, (SELECT nickname FROM market_direct_history, player WHERE player.id = from_id AND item_id = ' + material_2 + ' LIMIT 1) As fromId, (SELECT nickname FROM market_direct_history, player WHERE player.id = to_id AND item_id = ' + material_2 + ' LIMIT 1) As toId, (SELECT SUM(quantity) FROM market_direct_history WHERE item_id = ' + material_2 + ') As cnt FROM market_direct_history WHERE item_id = ' + material_2 + ' ORDER BY id DESC', function (err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length > 0) {
						if (Object.keys(rows).length < len) {
							len = Object.keys(rows).length;
						}

						for (var i = 0; i < len; i++) {
							m2.push([Math.round(rows[i].price)]);
						}

						connection.query('SELECT price, (SELECT nickname FROM market_direct_history, player WHERE player.id = from_id AND item_id = ' + material_3 + ' LIMIT 1) As fromId, (SELECT nickname FROM market_direct_history, player WHERE player.id = to_id AND item_id = ' + material_3 + ' LIMIT 1) As toId, (SELECT SUM(quantity) FROM market_direct_history WHERE item_id = ' + material_3 + ') As cnt FROM market_direct_history WHERE item_id = ' + material_3 + ' ORDER BY id DESC', function (err, rows, fields) {
							if (err) throw err;
							if (Object.keys(rows).length > 0) {
								if (Object.keys(rows).length < len) {
									len = Object.keys(rows).length;
								}

								for (var i = 0; i < len; i++) {
									m3.push([Math.round(rows[i].price)]);
								}

								for (var i = 0; i < len; i++) {
									text += "\n> " + (parseInt(m1[i]) + parseInt(m2[i]) + parseInt(m3[i])) + " §";
								}

								bot.sendMessage(message.from.id, text);
							} else {
								bot.sendMessage(message.from.id, "Non ho trovato dati sufficienti per l'oggetto specificato");
							}
						});
					} else {
						bot.sendMessage(message.from.id, "Non ho trovato dati sufficienti per l'oggetto specificato");
					}
				});
			} else {
				bot.sendMessage(message.from.id, "Non ho trovato dati sufficienti per l'oggetto specificato");
			}
		});
	});
});

function rebSym(reborn) {
	var rebSym = "";
	if (reborn == 1) {
		rebSym = "✨";
	} else if (reborn == 2) {
		rebSym = "🔆";
	} else if (reborn == 3) {
		rebSym = "💫";
	} else if (reborn == 4) {
		rebSym = "⭐️";
	} else if (reborn == 5) {
		rebSym = "🌟";
	}
	return rebSym;
}

function getInfo(message, player, myhouse_id, from, account_id) {
	connection.query('SELECT * FROM player WHERE nickname = "' + player + '"', function (err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.chat.id, "Il giocatore non è registrato");
			return;
		}

		var gender_text = "Giocatore";
		if (rows[0].gender == "F"){
			gender_text = "Giocatrice";
		}

		var player_id = rows[0].id;
		var nickname = rows[0].nickname;
		var exp = rows[0].exp;
		var lev = Math.floor(exp / 10);
		var reborn = rows[0].reborn;
		var money = rows[0].money;
		var rank = rows[0].rank;
		var ability = rows[0].ability;
		var mission_team_count = rows[0].mission_team_count;
		var player_description = rows[0].player_description;
		var player_custom_nickname = rows[0].player_custom_nickname;
		var life = rows[0].life;
		var total_life = rows[0].total_life;
		var gems = rows[0].gems;
		var heist_count = rows[0].heist_count;
		var spy_count = rows[0].spy_count;
		var craft_count = rows[0].craft_count;
		var craft_week = rows[0].craft_week;
		var custom_name = rows[0].custom_name;
		var custom_name2 = rows[0].custom_name2;
		var custom_name3 = rows[0].custom_name3;
		var custom_name_h = rows[0].custom_name_h;
		var weapon_id = rows[0].weapon_id;
		var weapon2_id = rows[0].weapon2_id;
		var weapon3_id = rows[0].weapon3_id;
		var weapon = rows[0].weapon;
		var weapon2 = rows[0].weapon2;
		var weapon3 = rows[0].weapon3;
		var weapon_enchant_bonus = rows[0].weapon_enchant_bonus;
		var weapon2_enchant_bonus = rows[0].weapon2_enchant_bonus;
		var weapon3_enchant_bonus = rows[0].weapon3_enchant_bonus;
		var weapon_enchant = rows[0].weapon_enchant;
		var weapon2_enchant = rows[0].weapon2_enchant;
		var weapon3_enchant = rows[0].weapon3_enchant;
		var power_dmg = rows[0].power_dmg;
		var power_def = rows[0].power_def;
		var power_weapon = rows[0].power_weapon;
		var power_armor = rows[0].power_armor;
		var power_shield = rows[0].power_shield;
		var weapon_crit = rows[0].weapon_crit;
		var weapon2_crit = rows[0].weapon2_crit;
		var weapon3_crit = rows[0].weapon3_crit;
		var charm_id = rows[0].charm_id;
		var house_id = rows[0].house_id;
		var reborn = rows[0].reborn;
		var class_id = rows[0].class;
		var boost_id = rows[0].boost_id;
		var creation_date = rows[0].creation_date;

		if (mission_team_count > 0)
			mission_team_count = "Incarichi: " + formatNumber(mission_team_count) + "\n";
		else 
			mission_team_count = "";

		if (rank > 0)
			rank = "Rango: " + getRankName(rank, 0) + " (" + rank + ")\n";
		else
			rank = "";

		connection.query('SELECT name, id FROM item WHERE id = ' + weapon_id, function (err, rows, fields) {
			if (err) throw err;
			var weapon_name = "-";
			var weapon_id = 0;
			if (Object.keys(rows).length > 0) {
				weapon_id = rows[0].id;
				if ((weapon_id == 638) || (weapon_id == 639) || (weapon_id == 640) || (weapon_id == 754)) {
					if (custom_name != null)
						weapon_name = custom_name + rows[0].name.replace("Necro", "");
					else
						weapon_name = rows[0].name;
				} else
					weapon_name = rows[0].name;
			};

			connection.query('SELECT ability_level FROM ability WHERE player_id = ' + player_id + ' AND ability_id = 1', function (err, rows, fields) {
				if (err) throw err;

				var abBonus = 0;
				if (Object.keys(rows).length > 0)
					abBonus = rows[0].ability_level;

				connection.query('SELECT COUNT(item_id) As cnt FROM artifacts WHERE player_id = ' + player_id, function (err, rows, fields) {
					if (err) throw err;

					var artifacts = "";
					if (rows[0].cnt > 0)
						artifacts = "Artefatti: ";
					if (rows[0].cnt >= 1)
						artifacts += "🔥";
					if (rows[0].cnt >= 2)
						artifacts += "⚡️";
					if (rows[0].cnt >= 3)
						artifacts += "⛈";
					if (rows[0].cnt >= 4)
						artifacts += "🌑";
					if (rows[0].cnt >= 5)
						artifacts += "🔮";
					if (rows[0].cnt > 0)
						artifacts += "\n";

					connection.query('SELECT name, description FROM item WHERE id = ' + charm_id, function (err, rows, fields) {
						if (err) throw err;
						var talismano = "-";
						var talismano_desc = "";
						if (Object.keys(rows).length > 0) {
							talismano = rows[0].name;
							talismano_desc = " (" + rows[0].description + ")";
						};

						connection.query('SELECT name FROM house WHERE grade = ' + house_id, function (err, rows, fields) {
							if (err) throw err;
							var rifugio = "-";
							if (Object.keys(rows).length > 0) {
								if (house_id >= 5) {
									if (custom_name_h != null)
										rifugio = "Rifugio " + custom_name_h + " (" + house_id + ")";
									else
										rifugio = rows[0].name + " (" + house_id + ")";
								} else
									rifugio = rows[0].name + " (" + house_id + ")";
							};

							connection.query('SELECT name FROM player, team, team_player WHERE player.id = ' + player_id + ' AND team.id = team_player.team_id AND team_player.player_id = player.id', function (err, rows, fields) {
								if (err) throw err;
								var team_desc = "";
								if (Object.keys(rows).length > 0)
									team_desc = "⚜️ " + rows[0].name.trim() + "\n";

								connection.query('SELECT name FROM house WHERE id = ' + house_id, function (err, rows, fields) {
									if (err) throw err;
									var house_name = rows[0].name;

									connection.query('SELECT name FROM item WHERE id = ' + weapon2_id, function (err, rows, fields) {
										if (err) throw err;
										var weapon2_name = "-";
										if (Object.keys(rows).length > 0) {
											if ((weapon2_id == 688) || (weapon2_id == 689) || (weapon2_id == 690)) {
												if (custom_name2 != null)
													weapon2_name = rows[0].name.replace("Necro", custom_name2);
												else
													weapon2_name = rows[0].name;
											} else
												weapon2_name = rows[0].name;
										}

										connection.query('SELECT name FROM item WHERE id = ' + weapon3_id, function (err, rows, fields) {
											if (err) throw err;
											var weapon3_name = "-";
											if (Object.keys(rows).length > 0) {
												if ((weapon3_id == 671) || (weapon3_id == 672) || (weapon3_id == 673)) {
													if (custom_name3 != null)
														weapon3_name = rows[0].name.replace("Necro", custom_name3);
													else
														weapon3_name = rows[0].name;
												} else
													weapon3_name = rows[0].name;
											}

											connection.query('SELECT dragon.* FROM player, dragon WHERE player.id = dragon.player_id AND player.id = ' + player_id, function (err, rows, fields) {
												if (err) throw err;
												var dragon_name = "-";
												var dragon_level = "-";
												var dragon_damage = "-";
												var dragon_defence = "-";
												var dragon_critical = "-";
												var dragon_clawsid = 0;
												var dragon_saddleid = 0;
												var dragon_armsid = 0;
												var dragon_claws = 0;
												var dragon = 0;
												var dragon_status = "In salute";

												if (Object.keys(rows).length > 0) {
													dragon = 1;

													if (charm_id == 602) {
														rows[0].damage += 25;
														rows[0].critical += 10;
													}
													if (charm_id == 695) {
														rows[0].damage += 30;
														rows[0].critical += 15;
													}

													if ((class_id == 7) && (reborn > 1) && (reborn == 5))
														rows[0].claws += rows[0].claws * 1;
													else if ((class_id == 7) && (reborn > 1))
														rows[0].claws += rows[0].claws * 0.5;
													if ((class_id == 7) && (reborn > 1) && (reborn == 5))
														rows[0].saddle += rows[0].saddle * 1;
													else if ((class_id == 7) && (reborn > 1))
														rows[0].saddle += rows[0].saddle * 0.5;

													if ((class_id == 7) && (reborn == 3))
														rows[0].critical += 5;

													if ((class_id == 7) && (reborn >= 4))
														rows[0].critical += 7;

													dragon_name = rows[0].name.trim() + " " + rows[0].type;
													dragon_level = rows[0].level;
													dragon_damage = "+" + Math.round(rows[0].damage + rows[0].claws);
													dragon_defence = "-" + Math.round(rows[0].defence + rows[0].saddle);
													dragon_critical = Math.round(rows[0].critical);

													dragon_claws = parseInt(rows[0].claws);

													dragon_clawsid = rows[0].claws_id;
													dragon_saddleid = rows[0].saddle_id;
													dragon_armsid = rows[0].arms_id;

													if (rows[0].life <= 0)
														dragon_status = "Esausto";
													if (rows[0].sleep_h > 0)
														dragon_status = "Dorme";
												}

												connection.query('SELECT name, COUNT(name) As num FROM item WHERE id = ' + dragon_clawsid, function (err, rows, fields) {
													if (err) throw err;

													var dragon_claws_n = "-";
													if (rows[0].num > 0)
														dragon_claws_n = rows[0].name;

													connection.query('SELECT name, COUNT(name) As num FROM item WHERE id = ' + dragon_saddleid, function (err, rows, fields) {
														if (err) throw err;

														var dragon_saddle_n = "-";
														if (rows[0].num > 0)
															dragon_saddle_n = rows[0].name;

														connection.query('SELECT name, COUNT(name) As num FROM item WHERE id = ' + dragon_armsid, function (err, rows, fields) {
															if (err) throw err;

															var dragon_arms_n = "-";
															if (rows[0].num > 0)
																dragon_arms_n = rows[0].name;

															connection.query('SELECT player_nick As player, new_player_nick As new, time FROM referral_list WHERE new_player = ' + player_id, function (err, rows, fields) {
																if (err) throw err;

																var referral = "";
																if (Object.keys(rows).length > 0) {
																	var d = new Date(rows[0].time);
																	var short_date = addZero(d.getDate()) + "/" + addZero(d.getMonth() + 1) + "/" + d.getFullYear();
																	referral = "Invitato da: " + rows[0].player + " (" + short_date + ")\n";
																}else {
																	if (creation_date != null){
																		var d = new Date(creation_date);
																		var short_date = addZero(d.getDate()) + "/" + addZero(d.getMonth() + 1) + "/" + d.getFullYear();
																		referral = "Registrato il " + short_date + "\n";
																	}
																}

																connection.query('SELECT COUNT(inventory.item_id) As cnt FROM inventory, item WHERE inventory.item_id = item.id AND player_id = ' + player_id + ' AND rarity = "IN" AND inventory.quantity > 0', function (err, rows, fields) {
																	if (err) throw err;

																	var inest = rows[0].cnt;

																	connection.query('SELECT name FROM class WHERE id = ' + class_id, function (err, rows, fields) {
																		if (err) throw err;

																		var class_name = "-";
																		if (Object.keys(rows).length > 0)
																			class_name = rows[0].name;

																		var stars = rebSym(reborn);

																		if (player_id == 1)
																			stars = "👑";

																		var enchant1 = "";
																		if (weapon_enchant_bonus == 1)
																			enchant1 = " 🌊";
																		else if (weapon_enchant_bonus == 2)
																			enchant1 = " ⚡️";
																		else if (weapon_enchant_bonus == 3)
																			enchant1 = " 🔥";
																		var enchant2 = "";
																		if (weapon2_enchant_bonus == 1)
																			enchant2 = " 🌊";
																		else if (weapon2_enchant_bonus == 2)
																			enchant2 = " ⚡️";
																		else if (weapon2_enchant_bonus == 3)
																			enchant2 = " 🔥";
																		var enchant3 = "";
																		if (weapon3_enchant_bonus == 1)
																			enchant3 = " 🌊";
																		else if (weapon3_enchant_bonus == 2)
																			enchant3 = " ⚡️";
																		else if (weapon3_enchant_bonus == 3)
																			enchant3 = " 🔥";

																		//Talismani

																		if (charm_id == 62)
																			weapon += 5;
																		if (charm_id == 184)
																			weapon += 15;
																		if (charm_id == 188)
																			weapon += 20;
																		if (charm_id == 404)
																			weapon_crit += 6;
																		if (charm_id == 493)
																			weapon_crit += 2;
																		if (charm_id == 494)
																			weapon_crit += 4;
																		if (charm_id == 495)
																			weapon2_crit += 3;
																		if (charm_id == 496)
																			weapon3_crit += 3;
																		if (charm_id == 696) {
																			weapon_crit += 5;
																			weapon2_crit += 5;
																			weapon3_crit += 3;
																		}
																		if (charm_id == 698)
																			weapon += 30;
																		if (abBonus > 0) {
																			weapon_crit += abBonus;
																			weapon2_crit += abBonus;
																			weapon3_crit += abBonus;
																		}

																		//Vocazioni

																		if ((class_id == 2) && (reborn == 3))
																			weapon2_crit += 5;
																		if ((class_id == 2) && (reborn >= 4)) {
																			weapon2_crit += 7;
																			weapon3_crit += 7;
																		}
																		if ((class_id == 4) && (reborn == 3)) {
																			weapon_crit += 2;
																			weapon2_crit += 2;
																			weapon3_crit += 2;
																		}
																		if ((class_id == 4) && (reborn >= 4)) {
																			weapon_crit += 7;
																			weapon2_crit += 7;
																			weapon3_crit += 7;
																		}
																		if ((class_id == 5) && (reborn == 3))
																			weapon3_crit += 4;
																		if ((class_id == 5) && (reborn >= 4))
																			weapon3_crit += 8;
																		if ((class_id == 6) && (reborn == 3))
																			weapon2_crit += 2;
																		if ((class_id == 6) && (reborn == 3))
																			weapon3_crit += 2;
																		if ((class_id == 6) && (reborn >= 4))
																			weapon2_crit += 7;
																		if ((class_id == 6) && (reborn >= 4))
																			weapon3_crit += 7;
																		if ((class_id == 6) && (reborn == 5))
																			weapon2_crit += 7;
																		if ((class_id == 6) && (reborn == 5))
																			weapon3_crit += 7;
																		if ((class_id == 8) && (reborn == 3))
																			weapon3_crit += 5;
																		if ((class_id == 8) && (reborn >= 4))
																			weapon3_crit += 7;
																		if ((class_id == 8) && (reborn == 5))
																			weapon_crit += 10;
																		if ((class_id == 9) && (reborn == 3)) {
																			weapon_crit += 2;
																			weapon3_crit += 2;
																		}
																		if ((class_id == 9) && (reborn >= 4)) {
																			weapon_crit += 7;
																			weapon3_crit += 7;
																		}

																		if ((class_id == 7) && (reborn == 5))
																			weapon_crit += Math.round(dragon_critical / 2);

																		if ((class_id == 8) && (reborn == 2))
																			weapon += weapon * 0.10;
																		else if ((class_id == 8) && (reborn == 3))
																			weapon += weapon * 0.15;
																		else if ((class_id == 8) && (reborn == 4))
																			weapon += weapon * 0.17;
																		else if ((class_id == 8) && (reborn == 5))
																			weapon += weapon * 0.30;

																		//Descrizioni

																		var weapon_desc = "";
																		if (weapon_name != "-") {
																			weapon += power_dmg;
																			weapon_crit += power_weapon;
																			weapon_desc = " (+" + Math.round(weapon) + ", " + weapon_crit + "%, " + weapon_enchant + enchant1 + ")";
																		}
																		var weapon2_desc = "";
																		if (weapon2_name != "-") {
																			weapon2 -= power_def;
																			weapon2_crit += power_armor;
																			weapon2_desc = " (" + Math.round(weapon2) + ", " + weapon2_crit + "%, " + weapon2_enchant + enchant2 + ")";
																		}
																		var weapon3_desc = "";
																		if (weapon3_name != "-") {
																			weapon3_crit += power_shield;
																			weapon3_desc = " (" + Math.round(weapon3) + ", " + weapon3_crit + "%, " + weapon3_enchant + enchant3 + ")";
																		}

																		if (player != message.from.username) {
																			if (myhouse_id == 1) {
																				life = "?";
																				total_life = "?";
																				heist_count = "?";
																				spy_count = "?";
																				money = "?";
																				exp = "?";
																				lev = "?";
																				weapon_name = "?";
																				weapon_desc = "";
																				weapon2_name = "?";
																				weapon2_desc = "";
																				weapon3_name = "?";
																				weapon3_desc = "";
																				talismano = "?";
																				talismano_desc = "";
																				dragon_name = "?";
																				dragon_level = "?";
																				dragon_claws_n = "?";
																				dragon_damage = "?";
																				dragon_saddle_n = "?";
																				dragon_defence = "?";
																				dragon_critical = "?";
																				dragon_status = "?";
																			} else if (myhouse_id == 2) {
																				heist_count = "?";
																				spy_count = "?";
																				money = "?";
																				weapon_name = "?";
																				weapon_desc = "";
																				weapon2_name = "?";
																				weapon2_desc = "";
																				weapon3_name = "?";
																				weapon3_desc = "";
																				talismano = "?";
																				talismano_desc = "";
																				dragon_name = "?";
																				dragon_level = "?";
																				dragon_claws_n = "?";
																				dragon_damage = "?";
																				dragon_saddle_n = "?";
																				dragon_arms_n = "?";
																				dragon_defence = "?";
																				dragon_critical = "?";
																			} else if (myhouse_id == 3) {
																				heist_count = "?";
																				spy_count = "?";
																				money = "?";
																				talismano = "?";
																				talismano_desc = "";
																				dragon_name = "?";
																				dragon_level = "?";
																				dragon_claws_n = "?";
																				dragon_damage = "?";
																				dragon_saddle_n = "?";
																				dragon_defence = "?";
																				dragon_critical = "?";
																			} else if (myhouse_id == 4) {
																				heist_count = "?";
																				spy_count = "?";
																				money = "?";
																			} else if (myhouse_id == 5)
																				money = "?";
																		}

																		if (from == 1)
																			message.chat.id = account_id;

																		bot.sendMessage(message.chat.id, "<b>" + gender_text + "</b> 👤\n" +
																						"👤 " + nickname + (player_custom_nickname != null ? " <i>" + player_custom_nickname + "</i>": "") + "\n" +
																						team_desc + 
																						stars + " " + formatNumber(lev) + " (" + formatNumber(exp) + " xp)\n\n" +
																						"🏹 " + class_name + "\n" +
																						"💎 " + gems + " 🏆 " + inest + "\n" +
																						"💰 " + formatNumber(money) + " §\n" +
																						"❤️ " + formatNumber(life) + " / " + formatNumber(total_life) + " hp\n" +
																						"📦 " + formatNumber(craft_count) + " (" + formatNumber(craft_week) + ")\n" +
																						"🏕 " + rifugio + "\n" +
																						"\n<b>Equipaggiamento</b> ⚔️\n" +
																						"🗡 " + weapon_name + weapon_desc + "\n" +
																						"🥋 " + weapon2_name + weapon2_desc + "\n" +
																						"🛡 " + weapon3_name + weapon3_desc + "\n" +
																						"📿 " + talismano + "\n" +

																						(dragon ? "\n<b>" + dragon_name + " (L" + dragon_level + ")</b> 🐉\n" : "") +
																						(dragon ? "Stato: " + dragon_status + "\n" : "") +
																						(dragon ? dragon_claws_n + " (" + dragon_damage + ")\n" : "") +
																						(dragon ? dragon_saddle_n + " (" + dragon_defence + ")\n" : "") +
																						(dragon ? dragon_arms_n + "\n" : "") +
																						(dragon ? "Critico (" + dragon_critical + "%)\n" : "") +

																						"\n<b>Altro</b> 💱\n" +
																						"Abilità: " + formatNumber(ability) + "\n" +
																						referral +
																						artifacts +
																						rank +
																						mission_team_count +
																						(player_description != null ? "\n<i>" + player_description + "</i>" : ""), html);
																	});
																});
															});
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});
};

bot.onText(/^\/giocatore/, function (message) {
	var player = message.from.username;
	var account_id = 0;

	getInfo(message, player, 6, 0, account_id);
});

bot.onText(/^\/ispeziona/, function (message) {

	if (message.reply_to_message == undefined) {
		bot.sendMessage(message.from.id, "Questo comando va utilizzato in _risposta_", mark);
		return;
	}

	if (!checkSpam(message)) {
		return;
	}

	var usr = message.reply_to_message.from.username;

	if (usr == message.from.username){
		bot.sendMessage(message.from.id, "Non puoi ispezionare te stesso");
		return;
	}

	connection.query('SELECT * FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;

		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}
		if (rows[0].holiday == 1) {
			bot.sendMessage(message.from.id, "Non puoi ispezionare in vacanza")
			return;
		}

		if (rows[0].heist_protection != null) {
			bot.sendMessage(message.from.id, "A causa del campo di forza non puoi ispezionare gli altri utenti");
			return;
		}

		var account_id = rows[0].account_id;
		var myexp = rows[0].exp;
		var lev = Math.floor(myexp / 10);
		var reborn = rows[0].reborn;
		var from_id = rows[0].id;
		var weapon_bonus = rows[0].weapon;
		var life = rows[0].life;
		var house_id = rows[0].house_id;
		var money = rows[0].money;
		var heist_count = rows[0].heist_count;
		var global_end = rows[0].global_end;
		var boost_id = rows[0].boost_id;
		var boost_mission = rows[0].boost_mission;

		if ((lev < 15) && (reborn == 1)) {
			bot.sendMessage(message.from.id, "Il tuo livello è ancora troppo basso.");
			return;
		}

		var travel = rows[0].travel_id;
		var cave = rows[0].cave_id;

		connection.query('SELECT COUNT(*) As num, datetime FROM heist WHERE from_id=' + from_id, function (err, rows, fields) {
			if (err) throw err;
			if (rows[0].num > 0) {
				var date = new Date(rows[0].datetime);
				var short_date = addZero(date.getHours()) + ":" + addZero(date.getMinutes());
				bot.sendMessage(message.from.id, "Ispezione in corso fino alle " + short_date);
				return;
			}
			connection.query('SELECT id FROM heist_progress WHERE from_id=' + from_id, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length > 0) {
					bot.sendMessage(message.from.id, "Stai svolgendo un ispezione, completala prima di iniziarne un'altra");
					return;
				}

				if (money < 3000) {
					bot.sendMessage(message.from.id, "Non hai abbastanza monete!");
					return;
				}

				connection.query('SELECT id, account_id, reborn, holiday FROM player WHERE nickname="' + usr + '"', function (err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length > 0) {
						if (isBanned(rows[0].account_id) != null) {
							bot.sendMessage(message.from.id, "Non puoi ispezionare un giocatore bannato");
							return;
						}

						var d = new Date();
						var time = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate());

						if (reborn > rows[0].reborn) {
							bot.sendMessage(message.from.id, "Puoi ispezionare solamente un giocatore con una rinascita pari o superiore alla tua");
							return;
						}
						if (heist_count >= 10) {
							bot.sendMessage(message.from.id, "Puoi ispezionare un rifugio solamente 10 volte al giorno, riprova domani dalle 3.");
							return;
						}

						if (rows[0].holiday == 1) {
							bot.sendMessage(message.from.id, "Non puoi ispezionare un giocatore in modalità vacanza.");
							return;
						}

						connection.query('SELECT id FROM heist_history WHERE from_id = ' + from_id + ' AND to_id = ' + rows[0].id + ' AND time LIKE "' + time + '%"', function (err, rows, fields) {
							if (err) throw err;
							if (Object.keys(rows).length <= 2) {
								attack(usr, message, from_id, weapon_bonus, 3000, 0, account_id, global_end, boost_id, boost_mission);
							} else {
								bot.sendMessage(message.from.id, "Hai ispezionato troppe volte questo giocatore, riprova domani.");
							}
						});
					}
				});
			});
		});
	});
});

function attack(nickname, message, from_id, weapon_bonus, cost, source, account_id, global_end, boost_id, boost_mission) {
	connection.query('SELECT exp, ability, chat_id, heist_count, heist_limit, heist_protection, house_id, custom_name_h, id, money FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
		if (err) throw err;
		var chat_id_nickname = rows[0].chat_id;
		var isMatch = source;

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.from.id, "Questo nickname non esiste, riprova.");
			return;
		}

		var to_id = rows[0].id;

		if ((to_id == 1) || (to_id == 3)) {
			bot.sendMessage(message.from.id, "Dice il saggio: 'Campa cavallo sulla panca insieme alla capra facendo i cavolacci propri... In poche parole, fatti gli affari tuoi :>'");
			return;
		}

		var house_id = rows[0].house_id;
		var heist_count = parseInt(rows[0].heist_count);
		var heist_limit = parseInt(rows[0].heist_limit);
		var ability = parseInt(rows[0].ability);
		var custom_name_h = rows[0].custom_name_h;

		if (rows[0].heist_protection != null) {
			bot.sendMessage(message.from.id, "Il bersaglio è sotto protezione");
			return;
		}
		if (rows[0].money <= 0) {
			bot.sendMessage(message.from.id, "Il bersaglio ha poche monete, riprova cambiando giocatore.");
			return;
		}

		if ((rows[0].exp <= 150) && (isMatch == 0)) {
			bot.sendMessage(message.from.id, "Il bersaglio ha poca esperienza, riprova cambiando giocatore.");
			return;
		}

		connection.query('SELECT level, name, type FROM dragon WHERE player_id = ' + to_id, function (err, rows, fields) {
			if (err) throw err;

			var dragon_lev = 0;
			var dragon_name = "";

			if (Object.keys(rows).length > 0) {
				dragon_lev = rows[0].level;
				dragon_name = rows[0].name + " " + rows[0].type;
			}

			connection.query('SELECT team.name FROM team_player, team WHERE team.id = team_player.team_id AND player_id = ' + to_id, function (err, rows, fields) {
				if (err) throw err;

				var team_name = "-";

				if (Object.keys(rows).length == 0) {
					if (heist_limit >= 3) {
						bot.sendMessage(message.from.id, "Il bersaglio non possiede un team e ha raggiunto il limite di ispezioni subite. Riprova domani.");
						return;
					}
				} else {
					if (heist_limit >= 10) {
						bot.sendMessage(message.from.id, "Il bersaglio ha raggiunto il limite di ispezioni subite. Riprova domani.");
						return;
					}
					team_name = rows[0].name;
				}

				if (isMatch == 1) {
					connection.query('UPDATE player SET last_mm = ' + to_id + ' WHERE id = ' + from_id, function (err, rows, fields) {
						if (err) throw err;
					});
				}

				connection.query('SELECT name, rooms, grade FROM house WHERE id=' + house_id, function (err, rows, fields) {
					if (err) throw err;

					var house_name = rows[0].name;
					var grade = rows[0].grade;
					var rooms = rows[0].rooms;

					connection.query('UPDATE player SET money = money-' + cost + ' WHERE id = ' + from_id, function (err, rows, fields) {
						if (err) throw err;
					});

					var method = 1;	//piedelesto default
					var query = "";
					//Secondi (massimo 6*600 + 100)
					var totTime = (grade * 900);
					var rate = 50;

					if (method == 1) {
						totTime = Math.round(totTime * 0.6);
						rate = 40;
					} else if (method == 3) {
						totTime = Math.round(totTime * 1.2);
						rate = 60;
					}

					/*
					if (global_end == 1){
						totTime = Math.round(totTime / 2);
					}
					*/

					if (boost_id == 9) {
						if (boost_mission - 1 == 0) {
							connection.query('UPDATE player SET boost_mission = 0, boost_id = 0 WHERE id = ' + from_id, function (err, rows, fields) {
								if (err) throw err;
							});
						} else {
							connection.query('UPDATE player SET boost_mission = boost_mission-1 WHERE id = ' + from_id, function (err, rows, fields) {
								if (err) throw err;
							});
						}

						totTime = Math.round(totTime / 2);
					}

					var now = new Date();
					now.setSeconds(now.getSeconds() + totTime);
					var short_date = addZero(now.getHours()) + ":" + addZero(now.getMinutes());
					var long_date = now.getFullYear() + "-" + addZero(now.getMonth() + 1) + "-" + addZero(now.getDate()) + " " + addZero(now.getHours()) + ':' + addZero(now.getMinutes()) + ':' + addZero(now.getSeconds());

					connection.query('INSERT INTO heist (from_id, to_id, datetime, rate1, grade, matchmaking) ' +
									 'VALUES (' + from_id + ',' + to_id + ',"' + long_date + '",' + rate + ',' + grade + ',' + isMatch + ')',
									 function (err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, message.from.username + ", hai inviato Piedelesto all'ispezione del rifugio di " + nickname + ", tornerà alle " + short_date + "!");
					});
					connection.query('UPDATE player SET heist_count = heist_count+1 WHERE id = ' + from_id, function (err, rows, fields) {
						if (err) throw err;
					});
				});
			});
		});
	});
}

bot.onText(/^\/spia/, function (message) {

	if (message.reply_to_message == undefined) {
		bot.sendMessage(message.chat.id, "Questo comando va utilizzato in _risposta_", mark);
		return;
	}

	if (!checkSpam(message)) {
		return;
	}

	var player = message.reply_to_message.from.username;

	connection.query('SELECT account_id, holiday, spy_count, heist_protection, account_id, id, exp, weapon, house_id, money FROM player WHERE nickname="' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(account_id, "Non puoi spiare in vacanza")
			return;
		}

		if (rows[0].spy_count >= 25) {
			bot.sendMessage(account_id, "Hai raggiunto il limite giornaliero.");
			return;
		}

		if (rows[0].heist_protection != null) {
			bot.sendMessage(account_id, "A causa del campo di forza non puoi spiare gli altri utenti", back);
			return;
		}

		var account_id = rows[0].account_id;
		var player_id = rows[0].id;
		var level = Math.floor(rows[0].exp / 10);
		var power = rows[0].weapon;
		var myhouse = rows[0].house_id;

		if (rows[0].money < 500) {
			bot.sendMessage(account_id, "Non hai abbastanza monete");
			return;
		}

		connection.query('SELECT id, heist_protection, chat_id, account_id, house_id FROM player WHERE nickname = "' + player + '"', function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0) {
				var chat_id = rows[0].chat_id;
				var house_id = rows[0].house_id;
				if (rows[0].id == 1) {
					bot.sendMessage(account_id, "Guardone :>");
					return;
				}

				if (rows[0].id == 3) {
					bot.sendMessage(account_id, "Non si fanno ste cose :c");
					return;
				}

				if (player_id == rows[0].id) {
					bot.sendMessage(account_id, "Per visualizzare il tuo equipaggiamento utilizza il comando /giocatore");
					return;
				}

				if (isBanned(rows[0].account_id) != null) {
					bot.sendMessage(account_id, "Non puoi spiare un giocatore bannato");
					return;
				}

				if (rows[0].heist_protection != null) {
					bot.sendMessage(account_id, "Il bersaglio è sotto protezione");
					return;
				}

				getInfo(message, player, myhouse, 1, account_id);

				connection.query('UPDATE player SET spy_count = spy_count+1, money=money-500 WHERE id = ' + player_id, function (err, rows, fields) {
					if (err) throw err;
				});

				if (message.from.id != 20471035) {
					if (house_id == 1) {
						bot.sendMessage(chat_id, "Le pattuglie intorno al villaggio ci hanno avvisato che qualcuno ha spiato il tuo rifugio!");
					} else if (house_id == 2) {
						bot.sendMessage(chat_id, "Le pattuglie intorno al villaggio ci hanno avvisato che qualcuno *di livello " + level + "* ha spiato il tuo rifugio!", mark);
					} else if ((house_id == 3) || (house_id == 4)) {
						bot.sendMessage(chat_id, "Le pattuglie intorno al villaggio ci hanno avvisato che *un livello " + level + ", con +" + power + " di danno* ha spiato il tuo rifugio!", mark);
					} else if (house_id >= 5) {
						bot.sendMessage(chat_id, "Le pattuglie intorno al villaggio ci hanno avvisato che <b>" + message.from.username + "</b> ha spiato il tuo rifugio!", html);
					}
				}
			} else {
				bot.sendMessage(account_id, "Giocatore non trovato.");
			}
		});
	});
});

function getRankName(rank) {
	var text = "";

	if (rank <= rankList[0]) {
		text = "Esploratore Novizio";
	} else if (rank <= rankList[1]) {
		text = "Esploratore Modesto";
	} else if (rank <= rankList[2]) {
		text = "Esploratore Professionista";
	} else if (rank <= rankList[3]) {
		text = "Avventuriero Giovane";
	} else if (rank <= rankList[4]) {
		text = "Avventuriero Forestiero";
	} else if (rank <= rankList[5]) {
		text = "Avventuriero della Notte";
	} else if (rank <= rankList[6]) { //500
		text = "Avventuriero Impavido";
	} else if (rank <= rankList[7]) { //750
		text = "Avventuriero Eroico";
	} else if (rank <= rankList[8]) { //750
		text = "Eroe delle Esplorazioni";
	} else {
		text = "Mappatore Avanzato";
	}

	return text;
};

bot.onText(/^\/scrigni/, function (message, match) {
	if (message.chat.id == "-1001069842056") {
		bot.sendMessage(message.chat.id, "Lo zaino non può essere visualizzato in questo gruppo");
		return;
	}

	connection.query('SELECT id, total_life, life, account_id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		var player_id = rows[0].id;
		var bottext = "<b>" + message.from.username + "</b> possiedi:\n";

		connection.query('SELECT chest.name, quantity As num FROM chest, inventory_chest WHERE chest.id = inventory_chest.chest_id AND inventory_chest.player_id = ' + player_id + ' AND quantity > 0 ORDER BY chest.id', function (err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length > 0) {
				for (i = 0, len = Object.keys(rows).length; i < len; i++) {
					bottext = bottext + "> " + rows[i].name + " (" + formatNumber(rows[i].num) + ")\n";
				}
			} else {
				bottext = bottext + "Nessuno scrigno disponibile\n";
			}

			if ((new Date().getDate() == 1) && (new Date().getMonth() == 3)){
				bot.sendMessage(message.chat.id, "Nessuno scrigno disponibile 👀", html);
			}else{
				bot.sendMessage(message.chat.id, bottext, html);
			}
		});
	});
});

bot.onText(/^\/zaino (.+)|^\/zaino/, function (message, match) {
	if (message.chat.id == "-1001069842056") {
		bot.sendMessage(message.chat.id, "Lo zaino non può essere visualizzato in questo gruppo");
		return;
	}

	if (match[1] == undefined) {
		bot.sendMessage(message.chat.id, "La sintassi è la seguente: /zaino rarità (esempio: /zaino E)");
		return;
	}

	connection.query('SELECT id, total_life, life, account_id FROM player WHERE nickname="' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err;
		var banReason = isBanned(rows[0].account_id);
		if (banReason != null) {
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		var player_id = rows[0].id;

		if (match[1].toLowerCase() == "i") {
			connection.query('DELETE FROM magic WHERE quantity <= 0 AND player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;

				var bottext = message.from.username + ", ecco i tuoi incantesimi:\n\n";

				connection.query('SELECT type, power, quantity FROM magic WHERE player_id = ' + player_id, function (err, rows, fields) {
					if (err) throw err;

					if (Object.keys(rows).length > 0) {
						var n = "";
						for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
							if (rows[i].type == 1) {
								n = "Furia dei Mari";
							} else if (rows[i].type == 2) {
								n = "Tempesta Folgorante";
							} else if (rows[i].type == 3) {
								n = "Impeto di Fiamme";
							} else if (rows[i].type == 4) {
								n = "Ira Astrale";
							}
							bottext = bottext + "> " + n + " " + rows[i].power + " (" + rows[i].quantity + ")\n";
						}
					} else {
						bottext = bottext + "Nessun incantesimo disponibile\n";
					}
					bot.sendMessage(message.chat.id, bottext, html);
				});
			});
		} else {
			connection.query('SELECT shortname FROM rarity WHERE shortname = "' + match[1] + '"', function (err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Rarità non valida", mark);
					return;
				}

				var orderBy = "ORDER BY rarity.id DESC, item.name ASC";
				if (rows[0].shortname == "D")
					orderBy = "ORDER BY item.id ASC";

				var bottext = "<b>" + message.from.username + "</b> possiedi (" + rows[0].shortname + "):\n";

				connection.query('SELECT inventory.player_id, item.name, rarity.id, rarity.name As rname, inventory.quantity As num FROM inventory, item, rarity WHERE player_id = ' + player_id + ' AND rarity.shortname = item.rarity AND inventory.item_id = item.id AND rarity.shortname = "' + rows[0].shortname + '" AND inventory.quantity > 0 ' + orderBy, function (err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length > 0) {
						for (i = 0, len = Object.keys(rows).length; i < len; i++) {
							bottext = bottext + "> " + rows[i].name + " (" + formatNumber(rows[i].num) + ")\n";
						}
					} else {
						bottext = bottext + "Nessun oggetto di questa rarità disponibile\n";
					}
					if (Object.keys(bottext).length > 4000) {
						bottext = "Purtroppo lo zaino non può essere visualizzato poichè contiene troppi oggetti";
					}

					bot.sendMessage(message.chat.id, bottext, html)
				});
			});
		}
	});
});

function checkAuction() {
	connection.query('SELECT creator_id FROM `auction_list` WHERE time_end < NOW() AND time_end IS NOT NULL', function (err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length > 0) {
			if (Object.keys(rows).length == 1) {
				console.log(getNow("it") + "\x1b[32m 1 asta terminata\x1b[0m");
			} else {
				console.log(getNow("it") + "\x1b[32m " + Object.keys(rows).length + " aste terminate\x1b[0m");
			}
			rows.forEach(setFinishedAuction);
		}
	});
};

function checkShopNotification() {
	connection.query('SELECT DISTINCT(code) AS code, player_id FROM `public_shop` WHERE TIMESTAMPDIFF(MINUTE, NOW(), time_end) < 60 AND time_end IS NOT NULL AND notified = 0', function (err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length > 0) {
			if (Object.keys(rows).length == 1) {
				console.log(getNow("it") + "\x1b[32m 1 negozio notificato\x1b[0m");
			} else {
				console.log(getNow("it") + "\x1b[32m " + Object.keys(rows).length + " negozi notificati\x1b[0m");
			}
			rows.forEach(setFinishedShopNotification);
		}
	});
};

function setFinishedShopNotification(element, index, array) {
	var player_id = element.player_id;
	var code = element.code;

	connection.query('SELECT chat_id FROM player WHERE id = ' + player_id, function (err, rows, fields) {
		if (err) throw err;
		var chat_id = rows[0].chat_id;
		connection.query('UPDATE public_shop SET notified = 1 WHERE code = ' + code, function (err, rows, fields) {
			if (err) throw err;
			bot.sendMessage(chat_id, "Il negozio con codice <code>" + code + "</code> verrà eliminato a breve, aggiornalo o cancellalo", html);
		});
	});
};

function checkShop() {
	connection.query('SELECT DISTINCT(code) As code, player_id FROM `public_shop` WHERE time_end < NOW() AND time_end IS NOT NULL', function (err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length > 0) {
			if (Object.keys(rows).length == 1) {
				console.log(getNow("it") + "\x1b[32m 1 negozio terminato\x1b[0m");
			} else {
				console.log(getNow("it") + "\x1b[32m " + Object.keys(rows).length + " negozi terminati\x1b[0m");
			}
			rows.forEach(setFinishedShop);
		}
	});
};

function setFinishedShop(element, index, array) {
	var code = element.code;
	var player_id = element.player_id;

	connection.query('SELECT id, chat_id FROM player WHERE id = ' + player_id, function (err, rows, fields) {
		if (err) throw err;

		var chat_id = rows[0].chat_id;

		connection.query('DELETE FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
			if (err) throw err;
			bot.sendMessage(chat_id, "Il negozio <code>" + code + "</code> è scaduto ed è stato eliminato", html);
		});
	});
};

function setFinishedAuction(element, index, array) {
	connection.query('SELECT id, chat_id, item_id, last_price, last_player FROM auction_list WHERE creator_id = ' + element.creator_id, function (err, rows, fields) {
		if (err) throw err;

		var auction_id = rows[0].id;
		var item_id = rows[0].item_id;
		var money = rows[0].last_price;
		var last_player = rows[0].last_player;
		var last_price = rows[0].last_price;
		var chat_id = rows[0].chat_id;

		connection.query('SELECT nickname FROM player WHERE id = ' + last_player, function (err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0) {
				connection.query('UPDATE player SET money = money + ' + last_price + ' WHERE id = ' + last_player, function (err, rows, fields) {
					if (err) throw err;
					connection.query('DELETE FROM auction_list WHERE id = ' + auction_id, function (err, rows, fields) {
						if (err) throw err;
						addItem(element.creator_id, item_id);
						bot.sendMessage(chat_id, "Non ci sono offerte, asta annullata!");
					});
				});
				return;
			}
			var nickname = rows[0].nickname;
			addItem(last_player, item_id);
			connection.query('SELECT item.name FROM item WHERE id = ' + item_id, function (err, rows, fields) {
				if (err) throw err;
				var itemName = rows[0].name;
				bot.sendMessage(chat_id, "Asta terminata per " + itemName + "!\n\nIl vincitore è: @" + nickname + " con l'offerta di " + formatNumber(last_price) + " §!");

				connection.query('UPDATE player SET money = money+' + money + ' WHERE id = ' + element.creator_id, function (err, rows, fields) {
					if (err) throw err;
				});

				var d = new Date();
				var long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

				connection.query('INSERT INTO auction_history (creator_id, player_id, price, item_id, time) VALUES (' + element.creator_id + ',' + last_player + ',' + last_price + ',' + item_id + ',"' + long_date + '")', function (err, rows, fields) {
					if (err) throw err;
				});

				connection.query('DELETE FROM auction_list WHERE id = ' + auction_id, function (err, rows, fields) {
					if (err) throw err;
				});
			});
		});
	});
};


function checkLottery() {
	connection.query('SELECT creator_id FROM `public_lottery` WHERE time_end < NOW() AND time_end IS NOT NULL', function (err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length > 0) {
			if (Object.keys(rows).length == 1) {
				console.log(getNow("it") + "\x1b[32m 1 lotteria terminata\x1b[0m");
			} else {
				console.log(getNow("it") + "\x1b[32m " + Object.keys(rows).length + " lotterie terminate\x1b[0m");
			}
			rows.forEach(setFinishedLottery);
		}
	});
};

function setFinishedLottery(element, index, array) {
	connection.query('SELECT id, price, chat_id, item_id, money FROM public_lottery WHERE creator_id = ' + element.creator_id, function (err, rows, fields) {
		if (err) throw err;

		var lottery_id = rows[0].id;
		var item_id = rows[0].item_id;
		var money = rows[0].money;
		var chat_id = rows[0].chat_id;
		var price = rows[0].price;

		connection.query('SELECT player_id FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
			if (err) throw err;
			var members_num = Object.keys(rows).length;
			if (Object.keys(rows).length < 5) {
				connection.query('SELECT player_id FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
					if (err) throw err;

					if (price > 0) {
						for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
							connection.query('UPDATE player SET money = money + ' + price + ' WHERE id = ' + rows[i].player_id, function (err, rows, fields) {
								if (err) throw err;
							});
						};
					}

					connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
						if (err) throw err;
						connection.query('DELETE FROM public_lottery WHERE id = ' + lottery_id, function (err, rows, fields) {
							if (err) throw err;
							bot.sendMessage(chat_id, "Non ci sono abbastanza partecipanti per estrarre automaticamente, la lotteria è annullata e l'oggetto è stato ritirato dalla segreteria.");
						});
					});
				});
				return;
			}
			var rand = Math.round(Math.random() * (Object.keys(rows).length - 1));
			var extracted = rows[rand].player_id;
			connection.query('SELECT nickname FROM player WHERE id = ' + extracted, function (err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(chat_id, "Non ho trovato il giocatore estratto!");
					return;
				}
				var nickname = rows[0].nickname;
				addItem(extracted, item_id);
				connection.query('SELECT item.name FROM item WHERE id = ' + item_id, function (err, rows, fields) {
					if (err) throw err;
					var itemName = rows[0].name;
					var extra = "";
					if (money > 0) {
						extra = " ed un ammontare pari a " + formatNumber(money) + " §";
					}
					bot.sendMessage(chat_id, "Estrazione automatica per " + itemName + " con " + members_num + " partecipanti" + extra + "!\n\nIl vincitore è: @" + nickname + "!");

					//bot.sendMessage(chat_id, "Estrazione automatica per " + itemName + "!\n\nIl vincitore è: @" + nickname + "!");

					connection.query('UPDATE player SET money = money+' + money + ' WHERE id = ' + element.creator_id, function (err, rows, fields) {
						if (err) throw err;
						//console.log("Consegnati " + money + " § al creatore");
					});

					connection.query('SELECT nickname, account_id, chat_id FROM public_lottery_players, player WHERE player.id = player_id AND lottery_id = ' + lottery_id, function (err, rows, fields) {
						if (err) throw err;
						for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
							if (rows[i].nickname != nickname) {
								bot.sendMessage(rows[i].chat_id, "Estrazione automatica per " + itemName + " terminata, purtroppo hai perso!");
							} else {
								bot.sendMessage(rows[i].chat_id, "Estrazione automatica per " + itemName + " terminata, HAI VINTO!");
							}
						}
						connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
							if (err) throw err;
							connection.query('DELETE FROM public_lottery WHERE id = ' + lottery_id, function (err, rows, fields) {
								if (err) throw err;
								//console.log("Lotteria terminata");
							});
						});
					});

					var d = new Date();
					var long_date = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

					connection.query('INSERT INTO public_lottery_history (creator_id, player_id, item_id, money, time) VALUES (' + element.creator_id + ',' + extracted + ',' + item_id + ',' + money + ',"' + long_date + '")', function (err, rows, fields) {
						if (err) throw err;
					});
				});
			});
		});
	});
};

function checkMarket() {
	connection.query('SELECT id, player_id, item_1_id FROM market WHERE time_end < NOW()', function (err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length > 0) {
			if (Object.keys(rows).length == 1) {
				console.log(getNow("it") + "\x1b[32m 1 offerta terminata\x1b[0m");
			} else {
				console.log(getNow("it") + "\x1b[32m " + Object.keys(rows).length + " offerte terminate\x1b[0m");
			}
			rows.forEach(setFinishedMarket);
		}
	});
};

function setFinishedMarket(element, index, array) {
	connection.query('SELECT chat_id, account_id, id FROM player WHERE id = ' + element.player_id, function (err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0) {
			console.log("ERRORE scambio: " + element.player_id);
			return;
		}

		var chat_id = rows[0].account_id;
		var player_id = rows[0].id;
		var item1 = element.item_1_id;

		addItem(player_id, item1);

		connection.query('DELETE FROM market WHERE id = ' + element.id, function (err, rows, fields) {
			if (err) throw err;
			bot.sendMessage(chat_id, "La vendita è scaduta, l'oggetto è tornato nell'inventario.");
		});
	});
}

function checkMarketDirect() {
	connection.query('SELECT player_id, item_id, id FROM market_direct WHERE time_end < NOW()', function (err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length > 0) {
			if (Object.keys(rows).length == 1) {
				console.log(getNow("it") + "\x1b[32m 1 offerta vendita terminata\x1b[0m");
			} else {
				console.log(getNow("it") + "\x1b[32m " + Object.keys(rows).length + " offerte vendita terminate\x1b[0m");
			}
			rows.forEach(setFinishedMarketDirect);
		}
	});
};

function setFinishedMarketDirect(element, index, array) {
	connection.query('SELECT chat_id, account_id, id FROM player WHERE id = ' + element.player_id, function (err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0) {
			console.log("ERRORE vendi: " + element.player_id);
			return;
		}

		var chat_id = rows[0].account_id;
		var player_id = rows[0].id;
		var item1 = element.item_id;

		addItem(player_id, item1);

		connection.query('DELETE FROM market_direct WHERE id = ' + element.id, function (err, rows, fields) {
			if (err) throw err;
			bot.sendMessage(chat_id, "L'offerta è scaduta, l'oggetto è tornato nell'inventario.");
		});
	});
}

// Gestione oggetti

function addItem(player_id, item_id, qnt = 1) {
	qnt = parseInt(qnt);
	if (isNaN(qnt)){
		console.log("ERRORE! addItem di " + qnt + "x " + item_id + " per player " + player_id);
		return;
	}

	var rows = connection_sync.query('UPDATE inventory SET quantity = quantity+' + qnt + ' WHERE player_id = ' + player_id + ' AND item_id = ' + item_id);
	if (rows.affectedRows == 0){
		connection_sync.query('INSERT INTO inventory (player_id, item_id, quantity) VALUES (' + player_id + ',' + item_id + ', ' + qnt + ')');
	}
}

function delItem(player_id, item_id, qnt = 1) {
	qnt = parseInt(qnt);
	if (isNaN(qnt)){
		console.log("ERRORE! delItem di " + qnt + "x " + item_id + " per player " + player_id);
		return;
	}

	connection.query('UPDATE inventory SET quantity = quantity-' + qnt + ' WHERE player_id = ' + player_id + ' AND item_id = ' + item_id, function (err, rows, fields) {
		if (err) throw err;
	});
}

function delAllItem(player_id, item_id) {
	connection.query('DELETE FROM inventory WHERE player_id = ' + player_id + ' AND item_id = ' + item_id, function (err, rows, fields) {
		if (err) throw err;
	});
}

function delAllInventory(player_id) {
	connection_sync.query('DELETE FROM inventory WHERE player_id = ' + player_id);
}

function getItemCnt(player_id, item_id) {
	var item = connection_sync.query('SELECT quantity FROM inventory WHERE player_id = ' + player_id + ' AND item_id = ' + item_id);
	if (Object.keys(item).length == 0)
		return 0;
	else
		return item[0].quantity;
}

// Gestione scrigni

function addChest(player_id, chest_id, qnt = 1) {
	qnt = parseInt(qnt);
	if (isNaN(qnt)){
		console.log("ERRORE! addChest di " + qnt + "x " + chest_id + " per player " + player_id);
		return;
	}

	var rows = connection_sync.query('UPDATE inventory_chest SET quantity = quantity+' + qnt + ' WHERE player_id = ' + player_id + ' AND chest_id = ' + chest_id);
	if (rows.affectedRows == 0){
		connection_sync.query('INSERT INTO inventory_chest (player_id, chest_id, quantity) VALUES (' + player_id + ',' + chest_id + ', ' + qnt + ')');
	}
}

function delChest(player_id, chest_id, qnt = 1) {
	qnt = parseInt(qnt);
	if (isNaN(qnt)){
		console.log("ERRORE! delChest di " + qnt + "x " + chest_id + " per player " + player_id);
		return;
	}
	connection.query('UPDATE inventory_chest SET quantity = quantity-' + qnt + ' WHERE player_id = ' + player_id + ' AND chest_id = ' + chest_id, function (err, rows, fields) {
		if (err) throw err;
	});
}

function delAllChest(player_id, chest_id) {
	connection.query('DELETE FROM inventory_chest WHERE player_id = ' + player_id + ' AND chest_id = ' + chest_id, function (err, rows, fields) {
		if (err) throw err;
	});
}

function delAllChestInventory(player_id) {
	connection_sync.query('DELETE FROM inventory_chest WHERE player_id = ' + player_id);
}

function getChestCnt(player_id, chest_id) {
	var item = connection_sync.query('SELECT quantity FROM inventory_chest WHERE player_id = ' + player_id + ' AND chest_id = ' + chest_id);
	if (Object.keys(item).length == 0)
		return 0;
	else
		return item[0].quantity;
}

function isBanned(account_id){
	var banned = connection_sync.query('SELECT reason FROM banlist WHERE account_id = ' + account_id);
	if (Object.keys(banned).length == 0){
		return null;
	}else{
		console.log(account_id + " è bannato");
		return banned[0].reason;
	}
}

function getRandomArbitrary(min, max) {
	return Math.random() * (max - min) + min;
}

// Funzioni

function addZero(i) {
	if (i < 10)
		i = "0" + i;
	return i;
}

function formatNumber(num) {
	return ("" + num).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, function ($1) {
		return $1 + "."
	});
}

function getNow(lang, obj) {
	var d = new Date();
	obj = typeof obj !== 'undefined' ? obj : false;

	if (lang == "it") {
		var datetime = addZero(d.getDate()) + "/" + addZero(d.getMonth() + 1) + "/" + d.getFullYear() + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
	} else if (lang == "en") {
		var datetime = d.getFullYear() + "-" + addZero(d.getMonth() + 1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
	} else {
		var datetime = "Lingua non specificata";
	}
	if (obj == true) {
		datetime = new Date(datetime);
	}
	return datetime;
}

function callNTimes(time, fn) {
	function callFn() {
		if (1 < 0) return;
		fn();
		setTimeout(callFn, time);
	}
	setTimeout(callFn, time);
}

function findAndRemove(array, str) {
	for (var i = 0; i < array.length; i++) {
		if (array[i] == str) {
			array.splice(i, 1);
		}
	}
	return array;
}

function findInArray(array, str) {
	for (var i = 0; i < array.length; i++) {
		if (array[i] == str) {
			return true;
		}
	}
	return false;
}

String.prototype.replaceAll = function (search, replacement) {
	var target = this;
	return target.replace(new RegExp(search, 'g'), replacement);
};
