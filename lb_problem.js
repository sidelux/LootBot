process.on('uncaughtException', function (err) {
	console.error(err);
});

var TelegramBot = require('node-telegram-bot-api');
var config = require('./config.js');
var token = config.maintoken;
var bot = new TelegramBot(token, {polling: true});

bot.on('message', function (message) {
        console.log(message.from.username + ": " + message.text);

	var text = "Manutenzione, riprova tra poco. Segui @LootBotAvvisi per aggiornamenti.";

	bot.sendMessage(message.chat.id, text);
});
