process.on('uncaughtException', function (err) {
        console.error(err);
});

var TelegramBot = require('node-telegram-bot-api');
var config = require('./config.js');
var token = config.plustoken;
var bot = new TelegramBot(token, {polling: true});

bot.on('message', function (message) {
        console.log("Manutenzione: " + message.from.username + ": " + message.text);
});
