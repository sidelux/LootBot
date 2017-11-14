process.on('uncaughtException', function (err) {
        console.error(err);
});

var TelegramBot = require('node-telegram-bot-api');
var token = '236880746:AAEolJ-Dpe_gQdnGxksGFTb1ubMj03PVhw4';
var bot = new TelegramBot(token, {polling: true});

bot.on('message', function (message) {
        console.log(message.from.username + ": " + message.text);

        var text = "Manutenzione, riprova tra poco";
        //text = "Problemi ai server, ci scusiamo per il disagio. Riprova più tardi.\nIntanto accedi al gruppo pubblico per verificare lo stato del gioco: https://telegram.me/joinchat/AThc-z_EfojvcE8mbGw$

        //bot.sendMessage(message.chat.id, text);
});
