process.on('uncaughtException', function (err) {
	console.error(err);
});

process.on('unhandledRejection', function(reason, p){
	console.error("REJ: " + reason);
});

//Globali
var banlist_id = [];
var banlist_tx = [];

var TelegramBot = require('node-telegram-bot-api');
var fs = require('fs')
const https = require('https');

var token = '236880746:AAEolJ-Dpe_gQdnGxksGFTb1ubMj03PVhw4';
var bot = new TelegramBot(token, {polling: true});

var check = [];
var qnt = [];
var globaltime = Math.round(new Date()/1000);
var timevar = [];
var rankList = [20,50,75,100,150,200,500,1000];

var mysql      = require('mysql');
var connection = mysql.createConnection({
	host     : 'xxx',
	user     : 'root',
	password : 'xxx',
	database : 'xxx'
});

connection.connect();

bot.on('message', function (message) {

	//console.log(update.chat);
	var msg = message;
	var text = msg.text;
	var user = msg.from.username;
	var chat_id = msg.chat.id;
	var account_id = msg.from.id;
	if ((text != "undefined") && (text != undefined)){
		if (text.startsWith("/")){
			console.log(getNow("it") + " - " + user + ": " + text);
		}
		if (user != "fenix45"){
			if (chat_id == -1001097316494){
				if (!text.startsWith("Negozio di")){
					bot.kickChatMember(message.chat.id, account_id).then(result => {
						bot.sendMessage(chat_id, user + ", non puoi scrivere in questo gruppo, sei stato kickato.");
					});
				}
			}
		}
	}

	if (msg.chat.id < 0){
		connection.query('SELECT chat_id FROM plus_groups WHERE chat_id = ' + msg.chat.id, function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0){
				bot.getChatMembersCount(msg.chat.id).then(function(cnt) {
					connection.query('INSERT INTO plus_groups (name, chat_id, members) VALUES ("' + msg.chat.title + '","' + msg.chat.id + '",' + cnt + ')', function(err, rows, fields) {
						if (err) throw err;
						console.log("Gruppo aggiunto");
					});
				});
			}else{
				bot.getChatMembersCount(msg.chat.id).then(function(cnt) {

					var d = new Date();
					var long_date = d.getFullYear() + "-" + addZero(d.getMonth()+1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

					connection.query('UPDATE plus_groups SET name = "' + msg.chat.title + '", members = ' + cnt + ', last_update = "' + long_date + '" WHERE chat_id = ' + msg.chat.id, function(err, rows, fields) {
						if (err) throw err;
						//console.log("Gruppo aggiornato");
					});
				});				
			}
		});
		connection.query('SELECT always FROM plus_groups WHERE chat_id = ' + msg.chat.id, function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0){
				if (rows[0].always == 1){
					checkStatus(message, user, account_id, 1);
				}
			}
		});
		connection.query('SELECT account_id FROM plus_players WHERE account_id = ' + msg.from.id, function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0){
				connection.query('INSERT INTO plus_players (account_id, nickname) VALUES (' + msg.from.id + ',"' + msg.from.username + '")', function(err, rows, fields) {
					if (err) throw err;
					console.log(msg.from.username + " aggiunto");
				});
			}else{
				connection.query('UPDATE plus_players SET nickname = "' + msg.from.username + '" WHERE account_id = ' + msg.from.id, function(err, rows, fields) {
					if (err) throw err;
				});
			}
		});
	}
});

function cutText(text){
	var len = Object.keys(text).length;
	if (len > 20){
		var start = text.substring(0,8);
		var end = text.substring(len-8, len);

		text = start + "..." + end;
	}
	return text;
}

bot.on("inline_query", function(query) {

	var code = parseInt(query.query);

	if ((code == "") || (isNaN(code))){
		return;
	}

	connection.query('SELECT public_shop.id, quantity, item.name, price, player_id FROM public_shop, item WHERE item.id = item_id AND code = ' + code, function(err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0){
			return;
		}

		var iKeys = [];
		var name = "";
		for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
			name = cutText(rows[i].name);
			iKeys.push([{ text: name + " - " + formatNumber(rows[i].price) + "§ (" + rows[i].quantity + ")", callback_data: rows[i].id.toString()}]);
		}

		iKeys.push([{ text: "Aggiorna", callback_data: "update:" + code.toString()}]);

		connection.query('SELECT nickname FROM player WHERE id = ' + rows[0].player_id, function(err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0){
				return;
			}

			var text =  "Negozio di " + rows[0].nickname + "!";
			var desc =  "Negozio di " + rows[0].nickname;

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

callNTimes(1000, function() {
	checkShopErr();
});

callNTimes(60000, function() {
	checkLottery();
	checkAuction();
	checkShop();
	checkShopNotification();
	checkMarket();
	checkMarketDirect();
});

bot.onText(/^\/start/, function(message) {
	bot.sendMessage(message.chat.id, "Questo è un bot di supporto a @xxxgamebot, è utile nei gruppi. Scrivi / per visualizzare tutti i comandi disponibili!");
});

bot.onText(/^\/birra/, function(message) {
	bot.sendMessage(message.chat.id, "🍺");
});

checkShopNotification();
reloadBans();

function reloadBans(){
	banlist_id = [];
	banlist_tx = [];

	var lineReader = require('readline').createInterface({
		input: require('fs').createReadStream('banlist.txt')
	});

	lineReader.on('line', function (line) {
		var elem = line.split("|");
		if (line != ""){
			banlist_id.push(elem[0]);
			banlist_tx.push(elem[1]);
			//console.log(elem[0]);
		}
	});
	console.log('Banlist caricata');
};

bot.onText(/^\/banlist/, function(message, match) {
	reloadBans();
	bot.sendMessage(message.chat.id, "Banlist aggiornata");
});

bot.onText(/^\/det (.+)/, function(message, match) {
	var nick = match[1];

	if (message.from.username == "fenix45"){
		connection.query('SELECT * FROM player WHERE nickname = "' + nick + '"', function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0){
				bot.sendMessage(message.chat.id, JSON.stringify(rows,null,4));
			}else{
				bot.sendMessage(message.chat.id, "Boh!");
			}
		});
	}
});

bot.onText(/^\/chatid/, function(message, match){
	bot.sendMessage(message.chat.id, message.chat.id);
});

bot.onText(/^\/last (.+)/, function(message, match){
	var nick = match[1];

	if (message.from.username == "fenix45"){
		connection.query('SELECT command, time FROM last_command, player WHERE last_command.account_id = player.account_id AND player.nickname = "' + nick + '"', function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0){
				bot.sendMessage(message.chat.id, "Comando: " + rows[0].command + "\n\n" + rows[0].time);
			}else{
				bot.sendMessage(message.chat.id, "Boh!");
			}		
		});
	};
});

bot.onText(/^\/pic (.+)/, function(message, match) {
	if (message.from.username == "fenix45"){
		connection.query('SELECT account_id FROM player WHERE nickname = "' + match[1] + '"', function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0){
				bot.sendPhoto(message.chat.id, "propic/" + rows[0].account_id + ".jpg");			
			}else{
				bot.sendMessage(message.chat.id, "Boh!");
			}
		});
	};
});

bot.onText(/^\/info$/, function(message) {
	var reply = "";
	if (message.reply_to_message != undefined){
		var date2 = new Date(message.reply_to_message.date*1000);
		reply = 			"\n*REPLY TO*\n" +
			"Message ID: " + message.reply_to_message.message_id + "\n" +
			"User ID: " + message.reply_to_message.from.id + "\n" +
			"User Name: " + message.reply_to_message.from.first_name + "\n" +
			"User @: " + message.reply_to_message.from.username + "\n" +
			"Chat ID: " + message.reply_to_message.chat.id + "\n" +
			"Chat Name: " + message.reply_to_message.chat.first_name + "\n" +
			"Chat @: " + message.reply_to_message.chat.username + "\n" +
			"Chat Type: " + message.reply_to_message.chat.type + "\n" +
			"Date: " + toDate("it",date2);
	}

	var date = new Date(message.date*1000);
	bot.sendMessage(message.chat.id, 	"Message ID: " + message.message_id + "\n" +
					"User ID: " + message.from.id + "\n" +
					"User Name: " + message.from.first_name + "\n" +
					"User @: " + message.from.username + "\n" +
					"Chat ID: " + message.chat.id + "\n" +
					"Chat Name: " + message.chat.first_name + "\n" +
					"Chat @: " + message.chat.username + "\n" +
					"Chat Type: " + message.chat.type + "\n" +
					"Date: " + toDate("it",date) + "\n" + reply, mark);
});

function toDate(lang,  d) {
	if (lang == "it"){
		var datetime = addZero(d.getDate()) + "/" + addZero(d.getMonth()+1) + "/" + d.getFullYear() + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
	}else if (lang == "en"){
		var datetime = d.getFullYear() + "-" + addZero(d.getMonth()+1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
	}else{
		var datetime = "Lingua non specificata";
	}
	return datetime;
}

bot.onText(/^\/gruppi/, function(message) {

	bot.getChatMembersCount(-1001069842056).then(function(data) {
		var c1 = data;	//taverna

		bot.getChatMembersCount(-1001064571576).then(function(data) {
			var c2 = data;	//mercato

			bot.getChatMembersCount(-1001097502362).then(function(data) {
				var c3 = data;	//xxxteria

				bot.getChatMembersCount(-1001078754923).then(function(data) {
					var c4 = data; //flame

					bot.getChatMembersCount(-1001050988033).then(function(data) {
						var c5 = data;

						bot.sendMessage(message.chat.id, 	"<b>Ufficiali</b>\n" +
										"Canale principale per aggiornamenti: @xxxAvvisi\n" +

										"\n<b>Bot</b>\n" +
										"Liste oggetti e alberi automatici: @craftxxxbot\n" +
										"Qualcuno sempre a disposizione: @Oracoloxxx\n" +
										"Calcolo Loot Combat Rating: @xxxcrbot\n" +

										"\n<b>Siti</b>\n" +
										"<a href='http://federicoxella.space/xxxbot'>Federico Xella</a> - Craft Help\n" +
										"<a href='http://beegotsy.altervista.org/xxxbot/'>#SonoPoveroFaccioGuide</a> - Materiali necessari, guida, e altre funzionalità in sviluppo\n" +

										"\n<b>Gruppi</b>\n" +
										"<a href='https://telegram.me/joinchat/AThc-z_EfojvcE8mbGw1Cw'>Taverna</a> (" + c1 + ") - Di tutto un po'\n" +
										"<a href='https://telegram.me/joinchat/AThc-z90Erh4M2O8Mk5QLw'>Mercato</a> (" + c2 + ") - Solo scambi!\n" +
										"<a href='https://telegram.me/joinchat/AThc-z6cvhH-w2JWq9Ioew'>Testi Missioni</a> - Proponi testi!\n" +
										"<a href='https://telegram.me/joinchat/AThc-0FnuI5vlb4Hm53W_w'>Negozi</a> - Solo i vostri negozi!\n" +
										"@LootteriaNew (" + c3 + ") - Riservato alle Lotterie\n" +
										"<a href='https://telegram.me/joinchat/AVqFykBMfmvLbIV2segXvA'>Loot Flame</a> (" + c4 + ") - Nessun filtro, solo flame\n" +
										"<a href='https://telegram.me/joinchat/DOs98T6kzgEjsbbxh9Xv9g'>Sala Aste</a> (" + c5 + ") - Gestione delle aste!\n" +
										"@LootNotturno - Per i giocatori notturni\n" +
										"<a href='https://telegram.me/joinchat/CMLXoEDzSXixQrX0CHrTkA'>Maxx the Looter</a> - Competizioni, aste e gare per vincere oggetti esclusivi!\n" +
										"<a href='https://telegram.me/joinchat/EXFobEDH8FbDpQ4MTmw-mQ'>xxx School</a> - Impara le basi del gioco per iniziare con una marcia in più!\n" + 

										"\n<b>Canali</b>\n" +
										"@xxxbotquestions - Domande e sondaggi su xxxlandia!\n" +
										"@xxxwiki - Guide essenziali e mirate per iniziare a giocare a Loot Bot!\n" +
										"@xxxPolls - Sondaggi su qualsiasi cosa inerente a Loot!\n" +
										"@LootReport - Segnala un comportamento scorretto nella community!\n" +

										"\nVisita anche /mercatini. Per comparire qua chiedi all'amministratore.", html);
					});
				});
			});
		});
	});
});

bot.onText(/^\/mercatini/, function(message) {
	bot.sendMessage(message.chat.id, 	"<b>Mercatini</b>\n" +
					"@LEMPORIOdiLootbot - Il primo negozio di Loot!\n" +
					"@AlienStore - Lo store alieno di Loot!\n" +
					"@LaPulceNellOrecchio | @ciarpamemistico - I mercanti del male\n" +
					"@ElCanton - Da oggi senza olio di palma!\n" +
					"@chinatownxxxbot - Prezzi vantaggiosi Made in China!\n" +
					"@zainoRobNoah - Vendo tacchini a prezzi pazzi!\n" +
					"@LHStore - Lo store onesto e di qualità\n" +
					"@bricoxxx - Il mercato per tutti e di tutti!\n" +
					"<a href='https://telegram.me/joinchat/CO5QxUDcLsPjZFzisCvJdQ'>Le Bot Noir</a> - Il solito negozio privato, solo più nero\n" +
					"@LootKea - Non servono neanche le istruzioni!\n" +
					"@sephishop - L'evoluzione digitale del vostro amato sephistore. Sempre conveniente, ora fai-da-te.\n" +
					"@fancazzisti_shop - Vendita oggetti per grandi, piccini e poveri\n" +
					"@lapiccolafiammiferaiaxxxbot - Comprate signori comprate! Prezzi modici, bassi e fissi\n" +
					"@freeitem - Troverete qui solamente oggetti a prezzi da Pozzi\n" +
					"@ecoxxxshop - Prezzi convenienti per utenti convenienti!\n" +
					"@xxxonlymychael - Chi non ha niente da fare è gentilmente pregato di andare a farlo da un’altra parte.\n" +
					"@GaiusBazaar - Un bel negozietto per veri intenditori!\n" +
					"@SoloCoseBellee - Prezzi belli per veri poverelli!\n" +
					"@HelioStore - Save money. Craft better.\n" +
					"@LootTatori - Store per veri Guerrieri!\n" +
					"@PaopuShop - Vieni a condividere il legame del Paopu con noi e non te ne pentirai\n" +
					"@dogestore - Such Prices! So Cheap! Much Items! #DogeCraft\n" +
					"@LoShopDiCodast - Accorrete numerosi!!\n" +
					"@LOOTshop - dove potete acquistare oggetti interessanti a basso prezzo\n" +
					"@xxxspar - il risparmio è dietro l'angolo\n" +
					"@ignorantxxxstore - Prezzi bassi e offerte nuove ogni giorno!\n" +
					"@AngoloRotturexxx - Tutte le rarità a basso costo!\n" +
					"@disadattatishop - Vendita oggetti di xxxbot!\n" +
					"@negoziopercaso - Negozio specializzato nel risparmio e nella cura dei nuovi giocatori nessuna fregatura solo prezzi basissimi\n" +

					"\nVisita anche /gruppi. Per comparire qua chiedi all'amministratore.", html);
});

bot.onText(/^\/cid/, function(message) {
	if (message.from.username == "fenix45"){
		bot.sendMessage(message.chat.id, message.chat.id);
	}
});

bot.onText(/^\/comandigruppo/, function(message) {
	bot.sendMessage(message.chat.id, 	"Questi comandi sono utilizzabili solo dagli amministratori, visualizza un riepilogo con /riassunto\n\n" +
					"*Benvenuto*\n" +
					"/setwelcome testo - Imposta il testo di benvenuto, usa \\n per andare a capo (massimo 1024 caratteri)\n" +
					"/welcome on-off - Abilita o disabilita il messaggio di benvenuto\n" +
					"\n*Variabili disponibili*:\n" +
					"#giocatore# - #livello# - #rinascita# - #iscritto# - #drago#\n" +
					"Esempio: Benvenuto #giocatore#!\n\n" +
					"*Filtro livello*\n" +
					"/setmin livello - Imposta il livello minimo\n" +
					"/setmax livello - Imposta il livello massimo\n" +
					"/livello on-off - Abilita o disabilita il filtro livello\n" +
					"Per specificare la rinascita incrementare il livello di 100, 250 o 450 a seconda della rinascita\n\n" +
					"*Filtro bannato*\n" +
					"/kickbanned on-off - Abilita o disabilita il filtro bannato\n\n" +
					"*Filtro non iscritto*\n" +
					"/kickreg on-off - Abilita o disabilita il filtro non iscritto\n\n" +
					"*Attiva i filtri per ogni messaggio*\n" +
					"/hardmode on-off - Abilita o disabilita il controllo filtri per ogni messaggio\n" +

					"\n\n_Altri comandi a breve_", mark);
});

bot.onText(/^\/riassunto/, function(message, match) {
	if (message.chat.id > 0){
		return;
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function(data) {
		if ((data.status == "creator") || (data.status == "administrator")){
			connection.query('SELECT * FROM plus_groups WHERE chat_id = ' + message.chat.id, function(err, rows, fields) {	
				if (err) throw err;
				if (Object.keys(rows).length > 0){
					var welcome_text = rows[0].welcome_text;
					if (welcome_text == null){
						welcome_text = "Non impostato";
					}
					var welcome = (rows[0].welcome) ? "✅" : "❌";
					var level = (rows[0].level) ? "✅" : "❌";
					var min_lev = rows[0].min_lev;
					var max_lev = rows[0].max_lev;
					var kickban = (rows[0].kickban) ? "✅" : "❌";
					var kickreg = (rows[0].kickreg) ? "✅" : "❌";
					var always = (rows[0].always) ? "✅" : "❌";

					bot.sendMessage(message.chat.id, 	"<b>Impostazioni gruppo:</b>\n" +
									"Messaggio di benvenuto: " + welcome_text + "\n" +
									"Benvenuto: " + welcome + "\n" +
									"Filtro livello: " + level + " (" + min_lev + "-" + max_lev + ")\n" +
									"Filtro bannato: " + kickban + "\n" +
									"Filtro non registrato: " + kickreg + "\n" +
									"Hard mode: " + always + "\n", html);
				}else{
					bot.sendMessage(message.chat.id, "Il gruppo non è memorizzato nel plus, contatta l'amministratore");
				}
			});
		};
	});
});

bot.onText(/^\/setmin (.+)/, function(message, match) {
	if (message.chat.id > 0){
		return;
	}

	if (isNaN(parseInt(match[1]))){
		bot.sendMessage(message.chat.id, "Valore non valido");
		return;
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function(data) {
		if ((data.status == "creator") || (data.status == "administrator")){
			var text = parseInt(match[1]);
			connection.query('SELECT * FROM plus_groups WHERE chat_id = ' + message.chat.id, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Errore impostazione livello");
				}else{
					connection.query('UPDATE plus_groups SET min_lev = ' + text + ' WHERE chat_id = ' +  message.chat.id, function(err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Livello minimo impostato correttamente, ricordati di abilitarlo con /level on");
					});
				}
			});
		}
	});
});

bot.onText(/^\/setmax (.+)/, function(message, match) {
	if (message.chat.id > 0){
		return;
	}

	if (isNaN(parseInt(match[1]))){
		bot.sendMessage(message.chat.id, "Valore non valido");
		return;
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function(data) {
		if ((data.status == "creator") || (data.status == "administrator")){
			var text = parseInt(match[1]);
			connection.query('SELECT * FROM plus_groups WHERE chat_id = ' + message.chat.id, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Errore impostazione livello");
				}else{
					connection.query('UPDATE plus_groups SET max_lev = ' + text + ' WHERE chat_id = ' +  message.chat.id, function(err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Livello massimo impostato correttamente, ricordati di abilitarlo con /level on");
					});
				}
			});
		}
	});
});

bot.onText(/^\/level (.+)/, function(message, match) {
	if (message.chat.id > 0){
		return;
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function(data) {
		if ((data.status == "creator") || (data.status == "administrator")){
			var text = match[1];
			connection.query('SELECT * FROM plus_groups WHERE chat_id = ' + message.chat.id, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Errore impostazione livello");
				}else{

					if ((text == "on") || (text == "off")){
						var val = 0;
						if (text == "on"){
							bot.sendMessage(message.chat.id, "Filtro livello abilitato: MIN " + rows[0].min_lev + ", MAX " + rows[0].max_lev + "\nRicorda di impostare il bot come amministratore");
							val = 1;
						}else{
							bot.sendMessage(message.chat.id, "Filtro livello disabilitato");
							val = 0;
						}
						connection.query('UPDATE plus_groups SET level = ' + val + ' WHERE chat_id = ' +  message.chat.id, function(err, rows, fields) {
							if (err) throw err;
						});
					}else{
						bot.sendMessage(message.chat.id, "Parametro non valido, on/off.");
					}
				}
			});
		}
	});
});

bot.onText(/^\/kickbanned (.+)/, function(message, match) {
	if (message.chat.id > 0){
		return;
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function(data) {
		if ((data.status == "creator") || (data.status == "administrator")){
			var text = match[1];
			connection.query('SELECT * FROM plus_groups WHERE chat_id = ' + message.chat.id, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Errore impostazione kick bannato");
				}else{

					if ((text == "on") || (text == "off")){
						var val = 0;
						if (text == "on"){
							bot.sendMessage(message.chat.id, "Filtro bannato abilitato\nRicorda di impostare il bot come amministratore");
							val = 1;
						}else{
							bot.sendMessage(message.chat.id, "Filtro bannato disabilitato");
							val = 0;
						}
						connection.query('UPDATE plus_groups SET kickban = ' + val + ' WHERE chat_id = ' +  message.chat.id, function(err, rows, fields) {
							if (err) throw err;
						});
					}else{
						bot.sendMessage(message.chat.id, "Parametro non valido, on/off.");
					}
				}
			});
		}
	});
});

bot.onText(/^\/kickreg (.+)/, function(message, match) {
	if (message.chat.id > 0){
		return;
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function(data) {
		if ((data.status == "creator") || (data.status == "administrator")){
			var text = match[1];
			connection.query('SELECT * FROM plus_groups WHERE chat_id = ' + message.chat.id, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Errore impostazione kick non iscritto");
				}else{

					if ((text == "on") || (text == "off")){
						var val = 0;
						if (text == "on"){
							bot.sendMessage(message.chat.id, "Filtro non iscritto abilitato\nRicorda di impostare il bot come amministratore");
							val = 1;
						}else{
							bot.sendMessage(message.chat.id, "Filtro non iscritto disabilitato");
							val = 0;
						}
						connection.query('UPDATE plus_groups SET kickreg = ' + val + ' WHERE chat_id = ' +  message.chat.id, function(err, rows, fields) {
							if (err) throw err;
						});
					}else{
						bot.sendMessage(message.chat.id, "Parametro non valido, on/off.");
					}
				}
			});
		}
	});
});

bot.onText(/^\/hardmode (.+)/, function(message, match) {
	if (message.chat.id > 0){
		return;
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function(data) {
		if ((data.status == "creator") || (data.status == "administrator")){
			var text = match[1];
			connection.query('SELECT * FROM plus_groups WHERE chat_id = ' + message.chat.id, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Errore impostazione hard mode");
				}else{

					if ((text == "on") || (text == "off")){
						var val = 0;
						if (text == "on"){
							bot.sendMessage(message.chat.id, "Filtro controllo intensivo abilitato\nRicorda di impostare il bot come amministratore");
							val = 1;
						}else{
							bot.sendMessage(message.chat.id, "Filtro controllo intensivo disabilitato");
							val = 0;
						}
						connection.query('UPDATE plus_groups SET always = ' + val + ' WHERE chat_id = ' +  message.chat.id, function(err, rows, fields) {
							if (err) throw err;
						});
					}else{
						bot.sendMessage(message.chat.id, "Parametro non valido, on/off.");
					}
				}
			});
		}
	});
});

bot.onText(/^\/setwelcome (.+)/, function(message, match) {
	if (message.chat.id > 0){
		return;
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function(data) {
		if ((data.status == "creator") || (data.status == "administrator")){
			var text = match[1];
			connection.query('SELECT * FROM plus_groups WHERE chat_id = ' + message.chat.id, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Errore impostazione benvenuto");
				}else{
					connection.query('UPDATE plus_groups SET welcome_text = "' + text + '" WHERE chat_id = ' +  message.chat.id, function(err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Messaggio di benvenuto impostato correttamente, ricordati di abilitarlo con /welcome on");
					});
				}
			});
		}
	});
});

bot.onText(/^\/welcome (.+)/, function(message, match) {
	if (message.chat.id > 0){
		return;
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function(data) {
		if ((data.status == "creator") || (data.status == "administrator")){
			var text = match[1];
			connection.query('SELECT * FROM plus_groups WHERE chat_id = ' + message.chat.id, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Errore impostazione benvenuto");
				}else{

					if ((text == "on") || (text == "off")){
						var val = 0;
						if (text == "on"){
							bot.sendMessage(message.chat.id, "Messaggio di benvenuto abilitato");
							val = 1;
						}else{
							bot.sendMessage(message.chat.id, "Messaggio di benvenuto disabilitato");
							val = 0;
						}
						connection.query('UPDATE plus_groups SET welcome = ' + val + ' WHERE chat_id = ' +  message.chat.id, function(err, rows, fields) {
							if (err) throw err;
						});
					}else{
						bot.sendMessage(message.chat.id, "Parametro non valido, on/off.");
					}
				}
			});
		}
	});
});

function checkStatus(message, n, accountid, type){
	connection.query('SELECT * FROM plus_groups WHERE chat_id = ' + message.chat.id, function(err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0){
			console.log("Gruppo non memorizzato");
			return;
		}

		var chat_id = rows[0].chat_id;

		if (n == "fenix45"){
			return;
		}

		var bon = rows[0].kickban;
		if (bon == 1){
			connection.query('SELECT * FROM player WHERE nickname = "' + n + '"', function(err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length > 0){
					var account_id = (rows[0].account_id).toString();

					if (banlist_id.indexOf(account_id) != -1){
						bot.kickChatMember(message.chat.id, rows[0].account_id).then(result => {
							if (result != "False"){
								bot.sendMessage(message.chat.id, n + " è bannato dal gioco, l'ho kickato");
							}
						});
						return;
					}
				}
			});
		}

		//		console.log("kickreg");

		var non = rows[0].kickreg;
		if (non == 1){
			connection.query('SELECT * FROM player WHERE nickname = "' + n + '"', function(err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length == 0){
					bot.kickChatMember(message.chat.id, accountid).then(result => {
						if (result != "False"){
							bot.sendMessage(message.chat.id, n + " non è iscritto, l'ho kickato");
						}
					});
					return;
				}
			});
		}			

		//		console.log("kicklev");

		var min = rows[0].min_lev;
		var max = rows[0].max_lev;
		var lon = rows[0].level;

		if (lon == 1){
			connection.query('SELECT * FROM player WHERE nickname = "' + n + '"', function(err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length > 0){

					var lev = Math.floor(rows[0].exp/10);
					var reb = rows[0].reborn;
					if (reb == 2){
						lev += 100;
					}
					if (reb == 3){
						lev += 100;
						lev += 150;
					}
					if (reb == 4){
						lev += 100;
						lev += 150;
						lev += 200;
					}

					console.log("Livello reale: " + lev);

					if ((lev < min) || (lev > max)){
						bot.kickChatMember(message.chat.id, rows[0].account_id).then(result => {
							if (result != "False"){
								bot.sendMessage(message.chat.id, n + " non rispetta i requisiti del livello, l'ho kickato");
							}
						});
						return;
					};
				};
			});
		}

		if (type == 0){
			var welcome = rows[0].welcome_text;
			var on = rows[0].welcome;

			if (on == 1){
				connection.query('SELECT * FROM player WHERE nickname = "' + n + '"', function(err, rows, fields) {
					if (err) throw err;

					if (Object.keys(rows).length == 0){
						welcome = n + " non è iscritto a Loot Bot";
					}else{
						var player_id = rows[0].id;
						var account_id = (rows[0].account_id).toString();
						var livello = Math.floor(rows[0].exp/10);
						var nickname = rows[0].nickname;
						var rinascita = rows[0].reborn;
						var ban_mercato = rows[0].market_ban;

						if (welcome != null){
							connection.query('SELECT name, type FROM dragon WHERE player_id = ' + player_id, function(err, rows, fields) {
								if (err) throw err;

								if (Object.keys(rows).length > 0){
									welcome = welcome.replace(new RegExp("#drago#", "g"), rows[0].name + " " + rows[0].type);
								}else{
									welcome = welcome.replace(new RegExp("#drago#", "g"), "-");
								}

								welcome = welcome.replace(new RegExp("#giocatore#", "g"), nickname);
								welcome = welcome.replace(new RegExp("#livello#", "g"), livello);
								welcome = welcome.replace(new RegExp("#rinascita#", "g"), rinascita-1);
								if (banlist_id.indexOf(account_id) != -1){
									welcome = welcome.replace(new RegExp("#iscritto#", "g"), "🚫");			//Bannato
								}else{
									if (ban_mercato == 1){
										welcome = welcome.replace(new RegExp("#iscritto#", "g"), "❌");          //Bannato dal mercato
									}else{
										welcome = welcome.replace(new RegExp("#iscritto#", "g"), "👍");		//Iscritto
									}
								}
								if (chat_id == "-1001069842056"){
									if (livello < 30){
										welcome += "\nPer imparare le basi del gioco, entra nella <a href='https://telegram.me/joinchat/EXFobEDH8FbDpQ4MTmw-mQ'>xxx School</a>!";
									}
								}
								bot.sendMessage(message.chat.id, welcome, html);
							});
						}
					}
				});
			}
		}
	});	
};

bot.on('new_chat_participant', function(message) {
	var n = message.new_chat_participant.username;
	var accountid = message.new_chat_participant.id;

	console.log(message.new_chat_participant);

	checkStatus(message, n, accountid, 0);
});

function getProPic(message){
	var userPhoto = bot.getUserProfilePhotos(message.from.id).then(data => {

		//console.log(data.photos);

		if (data.photos[0] == undefined){
			return;
		}

		var file_id = data.photos[0][2].file_id;

		bot.getFile(file_id).then(photoInfo => {
			var filePath = photoInfo.file_path;
			var url = "https://api.telegram.org/file/bot" + token + "/" + filePath;

			//console.log(url);

			var file = fs.createWriteStream("propic/" + message.from.id + ".jpg");
			var request = https.get(url, function(response) {
				response.pipe(file);
				console.log("Propic memorizzata");
			});
		});
	});
};

bot.onText(/^\/iscritto (.+)|^\/iscritto/i, function(message, match) {
	var n = "";
	n = match[1];

	if ((n == undefined) || (n == "")){
		n = message.from.username;
	}

	n = n.replace("@","");

	connection.query('SELECT market_ban, account_id FROM player WHERE nickname = "' + n + '"', function(err, rows, fields) {
		if (Object.keys(rows).length == 0){
			bot.sendMessage(message.chat.id, "👎", mark);
		}else{
			var account_id = (rows[0].account_id).toString();
			if (banlist_id.indexOf(account_id) != -1){
				bot.sendMessage(message.chat.id, "🚫", mark);
			}else{
				if (rows[0].market_ban == 0){
					bot.sendMessage(message.chat.id, "👍", mark);
				}else{
					bot.sendMessage(message.chat.id, "❌", mark);
				}
			}
		}
	});
});



bot.onText(/^\/cancellalotteria/, function(message) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;

		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		connection.query('SELECT * FROM public_lottery WHERE creator_id = ' + player_id, function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0){
				var lottery_id = rows[0].id;
				var item_id = rows[0].item_id;
				var price = rows[0].price;
				var time_end = new Date(rows[0].time_end);

				var time_creation = time_end.setHours(time_end.getHours()-48);
				var now = new Date();
				var diff = Math.round(((now - time_creation)/1000)/60);

				diff = Math.abs(diff);

				if (diff > 15){
					bot.sendMessage(message.chat.id, "Puoi annullare la lotteria solo entro 15 minuti dopo averla creata");
					return;
				}

				connection.query('SELECT player_id FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function(err, rows, fields) {
					if (err) throw err;

					for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
						connection.query('UPDATE player SET money = money + ' + price + ' WHERE id = ' + rows[i].player_id, function(err, rows, fields) {
							if (err) throw err;
						});	
					};

					connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function(err, rows, fields) {
						if (err) throw err;
						connection.query('DELETE FROM public_lottery WHERE id = ' + lottery_id, function(err, rows, fields) {
							if (err) throw err;
							connection.query('INSERT INTO inventory (player_id, item_id) VALUES (' + player_id + ',' + item_id + ')', function(err, rows, fields) {
								if (err) throw err;
								bot.sendMessage(message.chat.id, "Hai annullato la lotteria in corso");
								console.log("Lotteria terminata manualmente");
							});
						});
					});
				});	
			}else{
				bot.sendMessage(message.chat.id, "Non stai gestendo nessuna lotteria");
				return;
			}
		});
	});	
});

bot.onText(/^\/creaasta(?!p) ([^\s]+) (.+)|^\/creaasta(?!p)$/, function(message, match) {
	if ((message.chat.id == "-1001069842056") || (message.chat.id == "-1001064571576")){
		bot.sendMessage(message.chat.id, "Non possono essere create aste in questo gruppo");
		return;
	}

	var prezzo = parseInt(match[1]);
	var oggetto = match[2];
	if ((oggetto == undefined) || (oggetto == "") || (prezzo == undefined) || (prezzo == 0) || (isNaN(prezzo))){
		bot.sendMessage(message.chat.id, "Per inserire un'asta utilizza la seguente sintassi: /creaasta PrezzoBase NomeOggetto, l'oggetto viene rimosso dall'inventario appena creata l'asta");
		return;
	}

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;

		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1){
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1){
			bot.sendMessage(message.chat.id, "...", back)
			return;
		}

		connection.query('SELECT * FROM auction_list WHERE creator_id = ' + player_id, function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0){
				bot.sendMessage(message.chat.id, "Puoi gestire solo un'asta alla volta");
				return;
			}

			connection.query('SELECT * FROM auction_list WHERE chat_id = -1001069842056', function(err, rows, fields) {
				if (err) throw err;
				if ((Object.keys(rows).length > 0) && (message.chat.id == -1001069842056)){
					bot.sendMessage(message.chat.id, "In questo gruppo può esistere solamente un'asta alla volta");
					return;
				}

				connection.query('SELECT item.allow_sell, item.id, item.value FROM inventory, item WHERE inventory.item_id = item.id AND item.name = "' + oggetto + '" AND inventory.player_id = ' + player_id, function(err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length == 0){
						bot.sendMessage(message.chat.id, "Devi possedere l'oggetto per creare un'asta");
						return;
					}

					if (rows[0].allow_sell == 0){
						bot.sendMessage(message.chat.id, "Questo oggetto non può essere messo all'asta");
						return;
					}

					if ((prezzo > parseInt(rows[0].value)) || (prezzo < Math.round(rows[0].value/100))){
						bot.sendMessage(message.chat.id, "Il prezzo inserito non è valido, max: " + parseInt(rows[0].value) + ", min: " + Math.round(rows[0].value/100));
						return;
					}

					var item_id = rows[0].id;
					connection.query('DELETE FROM inventory WHERE item_id = ' + item_id + ' AND player_id = ' + player_id + ' LIMIT 1', function(err, rows, fields) {
						if (err) throw err;

						var d = new Date();
						var start_date = d.getFullYear() + "-" + addZero(d.getMonth()+1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
						d.setMinutes(d.getMinutes() + 10);
						var long_date = d.getFullYear() + "-" + addZero(d.getMonth()+1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

						connection.query('INSERT INTO auction_list (chat_id, creator_id, item_id, last_price, time_end, time_start) VALUES (' + message.chat.id + ',' + player_id + ',' + item_id + ',' + prezzo + ',"' + long_date + '","' + start_date + '")', function(err, rows, fields) {
							if (err) throw err;

							connection.query('SELECT id FROM auction_list WHERE creator_id = ' + player_id, function(err, rows, fields) {
								if (err) throw err;

								var id = rows[0].id;
								var iKeys = [];
								iKeys.push([{ text: "+10", callback_data: "asta:" + id + ":" + "10"}]);
								iKeys.push([{ text: "+100", callback_data: "asta:" + id + ":" + "100"}]);
								iKeys.push([{ text: "+1000", callback_data: "asta:" + id + ":" + "1000"}]);

								bot.sendMessage(message.chat.id, "*Asta per " + oggetto + "*\n\n*Offerta*: " + prezzo + "§\n\nAppena pubblicata, scade tra 10 minuti, ogni offerta consente 5 minuti per rilanciare.", {parse_mode: 'Markdown', reply_markup: { inline_keyboard: iKeys }});
							});
						});
					});
				});
			});
		});
	});
});

bot.onText(/^\/pubblicaasta/, function(message) {
	connection.query('SELECT auction_list.id, last_price, holiday, creator_id, last_player, item_id, time_end, nickname, market_ban FROM auction_list, player WHERE player.id = auction_list.creator_id AND auction_list.creator_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function(err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0){
			bot.sendMessage(message.chat.id, "Puoi pubblicare solo le tue aste, al momento non ne hai nessuna aperta");
			return;
		}

		if (rows[0].market_ban == 1){
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1){
			bot.sendMessage(message.chat.id, "...", back)
			return;
		}

		var creator_nickname = rows[0].nickname;
		var last_player = rows[0].last_player;
		var last_player_nickname = "";
		var last_price = rows[0].last_price;
		var itemName = "";

		var d = new Date(rows[0].time_end);
		var long_date = d.getFullYear() + "-" + addZero(d.getMonth()+1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
		var short_date = addZero(d.getHours()) + ":" + addZero(d.getMinutes()) + ":" + addZero(d.getSeconds());

		var id = rows[0].id;

		connection.query('SELECT name FROM item WHERE id = ' + rows[0].item_id, function(err, rows, fields) {
			if (err) throw err;

			itemName = rows[0].name;

			connection.query('SELECT nickname FROM player WHERE id = ' + last_player, function(err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length == 0){
					last_player_nickname = "-";
				}else{
					last_player_nickname = rows[0].nickname;
				}

				var iKeys = [];
				iKeys.push([{ text: "+10", callback_data: "asta:" + id + ":" + "10"}]);
				iKeys.push([{ text: "+100", callback_data: "asta:" + id + ":" + "100"}]);
				iKeys.push([{ text: "+1000", callback_data: "asta:" + id + ":" + "1000"}]);

				var text = "*Asta per " + itemName + "*\n\n*Creatore*: " + creator_nickname.replace(new RegExp("_", "g"), " ") + "\n*Offerta*: " + last_price + "§\n*Offerente:* " + last_player_nickname.replace(new RegExp("_", "g"), " ") + "\n*Scade alle:* " + short_date;

				bot.sendMessage(message.chat.id, text, {parse_mode: 'Markdown', reply_markup: { inline_keyboard: iKeys }});
			});
		});
	});
});

bot.onText(/^\/cancellaasta/, function(message) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;

		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		connection.query('SELECT * FROM auction_list WHERE creator_id = ' + player_id, function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0){
				var auction_id = rows[0].id;
				var item_id = rows[0].item_id;
				var last_price = rows[0].last_price;
				var last_player = rows[0].last_player;
				var time_start = new Date(rows[0].time_start);

				var now = new Date();
				var diff = Math.round(((now - time_start)/1000)/60);

				diff = Math.abs(diff);

				if (diff > 5){
					bot.sendMessage(message.chat.id, "Puoi annullare l'asta solo entro 5 minuti dopo averla creata");
					return;
				}

				connection.query('UPDATE player SET money = money + ' + last_price + ' WHERE id = ' + last_player, function(err, rows, fields) {
					if (err) throw err;
					connection.query('DELETE FROM auction_list WHERE id = ' + auction_id, function(err, rows, fields) {
						if (err) throw err;
						connection.query('INSERT INTO inventory (player_id, item_id) VALUES (' + player_id + ',' + item_id + ')', function(err, rows, fields) {
							if (err) throw err;
							bot.sendMessage(message.chat.id, "Hai annullato l'asta in corso");
							console.log("Asta terminata manualmente");
						});
					});
				});
			}else{
				bot.sendMessage(message.chat.id, "Non stai gestendo nessuna asta");
				return;
			}
		});
	});	
});

bot.onText(/^\/asta(?!p) ([^\s]+) (.+)|^\/asta(?!p)/, function(message, match) {
	if ((message.chat.id == "-1001069842056") || (message.chat.id == "-1001064571576")){
		bot.sendMessage(message.chat.id, "Non puoi partecipare alle aste in questo gruppo");
		return;
	}

	var prezzo = parseInt(match[1]);
	var nickname = match[2];
	if ((nickname == undefined) || (nickname == "") || (prezzo == undefined) || (isNaN(prezzo))){
		bot.sendMessage(message.chat.id, "Per partecipare ad un asta utilizza la seguente sintassi: /asta Prezzo @nickname, mentre /creaasta per iniziarne una nuova");
		return;
	}	

	nickname = nickname.replace("@","");

	connection.query('SELECT id, money, account_id, market_ban FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;
		var money = rows[0].money;

		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1){
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		connection.query('SELECT id FROM player WHERE nickname = "' + nickname + '"', function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0){
				bot.sendMessage(message.chat.id, "Il nickname che hai inserito non esiste, riprova");
				return;
			}

			var creator_id = rows[0].id;
			connection.query('SELECT id, last_price, item_id, time_end, last_player FROM auction_list WHERE creator_id = ' + creator_id, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Il nickname che hai inserito non è associato a nessuna asta, riprova");
					return;
				}

				var last_price = rows[0].last_price;
				var auction_id = rows[0].id;
				var last_player = rows[0].last_player;
				var itemId = rows[0].item_id;
				var d = new Date();

				if (money < prezzo){
					bot.sendMessage(message.chat.id, "Non hai abbastanza credito per rialzare di " + prezzo + "§");
					return;
				}

				if (prezzo <= last_price){
					bot.sendMessage(message.chat.id, "L'offerta attuale è " + last_price + "§, rialza.");
					return;					
				}

				if (player_id == creator_id){
					bot.sendMessage(message.chat.id, "Non puoi rialzare la tua asta!");
					return;
				}

				connection.query('SELECT name FROM item WHERE id = ' + itemId, function(err, rows, fields) {
					if (err) throw err;
					var itemName = rows[0].name;

					connection.query('SELECT account_id FROM player WHERE id = ' + last_player,  function(err, rows, fields) {
						if (err) throw err;
						if (Object.keys(rows).length > 0){
							var account_id = rows[0].account_id;
							connection.query('UPDATE player SET money = money + ' + last_price + ' WHERE id = ' + last_player, function(err, rows, fields) {
								if (err) throw err;
								bot.sendMessage(account_id, "Sei stato superato nell'asta di " + nickname + " per " + itemName + ", dove *" + message.from.username + "* ha offerto *" + prezzo + "*§", mark);
							});
						}
					});

					d.setMinutes(d.getMinutes() + 5);
					var long_date = d.getFullYear() + "-" + addZero(d.getMonth()+1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

					connection.query('UPDATE auction_list SET time_end = "' + long_date + '", last_price = ' + prezzo + ', last_player = ' + player_id + ' WHERE id = ' + auction_id, function(err, rows, fields) {
						if (err) throw err;
						connection.query('UPDATE player SET money = money - ' + prezzo + ' WHERE id = ' + player_id, function(err, rows, fields) {
							if (err) throw err;
							bot.sendMessage(message.chat.id, message.from.username.replace(new RegExp("_", "g"), " ") + ", hai offerto *" + prezzo + "*§ per " + itemName, mark);
						});
					});
				});
			});
		});
	});
});

/*
bot.onText(/^\/termina/, function(message) {
	connection.query('SELECT id, account_id, market_ban FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;

		var account_id = (rows[0].account_id).toString();
                if (banlist_id.indexOf(account_id) != -1){
			console.log("BANNATO! (" + message.from.username + ")");
                	var text = "...";
                        bot.sendMessage(message.chat.id, text, mark);
                        return;
                }
		if (rows[0].market_ban == 1){
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		connection.query('SELECT id, item_id, last_price, last_player FROM auction_list WHERE creator_id = ' + player_id, function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0){
				bot.sendMessage(message.chat.id, "Non esiste nessuna asta creata da te");
				return;
			}

			var auction_id = rows[0].id;
			var item_id = rows[0].item_id;
			var money = rows[0].last_price;
			var last_player = rows[0].last_player;

			connection.query('SELECT * FROM player WHERE id = ' + last_player, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Non puoi terminare senza offerte!");
					return;
				}
				var nickname = rows[0].nickname;
				connection.query('INSERT INTO inventory (player_id, item_id) VALUES (' + last_player + ',' + item_id + ')', function(err, rows, fields) {
					if (err) throw err;
				});
				connection.query('SELECT item.name FROM item WHERE id = ' + item_id, function(err, rows, fields) {
					if (err) throw err;
					var itemName = rows[0].name;
					bot.sendMessage(message.chat.id, "Asta terminata per " + itemName + "!\n\nIl vincitore è: @" + nickname + " con l'offerta di " + money + "§!");

					connection.query('UPDATE player SET money = money+' + money + ' WHERE id = ' + player_id, function(err, rows, fields) {
						if (err) throw err;
						console.log("Consegnati " + money + "§ al creatore");
					});

					connection.query('INSERT INTO auction_history (creator_id, player_id, price, item_id) VALUES (' + player_id + ',' + last_player + ',' + money + ',' + item_id + ')', function(err, rows, fields) {
						if (err) throw err;
					});

					connection.query('DELETE FROM auction_list WHERE id = ' + auction_id, function(err, rows, fields) {
						if (err) throw err;
					});
				});
			});
		});
	});
});
*/

bot.onText(/^\/negozi$/, function(message, match) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;
		var text = "I tuoi negozi:\n\n";

		connection.query('SELECT item.name, public_shop.public, public_shop.code, public_shop.price, public_shop.time_end, public_shop.quantity FROM public_shop, item WHERE item.id = public_shop.item_id AND player_id = ' + player_id + ' ORDER BY code', function(err, rows, fields) {
			if (err) throw err;

			var d = new Date();
			var isPublic = "";

			if (Object.keys(rows).length > 0){
				d = new Date(rows[0].time_end);

				if (rows[0].public == 0){
					isPublic = "Privato";
				}else{
					isPublic = "Pubblico";
				}

				text += rows[0].code + " (Scadenza: " + toDate("it",d) + ") _" + isPublic + "_\n";
				for (var i = 0, len = Object.keys(rows).length; i < len; i++) {	
					if ((i > 0) && (rows[i].code != rows[i-1].code)){
						d = new Date(rows[i].time_end);
						if (rows[i].public == 0){
							isPublic = "Privato";
						}else{
							isPublic = "Pubblico";
						}
						text += "\n" + rows[i].code + " (Scadenza: " + toDate("it",d) + ") _" + isPublic + "_\n";
					}
					text += "> " + rows[i].quantity + "x " + rows[i].name + " (" + rows[i].price + "§)\n";
				}
				if (Object.keys(text).length > 4000){
					text = "Hai troppi negozi aperti, cancellane cercando il codice nei messaggi, oppure tutti insieme attraverso l'apposito comando";
				}
				bot.sendMessage(message.chat.id, text, mark);
			}else{
				bot.sendMessage(message.chat.id, "Non hai nessun negozio aperto");
			}
		});
	});	
});

bot.onText(/^\/privacy (.+)/, function(message, match) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;

		var code = match[1];
		var player_id = rows[0].id;

		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if ((code == undefined) || (code == "")){
			bot.sendMessage(message.chat.id, "La sintassi è: /privacy CODICE, puoi anche usare /privacy tutti");
			return;
		}

		if (code == "tutti"){
			connection.query('SELECT player_id, public FROM public_shop WHERE player_id = ' + player_id, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Non possiedi nessun negozio");
					return;
				}

				var public = rows[0].public;

				if (public == 0){
					connection.query('UPDATE public_shop SET public = 1 WHERE player_id = ' + player_id, function(err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Tutti i negozi impostati come _pubblici_!", mark);
					});
				}else if (public == 1){
					connection.query('UPDATE public_shop SET public = 0 WHERE player_id = ' + player_id, function(err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Tutti i negozi impostati come _privati_!", mark);
					});
				}
			});
			return;
		}

		connection.query('SELECT player_id, public FROM public_shop WHERE code = ' + code, function(err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0){
				bot.sendMessage(message.chat.id, "Non esiste un negozio con quel codice");
				return;
			}

			if (player_id != rows[0].player_id){
				bot.sendMessage(message.chat.id, "Non sei l'amministratore del negozio");
				return;
			}

			var public = rows[0].public;

			if (public == 0){
				connection.query('UPDATE public_shop SET public = 1 WHERE code = ' + code, function(err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(message.chat.id, "Il negozio è stato impostato _pubblico_!", mark);
				});
			}else if (public == 1){
				connection.query('UPDATE public_shop SET public = 0 WHERE code = ' + code, function(err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(message.chat.id, "Il negozio è stato impostato _privato_!", mark);
				});
			}
		});
	});
});

bot.onText(/^\/negozio(?!a|r) (.+)|^\/negozio(?!a|r)$|^\/negozioa$|^\/negozior$|^\/negozioa ([^\s]+) (.+)|^\/negozior ([^\s]+) (.+)|^\/negoziom$|^\/negoziom ([^\s]+) (.+)|^\/negoziou (.+)/, function(message, match) {
	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;

		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1){
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (message.chat.id < 0){
			bot.sendMessage(message.chat.id, "Non puoi gestire un negozio in un gruppo");
			return;
		}

		if (rows[0].holiday == 1){
			bot.sendMessage(message.chat.id, "...", back)
			return;
		}

		var func = "";

		if (message.text.indexOf("negozioa") != -1){
			var code = parseInt(match[2]);
			var text = match[3];

			func = "add";

			if ((text == undefined) || (text == "") || (isNaN(code))){
				bot.sendMessage(message.chat.id, "La sintassi è: /negozioa codice oggetto:prezzo:quantità,oggetto:prezzo:quantità,oggetto:prezzo:quantità (rispetta spazi e sintassi con precisione), il prezzo minimo di ogni oggetto è il prezzo base (/oggetto).");
				return;
			}
		}else if (message.text.indexOf("negozior") != -1){
			var code = parseInt(match[4]);
			var text = match[5];

			func = "remove";

			if ((text == undefined) || (text == "") || (isNaN(code))){
				bot.sendMessage(message.chat.id, "La sintassi è: /negozior codice oggetto,oggetto,oggetto (rispetta spazi e sintassi con precisione).");
				return;
			}			
		}else if (message.text.indexOf("negoziom") != -1){
			var code = parseInt(match[6]);
			var text = match[7];

			func = "update";

			if ((text == undefined) || (text == "") || (isNaN(code))){
				bot.sendMessage(message.chat.id, "La sintassi è: /negoziom codice oggetto:nuovoprezzo:nuovaquantità,oggetto:nuovoprezzo:nuovaquantità (rispetta spazi e sintassi con precisione).");
				return;
			}
		}else if (message.text.indexOf("negoziou") != -1){
			var text = match[8];

			func = "refresh";

			if ((text == undefined) || (text == "")){
				bot.sendMessage(message.chat.id, "La sintassi è: /negoziou codice,codice,codice.");
				return;
			}			
		}else{
			var code = Math.floor(10000000000 + Math.random() * 90000000000);
			var text = match[1];

			func = "new";

			if ((text == undefined) || (text == "")){
				bot.sendMessage(message.chat.id, "La sintassi è: /negozio oggetto:prezzo:quantità,oggetto:prezzo:quantità,oggetto:prezzo:quantità (rispetta spazi e sintassi con precisione), il prezzo minimo di ogni oggetto è il prezzo base (/oggetto).");
				return;
			}
		}

		var privacy = 0;
		if (text.indexOf("#") != -1){
			privacy = 1;
			text = text.replace("#","");
		}

		var d = new Date();
		d.setDate(d.getDate() + 4);
		var long_date = d.getFullYear() + "-" + addZero(d.getMonth()+1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

		var elements = text.split(",");

		if (func == "refresh"){
			var arrLen = Object.keys(elements).length;
			if (arrLen < 1){
				bot.sendMessage(message.chat.id, "Specifica almeno un codice negozio");
				return;
			}

			if (elements[0] == "tutti"){
				d.setDate(d.getDate() - 2);
				long_date = d.getFullYear() + "-" + addZero(d.getMonth()+1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

				connection.query('UPDATE public_shop SET time_end = "' + long_date + '" WHERE player_id = ' + player_id, function(err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(message.chat.id, "Tutti i negozi rinnovati per 2 giorni");
				});				
				return;
			}

			var code = 0;
			for (var i = 0; i < arrLen; i++) {
				code = elements[i];
				connection.query('SELECT * FROM public_shop WHERE code = ' + code + ' AND player_id = ' + player_id, function(err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length > 0){
						connection.query('UPDATE public_shop SET time_end = "' + long_date + '" WHERE code = ' + this.code, function(err, rows, fields) {
							if (err) throw err;
							bot.sendMessage(message.chat.id, "Negozio " + this.code + " rinnovato per 4 giorni");
						});
					}else{
						bot.sendMessage(message.chat.id, "Impossibile rinnovare il negozio con codice " + this.code);
					}
				}.bind( {code: code} ));
			}
			return;
		}	

		connection.query('SELECT * FROM public_shop WHERE code = ' + code + ' AND player_id = ' + player_id, function(err, rows, fields) {
			if (err) throw err;

			if ((func == "add") && (Object.keys(rows).length == 0)){
				bot.sendMessage(message.chat.id, "Nessun negozio trovato con quel codice, oppure non sei l'amministratore");
				return;
			}

			if ((func == "remove") && (Object.keys(rows).length == 0)){
				bot.sendMessage(message.chat.id, "Nessun negozio trovato con quel codice, oppure non sei l'amministratore");
				return;
			}		

			if ((func == "update") && (Object.keys(rows).length == 0)){
				bot.sendMessage(message.chat.id, "Nessun negozio trovato con quel codice, oppure non sei l'amministratore");
				return;
			}		

			var len = Object.keys(elements).length;

			if (len > 10){
				bot.sendMessage(message.chat.id, "Massimo 10 oggetti grazie!");
				return;
			}

			if (((Object.keys(rows).length+len) > 10) && (func == "add")){
				bot.sendMessage(message.chat.id, "Massimo 10 oggetti grazie!");
				return;
			}

			var items = [];
			var prices = [];
			var quantities = [];

			if (len == 0){
				bot.sendMessage(message.chat.id, "Errore, controlla la sintassi");
				return;
			}

			var splitted = [];
			var text = "";

			var item = 0;
			var price = 0;

			var re = new RegExp("^[0-9]*$");

			if (func == "remove"){
				text = "Riassunto oggetti rimossi:\n";

				connection.query('UPDATE public_shop SET time_end = "' + long_date + '" WHERE code = ' + code, function(err, rows, fields) {
					if (err) throw err;
				});

				for (var i = 0; i < len; i++) {
					items.push([elements[i]]);
					item = items[i];

					connection.query('SELECT id FROM item WHERE name = "' + item + '"', function(err, rows, fields) {
						if (err) throw err;

						console.log("Negozio: " + this.item + ":" + this.price);

						if (Object.keys(rows).length == 0){
							bot.sendMessage(message.chat.id, "Non ho trovato l'oggetto " + this.item + ", ricontrolla. L'ho saltato.");
						}else{
							var itemId = rows[0].id;
							connection.query('SELECT id, item_id FROM public_shop WHERE item_id = ' + itemId + ' AND code = ' + code, function(err, rows, fields) {
								if (err) throw err;

								if (Object.keys(rows).length == 0){
									bot.sendMessage(message.chat.id, "L'oggetto " + this.item + " non è presente nel negozio, ricontrolla. L'ho saltato.");
								}else{
									connection.query('DELETE FROM public_shop WHERE id = ' + rows[0].id, function(err, rows, fields) {
										if (err) throw err;
									});
								}
							}.bind( {item: this.item} ));
						}
					}.bind( {item: item} ));

					text += "Oggetto " + (i+1) + ": " + items[i] + "\n";					
				}
			}else if (func == "update"){
				text = "Riassunto oggetti modificati:\n";

				connection.query('UPDATE public_shop SET time_end = "' + long_date + '" WHERE code = ' + code, function(err, rows, fields) {
					if (err) throw err;
				});

				for (var i = 0; i < len; i++) {
					splitted = elements[i].split(":");
					items.push([splitted[0]]);
					prices.push([splitted[1]]);
					quantities.push([splitted[2]]);

					item = items[i];

					price = prices[i];
					if ((price < 0) || (re.test(price) == false)){
						bot.sendMessage(message.chat.id, "Il prezzo " + price + " non è valido");
						break;
						return;
					}

					quantity = quantities[i];
					if ((quantity < 0) || (re.test(quantity) == false)){
						bot.sendMessage(message.chat.id, "La quantità " + quantità + " non è valida");
						break;
						return;
					}

					connection.query('SELECT craftable, id, value FROM item WHERE name = "' + item + '"', function(err, rows, fields) {
						if (err) throw err;

						console.log("Negozio: " + this.item + ":" + this.price);

						if (Object.keys(rows).length == 0){
							bot.sendMessage(message.chat.id, "Non ho trovato l'oggetto " + this.item + ", ricontrolla. L'ho saltato.");
						}else{
							var itemId = rows[0].id;
							if (rows[0].craftable == 1){
								rows[0].value = rows[0].value*1.5;
							}
							if (this.price < rows[0].value){
								bot.sendMessage(message.chat.id, "L'oggetto " + this.item + " ha un prezzo troppo basso, è stato impostato al minimo: " + rows[0].value + "§.");
								this.price = rows[0].value;
							}
							if ((this.quantity <= 0) || (this.quantity == "")){
								bot.sendMessage(message.chat.id, "L'oggetto " + this.item + " ha una quantità non valida, è stato impostato a 1");
								this.quantity = 1;
							}

							connection.query('SELECT id, item_id FROM public_shop WHERE item_id = ' + itemId + ' AND code = ' + code, function(err, rows, fields) {
								if (err) throw err;

								if (Object.keys(rows).length == 0){
									bot.sendMessage(message.chat.id, "L'oggetto " + this.item + " non è presente nel negozio, ricontrolla. L'ho saltato.");
								}else{
									connection.query('UPDATE public_shop SET price = ' + this.price + ', quantity = ' + this.quantity + ' WHERE id = ' + rows[0].id, function(err, rows, fields) {
										if (err) throw err;
									});
								}
							}.bind( {item: this.item, price: this.price, quantity: this.quantity} ));
						}
					}.bind( {item: item, price: price, quantity: quantity} ));

					text += "Oggetto " + (i+1) + ": " + quantities[i] + "x " + items[i] + " per " + prices[i] + "§\n";
				}
			}else if ((func == "add") || (func == "new")){
				text = "Riassunto oggetti aggiunti:\n";

				connection.query('UPDATE public_shop SET time_end = "' + long_date + '" WHERE code = ' + code, function(err, rows, fields) {
					if (err) throw err;
				});

				for (var i = 0; i < len; i++) {
					splitted = elements[i].split(":");
					items.push([splitted[0]]);
					prices.push([splitted[1]]);
					quantities.push([splitted[2]]);

					item = items[i];
					price = prices[i];
					if ((price < 0) || (re.test(price) == false)){
						bot.sendMessage(message.chat.id, "Il prezzo " + price + " non è valido");
						break;
						return;
					}

					quantity = quantities[i];
					if ((quantity < 0) || (re.test(quantity) == false)){
						bot.sendMessage(message.chat.id, "La quantità " + quantity + " non è valida");
						break;
						return;
					}

					connection.query('SELECT craftable, id, value, allow_sell FROM item WHERE name = "' + item + '"', function(err, rows, fields) {
						if (err) throw err;

						console.log("Negozio -> " + this.item + ":" + this.price);

						if (Object.keys(rows).length == 0){
							bot.sendMessage(message.chat.id, "Non ho trovato l'oggetto " + this.item + ", ricontrolla. L'ho saltato.");
						}else{
							if (rows[0].allow_sell == 0){
								bot.sendMessage(message.chat.id, "L'oggetto " + this.item + " non può essere venduto. L'ho saltato.");
							}else{
								if (rows[0].craftable == 1){
									rows[0].value = rows[0].value*1.5;
								}
								if (this.price < rows[0].value){
									bot.sendMessage(message.chat.id, "L'oggetto " + this.item + " ha un prezzo troppo basso, è stato impostato al minimo: " + rows[0].value + "§.");
									this.price = rows[0].value;
								}
								if ((this.quantity <= 0) || (this.quantity == "")){
									bot.sendMessage(message.chat.id, "L'oggetto " + this.item + " ha una quantità non valida, è stato impostato a 1");
									this.quantity = 1;
								}

								var itemId = rows[0].id;
								var ex = 0;
								connection.query('SELECT id, item_id, public FROM public_shop WHERE code = ' + code, function(err, rows, fields) {
									if (err) throw err;

									if (Object.keys(rows).length > 0){
										for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
											if ((itemId == rows[i].item_id) && (ex == 0)){
												bot.sendMessage(message.chat.id, "L'oggetto " + this.item + " è già presente nel negozio. L'ho saltato.");
												ex = 1;
											}
										}
									}

									if (ex == 0){
										if (func == "add"){
											privacy = rows[0].public;
										}
										connection.query('INSERT INTO public_shop (player_id, code, item_id, price, quantity, time_end, public) VALUES (' + player_id + ',' + code + ',' + itemId + ',' + this.price + ',' + this.quantity + ',"' + long_date + '",' + privacy + ')', function(err, rows, fields) {
											if (err) throw err;
										});
									}
								}.bind( {price: this.price, item: this.item, quantity: this.quantity} ));
							}
						}	
					}.bind( {price: price, item: item, quantity: quantity} ));

					text += "Oggetto " + (i+1) + ": " + quantities[i] + "x " + items[i] + " per " + prices[i] + "§\n";
				}
				if (func == "new"){
					text += "\nPrivacy negozio: " + ((privacy == 1) ? "_Pubblico_" : "_Privato_");
				}
			}

			text += "\nScadrà il " + toDate("it",d);
			bot.sendMessage(message.chat.id, text, mark);

			setTimeout(function() {
				bot.sendMessage(message.chat.id, "@xxxplusbot " + code, mark);
			}, 1000);
		});
	});
});

bot.onText(/^\/cancellanegozio (.+)|^\/cancellanegozio$/, function(message, match) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;

		var code = match[1];
		var player_id = rows[0].id;

		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if ((code == undefined) || (code == "")){
			bot.sendMessage(message.chat.id, "La sintassi è: /cancellanegozio CODICE, puoi anche usare /cancellanegozio tutti");
			return;
		}

		if (code == "tutti"){
			connection.query('SELECT player_id FROM public_shop WHERE player_id = ' + player_id, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Non possiedi nessun negozio");
					return;
				}
				connection.query('DELETE FROM public_shop WHERE player_id = ' + player_id, function(err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(message.chat.id, "Tutti i negozi sono stati eliminati!");
				});
			});
			return;
		}

		connection.query('SELECT player_id FROM public_shop WHERE code = ' + code, function(err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0){
				bot.sendMessage(message.chat.id, "Non esiste un negozio con quel codice");
				return;
			}

			if (player_id != rows[0].player_id){
				bot.sendMessage(message.chat.id, "Non sei l'amministratore del negozio");
				return;
			}

			connection.query('DELETE FROM public_shop WHERE code = ' + code, function(err, rows, fields) {
				if (err) throw err;
				bot.sendMessage(message.chat.id, "Il negozio è stato eliminato!");
			});
		});
	});
});

bot.on('callback_query', function (message) {
	if (message.data.indexOf("asta") != -1){	
		var split = message.data.split(":");
		var auction_id = parseInt(split[1]);
		var offer = parseInt(split[2]);

		connection.query('SELECT account_id, market_ban, money, id, holiday FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
			if (err) throw err;

			var account_id = (rows[0].account_id).toString();
			if (banlist_id.indexOf(account_id) != -1){
				console.log("BANNATO! (" + message.from.username + ")");
				return;
			}

			if (rows[0].market_ban == 1){
				return;
			}

			if (rows[0].holiday == 1){
				return;
			}

			var money = rows[0].money;
			var player_id = rows[0].id;

			connection.query('SELECT auction_list.id, last_price, creator_id, last_player, item_id, time_end, nickname FROM auction_list, player WHERE player.id = auction_list.creator_id AND auction_list.id = ' + auction_id, function(err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length == 0){
					bot.answerCallbackQuery(message.id, 'L\'asta non esiste più');
					bot.editMessageText(">> L'asta non esiste più <<", {chat_id: message.message.chat.id, message_id: message.message.message_id});
					return;
				}

				var last_price = parseInt(rows[0].last_price);
				var auction_id = rows[0].id;
				var last_player = rows[0].last_player;
				var itemId = rows[0].item_id;
				var creator_nickname = rows[0].nickname;
				var creator_id = rows[0].creator_id;
				var d = new Date();

				var price = last_price+offer;

				if (money < price){
					bot.answerCallbackQuery(message.id, 'Non hai abbastanza credito, ti servono ' + price + '§');
					return;
				}

				if (player_id == creator_id){
					bot.answerCallbackQuery(message.id, 'Non puoi rialzare la tua asta');
					return;
				}

				if (player_id == last_player){
					bot.answerCallbackQuery(message.id, 'Non puoi rialzare la tua offerta');
					return;
				}

				connection.query('SELECT name FROM item WHERE id = ' + itemId, function(err, rows, fields) {
					if (err) throw err;
					var itemName = rows[0].name;

					connection.query('SELECT account_id FROM player WHERE id = ' + last_player,  function(err, rows, fields) {
						if (err) throw err;
						if (Object.keys(rows).length > 0){
							var account_id = rows[0].account_id;
							connection.query('UPDATE player SET money = money + ' + last_price + ' WHERE id = ' + last_player, function(err, rows, fields) {
								if (err) throw err;
								bot.sendMessage(account_id, "Sei stato superato nell'asta di " + creator_nickname + " per " + itemName + ", dove *" + message.from.username + "* ha offerto *" + price + "*§", mark);
							});
						}
					});

					d.setMinutes(d.getMinutes() + 5);
					var long_date = d.getFullYear() + "-" + addZero(d.getMonth()+1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
					var short_date = addZero(d.getHours()) + ":" + addZero(d.getMinutes()) + ":" + addZero(d.getSeconds());

					connection.query('UPDATE auction_list SET time_end = "' + long_date + '", last_price = ' + price + ', last_player = ' + player_id + ' WHERE id = ' + auction_id, function(err, rows, fields) {
						if (err) throw err;
						connection.query('UPDATE player SET money = money - ' + price + ' WHERE id = ' + player_id, function(err, rows, fields) {
							if (err) throw err;
							bot.answerCallbackQuery(message.id, 'Hai offerto ' + price + '§ per ' + itemName);

							var iKeys = [];
							iKeys.push([{ text: "+10", callback_data: "asta:" + auction_id + ":" + "10"}]);
							iKeys.push([{ text: "+100", callback_data: "asta:" + auction_id + ":" + "100"}]);
							iKeys.push([{ text: "+1000", callback_data: "asta:" + auction_id + ":" + "1000"}]);

							var text = "*Asta per " + itemName + "*\n\n*Creatore*: " + creator_nickname.replace(new RegExp("_", "g"), " ") + "\n*Offerta*: " + price + "§\n*Offerente:* " + message.from.username.replace(new RegExp("_", "g"), " ") + "\n*Scade alle:* " + short_date;

							bot.editMessageText(text, {chat_id: message.message.chat.id, message_id: message.message.message_id, parse_mode: 'Markdown', reply_markup: { inline_keyboard: iKeys }});
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

	if (shop_id.indexOf(":") == -1){
		if (qnt[message.from.id] != undefined){
			if (qnt[message.from.id] == shop_id){
				bot.answerCallbackQuery(message.id, 'Aggiorna il negozio per comprare due oggetti uguali');
				return;
			}
		}

	}else{
		qnt[message.from.id] = 0;
	}

	if (shop_id.indexOf(":") == -1){
		if (index == -1){
			check.push(message.from.id);
			bot.answerCallbackQuery(message.id, 'Premi ancora per confermare');
			return;		
		}else{
			index = check.indexOf(message.from.id);
		}

		if (timevar[message.from.id] != undefined){
			diff = Math.round(new Date()/1000) - timevar[message.from.id];
			if (diff < 3){
				bot.answerCallbackQuery(message.id, 'Attendi 3 secondi e riprova');
				console.log("Acquisto SPAM Utente");
				return;
			}
		}
		timevar[message.from.id] = Math.round(new Date()/1000);

		if (globaltime[shop_id] != undefined){
			diff = Math.round(new Date()/1000) - globaltime[shop_id];
			if (diff <= 1){
				bot.answerCallbackQuery(message.id, 'Attendi 1 secondo e riprova');
				console.log("Acquisto SPAM Negozio");
				return;			
			}
			globaltime[shop_id] = Math.round(new Date()/1000);
		}
	}

	//	if (message.from.username != "fenix45"){
	//		bot.answerCallbackQuery(message.id, 'Manutenzione, riprova tra poco');
	//		return;
	//	}

	connection.beginTransaction(function(err) {
		if (err) throw err;

		connection.query('SELECT * FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
			if (err) throw err;

			var player_id = rows[0].id;
			var money = rows[0].money;

			var account_id = (rows[0].account_id).toString();
			if (banlist_id.indexOf(account_id) != -1){
				console.log("BANNATO! (" + message.from.username + ")");
				connection.commit(function() {});
				return;
			}

			if (rows[0].market_ban == 1){
				return;
			}

			var isUpdate = 0;
			if (shop_id.indexOf(":") != -1){
				var split = shop_id.split(":");
				var code = split[1];

				connection.query('SELECT public_shop.id, player.nickname, quantity, item.name, price FROM public_shop, item, player WHERE player.id = public_shop.player_id AND item.id = item_id AND code = ' + code, function(err, rows, fields) {
					if (err) throw err;

					if (Object.keys(rows).length == 0){
						bot.editMessageText("Questo negozio è stato cancellato :(", {inline_message_id: message.inline_message_id});
						connection.commit(function() {});
						return;
					}

					var iKeys = [];
					var name = "";
					for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
						name = cutText(rows[i].name);
						iKeys.push([{ text: name + " - " + formatNumber(rows[i].price) + "§ (" + rows[i].quantity + ")", callback_data: rows[i].id.toString()}]);
					}

					iKeys.push([{ text: "Aggiorna", callback_data: "update:" + code.toString()}]);

					var d = new Date();
					var short_date = addZero(d.getHours()) + ":" + addZero(d.getMinutes()) + ":" + addZero(d.getSeconds());

					var text =  "Negozio di " + rows[0].nickname + " aggiornato alle " + short_date + "!";

					bot.editMessageText(text, {inline_message_id: message.inline_message_id, reply_markup: { inline_keyboard: iKeys }});
					bot.answerCallbackQuery(message.id, 'Negozio aggiornato!');
				});
				check.splice(index, 1);
				connection.commit(function() {});
				return;
			}

			if (isUpdate == 0){
				console.log("Acquisto da parte di " + message.from.username + " per id: " + shop_id);
			}else{
				console.log("Aggiornamento da parte di " + message.from.username + " per id: " + shop_id);			
			}

			connection.query('SELECT * FROM public_shop WHERE id = ' + shop_id, function(err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length == 0){
					bot.answerCallbackQuery(message.id, 'L\'oggetto è stato rimosso, aggiorna il negozio!');
					check.splice(index, 1);
					connection.commit(function() {});
					return;
				}

				var player_id2 = rows[0].player_id;
				var price = rows[0].price;
				var item_id = rows[0].item_id;
				var quantity = rows[0].quantity;
				var code = rows[0].code;

				connection.query('SELECT * FROM player WHERE id = ' + player_id2, function(err, rows, fields) {
					if (err) throw err;

					var player2 = rows[0].nickname;
					var chat_id2 = rows[0].account_id;

					var account_id = (rows[0].account_id).toString();
					if (banlist_id.indexOf(account_id) != -1){
						bot.answerCallbackQuery(message.id, "Non puoi acquistare da un giocatore bannato");
						connection.commit(function() {});
						return;
					}

					if (rows[0].market_ban == 1){
						bot.answerCallbackQuery(message.id, "Non puoi acquistare da un giocatore escluso dal mercato");
						connection.commit(function() {});
						return;
					}

					if (money-price < 0){
						bot.answerCallbackQuery(message.id, 'Non hai abbastanza monete!');
						check.splice(index, 1);
						connection.commit(function() {});
						return;
					}

					if (quantity < 1){
						bot.answerCallbackQuery(message.id, 'Sono finite le scorte dell\'oggetto richiesto!');
						check.splice(index, 1);
						connection.commit(function() {});
						return;
					}

					if (player_id == player_id2){
						bot.answerCallbackQuery(message.id, 'Non puoi acquistare da te stesso!');
						check.splice(index, 1);
						connection.commit(function() {});
						return;
					}

					connection.query('SELECT item.name FROM inventory, item WHERE inventory.item_id = item.id AND item.id = ' + item_id + ' AND inventory.player_id = ' + player_id2, function(err, rows, fields) {
						if (err) throw err;

						if (Object.keys(rows).length == 0){
							bot.answerCallbackQuery(message.id, 'Il proprietario del negozio non possiede l\'oggetto');
							check.splice(index, 1);
							connection.commit(function() {});
							return;
						}

						var item_name = rows[0].name;

						connection.query('DELETE FROM inventory WHERE item_id = ' + item_id + ' AND player_id = ' + player_id2 + ' LIMIT 1', function(err, rows, fields) {
							if (err) {
								bot.answerCallbackQuery(message.id, 'Errore durante l\'acquisto, riprova');
								connection.rollback(function() {
									console.log("Rollback negozio 1");
								});
								throw err;
							};
							connection.query('INSERT INTO inventory (player_id, item_id) VALUES (' + player_id + ',' + item_id + ')', function(err, rows, fields) {
								if (err) {
									bot.answerCallbackQuery(message.id, 'Errore durante l\'acquisto, riprova');
									connection.rollback(function() {
										console.log("Rollback negozio 2");
									});
									throw err;
								};
								connection.query('UPDATE player SET money = money + ' + price + ' WHERE id = ' + player_id2, function(err, rows, fields) {
									if (err) {
										bot.answerCallbackQuery(message.id, 'Errore durante l\'acquisto, riprova');
										connection.rollback(function() {
											console.log("Rollback negozio 3");
										});
										throw err;
									};
									connection.query('UPDATE player SET money = money - ' + price + ' WHERE id = ' + player_id, function(err, rows, fields) {
										if (err) {
											bot.answerCallbackQuery(message.id, 'Errore durante l\'acquisto, riprova');
											connection.rollback(function() {
												console.log("Rollback negozio 4");
											});
											throw err;
										};
										connection.query('UPDATE public_shop SET quantity = quantity - 1 WHERE id = ' + shop_id, function(err, rows, fields) {
											if (err) {
												bot.answerCallbackQuery(message.id, 'Errore durante l\'acquisto, riprova');
												connection.rollback(function() {
													console.log("Rollback negozio 5");
												});
												throw err;
											};

											var d2 = new Date();
											var long_date = d2.getFullYear() + "-" + addZero(d2.getMonth()+1) + "-" + addZero(d2.getDate()) + " " + addZero(d2.getHours()) + ':' + addZero(d2.getMinutes()) + ':' + addZero(d2.getSeconds());
											connection.query('INSERT INTO market_direct_history (item_id, price, time, from_id, to_id, type) VALUES (' + item_id + ',' + price + ',"' + long_date + '",' + player_id2 + ',' + player_id + ',2)', function (err, rows, fields) {
												if (err) {
													bot.answerCallbackQuery(message.id, 'Errore durante l\'acquisto, riprova');
													connection.rollback(function() {
														console.log("Rollback negozio 6");
													});
													throw err;
												};
											});

											bot.answerCallbackQuery(message.id, 'Hai comprato ' + item_name + ' per ' + price + '§!');
											bot.sendMessage(chat_id2, message.from.username + " ha acquistato " + item_name + " per " + price + "§ dal tuo negozio!");

											if (quantity-1 == 0){
												bot.sendMessage(chat_id2, "Le scorte di " + item_name + " sono terminate!");
											}

											connection.query('SELECT public_shop.id, quantity, item.name, price FROM public_shop, item WHERE item.id = item_id AND code = ' + code, function(err, rows, fields) {
												if (err) throw err;

												if (Object.keys(rows).length == 0){
													bot.editMessageText("Questo negozio è stato cancellato :(", {inline_message_id: message.inline_message_id});
													check.splice(index, 1);
													return;
												}

												var iKeys = [];
												var name = "";
												for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
													name = cutText(rows[i].name);
													iKeys.push([{ text: name + " - " + formatNumber(rows[i].price) + "§ (" + rows[i].quantity + ")", callback_data: rows[i].id.toString()}]);
												}

												iKeys.push([{ text: "Aggiorna", callback_data: "update:" + code.toString()}]);

												var d = new Date();
												var short_date = addZero(d.getHours()) + ":" + addZero(d.getMinutes()) + ":" + addZero(d.getSeconds());

												var text =  "Negozio di " + player2 + " aggiornato alle " + short_date + "!";

												bot.editMessageText(text, {inline_message_id: message.inline_message_id, reply_markup: { inline_keyboard: iKeys }});
											});

											connection.commit(function() {});

											qnt[message.from.id] = shop_id;
											check.splice(index, 1);
											if (Object.keys(check).length > 1000){
												check = [];
											}
											checkShopErr();
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

bot.onText(/^\/crealotteria(?!p) (.+)|^\/crealotteria(?!p)$/, function(message, match) {
	//	if ((message.chat.id == "-1001069842056") || (message.chat.id == "-1001064571576")){
	//		bot.sendMessage(message.chat.id, "Non possono essere create lotterie in questo gruppo");
	//		return;
	//	}

	var oggetto = match[1];
	if ((oggetto == undefined) || (oggetto == "")){
		bot.sendMessage(message.chat.id, "Per inserire una lotteria utilizza la seguente sintassi: /crealotteria NomeOggetto, l'oggetto viene rimosso dall'inventario appena creata la lotteria e il numero di partecipanti minimo è 5");
		return;
	}

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;

		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1){
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1){
			bot.sendMessage(message.chat.id, "...", back)
			return;
		}

		connection.query('SELECT * FROM public_lottery WHERE creator_id = ' + player_id, function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0){
				bot.sendMessage(message.chat.id, "Puoi gestire solo una lotteria alla volta");
				return;
			}

			connection.query('SELECT * FROM public_lottery WHERE chat_id = -1001069842056', function(err, rows, fields) {
				if (err) throw err;
				if ((Object.keys(rows).length > 0) && (message.chat.id == -1001069842056)){
					bot.sendMessage(message.chat.id, "In questo gruppo può esistere solamente una lotteria alla volta");
					return;
				}

				connection.query('SELECT item.allow_sell, item.id FROM inventory, item WHERE inventory.item_id = item.id AND item.name = "' + oggetto + '" AND inventory.player_id = ' + player_id, function(err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length == 0){
						bot.sendMessage(message.chat.id, "Devi possedere l'oggetto per creare una lotteria");
						return;
					}

					if (rows[0].allow_sell == 0){
						bot.sendMessage(message.chat.id, "Questo oggetto non può essere utilizzato per una lotteria");
						return;
					}

					var item_id = rows[0].id;
					connection.query('DELETE FROM inventory WHERE item_id = ' + item_id + ' AND player_id = ' + player_id + ' LIMIT 1', function(err, rows, fields) {
						if (err) throw err;

						var d = new Date();
						d.setHours(d.getHours() + 48);
						var long_date = d.getFullYear() + "-" + addZero(d.getMonth()+1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

						connection.query('INSERT INTO public_lottery (chat_id, creator_id, item_id, time_end) VALUES (' + message.chat.id + ',' + player_id + ',' + item_id + ',"' + long_date + '")', function(err, rows, fields) {
							if (err) throw err;
							bot.sendMessage(message.chat.id, "Lotteria creata! Usa /lotteria @" + message.from.username + " per iscriverti e /estrazione per estrarre il vincitore. Partecipanti minimi: 5.\nScadrà tra 48 ore.");
						});
					});
				});
			});
		});
	});
});

bot.onText(/^\/crealotteriap ([^\s]+) (.+)|^\/crealotteriap$/, function(message, match) {
	if ((message.chat.id == "-1001069842056") || (message.chat.id == "-1001064571576")){
		bot.sendMessage(message.chat.id, "Non possono essere create lotterie in questo gruppo");
		return;
	}

	var oggetto = match[2];
	var prezzo = match[1];
	if ((oggetto == undefined) || (oggetto == "") || (isNaN(prezzo)) || (prezzo == 0)){
		bot.sendMessage(message.chat.id, "Per inserire una lotteria a pagamento utilizza la seguente sintassi: /crealotteriap Prezzo NomeOggetto, l'oggetto viene rimosso dall'inventario appena creata la lotteria e il numero di partecipanti minimo è 5. Se la lotteria viene annullata le monete vengono restituite.", mark);
		return;
	}

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;

		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1){
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1){
			bot.sendMessage(message.chat.id, "...", back)
			return;
		}

		connection.query('SELECT * FROM public_lottery WHERE creator_id = ' + player_id, function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0){
				bot.sendMessage(message.chat.id, "Puoi gestire solo una lotteria alla volta");
				return;
			}

			connection.query('SELECT * FROM public_lottery WHERE chat_id = -1001069842056', function(err, rows, fields) {
				if (err) throw err;
				if ((Object.keys(rows).length > 0) && (message.chat.id == -1001069842056)){
					bot.sendMessage(message.chat.id, "In questo gruppo può esistere solamente una lotteria alla volta");
					return;
				}

				connection.query('SELECT item.id, item.allow_sell, item.value FROM inventory, item WHERE inventory.item_id = item.id AND item.name = "' + oggetto + '" AND inventory.player_id = ' + player_id, function(err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length == 0){
						bot.sendMessage(message.chat.id, "Devi possedere l'oggetto per creare una lotteria");
						return;
					}

					if (rows[0].allow_sell == 0){
						bot.sendMessage(message.chat.id, "Questo oggetto non può essere utilizzato per una lotteria");
						return;
					}

					var item_id = rows[0].id;

					if ((prezzo > parseInt(rows[0].value)) || (prezzo < Math.round(rows[0].value/100))){
						bot.sendMessage(message.chat.id, "Il prezzo inserito non è valido, max: " + parseInt(rows[0].value) + ", min: " + Math.round(rows[0].value/100));
						return;
					}

					var d = new Date();
					d.setHours(d.getHours() + 48);
					var long_date = d.getFullYear() + "-" + addZero(d.getMonth()+1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());

					connection.query('DELETE FROM inventory WHERE item_id = ' + item_id + ' AND player_id = ' + player_id + ' LIMIT 1', function(err, rows, fields) {
						if (err) throw err;
						connection.query('INSERT INTO public_lottery (chat_id, creator_id, item_id, price, time_end) VALUES (' + message.chat.id + ',' + player_id + ',' + item_id + ',' + prezzo + ',"' + long_date + '")', function(err, rows, fields) {
							if (err) throw err;
							bot.sendMessage(message.chat.id, "Lotteria creata! Usa /lotteriap @" + message.from.username + " per iscriverti e /estrazione per estrarre il vincitore. Partecipanti minimi: 5\nPrezzo partecipazione: " + prezzo + "§.\nScadrà tra 48 ore.");
						});
					});
				});
			});
		});
	});
});

bot.onText(/^\/estrazione/, function(message) {

	bot.sendMessage(message.chat.id, "L'estrazione manuale è al momento disabilitata", mark)
	return;

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;

		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1){
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1){
			bot.sendMessage(message.chat.id, "...", mark)
			return;
		}

		connection.query('SELECT id, item_id, money FROM public_lottery WHERE creator_id = ' + player_id, function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0){
				bot.sendMessage(message.chat.id, "Non esiste nessuna lotteria creata da te");
				return;
			}

			var lottery_id = rows[0].id;
			var item_id = rows[0].item_id;
			var money = rows[0].money;

			connection.query('SELECT player_id FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function(err, rows, fields) {
				if (err) throw err;
				var num = Object.keys(rows).length;
				if (Object.keys(rows).length < 5){
					bot.sendMessage(message.chat.id, "Non ci sono abbastanza partecipanti per l'estrazione: " + Object.keys(rows).length + "/5");
					return;
				}
				var rand = Math.round(Math.random()*(Object.keys(rows).length-1));
				console.log("Estrazione: " + rand);
				var extracted = rows[rand].player_id;
				console.log(extracted);
				connection.query('SELECT * FROM player WHERE id = ' + extracted, function(err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length == 0){
						bot.sendMessage(message.chat.id, "Non ho trovato il giocatore estratto!");
						return;
					}

					var nickname = rows[0].nickname;
					connection.query('INSERT INTO inventory (player_id, item_id) VALUES (' + extracted + ',' + item_id + ')', function(err, rows, fields) {
						if (err) throw err;
					});
					connection.query('SELECT item.name FROM item WHERE id = ' + item_id, function(err, rows, fields) {
						if (err) throw err;
						var itemName = rows[0].name;
						var extra = "";
						if (money > 0){
							extra = " ed un ammontare pari a " + money + "§";
						}
						bot.sendMessage(message.chat.id, "Estrazione per " + itemName + " con " + num + " partecipanti" + extra + "!\n\nIl vincitore è: @" + nickname + "!");

						connection.query('UPDATE player SET money = money+' + money + ' WHERE id = ' + player_id, function(err, rows, fields) {
							if (err) throw err;
							console.log("Consegnati " + money + "§ al creatore");
						});

						connection.query('INSERT INTO public_lottery_history (creator_id, player_id, item_id, money) VALUES (' + player_id + ',' + extracted + ',' + item_id + ',' + money + ')', function(err, rows, fields) {
							if (err) throw err;
						});

						connection.query('SELECT chat_id, nickname, account_id FROM public_lottery_players, player WHERE player.id = player_id AND lottery_id = ' + lottery_id, function(err, rows, fields) {
							if (err) throw err;
							for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
								if (rows[i].nickname != nickname){
									bot.sendMessage(rows[i].chat_id, "Estrazione per " + itemName + " terminata, purtroppo hai perso!");
								}else{
									bot.sendMessage(rows[i].chat_id, "Estrazione per " + itemName + " terminata, HAI VINTO!");
								}
							}
							connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function(err, rows, fields) {
								if (err) throw err;
								connection.query('DELETE FROM public_lottery WHERE id = ' + lottery_id, function(err, rows, fields) {
									if (err) throw err;
									console.log("Lotteria terminata");
								});
							});
						});
					});
				});
			});
		});
	});
});

bot.onText(/^\/lotterie/, function(message) {

	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;

		connection.query('SELECT player.nickname, item.name, public_lottery.price FROM player, item, public_lottery WHERE public_lottery.item_id = item.id AND public_lottery.creator_id = player.id', function(err, rows, fields) {
			if (err) throw err;
			var text = "Non ci sono lotterie disponibili";
			var p = "";
			if (Object.keys(rows).length > 0){
				text = "Lotterie disponibili:\n";
				for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
					if (rows[i].price == 0){
						p = "";
					}else{
						p = " (" + rows[i].price + "§)";
					}
					text += "> " + rows[i].nickname + " - " + rows[i].name + p + "\n";
				}

				connection.query('SELECT item.name FROM item, public_lottery, public_lottery_players WHERE public_lottery.item_id = item.id AND public_lottery_players.player_id = ' + player_id + ' AND public_lottery.id = public_lottery_players.lottery_id', function (err, rows, fields){
					if (err) throw err;

					if (Object.keys(rows).length > 0){
						text += "\nIscrizioni:\n";
						for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
							text += "> " + rows[i].name + "\n";
						}
					}else{
						text += "\nNon sei iscritto a nessuna lotteria";
					}

					bot.sendMessage(message.chat.id, text);
				});
			}
		});
	});
});

bot.onText(/^\/offri/i, function(message) {
	var text = "";
	var item = "";
	var price = 0;
	var time = 0;
	var buyer = "";

	var syntax = "Sintassi: '/offri oggetto,acquirente,prezzo'";

	if (message.text.indexOf(" ") != -1){
		text = message.text.substring(message.text.indexOf(" ")+1, message.text.lenght);
	}else{
		bot.sendMessage(message.from.id, syntax);
		return;
	}

	var elements = text.split(",");

	if (Object.keys(elements).length != 3){
		bot.sendMessage(message.from.id, "Numero parametri errato nell'offerta: " + Object.keys(elements).length + " su 3\n" + syntax);
		return;
	}

	item = elements[0].trim();
	buyer = elements[1].replace('@','').trim();
	price = elements[2].replace(/[^\w\s]/gi, '').trim();

	if (item == ""){
		bot.sendMessage(message.from.id, "Il parametro oggetto è obbligatorio");
		return;
	}
	if (buyer == ""){
		bot.sendMessage(message.from.id, "Il parametro acquirente è obbligatorio");
		return;
	}

	connection.query('SELECT * FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;		

		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}
		if (rows[0].holiday == 1){
			bot.sendMessage(message.chat.id, "...")
			return;
		}
		if (rows[0].market_ban == 1){
			bot.sendMessage(message.chat.id, "...");
			return;
		}

		var player_id = rows[0].id;
		var mymoney = rows[0].money;

		var item_val = 0;
		var item_id = 0;

		connection.query('SELECT id FROM market_direct WHERE player_id = ' + player_id, function(err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length > 0){
				bot.sendMessage(message.from.id, "Puoi inserire solo una vendita alla volta");
				return;
			}

			connection.query('SELECT item.allow_sell, item.value, item.id FROM item, inventory WHERE item.id = inventory.item_id AND item.name = "' + item + '" AND inventory.player_id = ' + player_id, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length > 0){
					if (rows[0].craftable == 1){
						item_val = rows[0].value*1.5;
					}else{
						item_val = rows[0].value;
					}
					item_id = rows[0].id;
				}else{
					bot.sendMessage(message.from.id, "Non possiedi l'oggetto che hai inserito.");
					return;
				}

				if (rows[0].allow_sell == 0){
					bot.sendMessage(message.chat.id, "Questo oggetto non può essere venduto");
					return;
				}

				var d2 = new Date();
				d2.setMinutes(d2.getMinutes() + 10);
				var long_date = d2.getFullYear() + "-" + addZero(d2.getMonth()+1) + "-" + addZero(d2.getDate()) + " " + addZero(d2.getHours()) + ':' + addZero(d2.getMinutes()) + ':' + addZero(d2.getSeconds());
				var short_date = addZero(d2.getHours()) + ':' + addZero(d2.getMinutes()) + ':' + addZero(d2.getSeconds());

				connection.query('SELECT COUNT(nickname) As cnt, id FROM player WHERE nickname = "' + buyer + '"', function(err, rows, fields) {
					if (err) throw err;

					if (rows[0].cnt == 0){
						bot.sendMessage(message.from.id, "L'acquirente inserito non esiste");
						return;
					}

					if (price < item_val){
						bot.sendMessage(message.from.id, "Prezzo impostato al minimo: " + item_val + "§");
						price = item_val;
					}

					if (message.from.username != "fenix45"){
						if (buyer.toLowerCase() == message.from.username.toLowerCase()){
							bot.sendMessage(message.from.id, "Non puoi vendere a te stesso");
							return;
						}
					}

					connection.query('SELECT COUNT(id) As qnt FROM market_direct WHERE buyer = ' + rows[0].id, function(err, rows, fields) {
						if (err) throw err;

						if (rows[0].qnt > 0){
							bot.sendMessage(message.chat.id, "Questo utente ha già una vendita in corso");
							return;
						}

						connection.query('SELECT chat_id, id, account_id FROM player WHERE nickname = "' + buyer + '"', function(err, rows, fields) {
							if (err) throw err;
							bot.sendMessage(rows[0].account_id, message.from.username + " vuole completare con te questa vendita:\n" +
											"> " + item + " per " + price + "§\n" +
											"Usa /accettav " + message.from.username + " per confermarla");

							connection.query('INSERT INTO market_direct VALUES (DEFAULT, ' + player_id + ',"' + item_id + '",' + price + ',"' + long_date + '",' + rows[0].id + ')', function(err, rows, fields) {
								if (err) throw err;
								connection.query('DELETE FROM inventory WHERE inventory.item_id = ' + item_id + ' AND inventory.player_id = ' + player_id + ' LIMIT 1', function(err, rows, fields) {
									if (err) throw err;
								});
								bot.sendMessage(message.chat.id, "La messa in vendita è stata registrata, verrà eliminata alle " + short_date);
							});
						});
					});
				});
			});
		});
	});
});

bot.onText(/^\/scambia/i, function(message) {
	connection.query('SELECT * FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;

		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			var text = "Il tuo account è stato *bannato* per il seguente motivo: _" + banlist_tx[banlist_id.indexOf(account_id)] + "_";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}
		if (rows[0].market_ban == 1){
			bot.sendMessage(message.chat.id, "...", back);
			return;
		}

		if (rows[0].holiday == 1){
			bot.sendMessage(message.chat.id, "...", back)
			return;
		}

		var player_id = rows[0].id;
		var text = "";
		var item1 = "";
		var item2 = "";
		var buyer = "";

		var syntax = "Sintassi: '/scambia oggetto1,oggetto2,acquirente'";

		if (message.text.indexOf(" ") != -1){
			text = message.text.substring(message.text.indexOf(" ")+1, message.text.lenght);
		}else{
			bot.sendMessage(message.from.id, syntax);
			return;
		}

		var elements = text.split(",");

		if (Object.keys(elements).length != 3){
			bot.sendMessage(message.from.id, "Numero parametri errato nell'offerta: " + Object.keys(elements).length + " su 3\n" + syntax, back);
			return;
		}

		item1 = elements[0].trim();
		item2 = elements[1].trim();
		buyer = elements[2].replace('@','').trim();

		if (item1 == ""){
			bot.sendMessage(message.from.id, "Il parametro oggetto 1 è obbligatorio");
			return;
		}
		if (item2 == ""){
			bot.sendMessage(message.from.id, "Il parametro oggetto 2 è obbligatorio");
			return;
		}
		if (item1.toLowerCase() == item2.toLowerCase()){
			bot.sendMessage(message.from.id, "Non puoi inserire due oggetti uguali");
			return;			
		}
		if (buyer == ""){
			bot.sendMessage(message.from.id, "Il parametro acquirente è obbligatorio");
			return;
		}

		connection.query('SELECT id FROM market WHERE player_id = ' + player_id, function(err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length > 0){
				bot.sendMessage(message.from.id, "Puoi inserire solo uno scambio alla volta");
				return;
			}

			connection.query('SELECT COUNT(nickname) As cnt, id FROM player WHERE nickname = "' + buyer + '"', function(err, rows, fields) {
				if (err) throw err;

				if (rows[0].cnt == 0){
					bot.sendMessage(message.from.id, "L'acquirente inserito non esiste");
					return;
				}

				if (message.from.username != "fenix45"){
					if (buyer.toLowerCase() == message.from.username.toLowerCase()){
						bot.sendMessage(message.from.id, "Non puoi scambiare a te stesso");
						return;
					}
				}

				connection.query('SELECT COUNT(id) As qnt FROM market WHERE buyer = ' + rows[0].id, function(err, rows, fields) {
					if (err) throw err;

					if (rows[0].qnt > 0){
						bot.sendMessage(message.chat.id, "Questo utente ha già uno scambio in corso");
						return;
					}

					var d2 = new Date();
					d2.setMinutes(d2.getMinutes() + 10);
					var long_date = d2.getFullYear() + "-" + addZero(d2.getMonth()+1) + "-" + addZero(d2.getDate()) + " " + addZero(d2.getHours()) + ':' + addZero(d2.getMinutes()) + ':' + addZero(d2.getSeconds());
					var short_date = addZero(d2.getHours()) + ':' + addZero(d2.getMinutes()) + ':' + addZero(d2.getSeconds());

					connection.query('SELECT item.id, item.allow_sell FROM item, inventory WHERE item.id = inventory.item_id AND item.name = "' + item1 + '" AND inventory.player_id = ' + player_id, function(err, rows, fields) {
						if (err) throw err;
						if (Object.keys(rows).length == 0){
							bot.sendMessage(message.from.id, "L'oggetto " + item1 + " non è presente nel tuo inventario o non è consentito.");
							return;
						}

						if (rows[0].allow_sell == 0){
							bot.sendMessage(message.chat.id, "Questo oggetto non può essere scambiato");
							return;
						}

						var item1_id = rows[0].id;

						connection.query('SELECT item.id, item.allow_sell FROM item WHERE item.name = "' + item2 + '"', function(err, rows, fields) {
							if (err) throw err;
							if (Object.keys(rows).length == 0){
								bot.sendMessage(message.from.id, "L'oggetto " + item2 + " che hai indicato non esiste o non è consentito.");
								return;
							}

							if (rows[0].allow_sell == 0){
								bot.sendMessage(message.chat.id, "Questo oggetto non può essere scambiato");
								return;
							}

							var item2_id = rows[0].id;

							connection.query('SELECT chat_id, account_id, id FROM player WHERE nickname = "' + buyer + '"', function(err, rows, fields) {
								if (err) throw err;

								bot.sendMessage(rows[0].account_id, message.from.username + " vuole completare con te questo scambio:\n" +
												"> " + item1 + " per " + item2 + "\n" +
												"Usa /accettas " + message.from.username + " per confermarlo");
								var buyer_id = rows[0].id;

								connection.query('INSERT INTO market VALUES (DEFAULT, ' + player_id + ', ' + item1_id + ',' + item2_id + ',"' + long_date + '",' + buyer_id + ')', function(err, rows, fields) {
									if (err) throw err;

									connection.query('DELETE FROM inventory WHERE inventory.item_id = ' + item1_id + ' AND inventory.player_id = ' + player_id + ' LIMIT 1', function(err, rows, fields) {
										if (err) throw err;
									});

									bot.sendMessage(message.chat.id, "L'offerta è stata registrata, verrà eliminata alle " + short_date);
								});
							});
						});
					});
				});
			});
		});
	});
});

bot.onText(/^\/accettav (.+)|^\/accettav/i, function(message, match) {

	if (match[1] == undefined){
		bot.sendMessage(message.from.id, "Utilizza la sintassi '/accettav nickname' per confermare una vendita!")
		return;
	}

	var name = match[1];

	connection.query('SELECT exp, holiday, id, money, account_id, market_ban FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;
		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}
		if (rows[0].holiday == 1){
			bot.sendMessage(message.chat.id, "...")
			return;
		}
		if (rows[0].market_ban == 1){
			bot.sendMessage(message.chat.id, "...");
			return;
		}

		var player_id = rows[0].id;
		var my_money = rows[0].money;

		connection.query('SELECT id, chat_id, account_id, nickname FROM player WHERE nickname = "' + name.trim() + '"', function(err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length == 0){
				bot.sendMessage(message.from.id, "Non ho trovato l'utente con cui concludere l'acquisto");
				return;
			}

			var player_id2 = rows[0].id;
			var chat_id2 = rows[0].account_id;
			var nick2 = rows[0].nickname;

			connection.query('SELECT * FROM market_direct WHERE buyer = ' + player_id, function(err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.from.id, "La vendita non è più disponibile.");
					return;
				}else{
					var marketid = rows[0].id;
					var item_id = rows[0].item_id;
					var money = rows[0].money;
					var buyer_id = rows[0].buyer;

					if (player_id != buyer_id){
						bot.sendMessage(message.from.id, "Non puoi accettare un acquisto riservato");
						return;
					}

					if (my_money < money){
						bot.sendMessage(message.from.id, "Non hai abbastanza credito per completare l'acquisto.");
						return;
					}else{
						connection.query('UPDATE player SET money = money-' + money + ' WHERE id = ' + player_id, function(err, rows, fields) {
							if (err) throw err;
							connection.query('UPDATE player SET money = money+' + money + ' WHERE id = ' + player_id2, function(err, rows, fields) {
								if (err) throw err;

								connection.query('INSERT INTO inventory (player_id, item_id) VALUES (' + player_id + ',' + item_id + ')', function(err, rows, fields) {
									if (err) throw err;

									var d = new Date();
									var long_date = d.getFullYear() + "-" + addZero(d.getMonth()+1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
									connection.query('INSERT INTO market_direct_history (item_id, price, time, from_id, to_id, buyer, type) VALUES (' + item_id + ',' + money + ',"' + long_date + '",' + player_id2 + ',' + player_id + ',' + buyer_id + ',1)', function(err, rows, fields) {
										if (err) throw err;
									});

									connection.query('DELETE FROM market_direct WHERE id = ' + marketid, function(err, rows, fields) {
										if (err) throw err;
										bot.sendMessage(message.chat.id, message.from.username + ", hai completato l'acquisto con " + nick2 + " per " + money + "§!");
										connection.query('SELECT name FROM item WHERE id = ' + item_id, function(err, rows, fields) {
											if (err) throw err;
											bot.sendMessage(chat_id2, message.from.username + " ha acquistato " + rows[0].name + " per " + money + "§!");
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
})

bot.onText(/^\/accettas (.+)|^\/accettas/i, function(message, match) {

	if (match[1] == undefined){
		bot.sendMessage(message.from.id, "Utilizza la sintassi '/accettas nickname' per confermare uno scambio!")
		return;
	}

	var name = match[1];

	connection.query('SELECT id, exp, holiday, account_id, market_ban FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;
		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}
		if (rows[0].holiday == 1){
			bot.sendMessage(message.chat.id, "...")
			return;
		}
		if (rows[0].market_ban == 1){
			bot.sendMessage(message.chat.id, "...");
			return;
		}

		var player_id = rows[0].id;

		connection.query('SELECT id, chat_id, account_id, nickname FROM player WHERE nickname = "' + name + '"', function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0){
				bot.sendMessage(message.from.id, "Non ho trovato il giocatore con cui completare lo scambio!", back);
				return;
			}

			var player_id2 = rows[0].id;
			var chat_id2 = rows[0].account_id;
			var nick2 = rows[0].nickname;

			connection.query('SELECT * FROM market WHERE buyer = ' + player_id, function(err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.from.id, "Lo scambio non è più disponibile.");
					return;
				}else{
					var marketid = rows[0].id;
					var item1 = rows[0].item_1_id;
					var item2 = rows[0].item_2_id;
					var buyer_id = rows[0].buyer;

					if (player_id != buyer_id){
						bot.sendMessage(message.from.id, "Non puoi accettare un acquisto riservato");
						return;
					}

					connection.query('SELECT item.id, item.name FROM item, inventory WHERE item.id = inventory.item_id AND inventory.item_id = ' + item2 + ' AND inventory.player_id = ' + player_id, function(err, rows, fields) {
						if (err) throw err;

						if (Object.keys(rows).length == 0){
							bot.sendMessage(message.from.id, "Non possiedi l'oggetto richiesto.");
							return;
						}
						connection.query('INSERT INTO inventory (player_id, item_id) VALUES (' + player_id + ',' + item1 + ')', function(err, rows, fields) {
							if (err) throw err;
							connection.query('INSERT INTO inventory (player_id, item_id) VALUES (' + player_id2 + ',' + item2 + ')', function(err, rows, fields) {
								if (err) throw err;
								connection.query('DELETE FROM inventory WHERE player_id = ' + player_id + ' AND item_id = ' + item2 + ' LIMIT 1', function(err, rows, fields) {
									if (err) throw err;

									var d = new Date();
									var long_date = d.getFullYear() + "-" + addZero(d.getMonth()+1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
									connection.query('INSERT INTO market_history (item_1a, item_2a, item_3a, item_1b, item_2b, item_3b, time, from_id, to_id, buyer) VALUES (' + item1 + ',0,0,' + item2 + ',0,0,"' + long_date + '",' + player_id2 + ',' + player_id + ',' + buyer_id + ')', function(err, rows, fields) {
										if (err) throw err;
									});

									connection.query('DELETE FROM market WHERE id = ' + marketid, function(err, rows, fields) {
										if (err) throw err;
										bot.sendMessage(message.chat.id, message.from.username + ", hai completato lo scambio con " + nick2 + "!");
										bot.sendMessage(chat_id2, "Il giocatore " + message.from.username + " ha accettato la tua offerta di scambio!");
									});
								});
							});
						});
					});
				}
			});
		});
	});
});

bot.onText(/^\/aste/, function(message) {
	connection.query('SELECT player.nickname, item.name, auction_list.time_end, auction_list.last_price FROM player, item, auction_list WHERE auction_list.item_id = item.id AND auction_list.creator_id = player.id', function(err, rows, fields) {
		if (err) throw err;
		var text = "Non ci sono aste disponibili";
		var p = "";
		if (Object.keys(rows).length > 0){
			text = "Aste disponibili:\n";
			var now = new Date();
			var diff = 0;
			var time_end = new Date();

			for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
				time_end = new Date(rows[i].time_end);
				min = Math.round(((time_end - now)/1000)/60);

				text += "> " + rows[i].nickname + " - " + rows[i].name + " (offerta: " + rows[i].last_price + "§, scade tra " + min + " minuti)" + "\n";
			}
		}
		bot.sendMessage(message.chat.id, text);
	});
});

bot.onText(/^\/lotteria(?!p) (.+)|^\/lotteria(?!p)/, function(message, match) {

	var nickname = match[1];
	if ((nickname == undefined) || (nickname == "")){
		bot.sendMessage(message.chat.id, "Per partecipare ad una lotteria utilizza la seguente sintassi: /lotteria @nickname, mentre /crealotteria per iniziarne una nuova");
		return;
	}	

	nickname = nickname.replace("@","");

	connection.query('SELECT id, market_ban, money, account_id, holiday FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;
		var money = rows[0].money;

		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1){
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1){
			bot.sendMessage(message.chat.id, "...", back)
			return;
		}

		connection.query('SELECT id FROM player WHERE nickname = "' + nickname + '"', function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0){
				bot.sendMessage(message.chat.id, "Il nickname che hai inserito non esiste, riprova");
				return;
			}
			var creator_id = rows[0].id;

			connection.query('SELECT id, price FROM public_lottery WHERE creator_id = ' + creator_id, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Il nickname che hai inserito non è associato a nessuna lotteria, riprova");
					return;
				}

				var price = rows[0].price;
				var lottery_id = rows[0].id;

				if (price > 0){
					bot.sendMessage(message.chat.id, "Questa è una lotteria a pagamento, usa /lotteriap per iscriverti");
					return;
				}

				if (player_id == creator_id){
					connection.query('SELECT * FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function(err, rows, fields) {
						if (err) throw err;		
						bot.sendMessage(message.chat.id, "Ci sono attualmente " + Object.keys(rows).length + " partecipanti");
					});
					return;
				}

				connection.query('SELECT * FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, function(err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length > 0){
						bot.sendMessage(message.chat.id, "Sei già registrato a questa lotteria!");
						return;
					}
					connection.query('INSERT INTO public_lottery_players (lottery_id, player_id) VALUES (' + lottery_id + ',' + player_id + ')', function(err, rows, fields) {
						if (err) throw err;
						bot.sendMessage(message.chat.id, "Ti sei registrato correttamente alla lotteria!");
					});
				});
			});
		});
	});
});

bot.onText(/^\/statolotteria (.+)|^\/statolotteria/, function(message, match) {
	var nickname = match[1];
	if ((nickname == undefined) || (nickname == "")){
		bot.sendMessage(message.chat.id, "Per ricevere informazioni su una lotteria utilizza la seguente sintassi: /statolotteria @nickname");
		return;
	}

	nickname = nickname.replace("@","");

	connection.query('SELECT id, nickname FROM player WHERE nickname = "' + nickname + '"', function(err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length == 0){
			bot.sendMessage(message.chat.id, "Il nickname che hai inserito non esiste, riprova");
			return;
		}

		var creator_id = rows[0].id;
		var nick = rows[0].nickname;

		connection.query('SELECT id, price, item_id, time_end FROM public_lottery WHERE creator_id = ' + creator_id, function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0){
				bot.sendMessage(message.chat.id, "Il nickname che hai inserito non è associato a nessuna lotteria, riprova");
				return;
			}

			var d = new Date(rows[0].time_end);
			var long_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds()) + " del " + addZero(d.getDate()) + "/" + addZero(d.getMonth()+1) + "/" + d.getFullYear();

			var price = rows[0].price;
			var itemId = rows[0].item_id;
			var priceText = "No";
			if (price > 0){
				priceText = "Si (" + price + "§)";
			}

			var lottery_id = rows[0].id;

			connection.query('SELECT name, rarity FROM item WHERE id = ' + itemId, function(err, rows, fields) {
				if (err) throw err;

				var name = rows[0].name;
				var rarity = " (" + rows[0].rarity + ")"

				connection.query('SELECT COUNT(*) As num FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function(err, rows, fields) {
					if (err) throw err;

					var players = rows[0].num;

					var text = 	"Informazioni Lotteria:\n\nGestore: " + nick + 
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

bot.onText(/^\/statoasta (.+)|^\/statoasta/, function(message, match) {
	var nickname = match[1];
	if ((nickname == undefined) || (nickname == "")){
		bot.sendMessage(message.chat.id, "Per ricevere informazioni su un asta utilizza la seguente sintassi: /statoasta @nickname");
		return;
	}

	nickname = nickname.replace("@","");

	connection.query('SELECT id, nickname FROM player WHERE nickname = "' + nickname + '"', function(err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length == 0){
			bot.sendMessage(message.chat.id, "Il nickname che hai inserito non esiste, riprova");
			return;
		}

		var creator_id = rows[0].id;
		var nick = rows[0].nickname;

		connection.query('SELECT id, last_price, last_player, item_id, time_end FROM auction_list WHERE creator_id = ' + creator_id, function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0){
				bot.sendMessage(message.chat.id, "Il nickname che hai inserito non è associato a nessuna asta, riprova");
				return;
			}

			var d = new Date(rows[0].time_end);
			var long_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds()) + " del " + addZero(d.getDate()) + "/" + addZero(d.getMonth()+1) + "/" + d.getFullYear();

			var itemId = rows[0].item_id;
			var last_price = rows[0].last_price;
			var last_player = rows[0].last_player;

			connection.query('SELECT name, rarity FROM item WHERE id = ' + itemId, function(err, rows, fields) {
				if (err) throw err;

				var name = rows[0].name;
				var rarity = " (" + rows[0].rarity + ")"

				connection.query('SELECT nickname FROM player WHERE id = ' + last_player, function(err, rows, fields) {
					if (err) throw err;

					var nickname = "";

					if (Object.keys(rows).length == 0){
						nickname = "Nessuno";
					}else{
						nickname = rows[0].nickname;
					}

					var text = 	"Informazioni Asta:\n\nGestore: " + nick + 
						"\nOggetto: " + name + rarity +
						"\nOfferente: " + nickname +
						"\nOfferta: " + last_price + "§" +
						"\nScade alle: " + long_date;
					bot.sendMessage(message.chat.id, text);
				});
			});
		});
	});
});

bot.onText(/^\/lotteriap (.+)|^\/lotteriap/, function(message, match) {
	if ((message.chat.id == "-1001069842056") || (message.chat.id == "-1001064571576")){
		return;
	}

	var nickname = match[1];
	if ((nickname == undefined) || (nickname == "")){
		bot.sendMessage(message.chat.id, "Per partecipare ad una lotteria utilizza la seguente sintassi: /lotteria @nickname, mentre /crealotteria per iniziarne una nuova");
		return;
	}	

	nickname = nickname.replace("@","");

	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;
		var player_id = rows[0].id;
		var money = rows[0].money;

		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		if (rows[0].market_ban == 1){
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1){
			bot.sendMessage(message.chat.id, "...", back)
			return;
		}

		connection.query('SELECT id FROM player WHERE nickname = "' + nickname + '"', function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0){
				bot.sendMessage(message.chat.id, "Il nickname che hai inserito non esiste, riprova");
				return;
			}
			var creator_id = rows[0].id;

			connection.query('SELECT id, price FROM public_lottery WHERE creator_id = ' + creator_id, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Il nickname che hai inserito non è associato a nessuna lotteria, riprova");
					return;
				}

				var price = rows[0].price;
				var lottery_id = rows[0].id;

				if (player_id == creator_id){
					connection.query('SELECT * FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function(err, rows, fields) {
						if (err) throw err;		
						bot.sendMessage(message.chat.id, "Ci sono attualmente " + Object.keys(rows).length + " partecipanti");
					});
					return;
				}

				if (price == 0){
					bot.sendMessage(message.chat.id, "Questa è una lotteria non a pagamento, usa /lotteria per partecipare");
					return;
				}

				if (money-price <= 0){
					bot.sendMessage(message.chat.id, "Non hai abbastanza monete per partecipare");
					return;
				}

				connection.query('SELECT * FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, function(err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length > 0){
						bot.sendMessage(message.chat.id, "Sei già registrato a questa lotteria!");
						return;
					}
					connection.query('INSERT INTO public_lottery_players (lottery_id, player_id) VALUES (' + lottery_id + ',' + player_id + ')', function(err, rows, fields) {
						if (err) throw err;
						if (price != 0){
							connection.query('UPDATE player SET money = money-' + price + ' WHERE id = ' + player_id, function(err, rows, fields) {
								if (err) throw err;
							});
							connection.query('UPDATE public_lottery SET money = money+' + price + ' WHERE id = ' + lottery_id, function(err, rows, fields) {
								if (err) throw err;
							});
							bot.sendMessage(message.chat.id, "Ti sei registrato alla lotteria al prezzo di " + price + "§!");	
						}
					});
				});
			});
		});
	});
});

bot.onText(/^\/faq/, function(message) {
	if (message.chat.id < 0){
		bot.sendMessage(message.chat.id, "_Messaggio inviato in privato_", mark);
	}

	bot.sendMessage(message.from.id,"*DOMANDE FREQUENTI*\n" +
					"\n*RISORSE UTILI*\n" +
					"Sito per visualizzare crafting: http://federicoxella.space/xxxbot\n" +
					"Novità e bug: @xxxAvvisi\n" +
					"Amministratore: @fenix45 (@FenixNews)\n" +

					"\n*INFORMAZIONI*\n" +
					"Se gli HP scendono a 0? Usa Piuma di Fenice o alle 3 di notte la vita si ricarica automaticamente\n" +
					"Non riesco a vendere ad un utente che ha uno spazio nel nome. Al posto dello spazio, metti l'underscore (trattino basso)\n" +

					"\n*COMANDI RAPIDI*\n" +
					"Esistono alcuni comandi rapidi del mercato, esempi:\n" +
					"*Vendita*: offri ogg1,ogg2,ogg3,acquirente,prezzo,tempo\n" +
					"*Scambio*: scambia ogg1,ogg2,ogg3,ogg4,ogg5,ogg6,prezzo,tempo\n" +
					"*Richiesta*: richiedi ogg1,ogg2,ogg3,prezzo,tempo\n" +
					"I campi non utili vanno lasciati vuoti, se il prezzo viene lasciato vuoto viene impostato il prezzo minimo\n" +

					"\n*CERCA*\n" +
					"Il Cerca è lo strumento più utilizzato di tutto il bot, ma ogni tanto può avere qualche loop spazio-temporale e ripetere le stesse stampe\n" +
					"Per impedire che ciò avvenga inserisci un (asterisco) prima della parola da cercare: 'Cerca (asterisco)Acciaio', cosi da non incorrere in questo intoppo\n" +

					"\n*VIAGGI*\n" +
					"I viaggi più lunghi (escluse le cave dal livello 10), sono da considerarsi come un periodo in cui non si può giocare, e almeno non si perdono scrigni e monete, non vanno considerate in sostituzione allo stesso tempo di missioni. Le Cave differiscono solamente per quantità di Pietre trovate, gli altri viaggi per rarità scrigno e quantità monete.\n" +

					"\n*RINASCITA*\n" +
					"La Rinascita è un parziale Reset del gioco che avviene al livello 100, 150, 200 o 300\n" +
					"- *Cosa perdo?*\n" +
					"Tutti gli oggetti tranne le rarità UE, U, H, S e X\n" +
					"Tutti i soldi e gli scrigni\n" +
					"Esperienza e oggetti al mercato\n" +
					"- *Cosa rimane?*\n" +
					"Il drago con tutto il suo equipaggiamento\n" +
					"Il tuo equipaggiamento\n" +
					"I gettoni/gemme e le missioni/viaggi in corso\n" +
					"Gli incantesimi e il mana\n" +
					"- *Cosa ottengo?*\n" +
					"La possibilità di creare oggetti di qualità superiore\n" +
					"Una gran quantità di monete\n" +
					"Una gran quantità di scrigni\n" +

					"\n*DRAGO*\n" +
					"Il drago è utile per aumentare il proprio danno e velocizzare i viaggi, oltre che per difesa del rifugio.\n" +
					"Tutti i dettagli vengono visualizzati dal livello 10, da quando è possibile farlo nascere.\n" +
					"Le pietre del drago hanno un valore da 1 a 6, dividendo il valore totale per 70 si ottiene il livello del drago.\n" +

					"\n*INCANTESIMI E MANA*\n" +
					"Il Mana può essere ottenuto attraverso un evento chiamato Miniere di Mana, dopo averlo accumulato è necessario andare nella sezione Sintesi (Zaino > Sintesi)" +
					" e seguire le istruzioni per creare gli incantesimi. A seconda della quantità di Mana utilizzato gli incantesimi creati saranno differenti e gli effetti" +
					" vengono descritti nella sezione Boss o Dungeon quando si deve affrontare il nemico.\n" +

					"\n*SET DRAGHI*\n" +
					"Infernale > Danno +25\n" +
					"Glaciale > Difesa +25\n" +
					"Oscuro > Danno +15 Difesa +10 Critico +5%\n" +
					"Celeste > Danno +10 Difesa +15 Critico +5%\n" +
					"Abissale > Danno +10 Difesa +5 Critico +10%\n" +
					"delle Vette > Danno +5 Difesa +10 Critico +10%", mark);
});

bot.onText(/^\/statistiche/, function(message) {
	connection.query('SELECT MAX(id) As tot, SUM(achievement_count) As achievement, SUM(dungeon_count) As dungeon_tot, SUM(money) As money, SUM(craft_count) As craft, SUM(mission_count) As miss2 FROM player', function(err, rows, fields) {
		if (err) throw err;
		var tot = rows[0].tot;
		var achievement = rows[0].achievement;
		var money = rows[0].money;
		var craft = rows[0].craft;
		var miss2 = rows[0].miss2;
		var dungeon_tot = rows[0].dungeon_tot;
		connection.query('SELECT COUNT(*) As miss FROM player WHERE mission_id != 0', function(err, rows, fields) {
			if (err) throw err;
			var miss = rows[0].miss;		
			connection.query('SELECT MAX(id) As inv FROM inventory', function(err, rows, fields) {
				if (err) throw err;
				var inv = rows[0].inv;
				connection.query('SELECT COUNT(id) As dragon FROM dragon', function(err, rows, fields) {
					if (err) throw err;
					var dragon = rows[0].dragon;
					connection.query('SELECT COUNT(*) As chest FROM inventory_chest', function(err, rows, fields) {
						if (err) throw err;
						var chest = rows[0].chest;
								connection.query('SELECT MAX(id) As heist, COUNT(*) As heistn FROM heist', function(err, rows, fields) {
									if (err) throw err;
									var heist = rows[0].heist;
									var heistn = rows[0].heistn;
									connection.query('SELECT COUNT(*) As travel FROM player WHERE travel_id != 0', function(err, rows, fields) {
										if (err) throw err;
										var travel = rows[0].travel;
										connection.query('SELECT SUM(damage) As dmg FROM boss_damage', function(err, rows, fields) {
											if (err) throw err;
											var dmg = rows[0].dmg;
											connection.query('SELECT MAX(id) As teamn FROM team', function(err, rows, fields) {
												if (err) throw err;
												var teamn = rows[0].teamn;
												connection.query('SELECT COUNT(*) As u FROM inventory_rarity WHERE name NOT LIKE "Pietra%" AND rarity = "U"', function(err, rows, fields) {
													if (err) throw err;
													var u = rows[0].u;

													var d = new Date();
													var today = d.getFullYear() + "-" + addZero(d.getMonth()+1) + "-" + addZero(d.getDate());
													connection.query('SELECT COUNT(*) As active FROM `last_command` WHERE time LIKE "' + today + '%"', function(err, rows, fields) {
														if (err) throw err;
														var act = rows[0].active;
														connection.query('SELECT `AUTO_INCREMENT` As lottery FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "xxx" AND TABLE_NAME = "public_lottery"', function(err, rows, fields) {
															if (err) throw err;
															var lottery = rows[0].lottery;
															connection.query('SELECT `AUTO_INCREMENT` As shop FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "xxx" AND TABLE_NAME = "public_shop"', function(err, rows, fields) {
																if (err) throw err;
																var shop = rows[0].shop;
																
																	connection.query('SELECT `AUTO_INCREMENT` As daily FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "xxx" AND TABLE_NAME = "daily_chest"', function(err, rows, fields) {
																		if (err) throw err;
																		var daily = rows[0].daily;
																		connection.query('SELECT `AUTO_INCREMENT` As dungeon FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "xxx" AND TABLE_NAME = "dungeon_list"', function(err, rows, fields) {
																			if (err) throw err;
																			var dungeon = rows[0].dungeon;
																			connection.query('SELECT `AUTO_INCREMENT` As room FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "xxx" AND TABLE_NAME = "dungeon_rooms"', function(err, rows, fields) {
																				if (err) throw err;
																				var room = rows[0].room;
																				connection.query('SELECT SUM(ability_level) As ablevel FROM `ability`', function (err, rows, fields) {
																					if (err) throw err;
																					var ablevel = rows[0].ablevel;	
																					connection.query('SELECT `AUTO_INCREMENT` As invite FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "xxx" AND TABLE_NAME = "referral_list"', function(err, rows, fields) {
																						if (err) throw err;
																						var invite = rows[0].invite;
																						connection.query('SELECT TRUNCATE(SUM(CASE WHEN fail = 0 THEN 1 ELSE 0 END)/COUNT(*)*100,0) As perc FROM heist_history', function (err, rows, fields){
																							if (err) throw err;
																							var perc = rows[0].perc;
																							connection.query('SELECT COUNT(*) As groups, SUM(members) As members FROM plus_groups', function(err, rows, fields) {
																								if (err) throw err;
																								var groups = rows[0].groups;
																								var members = rows[0].members;
																								connection.query('SELECT SUM(mana_1+mana_2+mana_3) As mana FROM event_mana_status', function(err, rows, fields) {
																									if (err) throw err;
																									var mana = rows[0].mana;
																									connection.query('SELECT SUM(quantity) As mag FROM magic', function(err, rows, fields) {
																										if (err) throw err;
																										var magic = rows[0].mag;
																										connection.query('SELECT `AUTO_INCREMENT` As search FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "xxx" AND TABLE_NAME = "search_history"', function(err, rows, fields) {
																											if (err) throw err;
																											var search = rows[0].search;

																											bot.sendMessage(message.chat.id, "*Statistiche:*\n\n" +

																															"*Giocatori registrati:* " + formatNumber(tot) + "\n" +
																															"*Missioni in corso*: " + miss + "\n" +
																															"*Missioni completate*: " + formatNumber(miss2) + "\n" +
																															"*Viaggi in corso*: " + travel + "\n" +
																															"*Utenti attivi (1):* " + formatNumber(act) + "\n" +
																															"*Monete attuali*: " + formatNumber(money) + "§\n" +
																															"*Oggetti*: " + formatNumber(inv) + "\n" + 
																															"*Scrigni attuali*: " + formatNumber(chest) + "\n" +
																															"*Creazioni*: " + formatNumber(craft) + "\n" +
																															"*Draghi*: " + formatNumber(dragon) + "\n" +
																															"*Team:* " + formatNumber(teamn) + "\n" +
																															"*Ispezioni/In corso/Rapporto:* " + formatNumber(heist) + "/" + heistn + "/" + perc + "%\n" +
																															"*Danni ai boss attuali:* " + formatNumber(dmg) + "\n" +
																															"*Lotterie:* " + formatNumber(lottery) + "\n" +
																															"*Oggetti nei negozi:* " + formatNumber(shop) + "\n" +
																															"*Scrigni giornalieri consegnati:* " + formatNumber(daily) + "\n" +
																															"*Dungeon completati:* " + formatNumber(dungeon_tot) + "\n" +
																															"*Dungeon creati:* " + formatNumber(dungeon) + "\n" +
																															"*Stanze create:* " + formatNumber(room) + "\n" +
																															"*Livelli skill:* " + formatNumber(ablevel) + "\n" +
																															"*Utenti invitati:* " + formatNumber(invite) + "\n" +
																															"*Mana grezzo:* " + formatNumber(mana) + "\n" +
																															"*Incantesimi:* " + formatNumber(magic) + "\n" +
																															"*Oggetti cercati:* " + formatNumber(search) + "\n" +
																															"*Imprese completate:* " + formatNumber(achievement) + "\n" +

																															"\n*Gruppi:* " + formatNumber(groups) + "\n" +
																															"*Membri nei gruppi:* " + formatNumber(members) + "\n" +

																															"\n(1) Utenti che hanno inviato un comando oggi", mark);
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

bot.onText(/^\/valorezaino/, function(message) {
	connection.query('SELECT SUM(value) as val FROM `inventory_rarity` WHERE player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function(err, rows, fields) {
		if (err) throw err;
		bot.sendMessage(message.chat.id, message.from.username.replace(new RegExp("_", "g"), " ") + ", il tuo zaino vale *" + formatNumber(rows[0].val) + "*§", mark);
	});
});

bot.onText(/^\/gruzzolo/, function(message) {
	connection.query('SELECT money as val FROM player WHERE id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function(err, rows, fields) {
		if (err) throw err;
		bot.sendMessage(message.chat.id, message.from.username.replace(new RegExp("_", "g"), " ") + ", possiedi *" + formatNumber(rows[0].val) + "*§", mark);
	});
});

bot.onText(/^\/oggetto (.+)|^\/oggetto/, function(message, match) {
	var oggetto = match[1];
	if (oggetto == undefined){
		bot.sendMessage(message.chat.id, "Inserisci il nome dell'oggetto (es. /oggetto Spada Antimateria) per visualizzare quanti ne possiedi");
		return;
	}
	connection.query('SELECT * FROM item WHERE name = "' + oggetto + '"', function(err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length > 0){
			var id = rows[0].id;
			var name = rows[0].name;
			var value = rows[0].value;
			var est = rows[0].estimate;
			var power = rows[0].power;
			var power_s = rows[0].power_shield;
			var power_a = rows[0].power_armor;
			var rarity = rows[0].rarity;
			var critical = rows[0].critical;

			connection.query('SELECT item.name, COUNT(item.name) As num FROM inventory, item , player WHERE player.id = inventory.player_id AND item.id = inventory.item_id AND item.name = "' + oggetto + '" AND inventory.player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function(err, rows, fields) {
				if (err) throw err;
				var posseduti = rows[0].num;

				connection.query('SELECT COUNT(*) As num, (SELECT COUNT(*) FROM inventory) As tot FROM inventory WHERE item_id = ' + id, function(err, rows, fields) {
					if (err) throw err;

					var diff = Math.round((rows[0].num/rows[0].tot)*100*1000)/1000 + "%";

					var pow = "";
					if (power != 0){
						pow = "\n*Valore:* " + power + ", " + critical + "%";
					}else if (power_a != 0){
						pow = "\n*Valore:* " + power_a + ", " + critical + "%";
					}else if (power_s != 0){
						pow = "\n*Valore:* " + power_s + ", " + critical + "%";
					}

					bot.sendMessage(message.chat.id,"*Nome oggetto:* " + name + "\n" +
									"*Rarità:* " + rarity + pow + "\n" +
									"*Prezzo base:* " + formatNumber(value) + "§\n" +
									(est != 0 ? "*Valore:* " + formatNumber(est) + "§\n" : "") +
									"*Posseduti:* " + posseduti + "\n" +
									"*Diffusione:* " + diff, mark);
				});
			});
		}else{
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

bot.onText(/^\/oggetti (.+)|^\/oggetti/, function(message, match) {

	var oggetto = match[1];
	var oggetti = [];
	if (oggetto == undefined){
		bot.sendMessage(message.chat.id, "Inserisci il nome parziale dell'oggetto (es. /oggetti Spada Anti) per visualizzare la lista e la quantità, per una ricerca precisa usa l'asterisco");
		return;
	}

	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;

		var player_id = rows[0].id;
		var text = "";
		var name = "";
		var rarity = "";
		var posseduti = 0;

		if (oggetto.indexOf(",") != -1){
			oggetti = oggetto.split(",");
			oggetti = cleanArray(oggetti);
		}else{
			oggetti.push(oggetto);
		}

		var len = Object.keys(oggetti).length;		
		var ogg = "";
		var query = "";
		var part = "";
		for (var i = 0; i < len; i++) {
			ogg = oggetti[i].trim();
			part = 'like "%' + ogg + '%"';
			if (ogg.indexOf("*") != -1){
				ogg = ogg.replace("*","");
				part = '= "' + ogg + '"';
			}
			query = 'SELECT item.name, item.rarity, count(item.name) As num FROM `item`, inventory WHERE item.name ' + part + ' AND inventory.item_id = item.id AND inventory.player_id = ' + player_id + ' GROUP BY item.name';
			connection.query(query, function(err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length > 0){
					for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
						name = rows[i].name;
						rarity = rows[i].rarity;
						posseduti = rows[i].num;
						text += "\n> " + name + " (" + rarity + ", " + posseduti + ")";
					}
				}

				if (this.i+1 == this.len){
					if (Object.keys(text).length > 0){
						if (Object.keys(text).length < 4000){
							bot.sendMessage(message.chat.id, text);
						}else{
							bot.sendMessage(message.chat.id, "Troppi risultati, prova con un filtro più limitato");
						}
					}else{
						bot.sendMessage(message.chat.id, "Non possiedi nessun oggetto con i filtri specificati");
					}
				}
			}.bind( {i: i, len: len} ));
		};
	});
});

bot.onText(/^\/ricerca (.+)|^\/ricerca/, function(message, match) {
	var oggetto = match[1];
	if (oggetto == undefined){
		bot.sendMessage(message.chat.id, "Inserisci il nome dell'oggetto (es. /ricerca Spada Antimateria) per cercare in tutte le vendite e scambi");
		return;
	}

	/*
	if (message.from.username != "fenix45"){
		bot.sendMessage(message.chat.id, "Manutenzione funzione");
		return;
	}
	*/

	var o = oggetto.trim();
	var oggetti = [];
	var ogg = "";

	if (o.indexOf(",") != -1){
		oggetti = o.split(",");
		oggetti = cleanArray(oggetti);
	}else{
		oggetti.push(o);
	}

	var len = Object.keys(oggetti).length;
	var plur = "i";
	if (len == 1){
		plur = "o";
	}
	var text = "Risultati ricerca di " + len + " oggett" + plur + ":\n";

	if (len > 3){
		bot.sendMessage(message.chat.id, "Massimo 3 oggetti grazie!");
		return;
	}

	for (var i = 0; i < len; i++) {
		ogg = oggetti[i].trim();
		connection.query('SELECT id, name FROM item WHERE name = "' + ogg + '"', function(err, rows, fields) {
			if (err) throw err;

			var itemId = 0;
			var itemName = "";

			if (Object.keys(rows).length > 0){
				itemId = rows[0].id;
				itemName = rows[0].name;
			}

			connection.query('SELECT player.nickname, public_lottery.price FROM public_lottery, player WHERE player.id = public_lottery.creator_id AND item_id = ' + itemId, function(err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length > 0){
					text += "\n<b>Lotterie</b> per " + this.itemName + ":\n";
					for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
						if (rows[i].price == 0){
							rows[i].price = "Gratis";
						}else{
							rows[i].price = rows[i].price + "§";
						}
						text += "> " + rows[i].nickname + " (" + rows[i].price + " - Lotteria)\n";
					}
				}

				connection.query('SELECT price FROM market_pack WHERE item_id = ' + this.itemId, function(err, rows, fields) {
					if (err) throw err;

					if (Object.keys(rows).length > 0){
						text += "\n<b>Pacchetti</b> per " + this.itemName + ":\n";
						for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
							text += "> Mercante Pazzo (" + formatNumber(rows[i].price) + "§ - Pacchetto)\n";
						}
					}

					connection.query('SELECT player.nickname, public_shop.code, public_shop.price FROM public_shop, player, inventory WHERE inventory.player_id = player.id AND inventory.item_id = ' + itemId + ' AND public_shop.public = 1 AND public_shop.quantity > 0 AND player.id = public_shop.player_id AND public_shop.item_id = ' + this.itemId + ' GROUP BY nickname ORDER BY price ASC', function(err, rows, fields) {
						if (err) throw err;
						if (Object.keys(rows).length > 0){
							text += "\n<b>Negozi</b> per " + this.itemName + ":\n";
							for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
								text += "> " + rows[i].nickname + " (" + formatNumber(rows[i].price) + "§ - " + rows[i].code + ")\n";
							}
						}

						if (this.i+1 == this.len){
							if (Object.keys(text).length > 50){
								if (Object.keys(text).length < 4000){
									bot.sendMessage(message.chat.id, text, html);
								}else{
									bot.sendMessage(message.chat.id, "Troppi risultati, prova con un filtro più limitato");
								}
							}else{
								bot.sendMessage(message.chat.id, "Non ho trovato nessun offerta in corso per gli oggetti specificati");
							}
						}
					}.bind( {i: this.i, len: this.len, itemId: this.itemId, itemName: this.itemName} ));
				}.bind( {i: this.i, len: this.len, itemId: this.itemId, itemName: this.itemName} ));
			}.bind( {i: this.i, len: this.len, itemId: itemId, itemName: itemName} ));
		}.bind( {i: i, len: len} ));
	};
});

bot.onText(/^\/necessari (.+)|^\/necessari/, function(message, match) {
	var oggetto = match[1];
	if (oggetto == undefined){
		bot.sendMessage(message.chat.id, "Inserisci il nome dell'oggetto (es. /necessari Spada Antimateria) per visualizzare tutti i materiali necessari");
		return;
	}

	connection.query('SELECT id, name, searchable FROM item WHERE name = "' + oggetto + '"', function(err, rows, fields) {
		if (err) throw err;

		var main = "";
		var mainId = 0;

		if (Object.keys(rows).length > 0){
			main = rows[0].name;
			mainId = rows[0].id;
		}else{
			bot.sendMessage(message.chat.id, "L'oggetto non esiste!");
			return;
		}

		if (rows[0].searchable == 0){
			bot.sendMessage(message.chat.id, "L'oggetto è nascosto!");
			return;
		}

		connection.query('SELECT material_1, material_2, material_3 FROM craft WHERE material_result = ' + mainId, function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0){
				connection.query('SELECT name, rarity, searchable FROM item WHERE id IN (' + rows[0].material_1 + ',' + rows[0].material_2 + ',' + rows[0].material_3 + ')', function(err, rows, fields) {
					if (err) throw err;
					var text = "=> *" + main + "* <=\n";
					text += "> " + rows[0].name + " (" + rows[0].rarity + ") <\n";
					text += "> " + rows[1].name + " (" + rows[1].rarity + ") <\n";
					text += "> " + rows[2].name + " (" + rows[2].rarity + ") <\n";
					bot.sendMessage(message.chat.id, text, mark);
				});
			}else{
				bot.sendMessage(message.chat.id, "L'oggetto non è creabile!");
			}
		});
	});
});

bot.onText(/^\/prezzo (.+)|^\/prezzo/, function(message, match) {
	var oggetto = match[1];
	if (oggetto == undefined){
		bot.sendMessage(message.chat.id, "Inserisci il nome dell'oggetto (es. /prezzo Spada Antimateria) per conoscerne gli ultimi prezzi");
		return;
	}

	if (message.chat.id < 0){
		bot.sendMessage(message.chat.id, "_Messaggio inviato in privato_", mark);
	}

	connection.query('SELECT price, (SELECT nickname FROM market_direct_history, player WHERE player.id = from_id AND item_id = (SELECT id FROM item WHERE name = "' + oggetto + '") LIMIT 1) As fromId, (SELECT nickname FROM market_direct_history, player WHERE player.id = to_id AND item_id = (SELECT id FROM item WHERE name = "' + oggetto + '") LIMIT 1) As toId, (SELECT count(*) FROM market_direct_history WHERE item_id = (SELECT id FROM item WHERE name = "' + oggetto + '")) As cnt FROM market_direct_history WHERE item_id = (SELECT id FROM item WHERE name = "' + oggetto + '") ORDER BY id DESC', function(err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length > 0){
			var text = "Ultimi prezzi trovati per " + oggetto + ":";

			var len = 10;
			if (Object.keys(rows).length < len){
				len = Object.keys(rows).length;
			}

			for (var i = 0; i < len; i++) {
				text += "\n> " + Math.round(rows[i].price) + "§ ";
			}
			bot.sendMessage(message.from.id, text + "\nVenduto " + rows[0].cnt + " volte");
		}else{
			bot.sendMessage(message.from.id, "Non ho trovato l'ultimo prezzo dell'oggetto specificato");
		}
	});
});

bot.onText(/^\/totale (.+)|^\/totale/, function(message, match) {
	var oggetto = match[1];
	if (oggetto == undefined){
		bot.sendMessage(message.chat.id, "Inserisci il nome dell'oggetto (es. /totale Spada Antimateria) per calcolarne gli ultimi prezzi sommando i materiali necessari");
		return;
	}

	if (message.chat.id < 0){
		bot.sendMessage(message.chat.id, "_Messaggio inviato in privato_", mark);
	}

	connection.query('SELECT material_1, material_2, material_3 FROM craft WHERE material_result = (SELECT id FROM item WHERE name = "' + oggetto + '" LIMIT 1)', function (err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0){
			bot.sendMessage(message.from.id, "L'oggetto inserito non esiste o non è creabile");
			return;
		}

		var material_1 = rows[0].material_1;
		var material_2 = rows[0].material_2;
		var material_3 = rows[0].material_3;

		var m1 = [];
		var m2 = [];
		var m3 = [];

		connection.query('SELECT price, (SELECT nickname FROM market_direct_history, player WHERE player.id = from_id AND item_id = ' + material_1 + ' LIMIT 1) As fromId, (SELECT nickname FROM market_direct_history, player WHERE player.id = to_id AND item_id = ' + material_1 + ' LIMIT 1) As toId, (SELECT count(*) FROM market_direct_history WHERE item_id = ' + material_1 + ') As cnt FROM market_direct_history WHERE item_id = ' + material_1 + ' ORDER BY id DESC', function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length > 0){
				var text = "Ultimi prezzi calcolati per " + oggetto + ":";

				var len = 10;
				if (Object.keys(rows).length < len){
					len = Object.keys(rows).length;
				}

				for (var i = 0; i < len; i++) {
					m1.push([Math.round(rows[i].price)]);
				}

				connection.query('SELECT price, (SELECT nickname FROM market_direct_history, player WHERE player.id = from_id AND item_id = ' + material_2 + ' LIMIT 1) As fromId, (SELECT nickname FROM market_direct_history, player WHERE player.id = to_id AND item_id = ' + material_2 + ' LIMIT 1) As toId, (SELECT count(*) FROM market_direct_history WHERE item_id = ' + material_2 + ') As cnt FROM market_direct_history WHERE item_id = ' + material_2 + ' ORDER BY id DESC', function(err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length > 0){
						if (Object.keys(rows).length < len){
							len = Object.keys(rows).length;
						}

						for (var i = 0; i < len; i++) {
							m2.push([Math.round(rows[i].price)]);
						}

						connection.query('SELECT price, (SELECT nickname FROM market_direct_history, player WHERE player.id = from_id AND item_id = ' + material_3 + ' LIMIT 1) As fromId, (SELECT nickname FROM market_direct_history, player WHERE player.id = to_id AND item_id = ' + material_3 + ' LIMIT 1) As toId, (SELECT count(*) FROM market_direct_history WHERE item_id = ' + material_3 + ') As cnt FROM market_direct_history WHERE item_id = ' + material_3 + ' ORDER BY id DESC', function(err, rows, fields) {
							if (err) throw err;
							if (Object.keys(rows).length > 0){
								if (Object.keys(rows).length < len){
									len = Object.keys(rows).length;
								}

								for (var i = 0; i < len; i++) {
									m3.push([Math.round(rows[i].price)]);
								}

								for (var i = 0; i < len; i++) {
									text += "\n> " + (parseInt(m1[i]) + parseInt(m2[i]) + parseInt(m3[i])) + "§";
								}

								bot.sendMessage(message.from.id, text);
							}else{
								bot.sendMessage(message.from.id, "Non ho trovato dati sufficienti per l'oggetto specificato");
							}
						});
					}else{
						bot.sendMessage(message.from.id, "Non ho trovato dati sufficienti per l'oggetto specificato");
					}
				});
			}else{
				bot.sendMessage(message.from.id, "Non ho trovato dati sufficienti per l'oggetto specificato");
			}
		});
	});
});

function getInfo(message, player, myhouse_id, from, account_id){
	connection.query('SELECT id, house_id, custom_name, weapon_id, weapon2_id, weapon3_id, charm_id FROM player WHERE nickname="' + player + '"', function(err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length == 0){
			bot.sendMessage(message.chat.id, "Il giocatore non esiste.", back);
			return;
		}

		var player_id = rows[0].id;
		var custom_name = rows[0].custom_name;

		var weapon_id = rows[0].weapon_id;
		var weapon2_id = rows[0].weapon2_id;
		var weapon3_id = rows[0].weapon3_id;
		var charm_id = rows[0].charm_id;
		var house_id = rows[0].house_id;

		connection.query('SELECT name, id FROM item WHERE id = ' + weapon_id, function(err, rows, fields) {
			if (err) throw err;
			var weapon = "-";
			var weapon_id = 0;
			if (Object.keys(rows).length > 0){
				weapon_id = rows[0].id;
				if ((weapon_id == 638) || (weapon_id == 639) || (weapon_id == 640)){
					if (custom_name != null){
						weapon = custom_name + rows[0].name.replace("Necro","");
					}else{
						weapon = rows[0].name;
					}
				}else{
					weapon = rows[0].name;
				}
			};

			connection.query('SELECT ability_level FROM ability WHERE player_id = ' + player_id + ' AND ability_id = 1', function(err, rows, fields) {
				if (err) throw err;

				var abBonus = 0;
				if (Object.keys(rows).length > 0){
					abBonus = rows[0].ability_level;
				}

				connection.query('SELECT name, description FROM item WHERE id = ' + charm_id, function(err, rows, fields) {
					if (err) throw err;
					var talismano = "-";
					var talismano_desc = "";
					if (Object.keys(rows).length > 0){
						talismano = rows[0].name;
						talismano_desc = " (" + rows[0].description + ")";
					};

					connection.query('SELECT name FROM player, team, team_player WHERE player.id = ' + player_id + ' AND team.id = team_player.team_id AND team_player.player_id = player.id', function(err, rows, fields) {
						if (err) throw err;
						var team_desc = "";
						if (Object.keys(rows).length > 0){
							team_desc = " (" + rows[0].name.trim() + ")";
						};

						connection.query('SELECT name FROM house WHERE id = ' + house_id, function(err, rows, fields) {
							if (err) throw err;
							var house_name = rows[0].name;

							connection.query('SELECT name FROM item WHERE id = ' + weapon2_id, function(err, rows, fields) {
								if (err) throw err;
								var weapon2 = "-";
								if (Object.keys(rows).length > 0){
									weapon2 = rows[0].name;
								}

								connection.query('SELECT name FROM item WHERE id = ' + weapon3_id, function(err, rows, fields) {
									if (err) throw err;
									var weapon3 = "-";
									if (Object.keys(rows).length > 0){
										weapon3 = rows[0].name;
									}

									connection.query('SELECT dragon.* FROM player, dragon WHERE player.id = dragon.player_id AND player.id = ' + player_id, function(err, rows, fields) {
										if (err) throw err;
										var dragon_name = "-";
										var dragon_level = "-";
										var dragon_damage = "-";
										var dragon_defense = "-";
										var dragon_critical = "-";

										var dragon_clawsid = 0;
										var dragon_saddleid = 0;

										var dragon_claws = 0;

										var dragon = 0;

										if (Object.keys(rows).length > 0){
											dragon = 1;

											if (charm_id == 602){
												rows[0].damage += 25;
												rows[0].critical += 10;
											}

											dragon_name = rows[0].name.replace(new RegExp("_", "g"), " ").trim() + " " + rows[0].type;
											dragon_level = rows[0].level;
											dragon_damage = rows[0].damage + " + " + rows[0].claws;
											dragon_defense = rows[0].defense + " + " + rows[0].saddle;
											dragon_critical = rows[0].critical + "%";

											dragon_claws = parseInt(rows[0].claws);

											dragon_clawsid = rows[0].claws_id;
											dragon_saddleid = rows[0].saddle_id;
										}

										connection.query('SELECT name, COUNT(name) As num FROM item WHERE id = ' + dragon_clawsid, function(err, rows, fields) {
											if (err) throw err;

											var dragon_claws_n = "-";
											if (rows[0].num > 0){
												dragon_claws_n = rows[0].name;
											}

											connection.query('SELECT name, COUNT(name) As num FROM item WHERE id = ' + dragon_saddleid, function(err, rows, fields) {
												if (err) throw err;

												var dragon_saddle_n = "-";
												if (rows[0].num > 0){
													dragon_saddle_n = rows[0].name;
												}

												connection.query('SELECT P1.nickname As player, P2.nickname As new, time FROM referral_list INNER JOIN player P1 ON P1.id = player_id INNER JOIN player P2 ON P2.id = new_player WHERE P2.id = ' + player_id, function(err, rows, fields) {
													if (err) throw err;

													var referral = "";
													if (Object.keys(rows).length > 0){
														var d = new Date(rows[0].time);
														var short_date = addZero(d.getDate()) + "/" + addZero(d.getMonth()+1) + "/" + d.getFullYear();
														referral = "Invitato da: " + rows[0].player + " (" + short_date + ")\n";
													}

													connection.query('SELECT class.name FROM player, class WHERE player.id = ' + player_id + ' AND player.class = class.id', function(err, rows, fields) {
														if (err) throw err;

														var class_name = "-";
														if (Object.keys(rows).length > 0){
															class_name = rows[0].name;
														}

														connection.query('SELECT * FROM player WHERE id = ' + player_id, function(err, rows, fields) {
															if (err) throw err;
															var stars = "";
															if (rows[0].reborn == 2){
																stars = " ⭐️ ";
															}else if (rows[0].reborn == 3){
																stars = " ⭐️⭐️ ";
															}else if (rows[0].reborn == 4){
																stars = " ⭐️⭐️⭐️";
															}else if (rows[0].reborn == 5){
																stars = " 🌟";
															}

															if (player_id == 1){
																stars = " 👑";
															}

															if (charm_id == 62){
																rows[0].weapon += 5;
															}
															if (charm_id == 184){
																rows[0].weapon += 15;
															}
															if (charm_id == 188){
																rows[0].weapon += 20;
															}
															if (charm_id == 63){
																rows[0].weapon2 -= 5;
															}
															if (charm_id == 186){
																rows[0].weapon2 -= 15;
															}
															if (charm_id == 189){
																rows[0].weapon2 -= 20;
															}
															if (charm_id == 404){
																rows[0].weapon_crit += 6;
															}
															if (charm_id == 493){
																rows[0].weapon_crit += 2;
															}
															if (charm_id == 494){
																rows[0].weapon_crit += 4;
															}
															if (charm_id == 495){
																rows[0].weapon2_crit += 3;
															}
															if (charm_id == 496){
																rows[0].weapon3_crit += 3;
															}
															if (abBonus > 0){
																rows[0].weapon_crit += abBonus;
																rows[0].weapon2_crit += abBonus;
																rows[0].weapon3_crit += abBonus;
															}

															var weapon_desc = "";
															if (weapon != "-"){
																weapon_desc = " (+" + rows[0].weapon + ", " + rows[0].weapon_crit + "%, " + rows[0].weapon_enchant + ")";
															}
															var weapon2_desc = "";
															if (weapon2 != "-"){
																weapon2_desc = " (" + rows[0].weapon2 + ", " + rows[0].weapon2_crit + "%, " + rows[0].weapon2_enchant + ")";
															}
															var weapon3_desc = "";
															if (weapon3 != "-"){
																weapon3_desc = " (" + rows[0].weapon3 + ", " + rows[0].weapon3_crit + "%, " + rows[0].weapon3_enchant + ")";
															}

															var nickname = rows[0].nickname;
															var weapon_d = parseInt(rows[0].weapon);
															var lev = Math.floor(rows[0].exp/10);
															var player_atk = (lev+weapon_d+rows[0].weapon_enchant) + " - " + ((lev+weapon_d+rows[0].weapon_enchant)+(weapon_d+rows[0].weapon_enchant+dragon_claws));
															var player_description = rows[0].player_description;

															if (player != message.from.username){
																if (myhouse_id == 1){
																	rows[0].life = "?";
																	rows[0].total_life = "?";
																	rows[0].heist_count = "?";
																	rows[0].spy_count = "?";
																	rows[0].money = "?";
																	rows[0].exp = "?";
																	lev = "?";
																	weapon = "?";
																	weapon_desc = "";
																	weapon2 = "?";
																	weapon2_desc = "";
																	weapon3 = "?";
																	weapon3_desc = "";
																	talismano = "?";
																	talismano_desc = "";
																	dragon_name = "?";
																	dragon_level = "?";
																	dragon_claws_n = "?";
																	dragon_damage = "?";
																	dragon_saddle_n = "?";
																	dragon_defense = "?";
																	dragon_critical = "?";
																}else if (myhouse_id == 2){
																	rows[0].heist_count = "?";
																	rows[0].spy_count = "?";
																	rows[0].money = "?";
																	weapon = "?";
																	weapon_desc = "";
																	weapon2 = "?";
																	weapon2_desc = "";
																	weapon3 = "?";
																	weapon3_desc = "";
																	talismano = "?";
																	talismano_desc = "";
																	dragon_name = "?";
																	dragon_level = "?";
																	dragon_claws_n = "?";
																	dragon_damage = "?";
																	dragon_saddle_n = "?";
																	dragon_defense = "?";
																	dragon_critical = "?";
																}else if (myhouse_id == 3){
																	rows[0].heist_count = "?";
																	rows[0].spy_count = "?";
																	rows[0].money = "?";
																	talismano = "?";
																	talismano_desc = "";
																	dragon_name = "?";
																	dragon_level = "?";
																	dragon_claws_n = "?";
																	dragon_damage = "?";
																	dragon_saddle_n = "?";
																	dragon_defense = "?";
																	dragon_critical = "?";
																}else if (myhouse_id == 4){
																	rows[0].heist_count = "?";
																	rows[0].spy_count = "?";
																	rows[0].money = "?";
																}else if (myhouse_id == 5){
																	rows[0].money = "?";
																}
															}

															if (from == 1){
																message.chat.id = account_id;
															}

															bot.sendMessage(message.chat.id, "<b>Giocatore</b> 👤\n" +
																			nickname + team_desc + "\n" +
																			"🔅 " + lev + " (" + rows[0].exp + ")" + stars + "\n\n" +
																			"🏹 " + class_name + "\n" +
																			"💎 " + rows[0].gems + "\n" +
																			"💰 " + formatNumber(rows[0].money) + "§\n" +
																			"❤️ " + rows[0].life + " / " + rows[0].total_life + " hp\n" +
																			"📦 " + rows[0].craft_count + " (" + rows[0].craft_week + ")\n" +
																			"\n<b>Equipaggiamento</b> ⚔️\n" +
																			"🗡 " + weapon + weapon_desc + "\n" +
																			"🥋 " + weapon2 + weapon2_desc + "\n" +
																			"🛡 " + weapon3 + weapon3_desc + "\n" +
																			"📿 " + talismano + "\n" +
																			"💥 " + player_atk + "\n" +

																			(dragon ? "\n<b>" + dragon_name + " (L" + dragon_level + ")</b> 🐉\n" : "") +
																			(dragon ? dragon_claws_n + " (" + dragon_damage + ")\n" : "") +
																			(dragon ? dragon_saddle_n + " (" + dragon_defense + ")\n" : "") +
																			(dragon ? "CRIT " + dragon_critical + "\n" : "") +

																			"\n<b>Altro</b> 💱\n" +
																			referral +
																			"Abilità: " + rows[0].ability + "\n" +
																			"Rango: " + getRankName(rows[0].rank, 0) + " (" + rows[0].rank + ")\n" +
																			(player_description != null ? "\n<i>" + player_description  + "</i>" : ""), html);
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

/*
function getInfo(message, player, house_id, from, account_id){
	connection.query('SELECT id, custom_name, player_description FROM player WHERE nickname="' + player + '"', function(err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length == 0){
			return;
		}

		var player_id = rows[0].id;
		var custom_name = rows[0].custom_name;
		var player_description = rows[0].player_description;

		connection.query('SELECT item.name, item.id FROM player, item WHERE player.id = ' + player_id + ' AND player.weapon_id = item.id', function(err, rows, fields) {
			if (err) throw err;
			var weapon = "-";
			var weapon_id = 0;
			if (Object.keys(rows).length > 0){
				weapon_id = rows[0].id;
                                if ((weapon_id == 638) || (weapon_id == 639) || (weapon_id == 640)){
                                        if (custom_name != null){
                                                weapon = custom_name + rows[0].name.replace("Necro","");
                                        }else{
                                                weapon = rows[0].name;
                                        }
                                }else{
                                        weapon = rows[0].name;
                                }
			};
			connection.query('SELECT item.name, item.description FROM player, item WHERE player.id = ' + player_id + ' AND player.charm_id = item.id', function(err, rows, fields) {
				if (err) throw err;
				var talismano = "-";
				var talismano_desc = "";
				if (Object.keys(rows).length > 0){
					talismano = rows[0].name;
					talismano_desc = " (" + rows[0].description + ")";
				};

				connection.query('SELECT name FROM `player`, team, team_player WHERE player.id = ' + player_id + ' AND team.id = team_player.team_id AND team_player.player_id = player.id', function(err, rows, fields) {
					if (err) throw err;
					var team_desc = "";
					if (Object.keys(rows).length > 0){
						team_desc = " (" + rows[0].name.trim() + ")";
					};

					connection.query('SELECT house.name FROM player, house WHERE player.id = ' + player_id + ' AND player.house_id = house.id', function(err, rows, fields) {
						if (err) throw err;
						var house_name = rows[0].name;

						connection.query('SELECT item.name FROM player, item WHERE player.id = ' + player_id + ' AND player.weapon2_id = item.id', function(err, rows, fields) {
							if (err) throw err;
							var weapon2 = "-";
							if (Object.keys(rows).length > 0){
								weapon2 = rows[0].name;
							}

							connection.query('SELECT item.name FROM player, item WHERE player.id = "' + player_id + '" AND player.weapon3_id = item.id', function(err, rows, fields) {
								if (err) throw err;
								var weapon3 = "-";
								if (Object.keys(rows).length > 0){
									weapon3 = rows[0].name;
								}

								connection.query('SELECT dragon.* FROM player, dragon WHERE player.id = dragon.player_id AND player.id = ' + player_id, function(err, rows, fields) {
									if (err) throw err;
									var dragon_name = "-";
									var dragon_level = "-";
									var dragon_damage = "-";
									var dragon_defense = "-";
									var dragon_critical = "-";

									var dragon_clawsid = 0;
									var dragon_saddleid = 0;

									var dragon_claws = 0;

									if (Object.keys(rows).length > 0){
										dragon_name = rows[0].name.replace(new RegExp("_", "g"), " ").trim() + " " + rows[0].type;
										dragon_level = rows[0].level;
										dragon_damage = rows[0].damage + " + " + rows[0].claws;
										dragon_defense = rows[0].defense + " + " + rows[0].saddle;
										dragon_critical = rows[0].critical + "%";

										dragon_claws = parseInt(rows[0].claws);

										dragon_clawsid = rows[0].claws_id;
										dragon_saddleid = rows[0].saddle_id;
									}

									connection.query('SELECT name, COUNT(name) As num FROM item WHERE id = ' + dragon_clawsid, function(err, rows, fields) {
										if (err) throw err;

										var dragon_claws_n = "-";
										if (rows[0].num > 0){
											dragon_claws_n = rows[0].name;
										}

										connection.query('SELECT name, COUNT(name) As num FROM item WHERE id = ' + dragon_saddleid, function(err, rows, fields) {
											if (err) throw err;

											var dragon_saddle_n = "-";
											if (rows[0].num > 0){
												dragon_saddle_n = rows[0].name;
											}

											connection.query('SELECT P1.nickname As player, P2.nickname As new, time FROM referral_list INNER JOIN player P1 ON P1.id = player_id INNER JOIN player P2 ON P2.id = new_player WHERE P2.id = ' + player_id, function(err, rows, fields) {
												if (err) throw err;

												var referral = "";
												if (Object.keys(rows).length > 0){
													var d = new Date(rows[0].time);
													var short_date = addZero(d.getDate()) + "/" + addZero(d.getMonth()+1) + "/" + d.getFullYear();
													referral = "Invitato da: " + rows[0].player + " (" + short_date + ")\n";
												}

												connection.query('SELECT class.name FROM player, class WHERE player.id = ' + player_id + ' AND player.class = class.id', function(err, rows, fields) {
													if (err) throw err;

													var class_name = rows[0].name;

													connection.query('SELECT * FROM player WHERE id = ' + player_id, function(err, rows, fields) {
														if (err) throw err;
														var stars = "";
														if (rows[0].reborn == 2){
															stars = " ⭐️ ";
														}else if (rows[0].reborn == 3){
															stars = " ⭐️⭐️ ";
														}else if (rows[0].reborn == 4){
															stars = " ⭐️⭐️⭐️";
														}else if (rows[0].reborn == 5){
															stars = " 🌟";
														}

														if (player_id == 1){
															stars = " 👑";
														}

														var weapon_desc = "";
														if (weapon != "-"){
															weapon_desc = " (+" + rows[0].weapon + ", " + rows[0].weapon_crit + "%, " + rows[0].weapon_enchant + ")";
														}
														var weapon2_desc = "";
														if (weapon2 != "-"){
															weapon2_desc = " (" + rows[0].weapon2 + ", " + rows[0].weapon2_crit + "%, " + rows[0].weapon2_enchant + ")";
														}
														var weapon3_desc = "";
														if (weapon3 != "-"){
															weapon3_desc = " (" + rows[0].weapon3 + ", " + rows[0].weapon3_crit + "%, " + rows[0].weapon3_enchant + ")";
														}

														var nickname = rows[0].nickname;

														var lev = Math.floor(rows[0].exp/10);
														var weapon_d = parseInt(rows[0].weapon);
														var player_atk = (lev+weapon_d+rows[0].weapon_enchant) + " - " + ((lev+weapon_d+rows[0].weapon_enchant)+(weapon_d+rows[0].weapon_enchant+dragon_claws));

														var Keys = []

														if (player == message.from.username){
															//	Keys.push(["Classe 🏹"]);
															Keys.push(["Visualizza Link Invito"]);
															Keys.push(["Statistiche Personali"]);
															Keys.push(["Resetta Guide"]);
														}else{
															if (house_id == 1){
																rows[0].life = "?";
																rows[0].total_life = "?";
																rows[0].heist_count = "?";
																rows[0].spy_count = "?";
																rows[0].money = "?";
																rows[0].exp = "?";
																lev = "?";
																weapon = "?";
																weapon_desc = "";
																weapon2 = "?";
																weapon2_desc = "";
																weapon3 = "?";
																weapon3_desc = "";
																talismano = "?";
																talismano_desc = "";
																dragon_name = "?";
																dragon_level = "?";
																dragon_claws_n = "?";
																dragon_damage = "?";
																dragon_saddle_n = "?";
																dragon_defense = "?";
																dragon_critical = "?";
															}else if (house_id == 2){
																rows[0].heist_count = "?";
																rows[0].spy_count = "?";
																rows[0].money = "?";
																weapon = "?";
																weapon_desc = "";
																weapon2 = "?";
																weapon2_desc = "";
																weapon3 = "?";
																weapon3_desc = "";
																talismano = "?";
																talismano_desc = "";
																dragon_name = "?";
																dragon_level = "?";
																dragon_claws_n = "?";
																dragon_damage = "?";
																dragon_saddle_n = "?";
																dragon_defense = "?";
																dragon_critical = "?";
															}else if (house_id == 3){
																rows[0].heist_count = "?";
																rows[0].spy_count = "?";
																rows[0].money = "?";
																talismano = "?";
																talismano_desc = "";
																dragon_name = "?";
																dragon_level = "?";
																dragon_claws_n = "?";
																dragon_damage = "?";
																dragon_saddle_n = "?";
																dragon_defense = "?";
																dragon_critical = "?";
															}else if (house_id == 4){
																rows[0].heist_count = "?";
																rows[0].spy_count = "?";
																rows[0].money = "?";
															}else if (house_id == 5){
																rows[0].money = "?";
															}
														}

														if (from == 1){
															message.chat.id = account_id;
														}

														bot.sendMessage(message.chat.id, "<b>Giocatore</b>\n" +
																		"Nickname: " + nickname + team_desc + stars + "\n" +
																		referral +
																		"Exp/Livello: " + rows[0].exp + " - " + lev + "\n" +
																		"Vocazione: " + class_name + "\n" +
																		"Abilità: " + rows[0].ability + "\n" +
																		"Rango: " + getRankName(rows[0].rank, 0) + "\n" +
																		"Creazioni: " + rows[0].craft_count + " (" + rows[0].craft_week + ")\n" +
																		"Gemme: " + rows[0].gems + "\n" +
																		"Salute: " + rows[0].life + " / " + rows[0].total_life + " hp\n\n" +
																		"<b>Drago</b>\n" +
																		"Nome: " + dragon_name + "\n" +
																		"Livello: " + dragon_level + "\n" +
																		"Attacco: " + dragon_claws_n + " (" + dragon_damage + ")\n" +
																		"Difesa: " + dragon_saddle_n + " (" + dragon_defense + ")\n" +
																		"Critico: " + dragon_critical + "\n\n" +
																		"<b>Equipaggiamento</b>\n" +
																		"Arma: " + weapon + weapon_desc + "\n" +
																		"Armatura: " + weapon2 + weapon2_desc + "\n" +
																		"Scudo: " + weapon3 + weapon3_desc + "\n" +
																		"Talismano: " + talismano + talismano_desc + "\n" +
																		"Danno base: " + player_atk + "\n\n" +
																		"<b>Rifugio</b>\n" +
																		"Ispezioni/Spiate: " + rows[0].heist_count + "/5 - " + rows[0].spy_count + "/15\n" +
																		"Rifugio: " + house_name + " (grado " + rows[0].house_id + ")\n" +
																		"Credito: " + formatNumber(rows[0].money) + "§" +
																		(player_description != null ? "\n\n<i>" + player_description  + "</i>" : ""), html);
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
*/

bot.onText(/^\/giocatore/, function(message) {
	var player = message.from.username;
	var account_id = 0;

	getInfo(message, player, 6, 0, account_id);
});

bot.onText(/^\/spia/, function(message) {

	if (message.reply_to_message == undefined){
		bot.sendMessage(message.chat.id, "Questo comando va utilizzato in _risposta_", mark);
		return;
	}

	var player = message.reply_to_message.from.username;

	connection.query('SELECT * FROM player WHERE nickname="' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;
		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			bot.sendMessage(message.chat.id, "...", mark);
			return;
		}

		if (rows[0].holiday == 1){
			bot.sendMessage(account_id, "Non puoi spiare in vacanza")
			return;
		}

		if (rows[0].spy_count >= 15){
			bot.sendMessage(account_id, "Hai raggiunto il limite");
			return;
		}

		var player_id = rows[0].id;
		var level = Math.floor(rows[0].exp/10);
		var power = rows[0].weapon;
		var myhouse = rows[0].house_id;

		if ((rows[0].life <= 0) && (rows[0].exp > 10)){
			bot.sendMessage(account_id, "Non hai abbastanza salute");
			return;
		}

		if ((rows[0].travel_id != 0) || (rows[0].cave_id != 0)){
			bot.sendMessage(account_id, "Non puoi spiare in viaggio");
			return;
		}

		if (rows[0].money < 500){
			bot.sendMessage(account_id, "Non hai abbastanza monete");
			return;
		}

		connection.query('SELECT COUNT(*) As num, datetime FROM heist WHERE from_id = ' + player_id, function(err, rows, fields) {
			if (err) throw err;
			if (rows[0].num == 0){
				connection.query('SELECT id, heist_protection, chat_id, account_id, house_id FROM player WHERE nickname="' + player + '"', function(err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length > 0){
						var chat_id = rows[0].chat_id;
						var house_id = rows[0].house_id;

						var account_id2 = (rows[0].account_id).toString();
						if (banlist_id.indexOf(account_id2) != -1){
							bot.sendMessage(account_id, "Non puoi spiare un giocatore bannato");
							return;
						}

						if (rows[0].heist_protection != null){
							bot.sendMessage(account_id, "Il bersaglio è sotto protezione");
							return;
						}

						getInfo(message, player, myhouse, 1, account_id);

						connection.query('UPDATE player SET spy_count = spy_count+1, money=money-500 WHERE nickname="' + message.from.username + '"', function(err, rows, fields) {
							if (err) throw err;
						});

						if (message.from.username != "fenix45"){
							if (house_id == 1){
								bot.sendMessage(chat_id, "Le pattuglie intorno al villaggio ci hanno avvisato che qualcuno ha spiato il tuo rifugio!");
							}else if (house_id == 2){
								bot.sendMessage(chat_id, "Le pattuglie intorno al villaggio ci hanno avvisato che qualcuno *di livello " + level + "* ha spiato il tuo rifugio!", mark);
							}else if ((house_id == 3) || (house_id == 4)){
								bot.sendMessage(chat_id, "Le pattuglie intorno al villaggio ci hanno avvisato che *un livello " + level + ", con +" + power + " di danno* ha spiato il tuo rifugio!", mark);									
							}else if (house_id >= 5){
								bot.sendMessage(chat_id, "Le pattuglie intorno al villaggio ci hanno avvisato che *" + message.from.username.replace(new RegExp("_", "g"), " ") + "* ha spiato il tuo rifugio!", mark);
							}
						}
					}else{
						bot.sendMessage(account_id, "Giocatore non trovato.");
					}
				});
			}else{
				bot.sendMessage(account_id, "Non puoi spiare mentre ispezioni");
			}
		});
	});
});

function getRankName(rank){
	var text = "";

	if (rank <= rankList[0]){
		text = "Esploratore Novizio";
	}else if (rank <= rankList[1]){
		text = "Esploratore Modesto";
	}else if (rank <= rankList[2]){
		text = "Esploratore Professionista";
	}else if (rank <= rankList[3]){
		text = "Avventuriero Giovane";
	}else if (rank <= rankList[4]){
		text = "Avventuriero Forestiero";
	}else if (rank <= rankList[5]){
		text = "Avventuriero della Notte";
	}else if (rank <= rankList[6]){
		text = "Avventuriero Impavido";
	}

	return text;
};

bot.onText(/^\/scrigni/, function(message, match) {
	if (message.chat.id == "-1001069842056"){
		bot.sendMessage(message.chat.id, "Lo zaino non può essere visualizzato in questo gruppo");
		return;
	}

	connection.query('SELECT id, total_life, life, account_id FROM player WHERE nickname="' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;
		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		var player_id = rows[0].id;
		var bottext = message.from.username.replace(new RegExp("_", "g"), " ") + ", ecco gli scrigni nel tuo zaino:\n\n";

		connection.query('SELECT chest.name, COUNT(chest.name) As num FROM chest, inventory_chest WHERE chest.id = inventory_chest.chest_id AND inventory_chest.player_id = ' + player_id + ' GROUP BY chest.name ORDER BY chest.id', function(err, rows, fields) {
			if (err) throw err;

			if (Object.keys(rows).length > 0){
				for (i = 0, len = Object.keys(rows).length; i < len; i++) {
					bottext = bottext + "> " + rows[i].name + " (" + rows[i].num + ")\n";
				}
			}else{
				bottext = bottext + "Nessuno scrigno disponibile\n";
			}

			bot.sendMessage(message.chat.id, bottext, mark)				

		});
	});		
});

bot.onText(/^\/zaino (.+)|^\/zaino/, function(message, match) {
	if (message.chat.id == "-1001069842056"){
		bot.sendMessage(message.chat.id, "Lo zaino non può essere visualizzato in questo gruppo");
		return;
	}

	if ((match[1] == undefined) || (match[1] == "undefined")){
		bot.sendMessage(message.chat.id, "La sintassi è la seguente: /zaino rarità (esempio: /zaino E)");
		return;
	}

	connection.query('SELECT id, total_life, life, account_id FROM player WHERE nickname="' + message.from.username + '"', function(err, rows, fields) {
		if (err) throw err;
		var account_id = (rows[0].account_id).toString();
		if (banlist_id.indexOf(account_id) != -1){
			console.log("BANNATO! (" + message.from.username + ")");
			var text = "...";
			bot.sendMessage(message.chat.id, text, mark);
			return;
		}

		var player_id = rows[0].id;

		if (match[1].toLowerCase() == "i"){
			var bottext = message.from.username.replace(new RegExp("_", "g"), " ") + ", ecco i tuoi incantesimi:\n\n";

			connection.query('SELECT type, power, quantity FROM magic WHERE player_id = ' + player_id, function(err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length > 0){
					var n = "";
					for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
						if (rows[i].type == 1){
							n = "Furia dei Mari";
						}else if (rows[i].type == 2){
							n = "Tempesta Folgorante";
						}else if (rows[i].type == 3){
							n = "Impeto di Fiamme";
						}else if (rows[i].type == 4){
							n = "Ira Astrale";
						}
						bottext = bottext + "> " + n + " " + rows[i].power + " (" + rows[i].quantity + ")\n";
					}
				}else{
					bottext = bottext + "Nessun incantesimo disponibile\n";
				}
				bot.sendMessage(message.chat.id, bottext, mark);
			});
		}else{
			connection.query('SELECT shortname FROM rarity WHERE shortname = "' + match[1] + '"', function(err, rows, fields) {
				if (err) throw err;

				if (Object.keys(rows).length == 0){
					bot.sendMessage(message.chat.id, "Rarità non valida", mark);
					return;
				}

				var bottext = message.from.username.replace(new RegExp("_", "g"), " ") + ", ecco gli oggetti di rarità " + match[1] + " nel tuo zaino:\n\n";

				connection.query('SELECT inventory.player_id, item.name, rarity.id, rarity.name As rname, COUNT(item.name) As num FROM `inventory`, item, rarity WHERE player_id = ' + player_id + ' AND rarity.shortname = item.rarity AND inventory.item_id = item.id AND rarity.shortname = "' + match[1] + '" GROUP BY item.name ORDER BY rarity.id DESC, item.name ASC', function(err, rows, fields) {
					if (err) throw err;
					if (Object.keys(rows).length > 0){
						for (i = 0, len = Object.keys(rows).length; i < len; i++) {
							bottext = bottext + "> " + rows[i].name + " (" + rows[i].num + ")\n";
						}
					}else{
						bottext = bottext + "Nessun oggetto di questa rarità disponibile\n";
					}
					if (Object.keys(bottext).length > 4000){
						bottext = "Purtroppo lo zaino non può essere visualizzato poichè contiene troppi oggetti";
					}

					bot.sendMessage(message.chat.id, bottext, mark)
				});
			});
		}
	});
});

function checkAuction(){
	connection.query('SELECT creator_id FROM `auction_list` WHERE time_end < NOW() AND time_end IS NOT NULL', function(err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length > 0){
			if (Object.keys(rows).length == 1){
				console.log(getNow("it") + " 1 asta terminata");
			}else{
				console.log(getNow("it") + " " + Object.keys(rows).length + " aste terminate");
			}
			rows.forEach(setFinishedAuction);
		}
	});
};

function checkShopNotification(){
	connection.query('SELECT DISTINCT(code) AS code, player_id FROM `public_shop` WHERE TIMESTAMPDIFF(MINUTE, NOW(), time_end) < 60 AND time_end IS NOT NULL AND notified = 0', function(err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length > 0){
			if (Object.keys(rows).length == 1){
				console.log(getNow("it") + " 1 negozio notificato");
			}else{
				console.log(getNow("it") + " " + Object.keys(rows).length + " negozi notificati");
			}
			rows.forEach(setFinishedShopNotification);
		}
	});
};

function setFinishedShopNotification(element, index, array) {
	var player_id = element.player_id;
	var code = element.code;

	connection.query('SELECT chat_id FROM player WHERE id = ' + player_id, function(err, rows, fields) {
		if (err) throw err;
		var chat_id = rows[0].chat_id;
		connection.query('UPDATE public_shop SET notified = 1 WHERE code = ' + code, function(err, rows, fields) {
			if (err) throw err;
			bot.sendMessage(chat_id, "Il negozio con codice " + code + " verrà eliminato a breve, aggiornalo o cancellalo");
		});
	});
};

function checkShopErr(){
	connection.query('SELECT public_shop.id, player_id, code, quantity, nickname, item.name, price, item.id As item_id FROM public_shop, player, item WHERE item.id = public_shop.item_id AND player.id = public_shop.player_id AND quantity < 0', function(err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length > 0){
			var text = "Allarme negozi:\n\n";
			for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
				text += rows[i].name + " " + rows[i].nickname + " " + rows[i].code + " " + rows[i].quantity + "\n";
			}
			//bot.sendMessage(20471035, text);
			bot.sendMessage("@lnotify", text);
			rows.forEach(setFinishedShopErr);
		}
	});
};

function setFinishedShopErr(element, index, array) {
	var code = element.code;
	var player_id = element.player_id;
	var code = element.code;
	var price = element.price;
	var item_id = element.item_id;
	var quantity = element.quantity;
	var shop_id = element.id;

	connection.query('SELECT to_id, time FROM market_direct_history WHERE item_id = ' + item_id + ' AND price = ' + price + ' AND from_id = ' + player_id + ' ORDER BY id DESC LIMIT 1', function(err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length > 0){
			var to_id = rows[0].to_id;
			quantity = Math.abs(quantity);

			for (var i = 0; i < quantity; i++) {
				connection.query('DELETE FROM inventory WHERE player_id = ' + to_id + ' AND item_id = ' + item_id + ' LIMIT ' + quantity, function(err, rows, fields) {
					if (err) throw err;
				});
				//I soldi dell'acquirente non vengono ripristinati(?)
				/*
				connection.query('UPDATE player SET money = money + ' + price + ' WHERE id = ' + to_id, function(err, rows, fields) {
					if (err) throw err;
				});
				*/
				connection.query('UPDATE player SET money = money - ' + price + ' WHERE id = ' + player_id, function(err, rows, fields) {
					if (err) throw err;
				});
				connection.query('INSERT INTO inventory (player_id, item_id) VALUES (' + player_id + ',' + item_id + ')', function(err, rows, fields) {
					if (err) throw err;
				});
			}
			connection.query('DELETE FROM public_shop WHERE id = ' + shop_id, function(err, rows, fields) {
				if (err) throw err;
				connection.query('SELECT chat_id FROM player WHERE id = ' + to_id, function(err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(rows[0].chat_id, "E' stato rilevato un problema al negozio in cui hai appena acquistato, ho automaticamente ripristinato gli oggetti e i §");
				});
				connection.query('SELECT chat_id FROM player WHERE id = ' + player_id, function(err, rows, fields) {
					if (err) throw err;
					bot.sendMessage(rows[0].chat_id, "E' stato rilevato un problema al negozio in cui hai appena venduto, ho automaticamente ripristinato gli oggetti e i §");
				});
			});
		}
	});
};

function checkShop(){
	connection.query('SELECT DISTINCT(code) As code, player_id FROM `public_shop` WHERE time_end < NOW() AND time_end IS NOT NULL', function(err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length > 0){
			if (Object.keys(rows).length == 1){
				console.log(getNow("it") + " 1 negozio terminato");
			}else{
				console.log(getNow("it") + " " + Object.keys(rows).length + " negozi terminati");
			}
			rows.forEach(setFinishedShop);
		}
	});
};

function setFinishedShop(element, index, array) {
	var code = element.code;
	var player_id = element.player_id;

	connection.query('SELECT id, chat_id FROM player WHERE id = ' + player_id, function(err, rows, fields) {
		if (err) throw err;

		var chat_id = rows[0].chat_id;

		connection.query('DELETE FROM public_shop WHERE code = ' + code, function(err, rows, fields) {
			if (err) throw err;
			bot.sendMessage(chat_id, "Il negozio " + code + " è scaduto ed è stato eliminato");
		});
	});
};

function setFinishedAuction(element, index, array) {
	connection.query('SELECT id, chat_id, item_id, last_price, last_player FROM auction_list WHERE creator_id = ' + element.creator_id, function(err, rows, fields) {
		if (err) throw err;

		var auction_id = rows[0].id;
		var item_id = rows[0].item_id;
		var money = rows[0].last_price;
		var last_player = rows[0].last_player;
		var last_price = rows[0].last_price;
		var chat_id = rows[0].chat_id;

		connection.query('SELECT * FROM player WHERE id = ' + last_player, function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length == 0){
				connection.query('UPDATE player SET money = money + ' + last_price + ' WHERE id = ' + last_player, function(err, rows, fields) {
					if (err) throw err;
					connection.query('DELETE FROM auction_list WHERE id = ' + auction_id, function(err, rows, fields) {
						if (err) throw err;
						connection.query('INSERT INTO inventory (player_id, item_id) VALUES (' + element.creator_id + ',' + item_id + ')', function(err, rows, fields) {
							if (err) throw err;
							bot.sendMessage(chat_id, "Non ci sono offerte, asta annullata!");
							console.log("Asta terminata automaticamente");
						});
					});
				});
				return;
			}
			var nickname = rows[0].nickname;
			connection.query('INSERT INTO inventory (player_id, item_id) VALUES (' + last_player + ',' + item_id + ')', function(err, rows, fields) {
				if (err) throw err;
			});
			connection.query('SELECT item.name FROM item WHERE id = ' + item_id, function(err, rows, fields) {
				if (err) throw err;
				var itemName = rows[0].name;
				bot.sendMessage(chat_id, "Asta terminata per " + itemName + "!\n\nIl vincitore è: @" + nickname + " con l'offerta di " + last_price + "§!");

				connection.query('UPDATE player SET money = money+' + money + ' WHERE id = ' + element.creator_id, function(err, rows, fields) {
					if (err) throw err;
					console.log("Consegnati " + money + "§ al creatore");
				});

				connection.query('INSERT INTO auction_history (creator_id, player_id, price, item_id) VALUES (' + element.creator_id + ',' + last_player + ',' + last_price + ',' + item_id + ')', function(err, rows, fields) {
					if (err) throw err;
				});

				connection.query('DELETE FROM auction_list WHERE id = ' + auction_id, function(err, rows, fields) {
					if (err) throw err;
				});
			});
		});
	});
};


function checkLottery(){
	connection.query('SELECT creator_id FROM `public_lottery` WHERE time_end < NOW() AND time_end IS NOT NULL', function(err, rows, fields) {
		if (err) throw err;
		if (Object.keys(rows).length > 0){
			if (Object.keys(rows).length == 1){
				console.log(getNow("it") + " 1 lotteria terminata");
			}else{
				console.log(getNow("it") + " " + Object.keys(rows).length + " lotterie terminate");
			}
			rows.forEach(setFinishedLottery);
		}
	});
};

function setFinishedLottery(element, index, array) {
	connection.query('SELECT id, price, chat_id, item_id, money FROM public_lottery WHERE creator_id = ' + element.creator_id, function(err, rows, fields) {
		if (err) throw err;

		var lottery_id = rows[0].id;
		var item_id = rows[0].item_id;
		var money = rows[0].money;
		var chat_id = rows[0].chat_id;
		var price = rows[0].price;

		connection.query('SELECT player_id FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function(err, rows, fields) {
			if (err) throw err;
			if (Object.keys(rows).length < 5){
				connection.query('SELECT player_id FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function(err, rows, fields) {
					if (err) throw err;

					for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
						connection.query('UPDATE player SET money = money + ' + price + ' WHERE id = ' + rows[i].player_id, function(err, rows, fields) {
							if (err) throw err;
						});	
					};

					connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function(err, rows, fields) {
						if (err) throw err;
						connection.query('DELETE FROM public_lottery WHERE id = ' + lottery_id, function(err, rows, fields) {
							if (err) throw err;
							connection.query('INSERT INTO inventory (player_id, item_id) VALUES (' + element.creator_id + ',' + item_id + ')', function(err, rows, fields) {
								if (err) throw err;
								bot.sendMessage(chat_id, "Non ci sono abbastanza partecipanti per estrarre automaticamente, la lotteria è annullata");
								console.log("Lotteria scaduta");
							});
						});
					});
				});
				return;
			}
			var rand = Math.round(Math.random()*(Object.keys(rows).length-1));
			console.log("Estrazione: " + rand);
			var extracted = rows[rand].player_id;
			console.log(extracted);
			connection.query('SELECT * FROM player WHERE id = ' + extracted, function(err, rows, fields) {
				if (err) throw err;
				if (Object.keys(rows).length == 0){
					bot.sendMessage(chat_id, "Non ho trovato il giocatore estratto!");
					return;
				}
				var nickname = rows[0].nickname;
				connection.query('INSERT INTO inventory (player_id, item_id) VALUES (' + extracted + ',' + item_id + ')', function(err, rows, fields) {
					if (err) throw err;
				});
				connection.query('SELECT item.name FROM item WHERE id = ' + item_id, function(err, rows, fields) {
					if (err) throw err;
					var itemName = rows[0].name;
					bot.sendMessage(chat_id, "Estrazione per " + itemName + "!\n\nIl vincitore è: @" + nickname + "!");

					connection.query('UPDATE player SET money = money+' + money + ' WHERE id = ' + element.creator_id, function(err, rows, fields) {
						if (err) throw err;
						console.log("Consegnati " + money + "§ al creatore");
					});

					connection.query('SELECT nickname, account_id, chat_id FROM public_lottery_players, player WHERE player.id = player_id AND lottery_id = ' + lottery_id, function(err, rows, fields) {
						if (err) throw err;
						for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
							if (rows[i].nickname != nickname){
								bot.sendMessage(rows[i].chat_id, "Estrazione automatica per " + itemName + " terminata, purtroppo hai perso!");
							}else{
								bot.sendMessage(rows[i].chat_id, "Estrazione automatica per " + itemName + " terminata, HAI VINTO!");
							}
						}
						connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function(err, rows, fields) {
							if (err) throw err;
							connection.query('DELETE FROM public_lottery WHERE id = ' + lottery_id, function(err, rows, fields) {
								if (err) throw err;
								console.log("Lotteria terminata");
							});
						});
					});

					connection.query('INSERT INTO public_lottery_history (creator_id, player_id, item_id, money) VALUES (' + element.creator_id + ',' + extracted + ',' + item_id + ',' + money + ')', function(err, rows, fields) {
						if (err) throw err;
					});
				});
			});
		});
	});
};

function checkMarket(){
	connection.query('SELECT * FROM `market` WHERE time_end < NOW()', function(err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length > 0){
			if (Object.keys(rows).length == 1){
				console.log(getNow("it") + " 1 offerta terminata");
			}else{
				console.log(getNow("it") + " " + Object.keys(rows).length + " offerte terminate");
			}
			rows.forEach(setFinishedMarket);
		}
	});
};

function setFinishedMarket(element, index, array) {
	connection.query('SELECT chat_id, account_id, id FROM player WHERE id = ' + element.player_id, function(err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0){
			console.log("ERRORE scambio: " + element.player_id);
			return;
		}

		var chat_id = rows[0].account_id;
		var player_id = rows[0].id;
		var item1 = element.item_1_id;

		connection.query('INSERT INTO `inventory` (player_id, item_id) VALUES (' + player_id + ',' + item1 + ')', function(err, rows, fields) {
			if (err) throw err;
		});

		connection.query('DELETE FROM market WHERE id = ' + element.id, function(err, rows, fields) {
			if (err) throw err;
			bot.sendMessage(chat_id, "La vendita è scaduta, l'oggetto è tornato nell'inventario.");
		});
	});
}

function setFinishedMarketDirect(element, index, array) {
	connection.query('SELECT chat_id, account_id, id FROM player WHERE id = ' + element.player_id, function(err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length == 0){
			console.log("ERRORE vendi: " + element.player_id);
			return;
		}

		var chat_id = rows[0].account_id;
		var player_id = rows[0].id;
		var item1 = element.item_id;

		connection.query('INSERT INTO `inventory`(player_id, item_id) VALUES (' + player_id + ',' + item1 + ')', function(err, rows, fields) {
			if (err) throw err;
		});

		connection.query('DELETE FROM market_direct WHERE id = ' + element.id, function(err, rows, fields) {
			if (err) throw err;
			bot.sendMessage(chat_id, "Lo scambio è scaduto, l'oggetto è tornato nell'inventario.");
		});
	});
}

function checkMarketDirect(){
	connection.query('SELECT * FROM `market_direct` WHERE time_end < NOW()', function(err, rows, fields) {
		if (err) throw err;

		if (Object.keys(rows).length > 0){
			if (Object.keys(rows).length == 1){
				console.log(getNow("it") + " 1 offerta vendita terminata");
			}else{
				console.log(getNow("it") + " " + Object.keys(rows).length + " offerte vendita terminate");
			}
			rows.forEach(setFinishedMarketDirect);
		}
	});
};

// Funzioni

function addZero(i) {
	if (i < 10) {
		i = "0" + i;
	}
	return i;
}

function formatNumber(num) {
	return ("" + num).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, function($1) { return $1 + "." });
}

function getNow(lang, obj) {
	var d = new Date();
	obj = typeof obj !== 'undefined' ? obj : false;

	if (lang == "it"){
		var datetime = addZero(d.getDate()) + "/" + addZero(d.getMonth()+1) + "/" + d.getFullYear() + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());
	}else if (lang == "en"){
		var datetime = d.getFullYear() + "-" + addZero(d.getMonth()+1) + "-" + addZero(d.getDate()) + " " + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds());	
	}else{
		var datetime = "Lingua non specificata";
	}
	if (obj == true){
		datetime = new Date(datetime);
	}
	return datetime
}

function callNTimes( time, fn) {
	function callFn() {
		if (1 < 0) return;
		fn();
		setTimeout(callFn, time);
	}
	setTimeout(callFn, time);
}

function findAndRemove(array, str){
	for (var i = 0; i < array.length; i++) {
		if (array[i] == str){
			array.splice(i, 1);
		}
	}
	return array;
}

function findInArray(array, str){
	for (var i = 0; i < array.length; i++) {
		if (array[i] == str){
			return true;
		}
	}
	return false;
}
