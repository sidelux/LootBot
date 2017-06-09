process.on('uncaughtException', function (err) {
        console.error(err);
});

//Globali
var TelegramBot = require('node-telegram-bot-api');

var token = '236880746:AAEolJ-Dpe_gQdnGxksGFTb1ubMj03PVhw4';
var bot = new TelegramBot(token, {polling: true});

bot.on('message', function (message) {
        //console.log(update.chat);
        var msg = message;
        var text = msg.text;
        var user = msg.from.username;
        var chat_id = msg.chat.id;
        var account_id = msg.from.id;
        console.log("SERVEROFF - " + user + ": " + text);

//	bot.sendMessage(chat_id, "Problemi ai server, ci scusiamo per il disagio. Riprova più tardi.\nIntanto accedi al gruppo pubblico per verificare lo stato del gioco: https://telegram.me/joinchat/AThc-z_EfojvcE8mbGw1Cw");
});
