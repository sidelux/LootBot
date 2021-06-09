/* eslint-disable eqeqeq */
/* eslint-disable camelcase */

process.env.NTBA_FIX_319 = 1

const TelegramBot = require('node-telegram-bot-api')
const ms = require('ms')
const mysql = require('mysql')
const stringSimilarity = require('string-similarity')
const { create, all } = require('mathjs')
const express = require('express')

const config = require('./config.js')
const tipsController = require('./suggestions/tips_message_controller.js')

process.on('uncaughtException', function (error) {
	console.log('\x1b[31mException: ', error, '\x1b[0m')
})

process.on('unhandledRejection', function (error, p) {
	if ((error.message.indexOf('Too Many Requests') === -1) && (error.message.indexOf('message is not modified') === -1)) {
		console.log('\x1b[31mError: ', error.message, '\x1b[0m')
	}
})

tipsController.initialize()

const math = create(all)
math.import({
	ones: _ => { throw new Error('Questa funzione è stata disabilitata') },
	zeros: _ => { throw new Error('Questa funzione è stata disabilitata') },
	identity: _ => { throw new Error('Questa funzione è stata disabilitata') },
	range: _ => { throw new Error('Questa funzione è stata disabilitata') },
	matrix: _ => { throw new Error('Questa funzione è stata disabilitata') }
}, { override: true })

const token = config.plustoken

const bot = new TelegramBot(token)
const app = express()

const path = '/plus/bot' + token
const port = 25002

const options = {
	allowed_updates: ['inline_query', 'chosen_inline_result', 'callback_query'],
	max_connections: 80
}
bot.setWebHook('https://fenixweb.net:8443' + path, options)
app.listen(port)

app.use(express.json())
app.post(path, function (req, res) {
	bot.processUpdate(req.body)
	res.sendStatus(200)
})

let check = []
const timevar = []
const timevarSpam = []
const timevarFlood = []
const rankList = [20, 50, 75, 100, 150, 200, 500, 750, 1000, 1500]
const reg = /^[a-zA-Zàèìòùé0-9.*,\\?!'@() ]{1,}$/

console.log('Avvio bot...')

const maxDurationQuery = 500

const dbConnection = mysql.createPool({
	host: config.dbhost,
	user: config.dbuser,
	password: config.dbpassword,
	database: config.dbdatabase,
	connectionLimit: 100
})

const connection = {
	end: dbConnection.end,
	query: function (q, fn) {
		const startTime = new Date()
		dbConnection.query(q, function (err, res, fields) {
			const duration = new Date() - startTime
			if (duration > maxDurationQuery) console.log('QUERY', q, 'EXECUTED IN', duration, 'ms')
			fn(err, res, fields)
		})
	},
	queryAsync: async (str, values) => new Promise((resolve, reject) => {
		const startTime = new Date()
		dbConnection.query(str, function (err, res, fields) {
			const duration = new Date() - startTime
			if (duration > maxDurationQuery) console.log('SYNC QUERY', str, 'EXECUTED IN', duration, 'ms')
			if (err) reject(err)
			else resolve(res)
		})
	})
}

process.on('SIGINT', function () {
	console.log('Spegnimento bot...')
	connection.end()
	process.exit()
})

process.on('SIGTERM', function () {
	console.log('Spegnimento bot...')
	connection.end()
	process.exit()
})

bot.on('polling_error', function (error) {
	console.log(error)
})

const mergeMessages = []

bot.on('edited_message', function (message) {
	connection.query('SELECT always, compact FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length > 0) {
			if (rows[0].compact === 1) {
				if (mergeMessages[message.chat.id] && mergeMessages[message.chat.id] !== '') {
					if (mergeMessages[message.chat.id].split(';')[0] === message.from.id) {
						const lastIdx = mergeMessages[message.chat.id].lastIndexOf(';')
						mergeMessages[message.chat.id] = mergeMessages[message.chat.id].substr(0, lastIdx + 1)
						mergeMessages[message.chat.id] += cleanForMerge(message.text)
					}
				}
			}
		}
	})
})

bot.on('message', function (message, match) {
	if (message.text) {
		// Suggestions

		if (message.entities) {
			const entities = message.entities
			let isSuggestion
			if (typeof entities !== 'undefined' && entities != null && entities.length != null && entities.length > 0) {
				const firstString = message.text.substr(entities[0].offset + 1, (entities[0].length) - 2).toLowerCase()
				if (firstString.indexOf('suggeriment') >= 0 || firstString === 'sug') { isSuggestion = true }
			}

			if (isSuggestion) {
				// console.log("> Sugg. da parte di " + message.from.username);
				tipsController.suggestionManager(message).then(function (responseMessage) {
					if (typeof (responseMessage) !== 'undefined') {
						// se c'è da editare qualche cosa...
						if (typeof (responseMessage.toEdit) !== 'undefined') {
							bot.editMessageText(
								responseMessage.toEdit.message_txt, {
								chat_id: responseMessage.toEdit.chat_id,
								message_id: responseMessage.toEdit.mess_id,
								parse_mode: responseMessage.toEdit.options.parse_mode,
								disable_web_page_preview: true,
								reply_markup: responseMessage.toEdit.options.reply_markup
							}).catch(function (err) {
								bot.sendMessage(
									16964514,
									"👮Hey:\nC'è stato un problema!\n" + err.response.body.description +
									'\nNella chat: ' + responseMessage.toSend.chat_id + '\n' + err.response.body
								)
							})
						}
						if (typeof (responseMessage.toSend) !== 'undefined') {
							bot.sendMessage(
								responseMessage.toSend.chat_id,
								responseMessage.toSend.message_txt,
								responseMessage.toSend.options
							).catch(function (err) {
								bot.sendMessage(
									responseMessage.toSend.chat_id,
									'Upps!\n' +
									'Sembra tu stia usando uno dei caratteri markdown non correttamente...\n' +
									'O comunque, questo è quello che dice Telegram:\n\n```' + err.response.body.description + '\n```'
								)
							})
						}
					}
				}).catch(function (err) { console.log(err) })
			}
		}

		// End suggestions

		if (message.text.startsWith('/') && !(message.text.startsWith('//'))) {
			if (message.text.indexOf('@') === -1) { console.log(getNow('it') + ' - ' + message.from.username + ': ' + message.text) } else if (message.text.toLowerCase().indexOf('@lootplusbot') !== -1) { console.log(getNow('it') + ' -- ' + message.from.username + ': ' + message.text) }
		}

		if (message.from.id != 20471035 && message.chat.id === -1001097316494) {
			let banFromGroup = 0
			if (message.text != undefined) {
				if (!message.text.startsWith('Negozio di')) { banFromGroup = 1 } else if (message.text.startsWith('@lootplusbot')) {
					bot.deleteMessage(message.chat.id, message.message_id).then(function (result) {
						if (result != true) { console.log('Errore cancellazione messaggio ' + message.chat.id + ' ' + message.message_id) }
					})
				} else {
					connection.query('INSERT INTO plus_history (account_id) VALUES (' + message.from.id + ')', function (err, rows, fields) {
						if (err) throw err
						connection.query('SELECT id FROM plus_history WHERE account_id = ' + message.from.id + ' ORDER BY id DESC LIMIT 2', function (err, rows, fields) {
							if (err) throw err

							if (Object.keys(rows).length > 1) {
								if (rows[0].id - rows[1].id < 5) {
									bot.kickChatMember(message.chat.id, message.from.id).then(function (result) {
										bot.sendMessage(message.chat.id, message.from.username + ", hai postato un negozio troppo vicino all'ultimo, sei stato kickato.")
										bot.sendMessage(message.from.id, "Sei stato kickato dal gruppo Loot Negozi perchè hai postato un negozio troppo vicino all'ultimo")
										bot.unbanChatMember(message.chat.id, message.from.id)
									})
									bot.deleteMessage(message.chat.id, message.message_id).then(function (result) {
										if (result != true) { console.log('Errore cancellazione messaggio ' + message.chat.id + ' ' + message.message_id) }
									})
								} else {
									connection.query('DELETE FROM plus_history WHERE account_id = ' + message.from.id + ' AND id != ' + rows[0].id, function (err, rows, fields) {
										if (err) throw err
									})
								}
							}
						})
					})
				}
			} else { banFromGroup = 1 }

			if (banFromGroup == 1) {
				const time = Math.round((Date.now() + ms('3 days')) / 1000)
				bot.kickChatMember(message.chat.id, message.from.id, { until_date: time }).then(function (result) {
					bot.sendMessage(message.chat.id, message.from.username + ', non puoi scrivere in questo gruppo, sei stato bannato per 3 giorni.')
					bot.sendMessage(message.from.id, 'Sei stato bannato dal gruppo Loot Negozi per 3 giorni perchè non hai postato un negozio')
				})
				bot.deleteMessage(message.chat.id, message.message_id).then(function (result) {
					if (result != true) { console.log('Errore cancellazione messaggio ' + message.chat.id + ' ' + message.message_id) }
				})
			}
		}
		if (message.text.toLowerCase().indexOf('errore:') != -1) {
			if (message.text.toLowerCase().indexOf('#arena') == -1) { bot.sendMessage('-1001098734700', '#Mtproto ' + message.from.username + ': ' + message.text) }
		}
	}

	if (message.chat.id < 0) {
		connection.query('SELECT chat_id FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length == 0) {
				bot.getChatMembersCount(message.chat.id).then(function (cnt) {
					connection.query('INSERT INTO plus_groups (name, chat_id, members) VALUES ("' + (message.chat.title).replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '').replaceAll("'", "").replaceAll('"', '') + '","' + message.chat.id + '",' + cnt + ')', function (err, rows, fields) {
						if (err) throw err
						console.log('Gruppo aggiunto: ' + message.chat.title)
					})
				})
			} else {
				bot.getChatMembersCount(message.chat.id).then(function (cnt) {
					const d = new Date()
					const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

					message.chat.title = message.chat.title.replace(/[^\w\s]/gi, '')

					connection.query('UPDATE plus_groups SET name = "' + message.chat.title + '", members = ' + cnt + ', last_update = "' + long_date + '" WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
						if (err) throw err
					})
				})
			}
		})
		connection.query('SELECT always, compact FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
			if (err) throw err

			if (message.new_chat_members != undefined) {
				if (message.new_chat_member.is_bot == 0) { checkStatus(message, message.new_chat_member.username, message.new_chat_member.id, 0) }
			} else {
				if (Object.keys(rows).length > 0) {
					if (rows[0].always == 1) {
						if (message.from.is_bot == 0) { checkStatus(message, message.from.username, message.from.id, 1) }
					}
					if (rows[0].compact == 1) {
						if ((message.from.is_bot == 0) && (message.text != undefined) && (message.text.indexOf('http') == -1)) {
							if ((message.reply_to_message == undefined) && (!message.text.startsWith('/')) && (message.forward_date == undefined)) {
								if ((mergeMessages[message.chat.id] != undefined) && (mergeMessages[message.chat.id] != '')) {
									if (mergeMessages[message.chat.id].split(';')[0] == message.from.id) {
										bot.deleteMessage(message.chat.id, mergeMessages[message.chat.id].split(';')[1])
										bot.deleteMessage(message.chat.id, message.message_id)
										const newText = mergeMessages[message.chat.id].split(';')[2] + '\n~\n' + cleanForMerge(message.text)
										bot.sendMessage(message.chat.id, '@' + message.from.username + ' <i>scrive</i>:\n' + newText, html).then(function (data) {
											mergeMessages[message.chat.id] = message.from.id + ';' + data.message_id + ';' + newText
										})
									} else { mergeMessages[message.chat.id] = message.from.id + ';' + message.message_id + ';' + cleanForMerge(message.text) }
								} else { mergeMessages[message.chat.id] = message.from.id + ';' + message.message_id + ';' + cleanForMerge(message.text) }
							} else { mergeMessages[message.chat.id] = '' } // ignora le risposte, i comandi e gli inoltri
						} else { mergeMessages[message.chat.id] = '' } // ignora i bot
					}
				}
			}
		})
	}

	if (message.from.username != undefined) {
		connection.query('SELECT account_id FROM plus_players WHERE account_id = ' + message.from.id, function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length == 0) {
				connection.query('INSERT INTO plus_players (account_id, nickname) VALUES (' + message.from.id + ',"' + message.from.username + '")', function (err, rows, fields) {
					if (err) throw err
					console.log(message.from.username + ' aggiunto')
				})
			} else {
				connection.query('SELECT real_name, gender FROM player WHERE account_id = "' + message.from.id + '"', function (err, rows, fields) {
					if (err) throw err

					if (Object.keys(rows).length > 0) {
						if ((rows[0].real_name == null) || (rows[0].gender == null)) {
							connection.query('UPDATE plus_players SET nickname = "' + message.from.username + '" WHERE account_id = ' + message.from.id, function (err, rows, fields) {
								if (err) throw err
							})
						} else {
							connection.query('UPDATE plus_players SET nickname = "' + message.from.username + '", gender = "' + rows[0].gender + '", real_name = "' + rows[0].real_name + '" WHERE account_id = ' + message.from.id, function (err, rows, fields) {
								if (err) throw err
							})
						}
					}
				})
			}
		})
	}
})

/* abilitare da botfather in caso
bot.on("chosen_inline_result", function (query) {
  console.log(query);
});
*/

bot.on('inline_query', async function (query) {
	if (query.query.indexOf('asta') != -1) {
		let nick = ''
		if (query.query.indexOf(':') != -1) {
			const split = query.query.split(':')
			if ((split[1] != undefined) && (split[1] != '')) { nick = split[1] }
		} else { nick = query.from.username }

		connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + query.from.username + '"', async function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) { return }

			const player_id = rows[0].id

			const banReason = await isBanned(rows[0].account_id)
			if (banReason != null) { return }

			if (rows[0].market_ban == 1) { return }

			if (rows[0].holiday == 1) { return }

			connection.query('SELECT auction_list.id, last_price, holiday, creator_id, last_player, item_id, time_end, nickname, market_ban FROM auction_list, player WHERE player.id = auction_list.creator_id AND auction_list.creator_id = (SELECT id FROM player WHERE nickname = "' + nick + '")', async function (err, rows, fields) {
				if (err) throw err

				if (Object.keys(rows).length == 0) { return }

				let creator_nickname = ''
				let last_player = 0
				let last_player_nickname = ''
				let last_price = 0
				let itemName = ''

				let d = new Date()
				let long_date = ''
				let short_date = ''

				var id = 0

				if (rows[0].market_ban == 1) {
					if (nickname != 'tutte') {
						bot.sendMessage(query.from.id, "L'utente è bannato dal mercato", mark)
						return
					}
				}

				creator_nickname = rows[0].nickname
				last_player = rows[0].last_player
				last_player_nickname = ''
				last_price = rows[0].last_price
				itemName = ''

				d = new Date(rows[0].time_end)
				long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())
				short_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

				var id = rows[0].id

				item = await connection.queryAsync('SELECT name FROM item WHERE id = ' + rows[0].item_id)
				itemName = item[0].name
				player = await connection.queryAsync('SELECT nickname FROM player WHERE id = ' + last_player)
				if (Object.keys(player).length == 0) { last_player_nickname = '-' } else { last_player_nickname = player[0].nickname }

				const iKeys = []
				iKeys.push([{
					text: '♻️ Aggiorna',
					callback_data: 'asta:' + id + ':' + 'update'
				}])
				iKeys.push([{
					text: '+1k',
					callback_data: 'asta:' + id + ':' + '1000'
				}])
				iKeys.push([{
					text: '+10k',
					callback_data: 'asta:' + id + ':' + '10000'
				}])
				iKeys.push([{
					text: '+100k',
					callback_data: 'asta:' + id + ':' + '100000'
				}])

				const text = '<b>Asta per ' + itemName + '</b>\n\n<b>Creatore</b>: ' + creator_nickname + '\n<b>Offerta</b>: ' + formatNumber(last_price) + ' §\n<b>Offerente:</b> ' + last_player_nickname + '\n<b>Scade alle:</b> ' + short_date

				bot.answerInlineQuery(query.id, [{
					id: '0',
					type: 'article',
					title: 'Pubblica Asta di ' + nick,
					description: '',
					message_text: text,
					parse_mode: 'HTML',
					reply_markup: {
						inline_keyboard: iKeys
					}
				}], { cache_time: 0 })
			})
		})
		return
	}

	let code = parseInt(query.query)
	let last = 0
	if ((code == '') || (isNaN(code))) {
		const lastShop = await connection.queryAsync('SELECT P.code FROM public_shop P, player PL WHERE PL.id = P.player_id AND PL.nickname = "' + query.from.username + '" ORDER BY time_creation DESC')
		if (Object.keys(lastShop).length == 0) { return }
		code = lastShop[0].code
		last = 1
	}

	connection.query('SELECT public_shop.id, quantity, item.name, price, player_id, massive, time_end, item_id, public_shop.description FROM public_shop, item WHERE item.id = item_id AND code = ' + code + ' ORDER BY item.name', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const iKeys = []
		let name = ''
		let item_list = ''
		let total_qnt = 0
		let total_price = 0
		let pQnt = 0
		let qntTot = 0
		for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
			name = cutTextW(rows[i].name)
			iKeys.push([{
				text: name + ' (' + rows[i].quantity + ') - ' + formatNumberK(rows[i].price) + ' §',
				callback_data: rows[i].id.toString()
			}])
			total_qnt++
			pQnt = await getItemCnt(rows[i].player_id, rows[i].item_id)
			if (pQnt > rows[i].quantity) { pQnt = rows[i].quantity }
			total_price += parseInt(rows[i].price * pQnt)
			qntTot += pQnt
			item_list += name + ', '
		}

		item_list = item_list.slice(0, -2)

		if (rows[0].massive != 0) {
			iKeys.push([{
				text: '💰 Compra tutto - ' + formatNumberK(total_price) + ' §',
				callback_data: 'all:' + code.toString()
			}])
		}

		iKeys.push([{
			text: '♻️ Aggiorna',
			callback_data: 'update:' + code.toString()
		}, {
			text: '🗑 Elimina',
			callback_data: 'delete:' + code.toString()
		}])

		var d = new Date()
		const short_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

		var d = new Date(rows[0].time_end)
		const long_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ' del ' + addZero(d.getDate()) + '/' + addZero(d.getMonth() + 1) + '/' + d.getFullYear()

		let isProtected = ''
		if (rows[0].protected == 1) { isProtected = ' 🚫' }
		let description = ''
		if (rows[0].description != null) { description = '\n<i>' + rows[0].description + '</i>' }

		connection.query('SELECT nickname FROM player WHERE id = ' + rows[0].player_id, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) { return }

			let plur = 'i'
			if (qntTot == 1) { plur = 'o' }

			const text = '<b>Negozio di ' + rows[0].nickname + '</b>\nAggiornato alle ' + short_date + '\nScadrà alle ' + long_date + '\nContiene ' + formatNumber(qntTot) + ' oggett' + plur + isProtected + description
			let desc
			if (last == 0) { desc = total_qnt + ' oggetti in vendita\n' + item_list } else { desc = 'Negozio più recente\n' + item_list }

			bot.answerInlineQuery(query.id, [{
				id: '0',
				type: 'article',
				title: 'Pubblica Negozio',
				description: desc,
				message_text: text,
				parse_mode: 'HTML',
				reply_markup: {
					inline_keyboard: iKeys
				}
			}], { cache_time: 0 })
		})
	})
})

var mark = {
	parse_mode: 'Markdown'
}

var html = {
	parse_mode: 'HTML',
	disable_web_page_preview: true
}

const no_preview = {
	parse_mode: 'Markdown',
	disable_web_page_preview: true
}

callNTimes(60000, function () {
	checkLottery()
	checkAuction()
	checkShop()
	checkShopNotification()
	checkMarket()
	checkMarketDirect()
})

bot.onText(/^\/start$|^\/start@lootplusbot$/, function (message) {
	bot.sendMessage(message.chat.id, 'Questo è un bot di supporto a @lootgamebot, è utile nei gruppi. Scrivi / per visualizzare tutti i comandi disponibili!')
})

bot.onText(/^\/comandigiocatore/, function (message) {
	bot.sendMessage(message.chat.id, '*Comandi disponibili per il giocatore*\n' +
		'/giocatore o /giocatrice - Mostra la scheda giocatore\n' +
		"/drago - Mostra la scheda drago (specifica 'nome parziale, tipo' di un drago per spiarlo)\n" +
		"/zaino - Mostra gli oggetti contenuti nello zaino (specifica anche rarità separate da virgola o 'consumabili' o 'completo')\n" +
		'/zainoc/b - Mostra gli oggetti creati/base contenuti nello zaino (specifica anche la rarità)\n' +
		'/zainor - Mostra gli oggetti speciali posseduti (polvere, monete lunari, ecc.)\n' +
		'/oggetto - Mostra i dettagli di un oggetto posseduto\n' +
		'/oggetti - Mostra i dettagli di più oggetti posseduti\n' +
		'/scrigni - Mostra gli scrigni posseduti\n' +
		'/valorezaino - Mostra il valore complessivo degli oggetti posseduti (specifica anche la rarità)\n' +
		'/valorezainob - Mostra il valore complessivo degli oggetti base posseduti (specifica anche la rarità)\n' +
		'/valorezainoc - Mostra il valore complessivo degli oggetti creati posseduti (specifica anche la rarità)\n' +
		'/gruzzolo - Mostra le monete possedute\n' +
		'/trofei - Mostra i trofei nella stagione in corso delle Mappe\n' +
		'/vette - Mostra il monte e le Ð raggiunte nelle Vette in corso\n' +
		'/creazioni - Mostra i punti creazione ottenuti\n' +
		'/spia - Spia un giocatore mostrando la scheda giocatore\n' +
		'/ispeziona - Ispeziona un giocatore, puoi anche specificare il nome dello gnomo da inviare\n' +
		'/rango - Visualizza informazioni sul rango del giocatore\n' +
		'/lega - Visualizza informazioni sulla lega del giocatore\n' +
		'/imprese - Visualizza lo stato delle imprese giornaliere\n' +
		"/abilità - Visualizza informazioni sull'abilità del giocatore\n" +
		'/posizione - Indica la posizione in classifica globale e se si otterrà il relativo punto partecipazione\n' +
		'/posizioneteam - Indica la posizione in classifica globale di tutti i membri del team\n' +
		'/figurine - Visualizza un riassunto delle figurine possedute raggruppate per rarità\n' +
		"/figurinel - Visualizza le figurine possedute (specifica anche la rarità, il nome parziale, 'doppie', rarità o raritàinv)\n" +
		'/figurina - Visualizza i dettagli delle figurine\n' +
		'/figurinem - Visualizza le figurine mancanti per la rarità indicata', mark)
})

bot.onText(/^\/comandioggetto/, function (message) {
	bot.sendMessage(message.chat.id, '*Comandi disponibili per gestire gli oggetti*\n' +
		'/necessari - Mostra gli oggetti necessari alla creazione di un creabile\n' +
		'/prezzo - Mostra gli ultimi prezzi di vendita di un oggetto escludendo quelli a prezzo base\n' +
		'/totale - Mostra gli ultimi prezzi utilizzando i prezzi degli oggetti utilizzati per crearlo\n' +
		"/ricerca - Cerca l'oggetto nei canali di vendita, puoi cercare fino a 3 oggetti separati da virgola", mark)
})

bot.onText(/^\/comandilotteria/, function (message) {
	bot.sendMessage(message.chat.id, '*Comandi disponibili per gestire le lotterie*\n' +
		'/statolotteria - Mostra lo stato di una lotteria\n' +
		'/crealotteria - Permette di creare una lotteria con iscrizione gratuita\n' +
		'/crealotteriap - Permette di creare una lotteria con iscrizione a pagamento\n' +
		"/lotteria - Iscrive alla lotteria con iscrizione gratuita (usa anche 'tutte' o '+nome oggetto')\n" +
		"/lotteriap - Iscrive alla lotteria con iscrizione a pagamento (usa anche 'tutte' o '+nome oggetto')\n" +
		"/dlotteria - Disiscrive dalla lotteria con iscrizione gratuita (usa anche 'tutte')\n" +
		"/dlotteriap - Disiscrive dalla lotteria con iscrizione a pagamento (usa anche 'tutte')\n" +
		'/lotterie - Mostra tutte le lotterie disponibili\n' +
		'/iscritti - Mostra gli iscritti alla propria lotteria\n' +
		"/estrazione - Forza l'estrazione di una lotteria\n" +
		'/cancellalotteria - Elimina una lotteria in corso', mark)
})

bot.onText(/^\/comandiasta/, function (message) {
	bot.sendMessage(message.chat.id, '*Comandi disponibili per gestire le aste*\n' +
		"/statoasta - Mostra lo stato di un'asta\n" +
		"/creaasta - Permette di creare un'asta (specifica solo l'oggetto per inserirlo a prezzo base)\n" +
		"/pubblicaasta - Permette di pubblicare l'asta con i relativi pulsanti (usa anche 'tutte')\n" +
		"/asta - Iscrive ad un'asta\n" +
		'/aste - Mostra tutte le aste disponibili\n' +
		"/cancellaasta - Elimina un'asta in corso", mark)
})

bot.onText(/^\/comandinegozio/, function (message) {
	bot.sendMessage(message.chat.id, '*Comandi disponibili per gestire i negozi*\n' +
		'/negozio - Crea un negozio per la vendita di oggetti\n' +
		"/privacy - Modifica la privacy del negozio da pubblico a privato e vice versa (usa anche 'tutti')\n" +
		"/massivo - Modifica la possibilità di acquistare in modo massivo dal negozio (usa anche 'tutti')\n" +
		"/protetto - Modifica la possibilità di acquistare dal negozio (usa anche 'tutti')\n" +
		"/autocancella - Modifica la possibilità di cancellare automaticamente il negozio quando svuotato (usa anche 'tutti')\n" +
		"/negoziodesc - Imposta o modifica la descrizione del negozio specificato (usa anche 'tutti')\n" +
		'/negozioa - Permette di aggiungere oggetti al negozio\n' +
		'/negozior - Permette di rimuovere oggetti dal negozio\n' +
		'/negoziom - Permette di modificare oggetti inseriti nel negozio\n' +
		'/negoziou - Permette di prolungare la scadenza del negozio\n' +
		'/negozioref - Permette di aggiornare le quantità di tutti gli oggetti di un negozio (usa anche +/-/max, tutti/privati/pubblici)\n' +
		'/negozi - Mostra tutti i propri negozi disponibili\n' +
		'/cancellanegozio - Elimina il negozio', mark)
})

bot.onText(/^\/comandicommercio/, function (message) {
	bot.sendMessage(message.chat.id, '*Comandi disponibili per commerciare*\n' +
		'/offri - Crea una vendita riservata verso un altro giocatore\n' +
		'/accettav - Accetta una vendita riservata\n' +
		'/rifiutav - Rifiuta una vendita riservata\n' +
		'/scambia - Crea uno scambio riservato verso un altro giocatore\n' +
		'/accettas - Accetta lo scambio riservato\n' +
		'/rifiutas - Rifiuta lo scambio riservato\n' +
		"/paga - Invia monete ad un altro giocatore (usa anche 'tutto')", mark)
})

bot.onText(/^\/comanditeam/, function (message) {
	bot.sendMessage(message.chat.id, '*Comandi disponibili per i team*\n' +
		'/chiamaparty - Invia un messaggio taggando tutti i membri del proprio party (escluso il chiamante) anche in privato\n' +
		'/chiamaparty<numero> - Invia un messaggio taggando tutti i membri del party <numero> anche in privato (solo per amministratori)\n' +
		'/votaparty - Invia un messaggio taggando solo i membri del proprio party che devono ancora votare anche in privato\n' +
		'/votaparty<numero> - Invia un messaggio taggando tutti i membri del party <numero> che devono ancora votare anche in privato (solo per amministratori)\n' +
		"/incremento - Invia un messaggio taggando solo i membri del proprio team che devono ancora attivare l'incremento nell'assalto anche in privato\n" +
		'/chiedoaiuto - Invia un messaggio taggando solo i membri non in dungeon disponibili ad uno scambio nel dungeon\n' +
		'/serveaiuto - Invia un messaggio taggando solo i membri in dungeon disponibili ad uno scambio nel dungeon\n' +
		'/chiamateam - Invia un messaggio taggando tutti i membri del proprio team anche in privato\n' +
		'/statoincarichi - Mostra un riepilogo di tutti gli incarichi in corso\n' +
		'/stanzeteam - Mostra la lista dei compagni di team e la stanza che hanno raggiunto nel dungeon', mark)
})

bot.onText(/^\/comandigenerali/, function (message) {
	bot.sendMessage(message.chat.id, '*Comandi generali*\n' +
		'/ping - Verifica se il bot è online\n' +
		'/statistiche - Mostra le statistiche di Loot Bot\n' +
		'/scuola - Mostra un link per accedere al gruppo scuola\n' +
		'/gruppi - Mostra tutti i gruppi pubblici\n' +
		'/mercatini - Mostra i mercatini degli utenti\n' +
		'/comandigruppo - Mostra i comandi per gestire gli utenti nei gruppi\n' +
		'/token - Permette di ottenere un token per accedere alle Loot Bot API\n' +
		'/notifiche - Permette di disattivare le notifiche di una particolare sezione del bot\n' +
		'/calcola - Gestisce calcoli anche avanzati utilizzando funzioni (in inglese)\n' +
		'/suggerimenti comandi - Visualizza la lista dei comandi disponibili per effettuare suggerimenti\n' +
		"/online - Visualzza i giocatori che hanno inviato un comando nell'ultimo minuto", mark)
})

bot.onText(/^\/online/, function (message, match) {
	connection.query('SELECT COUNT(*) As active FROM last_command WHERE TIMESTAMPDIFF(SECOND, time, NOW()) <= 60', function (err, rows, fields) {
		if (err) throw err
		const act_minute = rows[0].active

		const d = new Date()
		const long_date = addZero(d.getDate()) + '/' + addZero(d.getMonth() + 1) + '/' + d.getFullYear()
		bot.sendMessage(message.chat.id, '*👥 Loot players (LIVE)*\nOre ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ' del ' + long_date + '\n*' + act_minute + '* giocatori online ora', mark)
	})
})

bot.onText(/^\/calcola (.+)|^\/calcola/, async function (message, match) {
	if (match[1] == undefined) {
		bot.sendMessage(message.chat.id, 'Inserisci un operazione da risolvere. Esempio: /calcola 1+2\nGuida: http://mathjs.org/docs/index.html', no_preview)
		return
	}

	/*
	bot.sendMessage(message.chat.id, "Funzione momentaneamente non disponibile");
	return;
	*/

	if (match[1].indexOf('gruzzolo')) {
		const player = await connection.queryAsync('SELECT id, money FROM player WHERE nickname = "' + message.from.username + '"')
		if (Object.keys(player).length == 0) {
			bot.sendMessage(message.chat.id, "Puoi usare la variabile 'gruzzolo' solo se sei registrato al gioco")
			return
		}
		match[1] = match[1].replace('gruzzolo', player[0].money)
	}
	if (match[1].indexOf('scrigni')) {
		const chest = await connection.queryAsync('SELECT SUM(IC.quantity) As cnt FROM inventory_chest IC, player P WHERE P.id = IC.player_id AND P.nickname =  "' + message.from.username + '"')
		if (Object.keys(chest).length == 0) {
			bot.sendMessage(message.chat.id, "Puoi usare la variabile 'scrigni' solo se sei registrato al gioco")
			return
		}
		match[1] = match[1].replace('scrigni', chest[0].cnt)
	}
	if (match[1].indexOf('zaino')) {
		const inventory = await connection.queryAsync('SELECT SUM(I.value*IV.quantity) As val FROM item I, inventory IV, player P WHERE P.id = IV.player_id AND I.id = IV.item_id AND P.nickname = "' + message.from.username + '"')
		if (Object.keys(inventory).length == 0) {
			bot.sendMessage(message.chat.id, "Puoi usare la variabile 'zaino' solo se sei registrato al gioco")
			return
		}
		match[1] = match[1].replace('zaino', inventory[0].val)
	}

	const evalValue = match[1]
	if (evalValue.indexOf(':') != -1) {
		bot.sendMessage(message.chat.id, 'Usa / al posto di : per le divisioni')
		return
	}

	try {
		const result = math.evaluate(evalValue)
		bot.sendMessage(message.chat.id, 'Risultato: <code>' + result + '</code>', html)
	} catch (error) {
		bot.sendMessage(message.chat.id, 'Errore: ' + error.message)
		console.error('Errore calcola: ' + error.message)
	}
})

bot.onText(/^\/birra/, function (message) {
	connection.query('SELECT id, market_ban, account_id, money, holiday, birth_date FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const money = rows[0].money
		const birth_date = rows[0].birth_date

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		if (money < 100) {
			bot.sendMessage(message.chat.id, 'Non puoi permetterti nemmeno una birra >_>')
		} else {
			await reduceMoney(player_id, 100);
			if (calculateAge(new Date(birth_date)) < 18) { bot.sendMessage(message.chat.id, '🥛') } else { bot.sendMessage(message.chat.id, '🍺') }
			connection.query('UPDATE config SET food = food+1', function (err, rows, fields) {
				if (err) throw err
			})
		}
	})
})

bot.onText(/^\/pollo/, function (message) {
	bot.sendMessage(message.chat.id, '🐓')
})

bot.onText(/^\/facepalm/, function (message) {
	bot.sendPhoto(message.chat.id, 'https://scifanatic-wpengine.netdna-ssl.com/wp-content/uploads/2017/03/facepalm-head.jpg')
})

bot.onText(/^\/marketban (.+)/, function (message, match) {
	match[1] = match[1].replace('@', '')
	if (message.from.id == 20471035) {
		connection.query('SELECT id, market_ban, nickname, id, account_id FROM player WHERE nickname = "' + match[1] + '"', function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Non ho trovato nessun utente con quel nickname.')
				return
			}

			if (rows[0].market_ban == 0) {
				connection.query('UPDATE player SET market_ban = 1 WHERE id = ' + rows[0].id, function (err, rows, fields) {
					if (err) throw err
				})

				bot.sendMessage(message.chat.id, rows[0].nickname + ' bannato dal mercato.')
			} else {
				connection.query('UPDATE player SET market_ban = 0 WHERE id = ' + rows[0].id, function (err, rows, fields) {
					if (err) throw err
				})

				bot.sendMessage(message.chat.id, rows[0].nickname + ' sbannato dal mercato.')
			}
		})
	};
})

bot.onText(/^\/([0-9]{1,3})birre$/, function (message, match) {
	match[1] = parseInt(match[1])
	if (match[1] < 1) { match[1] = 1 }

	if (message.from.id != 20471035) {
		if (match[1] > 10) {
			bot.sendMessage(message.chat.id, 'nope.')
			return
		}
	}

	connection.query('SELECT id, market_ban, account_id, money, holiday, birth_date FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const money = rows[0].money
		const birth_date = rows[0].birth_date

		let t = ''
		for (let i = 0; i < match[1]; i++) {
			if (calculateAge(new Date(birth_date)) < 18) { t += '🥛' } else { t += '🍺' }
		}

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		if (money < (100 * match[1])) {
			bot.sendMessage(message.chat.id, 'Non puoi permetterti tutte queste birre >_>')
		} else {
			await reduceMoney(player_id, (100 * match[1]));
			bot.sendMessage(message.chat.id, t)

			connection.query('UPDATE config SET food = food+' + match[1], function (err, rows, fields) {
				if (err) throw err
			})
		};
	})
})

bot.onText(/^\/duebirre/, function (message) {
	connection.query('SELECT id, market_ban, account_id, money, holiday, birth_date FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const money = rows[0].money
		const birth_date = rows[0].birth_date

		let t = ''
		if (calculateAge(new Date(birth_date)) < 18) { t += '🥛🥛' } else { t += '🍻' }

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		if (money < 200) {
			bot.sendMessage(message.chat.id, 'Non puoi permetterti nemmeno una birra >_>')
		} else {
			await reduceMoney(player_id, 200);
			bot.sendMessage(message.chat.id, '');
			connection.query('UPDATE config SET food = food+2', function (err, rows, fields) {
				if (err) throw err
			})
		}
	})
})

bot.onText(/^\/popcorn/, function (message) {
	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const money = rows[0].money

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		if (money < 100) {
			bot.sendMessage(message.chat.id, "Il flame potrai godertelo un'altra volta...")
		} else {
			await reduceMoney(player_id, 100);
			bot.sendMessage(message.chat.id, '🍿');
			connection.query('UPDATE config SET food = food+1', function (err, rows, fields) {
				if (err) throw err
			})
		}
	})
})

bot.onText(/\/checkMember (.+) (.+)/i, function (message, match) {
	connection.query('SELECT id FROM player WHERE nickname = "' + match[1] + '"', function (err, rows, fields) {
		if (err) throw err
		const player_id = rows[0].id
		connection.query('SELECT team_id FROM team_player WHERE player_id = ' + player_id, async function (err, rows, fields) {
			if (err) throw err
			await validTeamMember(message, rows[0].team_id, player_id, match[2])
		})
	})
})

async function validTeamMember(message, team_id, player_id, soglia) {
	const rows = await connection.queryAsync('SELECT P.id As player_id, T.kill_num, T.name, P.reborn, P.nickname, FLOOR(P.exp/10) As level FROM team T, team_player TP, player P WHERE T.id = TP.team_id AND TP.player_id = P.id AND T.id = ' + team_id + ' ORDER BY P.reborn, P.exp DESC')

	let mediaTeam = 0
	for (var i = 0, len = Object.keys(rows).length; i < len; i++) { mediaTeam += parseInt(getRealLevel(rows[i].reborn, rows[i].level)) }
	mediaTeam = mediaTeam / Object.keys(rows).length

	let sum = 0
	let lev = 0
	let dev = 0
	let calc = 0
	for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
		lev = getRealLevel(rows[i].reborn, rows[i].level)
		sum += Math.pow(Math.abs(mediaTeam - lev), 2)
	}
	dev = Math.sqrt(sum / Object.keys(rows).length)

	let res = 0
	for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
		if (player_id == rows[i].player_id) {
			lev = getRealLevel(rows[i].reborn, rows[i].level)
			calc = Math.round((lev - mediaTeam) / dev * 100) / 100
			if (isNaN(calc) || (calc < 0)) { calc = 0 }
			if (calc <= soglia) { res = 1 }
		}
	}

	bot.sendMessage(message.chat.id, 'Media team: ' + mediaTeam + '\nDev: ' + dev + '\nRes: ' + res)
};

bot.onText(/^\/ovetto/, function (message) {
	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const money = rows[0].money

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		if (money < 100) {
			bot.sendMessage(message.chat.id, 'Ma che bello cucinare senza comprare le uova :>')
		} else {
			await reduceMoney(player_id, 100);
			bot.sendMessage(message.chat.id, '🍳');
			connection.query('UPDATE config SET food = food+1', function (err, rows, fields) {
				if (err) throw err
			})
		}
	})
})

bot.onText(/^\/salmone/, function (message) {
	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const money = rows[0].money

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		if (money < 100) {
			bot.sendMessage(message.chat.id, 'Nemmeno due spicci per un piccolo salmone :c')
		} else {
			await reduceMoney(player_id, 100);
			bot.sendMessage(message.chat.id, '🐟');
			connection.query('UPDATE config SET food = food+1', function (err, rows, fields) {
				if (err) throw err
			})
		}
	})
})

bot.onText(/^\/caffè/, function (message) {
	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const money = rows[0].money

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		if (money < 100) {
			bot.sendMessage(message.chat.id, 'Il caffè è finito :c')
		} else {
			await reduceMoney(player_id, 100);
			bot.sendMessage(message.chat.id, '☕️');
			connection.query('UPDATE config SET food = food+1', function (err, rows, fields) {
				if (err) throw err
			})
		}
	})
})

bot.onText(/^\/whisky/, function (message) {
	connection.query('SELECT id, market_ban, account_id, money, holiday, birth_date FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const money = rows[0].money
		const birth_date = rows[0].birth_date

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		if (money < 100) {
			bot.sendMessage(message.chat.id, 'Vorresti eh, ubriacone')
		} else {
			await reduceMoney(player_id, 100);
			if (calculateAge(new Date(birth_date)) < 18) { bot.sendMessage(message.chat.id, '🥛') } else { bot.sendMessage(message.chat.id, '🥃') }
			connection.query('UPDATE config SET food = food+1', function (err, rows, fields) {
				if (err) throw err
			})
		}
	})
})

bot.onText(/^\/cibi/, function (message) {
	connection.query('SELECT food FROM config', function (err, rows, fields) {
		if (err) throw err
		bot.sendMessage(message.chat.id, 'Sono stati acquistati ' + formatNumber(rows[0].food) + ' cibi per un totale di ' + formatNumber(rows[0].food * 100) + ' §!')
	})
})

bot.onText(/^\/gban ([^\s]+) (.+)|^\/gban|^\/🍌/, function (message, match) {
	if (message.from.id == 20471035) {
		if (match[1] == undefined) {
			if (message.reply_to_message != undefined) { match[1] = message.reply_to_message.from.username } else {
				bot.sendMessage(message.chat.id, 'Sintassi: /gban nickname motivo (ban dal gioco, anche in risposta)')
				return
			}
		}

		if (match[2] == undefined) {
			match[2] == '...'
		}

		connection.query('SELECT nickname, id, account_id FROM player WHERE nickname = "' + match[1].replace('@', '') + '"', function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Non ho trovato nessun utente con quel nickname.')
				return
			}

			const nick = rows[0].nickname
			const account_id = rows[0].account_id

			connection.query('INSERT INTO banlist (account_id, reason) VALUES (' + rows[0].account_id + ',"' + match[2] + '")', function (err, rows, fields) {
				if (err) throw err
			})

			connection.query('DELETE FROM public_shop WHERE player_id = ' + rows[0].id, function (err, rows, fields) {
				if (err) throw err
			})
			connection.query('UPDATE player SET market_ban = 1, mission_party = 0 WHERE id = ' + rows[0].id, function (err, rows, fields) {
				if (err) throw err
			})
			connection.query('DELETE FROM team_player WHERE player_id = ' + rows[0].id, function (err, rows, fields) {
				if (err) throw err
			})
			connection.query('UPDATE token SET token = NULL, status = "REVOKED" WHERE player_id = ' + rows[0].id, function (err, rows, fields) {
				if (err) throw err
			})
			connection.query('DELETE FROM mission_team_party_player WHERE player_id = ' + rows[0].id, function (err, rows, fields) {
				if (err) throw err
			})

			removeFromAssault(rows[0].id)

			bot.kickChatMember(message.chat.id, account_id).then(function (result) {
				bot.sendMessage(message.chat.id, nick + ' (' + account_id + ') bannato da chat e game.')
			})
		})
	};
})

bot.onText(/^\/gb (.+)|^\/gb$/, function (message, match) {
	if (message.chat.id > 0) { return }

	if (match[1] == undefined) {
		if (message.reply_to_message != undefined) { match[1] = message.reply_to_message.from.username } else {
			bot.sendMessage(message.chat.id, 'Sintassi: /gb nickname (ban dai gruppi)')
			return
		}
	}

	const chat_id = message.chat.id
	if ((chat_id == '-1001069842056') || (chat_id == '-1001064571576') || (chat_id == '-1001050459665') || (chat_id == '-1001064797183') || (chat_id == '-1001097316494')) {
		bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
			if ((data.status == 'creator') || (data.status == 'administrator')) {
				connection.query('SELECT nickname, id, account_id, group_ban FROM player WHERE nickname = "' + match[1].replace('@', '') + '"', function (err, rows, fields) {
					if (err) throw err

					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, 'Non ho trovato nessun utente con quel nickname.')
						return
					}

					const nick = rows[0].nickname
					const account_id = rows[0].account_id

					if (rows[0].group_ban == 0) {
						connection.query('UPDATE player SET group_ban = 1 WHERE id = ' + rows[0].id, function (err, rows, fields) {
							if (err) throw err
						})
						bot.sendMessage(message.chat.id, nick + ' (' + account_id + ') bannato dai gruppi.')

						connection.query('SELECT chat_id FROM plus_groups WHERE groupban = 1', function (err, rows, fields) {
							if (err) throw err

							for (const row of rows) bot.kickChatMember(row.chat_id, account_id)
						})
					} else {
						if (chat_id == '-1001064797183') {
							connection.query('UPDATE player SET group_ban = 0 WHERE id = ' + rows[0].id, function (err, rows, fields) {
								if (err) throw err
							})
							bot.sendMessage(message.chat.id, nick + ' (' + account_id + ') sbannato dai gruppi.')

							connection.query('SELECT chat_id FROM plus_groups WHERE groupban = 1', function (err, rows, fields) {
								if (err) throw err

								for (const row of rows) { bot.unbanChatMember(row.chat_id, account_id) }
							})
						}
					}
				})
			};
		})
	}
})

bot.onText(/^\/det (.+)/, function (message, match) {
	const nick = match[1]

	if (message.from.id == 20471035) {
		connection.query('SELECT * FROM player WHERE nickname = "' + nick + '"', function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length > 0) { bot.sendMessage(message.chat.id, JSON.stringify(rows, null, 4)) } else { bot.sendMessage(message.chat.id, 'Boh!') }
		})
	}
})

bot.onText(/^\/chatid/, function (message, match) {
	bot.sendMessage(message.chat.id, message.chat.id)
})

bot.onText(/^\/last (.+)/, function (message, match) {
	const nick = match[1]

	if (message.from.id == 20471035) {
		connection.query('SELECT time FROM last_command, player WHERE last_command.account_id = player.account_id AND player.nickname = "' + nick + '"', function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length > 0) {
				const d = new Date(rows[0].time)
				const long_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds()) + ' ' + addZero(d.getDate()) + '/' + addZero(d.getMonth() + 1) + '/' + d.getFullYear()
				bot.sendMessage(message.chat.id, long_date)
			} else { bot.sendMessage(message.chat.id, 'Boh!') }
		})
	};
})

bot.onText(/^\/ping/, function (message, match) {
	bot.sendMessage(message.chat.id, '_Pong_', mark)
})

bot.onText(/^\/pinfo (.+)/, function (message, match) {
	if (message.from.id != 20471035) { return }
	connection.query('SELECT * FROM plus_players WHERE nickname = "' + match[1] + '"', function (err, rows, fields) {
		if (err) throw err
		let real_name = '?'
		if (rows[0].real_name != null) { real_name = rows[0].real_name }
		let datetime = '?'
		if (rows[0].birth_date != null) {
			const d = new Date(rows[0].birth_date)
			datetime = addZero(d.getDate()) + '/' + addZero(d.getMonth() + 1) + '/' + d.getFullYear()
		}

		// calcolo creazione account
		// https://github.com/wjclub/telegram-bot-getids/blob/master/ages.json
		// 4 feb 19

		const ages = {
			2768409: 1383264000000,
			7679610: 1388448000000,
			11538514: 1391212000000,
			15835244: 1392940000000,
			23646077: 1393459000000,
			38015510: 1393632000000,
			44634663: 1399334000000,
			46145305: 1400198000000,
			54845238: 1411257000000,
			63263518: 1414454000000,
			101260938: 1425600000000,
			101323197: 1426204000000,
			111220210: 1429574000000,
			103258382: 1432771000000,
			103151531: 1433376000000,
			116812045: 1437696000000,
			122600695: 1437782000000,
			109393468: 1439078000000,
			112594714: 1439683000000,
			124872445: 1439856000000,
			130029930: 1441324000000,
			125828524: 1444003000000,
			133909606: 1444176000000,
			157242073: 1446768000000,
			143445125: 1448928000000,
			148670295: 1452211000000,
			152079341: 1453420000000,
			171295414: 1457481000000,
			181783990: 1460246000000,
			222021233: 1465344000000,
			225034354: 1466208000000,
			278941742: 1473465000000,
			285253072: 1476835000000,
			294851037: 1479600000000,
			297621225: 1481846000000,
			328594461: 1482969000000,
			337808429: 1487707000000,
			341546272: 1487782000000,
			352940995: 1487894000000,
			369669043: 1490918000000,
			400169472: 1501459000000
		}

		const ids = Object.keys(ages)
		const nids = ids.map(e => parseInt(e))

		const minId = nids[0]
		const maxId = nids[nids.length - 1]

		const getDate = (id) => {
			if (id < minId) { return [-1, new Date(ages[ids[0]])] } else if (id > maxId) { return [1, new Date(ages[ids[ids.length - 1]])] } else {
				let lid = nids[0]
				for (let i = 0; i < ids.length; i++) {
					if (id <= nids[i]) {
						const uid = nids[i]
						const lage = ages[lid]
						const uage = ages[uid]

						const idratio = ((id - lid) / (uid - lid))
						const midDate = Math.floor((idratio * (uage - lage)) + lage)
						return [0, new Date(midDate)]
					} else { lid = nids[i] }
				}
			}
		}

		const getAge = (id) => {
			const d = getDate(id)
			return [
				d[0] < 0 ? 'older_than' : d[0] > 0 ? 'newer_than' : 'aprox',
				`${(d[1].getUTCMonth() + 1)}/${d[1].getUTCFullYear()}`
			]
		}

		const res = getAge(rows[0].account_id)

		// fine calcolo creazione account

		bot.sendMessage(message.from.id, '<b>ID Account:</b> ' + rows[0].account_id + '\n<b>Nome utente:</b> ' + rows[0].nickname + '\n<b>Ultimo comando:</b> ' + toDate('it', rows[0].last_update) + '\n<b>Nome:</b> ' + rows[0].real_name + '\n<b>Sesso:</b> ' + rows[0].gender + '\n<b>Data di nascita:</b> ' + datetime + '\n<b>Creazione account:</b> ' + res[0] + ' ' + res[1], html)
	})
})

bot.onText(/^\/info$/, function (message) {
	let reply = ''

	if (message.reply_to_message != undefined) {
		var date = new Date(message.reply_to_message.date * 1000)
		reply = '\n*REPLY TO*\n' +
			'Message ID: ' + message.reply_to_message.message_id + '\n' +
			'User ID: ' + message.reply_to_message.from.id + '\n' +
			'User Name: ' + message.reply_to_message.from.first_name + '\n' +
			'User @: ' + message.reply_to_message.from.username + '\n' +
			'Chat ID: ' + message.reply_to_message.chat.id + '\n' +
			'Chat Name: ' + ((message.reply_to_message.chat.first_name == undefined) ? '???' : message.reply_to_message.chat.first_name) + '\n' +
			'Chat @: ' + ((message.reply_to_message.chat.username == undefined) ? '???' : message.reply_to_message.chat.username) + '\n' +
			'Chat Type: ' + message.reply_to_message.chat.type + '\n' +
			'Date: ' + toDate('it', date) + '\n'

		if (message.reply_to_message.forward_sender_name != undefined) { reply += 'Forward User: ' + message.reply_to_message.forward_sender_name + '\n' }
		if (message.reply_to_message.forward_date != undefined) {
			var date = new Date(message.reply_to_message.forward_date * 1000)
			reply += 'Forward Date: ' + toDate('it', date)
		}
	}

	var date = new Date(message.date * 1000)
	bot.sendMessage(message.chat.id, 'Message ID: ' + message.message_id + '\n' +
		'User ID: ' + message.from.id + '\n' +
		'User Name: ' + message.from.first_name + '\n' +
		'User @: ' + message.from.username + '\n' +
		'Chat ID: ' + message.chat.id + '\n' +
		'Chat Name: ' + ((message.chat.first_name == undefined) ? '???' : message.chat.first_name) + '\n' +
		'Chat @: ' + ((message.chat.username == undefined) ? '???' : message.chat.username) + '\n' +
		'Chat Type: ' + message.chat.type + '\n' +
		'Date: ' + toDate('it', date) + '\n' + reply, mark)
})

bot.onText(/\/printsticker/, function (message) {
	bot.getStickerSet('Rango_v2').then(function (data) {
		console.log(data.stickers)
	})
})

bot.onText(/^\/gruppi/, function (message) {
	bot.getChatMembersCount(-1001069842056).then(function (data) {
		const c1 = data // taverna
		console.log('Next Mercato')

		bot.getChatMembersCount(-1001064571576).then(function (data) {
			const c2 = data // mercato
			console.log('Next Lotteria')

			bot.getChatMembersCount(-1001087936894).then(function (data) {
				const c3 = data // lootteria
				console.log('Next Flame')

				bot.getChatMembersCount(-1001078754923).then(function (data) {
					const c4 = data // flame
					console.log('Next Scuola')

					bot.getChatMembersCount(-1001086845014).then(function (data) {
						const c6 = data // scuola
						console.log('Next Scommesse')

						bot.getChatMembersCount(-1001123874487).then(function (data) {
							const c10 = data // contrabbando
							console.log('Next Raffles')

							bot.getChatMembersCount(-1001131584245).then(function (data) {
								const c11 = data // raffles
								console.log('Next Negozi')

								bot.getChatMembersCount(-1001097316494).then(function (data) {
									const c12 = data // negozi
									console.log('Next Test')

									bot.getChatMembersCount(-1001050459665).then(function (data) {
										const c13 = data // testi
										console.log('Next Gelateria')

										bot.getChatMembersCount(-1001127554674).then(function (data) {
											const c14 = data // gelateria
											console.log('Next Ade')

											bot.getChatMembersCount(-1001167682606).then(function (data) {
												const c17 = data // music
												console.log('Next Nabbi')

												if (message.chat.id < 0) { bot.sendMessage(message.chat.id, '_Messaggio inviato in privato_', mark) }

												bot.sendMessage(message.from.id, '<b>Ufficiali</b>\n' +
													'Canale principale per aggiornamenti: @LootBotAvvisi\n' +

													'\n<b>Bot</b>\n' +
													'Liste oggetti e alberi automatici: @craftlootbot\n' +
													'Qualcuno sempre a disposizione: @OracoloLootBot\n' +
													'Calcolo Loot Combat Rating: @lootcrbot\n' +
													'Tool per mercato e cronologie: @ToolsForLootBot\n' +
													'Quotazioni oggetti in tempo reale: @Loot_Quotes_Bot\n' +
													'Tastiera per inviare facilmente i comandi del plus: @LootPlusKeyboardBot\n' +

													'\n<b>Altro</b>\n' +
													"<a href='https://telegra.ph/Guida-alle-LootBot-API-04-06'>LootBot Api v2</a>\n" +

													'\n<b>Gruppi</b>\n' +
													"<a href='https://telegram.me/joinchat/AThc-z_EfojvcE8mbGw1Cw'>Taverna</a> (" + c1 + ") - Di tutto un po'\n" +
													"<a href='https://telegram.me/joinchat/AThc-z90Erh4M2O8Mk5QLw'>Mercato</a> (" + c2 + ') - Solo scambi!\n' +
													"<a href='https://telegram.me/joinchat/AThc-z6cvhH-w2JWq9Ioew'>Testi Missioni</a> (" + c13 + ') - Proponi testi!\n' +
													"<a href='https://telegram.me/joinchat/AThc-0FnuI5vlb4Hm53W_w'>Negozi</a> (" + c12 + ') - Solo i vostri negozi!\n' +
													"<a href='https://t.me/joinchat/Dl2UwEDYmX6z5jf7vHhG9Q'>Lootteria</a> (" + c3 + ') - Riservato alle Lotterie\n' +
													"<a href='https://t.me/joinchat/AVqFykBMfmvrULAUQv-MmQ'>Loot Flame</a> (" + c4 + ') - Nessun filtro, solo flame\n' +
													"<a href='https://t.me/joinchat/EXFobEDH8FaawvMWE7p-Jg'>LootBot School</a> (" + c6 + ') - Impara le basi del gioco per iniziare con una marcia in più!\n' +
													"<a href='https://t.me/joinchat/DOs98UL89rdYL_PFGukbJw'>Vicolo del Contrabbando</a> (" + c10 + ') - Chiedi aiuto per le richieste del contrabbandiere!\n' +
													"<a href='https://t.me/joinchat/AAAAAEM1HnIQeWI32RwzXw'>Gelateria</a> (" + c14 + ') - Gruppo OT con tanto di gelato (Livello minimo: 10)\n' +
													"<a href='https://t.me/joinchat/I-b0dhM-eO3tmxrz9rtMrg'>Gruppo Scommesse 2</a> Gruppo ignorante dove arriverai a giocarti la casa a dadi e il cagnolino a testa o croce\n" +
													"<a href='https://t.me/joinchat/EDP-JUWZbC6SZ-f0ieaoLg'>Loot Music</a> (" + c17 + ') - La musica ed il diverimento di Lootia!\n' +

													'\n<b>Canali</b>\n' +
													'@Suggerimenti_per_LootBot - Gruppo dove i suggerimenti vengono postati e votati dagli utenti\n' +
													'@LaBachecaDiLootia - Bacheca degli annunci per gli avventurieri di Lootia\n' +

													"\nVisita anche /mercatini. Per comparire qua chiedi all'amministratore.", html)
											})
										})
									})
								})
							})
						})
					})
				})
			})
		})
	})
})

bot.onText(/^\/mercatini/, function (message) {
	if (message.chat.id < 0) { bot.sendMessage(message.chat.id, '_Messaggio inviato in privato_', mark) }

	bot.sendMessage(message.from.id, '<b>Valutazione Mercatini</b>\n@lootadvisor\n\n' +
		'<b>Mercatini</b>\n' +
		'@LEMPORIOdiLootbot - Il primo negozio di Loot!\n' +
		'@ilvenditoreoscuro -  Il viandante più economico di Lootia!\n' +
		'@ildracomante - Craftati del Contrabbandiere e divertenti giochi a premi\n' +

		"\nVisita anche /gruppi. Per comparire qua chiedi all'amministratore.", html)
})

bot.onText(/^\/chiamaparty( .+)?$/, function (message, match) {
	if (!checkSpam(message)) { return }

	if (message.chat.id > 0) {
		bot.sendMessage(message.from.id, 'Questo comando può essere usato solo nei gruppi')
		return
	}

	connection.query('SELECT team_id, party_id, player_id FROM mission_team_party_player WHERE player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.from.id, 'Non sei in team o in un party')
			return
		}

		const party_id = rows[0].party_id
		const team_id = rows[0].team_id
		const player_id = rows[0].player_id

		connection.query('SELECT wait, assigned_to FROM mission_team_party WHERE party_id = ' + party_id + ' AND team_id = ' + team_id, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				console.log('Errore party')
				return
			}

			connection.query('SELECT P.nickname, P.chat_id FROM mission_team_party_player T, player P WHERE T.player_id = P.id AND T.party_id = ' + party_id + ' AND T.team_id = ' + team_id + ' AND P.id != ' + player_id, function (err, rows, fields) {
				if (err) throw err

				let nicklist = ''

				for (i = 0; i < Object.keys(rows).length; i++) {
					nicklist += '@' + rows[i].nickname + ' '
					bot.sendMessage(rows[i].chat_id, '<b>' + message.from.username + '</b> del tuo party ti sta chiamando a rapporto!', html)
				}

				bot.sendMessage(message.chat.id, '<b>' + message.from.username + '</b> chiama i suoi compagni di party!\n' + nicklist, html)
			})
		})
	})
})

bot.onText(/^\/chiamateam$/, function (message, match) {
	if (!checkSpam(message)) { return }

	if (message.chat.id > 0) {
		bot.sendMessage(message.from.id, 'Questo comando può essere usato solo nei gruppi')
		return
	}

	connection.query('SELECT team_id, player_id FROM team_player WHERE player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.from.id, 'Non sei in team')
			return
		}

		const team_id = rows[0].team_id
		const player_id = rows[0].player_id

		connection.query('SELECT P.nickname, P.chat_id FROM team_player T, player P WHERE T.player_id = P.id AND T.team_id = ' + team_id + ' AND P.id != ' + player_id, function (err, rows, fields) {
			if (err) throw err

			let nicklist = ''

			for (i = 0; i < Object.keys(rows).length; i++) {
				nicklist += '@' + rows[i].nickname + ' '
				bot.sendMessage(rows[i].chat_id, '<b>' + message.from.username + '</b> del tuo team ti chiama a rapporto!', html)
			}

			bot.sendMessage(message.chat.id, '<b>' + message.from.username + '</b> chiama i suoi compagni di team!\n' + nicklist, html)
		})
	})
})

bot.onText(/^\/stanzeteam/, function (message, match) {
	if (!checkSpam(message)) { return }

	connection.query('SELECT team_id, player_id FROM team_player WHERE player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.from.id, 'Non sei in team')
			return
		}

		const team_id = rows[0].team_id
		const player_id = rows[0].player_id

		connection.query('SELECT P.nickname, D.room_id, L.rooms, P.rank, D.pass, L.cursed FROM team_player T, player P, dungeon_status D, dungeon_list L WHERE P.id = D.player_id AND D.dungeon_id = L.id AND T.player_id = P.id AND T.team_id = ' + team_id + ' ORDER BY rank DESC', function (err, rows, fields) {
			if (err) throw err

			let nicklist = ''

			if (Object.keys(rows).length > 0) {
				let pass = ''
				let cursed = ''
				let rooms = ''
				for (i = 0; i < Object.keys(rows).length; i++) {
					pass = ''
					if (rows[i].pass > 0) { pass = ' (Pass usato)' }
					cursed = ''
					if (rows[i].cursed == 1) { cursed = ' 🧨' }
					rooms = rows[i].room_id + '/' + rows[i].rooms
					if (rows[i].room_id > rows[i].rooms) { rooms = '(Boss)' }
					nicklist += '> ' + rows[i].nickname + ': ' + rooms + cursed + ', Rango ' + formatNumber(rows[i].rank) + pass + '\n'
				}
			} else { nicklist = 'Nessun compagno in dungeon' }

			bot.sendMessage(message.chat.id, 'Compagni di team in dungeon:\n' + nicklist, html)
		})
	})
})

bot.onText(/^\/chiamaparty([0-9]+)( .+)?$/, function (message, match) {
	if (!checkSpam(message)) { return }

	if (message.chat.id > 0) {
		bot.sendMessage(message.from.id, 'Questo comando può essere usato solo nei gruppi')
		return
	}

	const party_id = parseInt(match[1])

	if ((isNaN(party_id)) || (party_id < 1)) {
		bot.sendMessage(message.from.id, 'Numero party non valido')
		return
	}

	connection.query('SELECT team_id, role FROM team_player WHERE player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.from.id, 'Non sei in team')
			return
		}

		const role = rows[0].role
		const team_id = rows[0].team_id
		let sym = ''

		if (rows[0].role == 0) {
			bot.sendMessage(message.from.id, "Solo l'amministratore o il vice possono utilizzare questa funzione")
			return
		} else if (rows[0].role == 1) { sym = ' 👑' } else if (rows[0].role == 2) { sym = ' 🔰' }

		connection.query('SELECT 1 FROM mission_team_party WHERE party_id = ' + party_id + ' AND team_id = ' + team_id, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				console.log('Il numero del party inserito non esiste')
				return
			}

			connection.query('SELECT P.nickname, P.chat_id FROM mission_team_party_player T, player P WHERE T.player_id = P.id AND T.party_id = ' + party_id + ' AND T.team_id = ' + team_id, function (err, rows, fields) {
				if (err) throw err

				let nicklist = ''

				for (i = 0; i < Object.keys(rows).length; i++) {
					nicklist += '@' + rows[i].nickname + ' '
					bot.sendMessage(rows[i].chat_id, '<b>' + message.from.username + '</b> del tuo party ti sta chiamando a rapporto!', html)
				}

				bot.sendMessage(message.chat.id, '<b>' + message.from.username + '</b>' + sym + ' chiama i componenti del party ' + party_id + '!\n' + nicklist, html)
			})
		})
	})
})

bot.onText(/^\/votaparty$/, function (message, match) {
	if (!checkSpam(message)) { return }

	if (message.chat.id > 0) {
		bot.sendMessage(message.from.id, 'Questo comando può essere usato solo nei gruppi')
		return
	}

	connection.query('SELECT team_id, party_id, player_id FROM mission_team_party_player WHERE player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.from.id, "Puoi usare questo comando solo se sei all'interno di un team e di un party!")
			return
		}

		const party_id = rows[0].party_id
		const team_id = rows[0].team_id
		const player_id = rows[0].player_id

		connection.query('SELECT part_id, wait, assigned_to FROM mission_team_party WHERE party_id = ' + party_id + ' AND team_id = ' + team_id, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				console.log('Errore party')
				return
			}

			if ((rows[0].part_id == 0) && (rows[0].wait == 0)) {
				bot.sendMessage(message.chat.id, 'Puoi usare questo comando solo se il party non è in attesa!')
				return
			}

			connection.query('SELECT P.nickname, P.chat_id FROM mission_team_party_player T, player P WHERE T.player_id = P.id AND T.party_id = ' + party_id + ' AND T.team_id = ' + team_id + ' AND P.id != ' + player_id + ' AND answ_id = 0', function (err, rows, fields) {
				if (err) throw err

				let nicklist = ''

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non manca nessun compagno!')
					return
				}

				for (i = 0; i < Object.keys(rows).length; i++) {
					nicklist += '@' + rows[i].nickname + ' '
					bot.sendMessage(rows[i].chat_id, '<b>' + message.from.username + "</b> ti incita a votare per l'incarico!", html)
				}

				bot.sendMessage(message.chat.id, '<b>' + message.from.username + '</b> incita i suoi compagni del Party ' + party_id + ' a votare!\n' + nicklist, html)
			})
		})
	})
})

bot.onText(/^\/votaparty([0-9])( .+)?/, function (message, match) {
	if (!checkSpam(message)) { return }

	if (message.chat.id > 0) {
		bot.sendMessage(message.from.id, 'Questo comando può essere usato solo nei gruppi')
		return
	}

	const party_id = parseInt(match[1])

	if ((isNaN(party_id)) || (party_id < 1)) {
		bot.sendMessage(message.from.id, 'Numero party non valido')
		return
	}

	connection.query('SELECT player_id, team_id, role FROM team_player WHERE player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.from.id, 'Non sei in team')
			return
		}

		const role = rows[0].role
		const team_id = rows[0].team_id
		const sym = ''

		if (rows[0].role == 0) {
			bot.sendMessage(message.from.id, "Solo l'amministratore o il vice possono utilizzare questa funzione")
			return
		}

		connection.query('SELECT part_id, wait, assigned_to FROM mission_team_party WHERE party_id = ' + party_id + ' AND team_id = ' + team_id, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				console.log('Il numero del party inserito non esiste')
				return
			}

			if ((rows[0].part_id == 0) && (rows[0].wait == 0)) {
				bot.sendMessage(message.chat.id, 'Puoi usare questo comando solo se il party non è in attesa!')
				return
			}

			connection.query('SELECT P.nickname, P.chat_id FROM mission_team_party_player T, player P WHERE T.player_id = P.id AND T.party_id = ' + party_id + ' AND T.team_id = ' + team_id + ' AND answ_id = 0', function (err, rows, fields) {
				if (err) throw err

				let nicklist = ''

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non manca nessun compagno!')
					return
				}

				for (i = 0; i < Object.keys(rows).length; i++) {
					nicklist += '@' + rows[i].nickname + ' '
					bot.sendMessage(rows[i].chat_id, '<b>' + message.from.username + "</b> ti incita a votare per l'incarico!", html)
				}

				bot.sendMessage(message.chat.id, '<b>' + message.from.username + '</b> incita il Party ' + party_id + ' a votare!\n' + nicklist, html)
			})
		})
	})
})

bot.onText(/^\/incremento$/, function (message, match) {
	if (!checkSpam(message)) { return }

	if (message.chat.id > 0) {
		bot.sendMessage(message.from.id, 'Questo comando può essere usato solo nei gruppi')
		return
	}

	connection.query('SELECT player_id, team_id FROM team_player WHERE player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.from.id, "Puoi usare questo comando solo se sei all'interno di un team!")
			return
		}

		const team_id = rows[0].team_id
		const player_id = rows[0].player_id

		connection.query('SELECT phase FROM assault WHERE team_id = ' + team_id, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, 'Puoi usare questo comando solo se hai avviato un Assalto!')
				return
			}

			if (rows[0].phase != 2) {
				bot.sendMessage(message.from.id, "Puoi usare questo comando solo durante il Giorno dell'Assalto!")
				return
			}

			connection.query('SELECT P.nickname, P.chat_id FROM assault_place_player_id A LEFT JOIN assault_place_miniboost M ON A.player_id = M.player_id, player P WHERE A.player_id = P.id AND M.player_id IS NULL AND P.id != ' + player_id + ' AND A.team_id = ' + team_id, function (err, rows, fields) {
				if (err) throw err

				let nicklist = ''
				let nicklist2 = ''

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non manca nessun compagno!')
					return
				}

				for (i = 0; i < Object.keys(rows).length; i++) { bot.sendMessage(rows[i].chat_id, '<b>' + message.from.username + "</b> ti incita ad attivare l'incremento nell'assalto!", html) }

				if (Object.keys(rows).length < 5) {
					for (i = 0; i < Object.keys(rows).length; i++) { nicklist += '@' + rows[i].nickname + ' ' }
				} else {
					for (i = 0; i < 5; i++) { nicklist += '@' + rows[i].nickname + ' ' }
					for (i = 5; i < Object.keys(rows).length; i++) { nicklist2 += '@' + rows[i].nickname + ' ' }
				}

				bot.sendMessage(message.chat.id, '<b>' + message.from.username + "</b> incita i suoi compagni di team ad attivare l'incremento!\n" + nicklist, html)
				if (nicklist2 != '') { bot.sendMessage(message.chat.id, nicklist2, html) }
			})
		})
	})
})

bot.onText(/^\/chiedoaiuto/, function (message, match) {
	if (!checkSpam(message)) { return }

	if (message.chat.id > 0) {
		bot.sendMessage(message.from.id, 'Questo comando può essere usato solo nei gruppi')
		return
	}

	connection.query('SELECT player_id, team_id FROM team_player WHERE player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.from.id, "Puoi usare questo comando solo se sei all'interno di un team!")
			return
		}

		const team_id = rows[0].team_id
		const player_id = rows[0].player_id

		connection.query('SELECT name, room_id, rooms, finish_date, finish_time, pass FROM dungeon_status, dungeon_list WHERE dungeon_status.dungeon_id = dungeon_list.id AND player_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, "Puoi usare questo comando solo se sei all'interno di un dungeon!")
				return
			}

			const dungeon_name = rows[0].name
			const dungeon_room = rows[0].room_id
			const dungeon_tot_room = rows[0].rooms
			const dungeon_finish_date = new Date(rows[0].finish_date)
			const instance_finish_time = new Date(rows[0].finish_time)
			let finish_date = new Date()

			if (rows[0].pass != 0) {
				bot.sendMessage(message.from.id, 'Puoi usare questo comando solo se il dungeon non è già stato passato!')
				return
			}

			if (dungeon_finish_date.getTime() < instance_finish_time.getTime()) { finish_date = dungeon_finish_date } else { finish_date = instance_finish_time }

			finish_date = toDate('it', finish_date)

			connection.query('SELECT nickname, reborn, rank FROM player WHERE id = ' + player_id, function (err, rows, fields) {
				if (err) throw err

				const reborn = rows[0].reborn
				const rank = rows[0].rank

				connection.query('SELECT P.nickname, P.reborn, P.rank FROM team_player T LEFT JOIN dungeon_status D ON T.player_id = D.player_id, player P WHERE T.player_id = P.id AND D.player_id IS NULL AND P.reborn != 1 AND P.id != ' + player_id + ' AND T.team_id = ' + team_id + ' ORDER BY reborn ASC', function (err, rows, fields) {
					if (err) throw err

					let nicklist = ''

					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, 'Nessun compagno disponibile!')
						return
					}

					for (i = 0; i < Object.keys(rows).length; i++) { nicklist += '> @' + rows[i].nickname + ' (R' + (rows[i].reborn - 1) + ', Rango ' + formatNumber(rows[i].rank) + ')\n' }

					bot.sendMessage(message.chat.id, '<b>' + message.from.username + '</b> (R' + (reborn - 1) + ', Rango ' + formatNumber(rank) + '), in esplorazione del dungeon ' + dungeon_name + ' stanza ' + dungeon_room + '/' + dungeon_tot_room + ' (crollerà il ' + finish_date + ') chiede aiuto ai suoi compagni di team:\n' + nicklist, html)
				})
			})
		})
	})
})

bot.onText(/^\/serveaiuto/, function (message, match) {
	if (!checkSpam(message)) { return }

	if (message.chat.id > 0) {
		bot.sendMessage(message.from.id, 'Questo comando può essere usato solo nei gruppi')
		return
	}

	connection.query('SELECT player_id, team_id FROM team_player WHERE player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.from.id, "Puoi usare questo comando solo se sei all'interno di un team!")
			return
		}

		const team_id = rows[0].team_id
		const player_id = rows[0].player_id

		connection.query('SELECT name, room_id, rooms, finish_date, finish_time FROM dungeon_status, dungeon_list WHERE dungeon_status.dungeon_id = dungeon_list.id AND player_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length > 0) {
				bot.sendMessage(message.from.id, "Puoi usare questo comando solo se non sei all'interno di un dungeon!")
				return
			}

			connection.query('SELECT nickname, reborn, rank FROM player WHERE id = ' + player_id, function (err, rows, fields) {
				if (err) throw err

				const reborn = rows[0].reborn
				const rank = rows[0].rank

				connection.query('SELECT P.nickname, P.reborn, P.rank FROM team_player T LEFT JOIN dungeon_status D ON T.player_id = D.player_id, player P WHERE T.player_id = P.id AND D.player_id IS NOT NULL AND P.reborn != 1 AND P.id != ' + player_id + ' AND T.team_id = ' + team_id + ' AND D.pass = 0 ORDER BY reborn ASC', function (err, rows, fields) {
					if (err) throw err

					let nicklist = ''

					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, 'Nessun compagno disponibile!')
						return
					}

					for (i = 0; i < Object.keys(rows).length; i++) { nicklist += '> @' + rows[i].nickname + ' (R' + (rows[i].reborn - 1) + ', Rango ' + formatNumber(rows[i].rank) + ')\n' }

					bot.sendMessage(message.chat.id, '<b>' + message.from.username + '</b> (R' + (reborn - 1) + ', Rango ' + formatNumber(rank) + ') offre aiuto ai suoi compagni di team:\n' + nicklist, html)
				})
			})
		})
	})
})

bot.onText(/^\/cid/, function (message) {
	bot.sendMessage(message.chat.id, message.chat.id)
})

bot.onText(/^\/token/, function (message) {
	if (message.chat.id < 0) {
		bot.sendMessage(message.chat.id, 'Puoi usare questo comando solo in privato', mark)
		return
	}

	connection.query('SELECT id, account_id, exp, reborn FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const lev = Math.floor(rows[0].exp / 10)
		const reborn = rows[0].reborn

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if ((lev < 50) && (reborn == 1)) {
			bot.sendMessage(message.chat.id, 'Raggiungi almeno il livello 50 per richiedere il token', mark)
			return
		}

		connection.query('SELECT token FROM token WHERE player_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err

			let token = 'Non ancora richiesto'
			if (Object.keys(rows).length > 0) {
				token = rows[0].token
				if (token == null) { token = 'Revocato' }
			}

			const iKeys = []
			iKeys.push([{
				text: 'Richiedi/Rinnova',
				callback_data: 'token_new'
			}])
			iKeys.push([{
				text: 'Revoca',
				callback_data: 'token_del'
			}])

			bot.sendMessage(message.chat.id, 'Richiedi il token per utilizzare le Api, in caso di utilizzo non consono, verrai bannato dal gioco. Tienitelo per te!\nToken attuale: <code>' + token + '</code>\n\nGuida: http://telegra.ph/Guida-alle-LootBot-API-04-06\nSwagger: https://app.swaggerhub.com/apis-docs/LucaDevelop/LootBotAPI/\nWrapper Python: https://pypi.org/project/LootBotApi/', {
				parse_mode: 'HTML',
				disable_web_page_preview: true,
				reply_markup: {
					inline_keyboard: iKeys
				}
			})
		})
	})
})

bot.onText(/^\/comandigruppo/, function (message) {
	bot.sendMessage(message.chat.id, 'Questi comandi sono utilizzabili solo dagli amministratori, visualizza un riepilogo con /riassunto\n\n' +
		'*Benvenuto*\n' +
		'/setwelcome testo - Imposta il testo di benvenuto, usa \\n per andare a capo (massimo 1024 caratteri)\n' +
		'/welcome on-off - Abilita o disabilita il messaggio di benvenuto\n' +
		'\n*Variabili disponibili*:\n' +
		'#giocatore# - #livello# - #rinascita# - #iscritto# - #drago#\n' +
		'Esempio: Benvenuto #giocatore#!\n\n' +
		'*Filtro livello*\n' +
		'/setmin livello - Imposta il livello minimo\n' +
		'/setmax livello - Imposta il livello massimo\n' +
		'/level on-off - Abilita o disabilita il filtro livello\n' +
		'Per specificare la rinascita incrementare il livello di 100, 250 o 450 a seconda della rinascita\n\n' +
		'*Filtro bannato*\n' +
		'/kickbanned on-off - Abilita o disabilita il filtro bannato\n\n' +
		'*Filtro non iscritto*\n' +
		'/kickreg on-off - Abilita o disabilita il filtro non iscritto\n\n' +
		'*Filtro ban dai gruppi*\n' +
		'/groupban on-off - Abilita o disabilita il filtro group ban\n\n' +
		'*Filtro foto/documenti postati nei gruppi*\n' +
		'/photodocs on-off - Abilita o disabilita il filtro foto/documenti per livello < 50\n\n' +
		'*Compattatore messaggi (beta)*\n' +
		'/compact on-off - Abilita o disabilita il compattamento automatico dei messaggi\n\n' +
		'*Attiva i filtri per ogni messaggio*\n' +
		'/hardmode on-off - Abilita o disabilita il controllo filtri per ogni messaggio\n' +
		'\n\n_Altri comandi a breve_', mark)
})

bot.onText(/^\/riassunto/, function (message, match) {
	if (message.chat.id > 0) { return }

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == 'creator') || (data.status == 'administrator')) {
			connection.query('SELECT * FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length > 0) {
					let welcome_text = rows[0].welcome_text
					if (welcome_text == null) {
						welcome_text = 'Non impostato'
					}
					const welcome = (rows[0].welcome) ? '✅' : '❌'
					const level = (rows[0].level) ? '✅' : '❌'
					const min_lev = rows[0].min_lev
					const max_lev = rows[0].max_lev
					const kickban = (rows[0].kickban) ? '✅' : '❌'
					const kickreg = (rows[0].kickreg) ? '✅' : '❌'
					const always = (rows[0].always) ? '✅' : '❌'
					const groupban = (rows[0].groupban) ? '✅' : '❌'
					const photodocs = (rows[0].photodocs) ? '✅' : '❌'
					const compact = (rows[0].compact) ? '✅' : '❌'

					bot.sendMessage(message.chat.id, '<b>Impostazioni gruppo:</b>\n' +
						'Messaggio di benvenuto: ' + welcome_text + '\n' +
						'Benvenuto: ' + welcome + '\n' +
						'Filtro livello: ' + level + ' (' + min_lev + '-' + max_lev + ')\n' +
						'Filtro bannato: ' + kickban + '\n' +
						'Filtro non registrato: ' + kickreg + '\n' +
						'Group ban automatico: ' + groupban + '\n' +
						'Filtro foto/documenti: ' + photodocs + '\n' +
						'Compattatore: ' + compact + '\n' +
						'Hard mode: ' + always + '\n', html)
				} else {
					bot.sendMessage(message.chat.id, "Il gruppo non è memorizzato nel plus, contatta l'amministratore")
				}
			})
		};
	})
})

bot.onText(/^\/setmin (.+)/, function (message, match) {
	if (message.chat.id > 0) { return }

	if (isNaN(parseInt(match[1]))) {
		bot.sendMessage(message.chat.id, 'Valore non valido')
		return
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == 'creator') || (data.status == 'administrator')) {
			const text = parseInt(match[1])
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Errore impostazione livello')
				} else {
					connection.query('UPDATE plus_groups SET min_lev = ' + text + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Livello minimo impostato correttamente, ricordati di abilitarlo con /level on')
					})
				}
			})
		}
	})
})

bot.onText(/^\/setmax (.+)/, function (message, match) {
	if (message.chat.id > 0) { return }

	if (isNaN(parseInt(match[1]))) {
		bot.sendMessage(message.chat.id, 'Valore non valido')
		return
	}

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == 'creator') || (data.status == 'administrator')) {
			const text = parseInt(match[1])
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Errore impostazione livello')
				} else {
					connection.query('UPDATE plus_groups SET max_lev = ' + text + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Livello massimo impostato correttamente, ricordati di abilitarlo con /level on')
					})
				}
			})
		}
	})
})

bot.onText(/^\/level (.+)/, function (message, match) {
	if (message.chat.id > 0) { return }

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == 'creator') || (data.status == 'administrator')) {
			const text = match[1]
			connection.query('SELECT min_lev, max_lev FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Errore impostazione livello')
				} else {
					if ((text == 'on') || (text == 'off')) {
						let val = 0
						if (text == 'on') {
							bot.sendMessage(message.chat.id, 'Filtro livello abilitato: MIN ' + rows[0].min_lev + ', MAX ' + rows[0].max_lev + '\nRicorda di impostare il bot come amministratore')
							val = 1
						} else {
							bot.sendMessage(message.chat.id, 'Filtro livello disabilitato')
							val = 0
						}
						connection.query('UPDATE plus_groups SET level = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err
						})
					} else {
						bot.sendMessage(message.chat.id, 'Parametro non valido, on/off.')
					}
				}
			})
		}
	})
})

bot.onText(/^\/kickbanned (.+)/, function (message, match) {
	if (message.chat.id > 0) { return }

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == 'creator') || (data.status == 'administrator')) {
			const text = match[1]
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Errore impostazione kick bannato')
				} else {
					if ((text == 'on') || (text == 'off')) {
						let val = 0
						if (text == 'on') {
							bot.sendMessage(message.chat.id, 'Filtro bannato abilitato\nRicorda di impostare il bot come amministratore')
							val = 1
						} else {
							bot.sendMessage(message.chat.id, 'Filtro bannato disabilitato')
							val = 0
						}
						connection.query('UPDATE plus_groups SET kickban = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err
						})
					} else {
						bot.sendMessage(message.chat.id, 'Parametro non valido, on/off.')
					}
				}
			})
		}
	})
})

bot.onText(/^\/kickreg (.+)/, function (message, match) {
	if (message.chat.id > 0) { return }

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == 'creator') || (data.status == 'administrator')) {
			const text = match[1]
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Errore impostazione kick non iscritto')
				} else {
					if ((text == 'on') || (text == 'off')) {
						let val = 0
						if (text == 'on') {
							bot.sendMessage(message.chat.id, 'Filtro non iscritto abilitato\nRicorda di impostare il bot come amministratore')
							val = 1
						} else {
							bot.sendMessage(message.chat.id, 'Filtro non iscritto disabilitato')
							val = 0
						}
						connection.query('UPDATE plus_groups SET kickreg = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err
						})
					} else {
						bot.sendMessage(message.chat.id, 'Parametro non valido, on/off.')
					}
				}
			})
		}
	})
})

bot.onText(/^\/groupban (.+)/, function (message, match) {
	if (message.chat.id > 0) { return }

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == 'creator') || (data.status == 'administrator')) {
			const text = match[1]
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Errore impostazione group ban')
				} else {
					if ((text == 'on') || (text == 'off')) {
						let val = 0
						if (text == 'on') {
							bot.sendMessage(message.chat.id, 'Filtro group ban abilitato\nRicorda di impostare il bot come amministratore')
							val = 1
						} else {
							bot.sendMessage(message.chat.id, 'Filtro group ban disabilitato')
							val = 0
						}
						connection.query('UPDATE plus_groups SET groupban = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err
						})
					} else {
						bot.sendMessage(message.chat.id, 'Parametro non valido, on/off.')
					}
				}
			})
		}
	})
})

bot.onText(/^\/photodocs (.+)/, function (message, match) {
	if (message.chat.id > 0) { return }

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == 'creator') || (data.status == 'administrator')) {
			const text = match[1]
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Errore impostazione filtro foto/documenti')
				} else {
					if ((text == 'on') || (text == 'off')) {
						let val = 0
						if (text == 'on') {
							bot.sendMessage(message.chat.id, "Filtro foto/documenti abilitato, ricorda di attivare l'/hardmode!")
							val = 1
						} else {
							bot.sendMessage(message.chat.id, 'Filtro foto/documenti disabilitato')
							val = 0
						}
						connection.query('UPDATE plus_groups SET photodocs = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err
						})
					} else {
						bot.sendMessage(message.chat.id, 'Parametro non valido, on/off.')
					}
				}
			})
		}
	})
})

bot.onText(/^\/compact (.+)/, function (message, match) {
	if (message.chat.id > 0) { return }

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == 'creator') || (data.status == 'administrator')) {
			const text = match[1]
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Errore impostazione compattatore')
				} else {
					if ((text == 'on') || (text == 'off')) {
						let val = 0
						if (text == 'on') {
							bot.sendMessage(message.chat.id, 'Compattatore abilitato\nRicorda di impostare il bot come amministratore')
							val = 1
						} else {
							bot.sendMessage(message.chat.id, 'Compattatore disabilitato')
							val = 0
						}
						connection.query('UPDATE plus_groups SET compact = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err
						})
					} else {
						bot.sendMessage(message.chat.id, 'Parametro non valido, on/off.')
					}
				}
			})
		}
	})
})

bot.onText(/^\/hardmode (.+)/, function (message, match) {
	if (message.chat.id > 0) { return }

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == 'creator') || (data.status == 'administrator')) {
			const text = match[1]
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Errore impostazione hard mode')
				} else {
					if ((text == 'on') || (text == 'off')) {
						let val = 0
						if (text == 'on') {
							bot.sendMessage(message.chat.id, 'Filtro controllo intensivo abilitato\nRicorda di impostare il bot come amministratore')
							val = 1
						} else {
							bot.sendMessage(message.chat.id, 'Filtro controllo intensivo disabilitato')
							val = 0
						}
						connection.query('UPDATE plus_groups SET always = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err
						})
					} else { bot.sendMessage(message.chat.id, 'Parametro non valido, on/off.') }
				}
			})
		}
	})
})

bot.onText(/^\/setwelcome (.+)/, function (message, match) {
	if (message.chat.id > 0) { return }

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == 'creator') || (data.status == 'administrator')) {
			const text = match[1]
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Errore impostazione benvenuto')
				} else {
					connection.query('UPDATE plus_groups SET welcome_text = "' + text + '" WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Messaggio di benvenuto impostato correttamente, ricordati di abilitarlo con /welcome on')
					})
				}
			})
		}
	})
})

bot.onText(/^\/welcome (.+)/, function (message, match) {
	if (message.chat.id > 0) { return }

	bot.getChatMember(message.chat.id, message.from.id).then(function (data) {
		if ((data.status == 'creator') || (data.status == 'administrator')) {
			const text = match[1]
			connection.query('SELECT 1 FROM plus_groups WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Errore impostazione benvenuto')
				} else {
					if ((text == 'on') || (text == 'off')) {
						let val = 0
						if (text == 'on') {
							bot.sendMessage(message.chat.id, 'Messaggio di benvenuto abilitato')
							val = 1
						} else {
							bot.sendMessage(message.chat.id, 'Messaggio di benvenuto disabilitato')
							val = 0
						}
						connection.query('UPDATE plus_groups SET welcome = ' + val + ' WHERE chat_id = ' + message.chat.id, function (err, rows, fields) {
							if (err) throw err
						})
					} else { bot.sendMessage(message.chat.id, 'Parametro non valido, on/off.') }
				}
			})
		}
	})
})

bot.onText(/^\/calcteamall/i, function (message, match) {
	if (message.from.id != 20471035) { return }
	connection.query('SELECT id FROM team WHERE players > 1', function (err, rows, fields) {
		if (err) throw err
		for (let j = 0, len = Object.keys(rows).length; j < len; j++) {
			connection.query('SELECT team.name, player.reborn, player.nickname, FLOOR(player.exp/10) As level FROM team, team_player, player WHERE team.id = team_player.team_id AND team_player.player_id = player.id AND team.id = ' + rows[j].id + ' ORDER BY player.reborn, player.exp DESC', function (err, rows, fields) {
				if (err) throw err
				let mediaTeam = 0
				for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
					mediaTeam += parseInt(getRealLevel(rows[i].reborn, rows[i].level))
				}
				mediaTeam = mediaTeam / Object.keys(rows).length

				let sup = 0
				let sum = 0
				let lev = 0
				let dev = 0
				let calc = 0
				let text = rows[0].name + ': '
				for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
					lev = getRealLevel(rows[i].reborn, rows[i].level)
					sum += Math.pow(Math.abs(mediaTeam - lev), 2)
				}
				dev = Math.sqrt(sum / Object.keys(rows).length)

				for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
					lev = getRealLevel(rows[i].reborn, rows[i].level)
					calc = Math.round((lev - mediaTeam) / dev * 100) / 100
					if (isNaN(calc) || (calc < 0)) { calc = 0 }
					if (calc > 2.9) {
						text += rows[i].nickname + ' (' + lev + ', ' + calc + ')\n'
						sup++
					}
				}

				if (sup > 0) { bot.sendMessage(message.chat.id, text, html) }
			})
		};
	})
})

bot.onText(/^\/calcteam (.+)/i, function (message, match) {
	if (message.from.id != 20471035) { return }
	connection.query('SELECT team.name, player.reborn, player.nickname, FLOOR(player.exp/10) As level FROM team, team_player, player WHERE team.id = team_player.team_id AND team_player.player_id = player.id AND team.name = "' + match[1] + '" ORDER BY player.reborn, player.exp DESC', function (err, rows, fields) {
		if (err) throw err
		let mediaTeam = 0
		for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
			mediaTeam += parseInt(getRealLevel(rows[i].reborn, rows[i].level))
		}
		mediaTeam = mediaTeam / Object.keys(rows).length

		let sup = 0
		let sum = 0
		let lev = 0
		let dev = 0
		let calc = 0
		let text = rows[0].name + ' (' + Math.round(mediaTeam) + '):\n\n'
		for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
			lev = getRealLevel(rows[i].reborn, rows[i].level)
			sum += Math.pow(Math.abs(mediaTeam - lev), 2)
		}
		dev = Math.sqrt(sum / Object.keys(rows).length)

		for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
			lev = getRealLevel(rows[i].reborn, rows[i].level)
			calc = Math.round((lev - mediaTeam) / dev * 100) / 100
			if (isNaN(calc) || (calc < 0)) { calc = 0 }
			if (calc > 2.9) {
				text += rows[i].nickname + ' (' + lev + ', ' + calc + ')\n'
				sup++
			} else {
				text += rows[i].nickname + ' (' + lev + ', ' + calc + ')\n'
			}
		}
		text += '\nNon validi: ' + sup + '/' + Object.keys(rows).length
		text += '\nDeviazione: ' + Math.round(dev)

		bot.sendMessage(message.chat.id, text, html)
	})
})

bot.onText(/^\/contrabb (.+)/i, function (message, match) {
	if (message.from.id != 20471035) { return }
	connection.query('SELECT id, base_sum, price_sum, name, value FROM item WHERE name = "' + match[1] + '"', function (err, rows, fields) {
		if (err) throw err
		const val = parseInt(rows[0].base_sum)
		const price_sum = parseInt(rows[0].price_sum)

		let price = val + price_sum// + rows[0].value;
		const mid = price
		price = price * (1.5 + (Math.random() * 0.5))

		bot.sendMessage(message.chat.id, 'Somma base: ' + formatNumber(val) + ' + ' + 'Somma costi: ' + formatNumber(price_sum) + '\n= ' + formatNumber(mid) + '\n * random(1.5-2.0)\n= ' + formatNumber(Math.round(price)))
	})
})

bot.onText(/^\/rimod ([^\s]+) ([^\s]+) ([^\s]+)/i, function (message, match) {
	// attuale - richiesto - costo

	const att = match[1]
	const rich = match[2]
	const cost = match[3]

	let spent = 0; let ret = 0; let x = 0; let xr = 0; let y = 0
	for (i = 0; i < rich; i++) {
		if (i == att) { spent = xr }
		y = x
		ret = funz(x) * cost
		x += ret
		xr += Math.round(ret)
	}

	const res = xr - spent
	const unit = Math.round(x - y)
	bot.sendMessage(message.chat.id, 'Punti: ' + formatNumber(res) + ' (' + formatNumber(unit) + ')\n' +
		'Exp: ' + formatNumber(res * 30) + ' (' + formatNumber(unit * 30) + ')\n' +
		'Monete: ' + formatNumber(res * 1000000) + ' (' + formatNumber(unit * 1000000) + ')')
})

bot.onText(/^\/dai (.+)/i, function (message, match) {
	if ((message.from.id == 20471035) || (message.from.id == 114304603)) {
		const split = match[1].split(',')
		let options = { parse_mode: 'Markdown' }
		if (message.reply_to_message != undefined) { options = { parse_mode: 'Markdown', reply_to_message_id: message.reply_to_message.message_id } }

		bot.sendMessage(message.chat.id, '*' + split[0] + '*, hai ricevuto 1x *' + split[1] + '*!', options)
	}
})

bot.onText(/^\/reset/i, function (message, match) {
	if ((message.from.id == 20471035) || (message.from.id == 114304603)) {
		if (message.reply_to_message != undefined) {
			bot.sendMessage(message.chat.id, '*' + message.reply_to_message.from.username + '*, il tuo account è stato completamente *resettato*, riavvia il bot per creare un nuovo account!', { parse_mode: 'Markdown', reply_to_message_id: message.reply_to_message.message_id })
		}
	}
})

bot.onText(/^\/msg (.+)/i, function (message, match) {
	if ((message.from.id == 20471035) || (message.from.id == 114304603)) {
		let options = { parse_mode: 'Markdown' }
		if (message.reply_to_message != undefined) { options = { parse_mode: 'Markdown', reply_to_message_id: message.reply_to_message.message_id } }

		bot.sendMessage(message.chat.id, match[1], options)
	}
})

bot.onText(/^\/rune (.+)/i, function (message, match) {
	if (match[1].indexOf(',') == -1) { return }

	const split = match[1].split(',')

	const my_comb = split[0].trim()
	const combi = split[1].trim()

	// da qua

	let num = []
	let end = ''
	let end_num = 0

	let final1 = 0
	let final2 = 0
	let final_n1 = ''
	let final_n2 = ''
	let couple1 = 0
	let couple2 = 0

	let dcouple1 = 0
	let dcouple2 = 0
	let dcouple1b = 0
	let dcouple2b = 0
	const dcoupled1 = 0
	const dcoupled2 = 0
	let dcoupleSolo1 = 0
	let dcoupleSolo2 = 0
	let coupSolo1 = 0
	let coupSolo2 = 0

	let triple1 = 0
	let triple2 = 0
	let triple_a1 = 0
	let triple_a2 = 0
	let triple_b1 = 0
	let triple_b2 = 0
	let triple_d1 = 0
	let triple_d2 = 0

	let full1_d = 0
	let full1_t = 0
	let full1 = 0
	let full2 = 0
	let quad1 = 0
	let quad2 = 0
	let dquad1 = 0
	let dquad2 = 0
	let penta1 = 0
	let penta2 = 0
	let scalef1 = 0
	let scalef2 = 0
	let scales1 = 0
	let scales2 = 0

	for (i = 0; i < 2; i++) {
		if (i == 0) { num = my_comb.split('') } else { num = combi.split('') }
		num.sort()

		end = ''
		end_num = 0

		// Cinque di un tipo
		if ((num[0] == num[1]) && (num[1] == num[2]) && (num[2] == num[3]) && (num[3] == num[4])) {
			end = 'Cinque di un tipo'
			end_num = 8
		}

		if ((i == 0) && (end_num == 8)) { penta1 = num[0] } else { penta2 = num[0] }

		if (end_num == 0) {
			// Quattro di un tipo
			let dquad = 0
			if ((num[0] == num[1]) && (num[1] == num[2]) && (num[2] == num[3])) {
				end = 'Quattro di un tipo'
				end_num = 7
				dquad = num[4]
			}
			if ((num[1] == num[2]) && (num[2] == num[3]) && (num[3] == num[4])) {
				end = 'Quattro di un tipo'
				end_num = 7
				dquad = num[0]
			}

			if ((i == 0) && (end_num == 7)) {
				quad1 = num[1]
				dquad1 = dquad
			} else {
				quad2 = num[1]
				dquad2 = dquad
			}
		}

		if (end_num == 0) {
			// Scala di 6
			if ((num[0] == 2) && (num[1] == 3) && (num[2] == 4) && (num[3] == 5) && (num[4] == 6)) {
				end = 'Scala di 6'
				end_num = 6
			}

			if ((i == 0) && (end_num == 6)) { scales1 = num[0] } else { scales2 = num[0] }
		}

		if (end_num == 0) {
			// Scala di 5
			if ((num[0] == 1) && (num[1] == 2) && (num[2] == 3) && (num[3] == 4) && (num[4] == 5)) {
				end = 'Scala di 5'
				end_num = 5
			}

			if ((i == 0) && (end_num == 5)) { scalef1 = num[0] } else { scalef2 = num[0] }
		}

		if (end_num == 0) {
			// Full House
			let full = 0
			let fullDouble = 0
			let fullTris = 0
			const array_full = []

			if ((num[0] == num[1]) && (num[1] == num[2])) {
				full++
				fullTris = num[0]
				array_full.push(num[3])
				array_full.push(num[4])
			} else if ((num[1] == num[2]) && (num[2] == num[3])) {
				full++
				fullTris = num[1]
				array_full.push(num[0])
				array_full.push(num[4])
			} else if ((num[2] == num[3]) && (num[3] == num[4])) {
				full++
				fullTris = num[2]
				array_full.push(num[0])
				array_full.push(num[1])
			}

			if (full == 1) {
				if (array_full[0] == array_full[1]) {
					full++
					fullDouble = array_full[0]
				}

				if (fullDouble != fullTris) {
					if (full == 2) {
						end = 'Full'
						end_num = 4
					}
					if ((i == 0) && (end_num == 4)) {
						full1_d = fullDouble
						full1_t = fullTris
					} else {
						if (fullTris == full1_t) {
							full2 = fullDouble
							full1 = full1_d
						} else {
							full2 = fullTris
							full1 = full1_t
						}
					}
				}
			}
		}

		if (end_num == 0) {
			// Tre di un tipo
			let triple = 0
			const triple_d = 0
			if ((num[0] == num[1]) && (num[1] == num[2])) {
				end = 'Tre di un tipo'
				end_num = 3
				triple = num[0]

				if (i == 0) {
					triple_a1 = num[3]
					triple_a2 = num[4]
				} else {
					triple_b1 = num[3]
					triple_b2 = num[4]
				}
			}
			if ((num[1] == num[2]) && (num[2] == num[3])) {
				end = 'Tre di un tipo'
				end_num = 3
				triple = num[1]

				if (i == 0) {
					triple_a1 = num[0]
					triple_a2 = num[4]
				} else {
					triple_b1 = num[0]
					triple_b2 = num[4]
				}
			}
			if ((num[2] == num[3]) && (num[3] == num[4])) {
				end = 'Tre di un tipo'
				end_num = 3
				triple = num[2]

				if (i == 0) {
					triple_a1 = num[0]
					triple_a2 = num[1]
				} else {
					triple_b1 = num[0]
					triple_b2 = num[1]
				}
			}

			if ((i == 0) && (end_num == 3)) { triple1 = triple } else {
				triple2 = triple

				if (triple_a2 == triple_b2) {
					if (triple_a1 >= triple_b1) {
						triple_d1 = triple_a1
						triple_d2 = 0
					} else {
						triple_d1 = 0
						triple_d2 = triple_b1
					}
				} else {
					if (triple_a2 >= triple_b2) {
						triple_d1 = triple_a2
						triple_d2 = 0
					} else {
						triple_d1 = 0
						triple_d2 = triple_b2
					}
				}
			}
		}

		if (end_num == 0) {
			// Doppia Coppia
			let double = 0
			let doubleN = 0
			let doubleN2 = 0
			if (num[0] == num[1]) {
				double++
				doubleN = num[0]
			}
			if (num[1] == num[2]) {
				double++
				if (double == 2) { doubleN2 = doubleN }
				if (num[1] > doubleN) { doubleN = num[1] }
			}
			if (num[2] == num[3]) {
				double++
				if (double == 2) { doubleN2 = doubleN }
				if (num[2] > doubleN) { doubleN = num[2] }
			}
			if (num[3] == num[4]) {
				double++
				if (double == 2) { doubleN2 = doubleN }
				if (num[3] > doubleN) { doubleN = num[3] }
			}
			if (double == 2) {
				end = 'Doppia Coppia'
				end_num = 2
			}

			let checkN = 0

			if ((i == 0) && (end_num == 2)) {
				dcouple1 = doubleN
				dcouple1b = doubleN2

				for (k = 0; k < 5; k++) {
					checkN = 0
					for (j = 0; j < 5; j++) {
						if (num[k] == num[j]) { checkN++ }
					}
					if (checkN == 1) { dcoupleSolo1 = num[k] }
				}
			} else {
				dcouple2 = doubleN
				dcouple2b = doubleN2

				for (k = 0; k < 5; k++) {
					checkN = 0
					for (j = 0; j < 5; j++) {
						if (num[k] == num[j]) { checkN++ }
					}
					if (checkN == 1) { dcoupleSolo2 = num[k] }
				}
			}
		}

		if (end_num == 0) {
			// Coppia
			let coup = 0
			if (num[0] == num[1]) {
				end = 'Coppia'
				end_num = 1
				coup = num[0]

				var others = [num[2], num[3], num[4]]
				if (i == 0) { coupSolo1 = others } else { coupSolo2 = others }
			}
			if (num[1] == num[2]) {
				end = 'Coppia'
				end_num = 1
				coup = num[1]

				var others = [num[0], num[3], num[4]]
				if (i == 0) { coupSolo1 = others } else { coupSolo2 = others }
			}
			if (num[2] == num[3]) {
				end = 'Coppia'
				end_num = 1
				coup = num[2]

				var others = [num[0], num[1], num[4]]
				if (i == 0) { coupSolo1 = others } else { coupSolo2 = others }
			}
			if (num[3] == num[4]) {
				end = 'Coppia'
				end_num = 1
				coup = num[3]

				var others = [num[0], num[1], num[2]]
				if (i == 0) { coupSolo1 = others } else { coupSolo2 = others }
			}

			if ((i == 0) && (end_num == 1)) { couple1 = coup } else { couple2 = coup }
		}

		if (i == 0) {
			final1 = end_num
			final_n1 = end
		} else {
			final2 = end_num
			final_n2 = end
		}
	}

	const text = 'Punti 1: ' + final1 + ' (' + final_n1 + ')\nPunti 2: ' + final2 + ' (' + final_n2 + ')'
	console.log(text)

	if ((final1 == 1) && (final2 == 1)) { // Coppia
		if (couple1 == couple2) {
			for (k = 0; k < coupSolo1.length; k++) {
				if (coupSolo1[k] != coupSolo2[k]) {
					if (coupSolo1[k] > coupSolo2[k]) { final1++ } else { final2++ }
				}
			}
		} else if (couple1 > couple2) { final1++ } else { final2++ }
	}
	if ((final1 == 2) && (final2 == 2)) { // Doppia Coppia
		if (dcouple1 > dcouple2) { final1++ } else if (dcouple1 == dcouple2) {
			if (dcouple1b > dcouple2b) { final1++ } else if (dcouple1b == dcouple2b) {
				if (dcoupleSolo1 > dcoupleSolo2) { final1++ } else { final2++ }
			} else { final2++ }
		} else { final2++ }
	}
	if ((final1 == 3) && (final2 == 3)) { // Tris
		if (triple1 == triple2) {
			if (triple_d1 > triple_d2) { final1++ } else { final2++ }
		} else {
			if (triple1 > triple2) { final1++ } else { final2++ }
		}
	}
	if ((final1 == 4) && (final2 == 4)) { // Full
		if (full1 > full2) { final1++ } else { final2++ }
	}
	if ((final1 == 5) && (final2 == 5)) { // Scala 5
		if (scalef1 > scalef2) { final1++ } else { final2++ }
	}
	if ((final1 == 6) && (final2 == 6)) { // Scala 6
		if (scales1 > scales2) { final1++ } else { final2++ }
	}
	if ((final1 == 7) && (final2 == 7)) { // Quattro uguali
		if (quad1 > quad2) { final1++ } else {
			if (quad1 == quad2) {
				if (dquad1 > dquad2) { final1++ } else { final2++ }
			} else { final2++ }
		}
	}
	if ((final1 == 8) && (final2 == 8)) { // Cinque uguali
		if (penta1 > penta2) { final1++ } else { final2++ }
	}

	if ((final1 == 0) && (final2 == 0)) {
		const n1 = my_comb.split('').sort().join('')
		const n2 = combi.split('').sort().join('')
		if (n2 > n1) { final2++ } else { final1++ }
	}

	if (final1 > final2) { bot.sendMessage(message.chat.id, text + '\nVince 1 (' + final1 + ', ' + final2 + ')') } else { bot.sendMessage(message.chat.id, text + '\nVince 2 (' + final1 + ', ' + final2 + ')') }
})

bot.onText(/^\/iscritto ([\w,\-\s]+)|^\/iscritto/i, async function (message, match) {
	let nick = match[1]
	if ((nick == undefined) || (nick == '')) { nick = message.from.username }

	if (message.reply_to_message != undefined) {
		if (message.reply_to_message.text != undefined) {
			if (message.reply_to_message.text.indexOf('@') != -1) { nick = message.reply_to_message.text } else { nick = message.reply_to_message.from.username }
		}
	}

	nick = nick.toString().replaceAll(/@/, '')
	nick = nick.toString().replaceAll(/\s/, ',')
	nick = nick.toString().replaceAll(/\-/, ',')

	let nicknames = []
	if (nick.indexOf(',') != -1) { nicknames = nick.split(',') } else { nicknames[0] = nick }

	let text = ''
	for (let i = 0, len = nicknames.length; i < len; i++) {
		nicknames[i] = nicknames[i].trim()
		if (nicknames[i] == '') { continue }
		const rows = await connection.queryAsync('SELECT market_ban, account_id FROM player WHERE nickname = "' + escape(nicknames[i]) + '"')
		if (Object.keys(rows).length == 0) { text += nicknames[i] + ': 👎\n' } else {
			const banReason = await isBanned(rows[0].account_id)
			if (banReason != null) { text += nicknames[i] + ': 🚫\n' } else {
				if (rows[0].market_ban == 0) { text += nicknames[i] + ': 👍\n' } else { text += nicknames[i] + ': ❌\n' }
			}
		}
	}

	bot.sendMessage(message.chat.id, text, html)
})

bot.onText(/^\/cancellalotteria/, async function (message) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		connection.query('SELECT id, item_id, price, time_end FROM public_lottery WHERE creator_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length > 0) {
				const lottery_id = rows[0].id
				const item_id = rows[0].item_id
				const price = rows[0].price
				const time_end = new Date(rows[0].time_end)

				const time_creation = time_end.setHours(time_end.getHours() - 48)
				const now = new Date()
				let diff = Math.round(((now - time_creation) / 1000) / 60)

				diff = Math.abs(diff)

				if (diff > 15) {
					bot.sendMessage(message.chat.id, 'Puoi annullare la lotteria solo entro 15 minuti dopo averla creata')
					return
				}

				connection.query('SELECT player_id FROM public_lottery_players WHERE lottery_id = ' + lottery_id, async function (err, rows, fields) {
					if (err) throw err

					for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
						await addMoney(rows[i].player_id, price);
					};

					connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
						if (err) throw err
						connection.query('DELETE FROM public_lottery WHERE id = ' + lottery_id, async function (err, rows, fields) {
							if (err) throw err
							await addItem(player_id, item_id)
							bot.sendMessage(message.chat.id, 'Hai annullato la lotteria in corso')
							console.log('Lotteria terminata manualmente')
						})
					})
				})
			} else {
				bot.sendMessage(message.chat.id, 'Non stai gestendo nessuna lotteria')
			}
		})
	})
})

bot.onText(/^\/creaasta(?!p) ([^\s]+),(.+)|^\/creaasta(?!p) (.+)|^\/creaasta(?!p)$/, async function (message, match) {
	if ((message.chat.id == '-1001069842056') || (message.chat.id == '-1001064571576')) {
		bot.sendMessage(message.chat.id, 'Non possono essere create aste in questo gruppo')
		return
	}

	let prezzo = parseInt(match[1])
	let oggetto = match[2]
	if (match[3] == undefined) {
		if ((oggetto == undefined) || (oggetto == '') || (prezzo == undefined) || (prezzo == 0) || (isNaN(prezzo))) {
			bot.sendMessage(message.chat.id, "Per inserire un'asta utilizza la seguente sintassi: /creaasta prezzo, oggetto\nL'oggetto viene rimosso dall'inventario appena creata l'asta")
			return
		}
		prezzo = prezzo.toString().replaceAll(/\./, '')
	} else {
		const item = await connection.queryAsync("SELECT value FROM item WHERE name = '" + escape(match[3]) + "'")
		if (Object.keys(item).length == 0) {
			console.log('Non trovato: ' + match[3])
			bot.sendMessage(message.chat.id, "L'oggetto specificato non esiste")
			return
		}
		prezzo = item[0].value
		oggetto = match[3]
	}

	oggetto = oggetto.trim()

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		connection.query('SELECT 1 FROM auction_list WHERE creator_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length > 0) {
				bot.sendMessage(message.chat.id, "Puoi gestire solo un'asta alla volta")
				return
			}

			connection.query('SELECT 1 FROM auction_list WHERE chat_id = -1001069842056', function (err, rows, fields) {
				if (err) throw err
				if ((Object.keys(rows).length > 0) && (message.chat.id == -1001069842056)) {
					bot.sendMessage(message.chat.id, "In questo gruppo può esistere solamente un'asta alla volta")
					return
				}

				connection.query('SELECT item.allow_sell, item.id, item.value FROM inventory, item WHERE inventory.item_id = item.id AND item.name = "' + oggetto + '" AND inventory.player_id = ' + player_id + ' AND inventory.quantity > 0', function (err, rows, fields) {
					if (err) throw err
					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, "Devi possedere l'oggetto per creare un'asta")
						return
					}

					if (rows[0].allow_sell == 0) {
						bot.sendMessage(message.chat.id, "Questo oggetto non può essere messo all'asta")
						return
					}

					const maxPrice = rows[0].value * 100
					const minPrice = Math.round(rows[0].value / 100)
					if ((prezzo > parseInt(maxPrice)) || (prezzo < minPrice)) {
						bot.sendMessage(message.chat.id, 'Il prezzo inserito non è valido, max: ' + maxPrice + ', min: ' + minPrice)
						return
					}

					const item_id = rows[0].id
					delItem(player_id, item_id, 1)

					const d = new Date()
					const start_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())
					d.setMinutes(d.getMinutes() + 180)
					const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

					connection.query('INSERT INTO auction_list (chat_id, creator_id, item_id, last_price, time_end, time_start) VALUES (' + message.chat.id + ',' + player_id + ',' + item_id + ',' + prezzo + ',"' + long_date + '","' + start_date + '")', function (err, rows, fields) {
						if (err) throw err

						connection.query('SELECT id FROM auction_list WHERE creator_id = ' + player_id, function (err, rows, fields) {
							if (err) throw err

							const id = rows[0].id
							const iKeys = []
							iKeys.push([{
								text: '♻️ Aggiorna',
								callback_data: 'asta:' + id + ':' + 'update'
							}])
							iKeys.push([{
								text: '+1k',
								callback_data: 'asta:' + id + ':' + '1000'
							}])
							iKeys.push([{
								text: '+10k',
								callback_data: 'asta:' + id + ':' + '10000'
							}])
							iKeys.push([{
								text: '+100k',
								callback_data: 'asta:' + id + ':' + '100000'
							}])

							bot.sendMessage(message.chat.id, '<b>Asta per ' + oggetto + '</b>\n\n<b>Offerta</b>: ' + formatNumber(prezzo) + ' §\n\nAppena pubblicata, scade tra 1 ora, ogni offerta consente 15 min per rilanciare.', {
								parse_mode: 'HTML',
								reply_markup: {
									inline_keyboard: iKeys
								}
							})
						})
					})
				})
			})
		})
	})
})

bot.onText(/^\/pubblicaasta (.+)|^\/pubblicaasta/, function (message, match) {
	let nick = ''
	if (match[1] == undefined) { nick = message.from.username } else { nick = match[1] }

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		let query = 'SELECT auction_list.id, last_price, holiday, creator_id, last_player, item_id, time_end, nickname, market_ban FROM auction_list, player WHERE player.id = auction_list.creator_id AND auction_list.creator_id = (SELECT id FROM player WHERE nickname = "' + nick + '")'
		if (nick == 'tutte') { query = 'SELECT auction_list.id, last_price, holiday, creator_id, last_player, item_id, time_end, nickname, market_ban FROM auction_list, player WHERE player.id = auction_list.creator_id LIMIT 5' }

		connection.query(query, async function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				if (nick == message.from.username) { bot.sendMessage(message.chat.id, 'Non hai aperto nessuna asta') } else if (nick == 'tutte') { bot.sendMessage(message.chat.id, "Non c'è nessuna asta aperta") } else { bot.sendMessage(message.chat.id, "L'utente non ha aperto nessuna asta") }
				return
			}

			let creator_nickname = ''
			let last_player = 0
			let last_player_nickname = ''
			let last_price = 0
			let itemName = ''

			let d = new Date()
			let long_date = ''
			let short_date = ''

			var id = 0

			for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
				if (rows[i].market_ban == 1) {
					if (nickname != 'tutte') { bot.sendMessage(message.chat.id, "L'utente è bannato dal mercato", mark) }
					continue
				}

				creator_nickname = rows[i].nickname
				last_player = rows[i].last_player
				last_player_nickname = ''
				last_price = rows[i].last_price
				itemName = ''

				d = new Date(rows[i].time_end)
				long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())
				short_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

				var id = rows[i].id

				item = await connection.queryAsync('SELECT name FROM item WHERE id = ' + rows[i].item_id)
				itemName = item[0].name
				player = await connection.queryAsync('SELECT nickname FROM player WHERE id = ' + last_player)
				if (Object.keys(player).length == 0) { last_player_nickname = '-' } else { last_player_nickname = player[0].nickname }

				const iKeys = []
				iKeys.push([{
					text: '♻️ Aggiorna',
					callback_data: 'asta:' + id + ':' + 'update'
				}])
				iKeys.push([{
					text: '+1k',
					callback_data: 'asta:' + id + ':' + '1000'
				}])
				iKeys.push([{
					text: '+10k',
					callback_data: 'asta:' + id + ':' + '10000'
				}])
				iKeys.push([{
					text: '+100k',
					callback_data: 'asta:' + id + ':' + '100000'
				}])

				const text = '<b>Asta per ' + itemName + '</b>\n\n<b>Creatore</b>: ' + creator_nickname + '\n<b>Offerta</b>: ' + formatNumber(last_price) + ' §\n<b>Offerente:</b> ' + last_player_nickname + '\n<b>Scade alle:</b> ' + short_date

				bot.sendMessage(message.chat.id, text, {
					parse_mode: 'HTML',
					reply_markup: {
						inline_keyboard: iKeys
					}
				})
			}
		})
	})
})

bot.onText(/^\/cancellaasta/, async function (message) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err
		const player_id = rows[0].id

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		connection.query('SELECT id, item_id, last_price, last_player, time_start FROM auction_list WHERE creator_id = ' + player_id, async function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length > 0) {
				const auction_id = rows[0].id
				const item_id = rows[0].item_id
				const last_price = rows[0].last_price
				const last_player = rows[0].last_player
				const time_start = new Date(rows[0].time_start)

				const now = new Date()
				let diff = Math.round(((now - time_start) / 1000) / 60)

				diff = Math.abs(diff)

				if (diff > 5) {
					bot.sendMessage(message.chat.id, "Puoi annullare l'asta solo entro 5 minuti dopo averla creata")
					return
				}

				await addMoney(last_player, last_price);
				connection.query('DELETE FROM auction_list WHERE id = ' + auction_id, async function (err, rows, fields) {
					if (err) throw err
					await addItem(player_id, item_id)
					bot.sendMessage(message.chat.id, "Hai annullato l'asta in corso")
					console.log('Asta terminata manualmente')
				});
			} else {
				bot.sendMessage(message.chat.id, 'Non stai gestendo nessuna asta')
			}
		})
	})
})

bot.onText(/^\/asta(?!p) ([^\s]+) (.+)|^\/asta(?!p)/, async function (message, match) {
	if ((message.chat.id == '-1001069842056') || (message.chat.id == '-1001064571576')) {
		bot.sendMessage(message.chat.id, 'Non puoi partecipare alle aste in questo gruppo')
		return
	}

	let prezzo = parseInt(match[1])
	let nickname = match[2]
	if ((nickname == undefined) || (nickname == '') || (prezzo == undefined) || (isNaN(prezzo))) {
		bot.sendMessage(message.chat.id, "Per partecipare ad un asta utilizza la seguente sintassi: '/asta Prezzo, @nickname', mentre /creaasta per iniziarne una nuova")
		return
	}

	prezzo = prezzo.toString().replaceAll(/\./, '')
	nickname = nickname.replace('@', '')

	if (isNaN(prezzo)) {
		bot.sendMessage(message.chat.id, 'Il prezzo inserito non è valido, riprova')
		return
	}

	connection.query('SELECT id, money, account_id, market_ban FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const money = rows[0].money

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		connection.query('SELECT id FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Il nickname che hai inserito non esiste, riprova')
				return
			}

			const creator_id = rows[0].id
			connection.query('SELECT id, last_price, item_id, time_end, last_player FROM auction_list WHERE creator_id = ' + creator_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Il nickname che hai inserito non è associato a nessuna asta, riprova')
					return
				}

				const last_price = rows[0].last_price
				const auction_id = rows[0].id
				const last_player = rows[0].last_player
				const itemId = rows[0].item_id

				if (money < prezzo) {
					bot.sendMessage(message.chat.id, 'Non hai abbastanza credito per rialzare di ' + prezzo + ' §')
					return
				}

				if (prezzo <= last_price) {
					bot.sendMessage(message.chat.id, "L'offerta attuale è " + formatNumber(last_price) + ' §, rialza.')
					return
				}

				if (player_id == creator_id) {
					bot.sendMessage(message.chat.id, 'Non puoi rialzare la tua asta!')
					return
				}

				connection.query('SELECT name FROM item WHERE id = ' + itemId, function (err, rows, fields) {
					if (err) throw err
					const itemName = rows[0].name

					connection.query('SELECT account_id FROM player WHERE id = ' + last_player, async function (err, rows, fields) {
						if (err) throw err
						if (Object.keys(rows).length > 0) {
							const account_id = rows[0].account_id
							await addMoney(last_player, last_price);
							connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + last_player + ' AND type = 2', function (err, rows, fields) {
								if (err) throw err
								let notify = 0
								if (Object.keys(rows).length == 0) { notify = 1 } else {
									if (rows[0].deny == 0) { notify = 1 }
								}
								if (notify == 1) {
									bot.sendMessage(account_id, "Sei stato superato nell'asta di " + nickname + ' per ' + itemName + ', dove *' + message.from.username + '* ha offerto *' + formatNumber(last_price) + '* §', mark)
								};
							})
						}
					})

					const d = new Date()
					d.setMinutes(d.getMinutes() + 15)
					const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

					connection.query('UPDATE auction_list SET time_end = "' + long_date + '", last_price = ' + prezzo + ', last_player = ' + player_id + ' WHERE id = ' + auction_id, async function (err, rows, fields) {
						if (err) throw err
						await reduceMoney(player_id, prezzo);
						bot.sendMessage(message.chat.id, message.from.username + ', hai offerto <b>' + prezzo + '</b> § per ' + itemName, html);
					})
				})
			})
		})
	})
})

bot.onText(/^\/negozi$/, function (message, match) {
	if (!checkSpam(message)) { return }

	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		let text = 'I tuoi negozi:\n\n'

		connection.query('SELECT item.name, public_shop.public, public_shop.code, public_shop.price, public_shop.time_end, public_shop.quantity, public_shop.massive, public_shop.protected, public_shop.autodel FROM public_shop, item WHERE item.id = public_shop.item_id AND player_id = ' + player_id + ' ORDER BY time_end, code ASC', function (err, rows, fields) {
			if (err) throw err

			let d = new Date()
			let isPublic = ''
			let isMassive = ''
			let isProtected = ''
			let isAutoDelete = ''

			if (Object.keys(rows).length > 0) {
				d = new Date(rows[0].time_end)

				if (rows[0].public == 0) { isPublic = 'Privato' } else { isPublic = 'Pubblico' }
				if (rows[0].massive == 0) { isMassive = ', Massivo Disabilitato' } else if (rows[0].massive == 1) { isMassive = ', Massivo Abilitato' } else { isMassive = ', Massivo Obbligato' }
				if (rows[0].protected == 0) { isProtected = ', Non Protetto' } else { isProtected = ', Protetto' }
				if (rows[0].autodel == 0) { isAutoDelete = ', Cancellazione Automatica Disattivata' } else { isAutoDelete = ', Cancellazione Automatica Attivata' }

				text += '<code>' + rows[0].code + '</code> (Scadenza: ' + toDate('it', d) + ') <i>' + isPublic + isMassive + isProtected + isAutoDelete + '</i>\n'
				for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
					if ((i > 0) && (rows[i].code != rows[i - 1].code)) {
						d = new Date(rows[i].time_end)

						if (rows[i].public == 0) { isPublic = 'Privato' } else { isPublic = 'Pubblico' }
						if (rows[i].massive == 0) { isMassive = ', Massivo Disabilitato' } else if (rows[i].massive == 1) { isMassive = ', Massivo Abilitato' } else { isMassive = ', Massivo Obbligato' }
						if (rows[i].protected == 0) { isProtected = ', Non Protetto' } else { isProtected = ', Protetto' }
						if (rows[i].autodel == 0) { isAutoDelete = ', Cancellazione Automatica Disattivata' } else { isAutoDelete = ', Cancellazione Automatica Attivata' }

						text += '\n<code>' + rows[i].code + '</code> (Scadenza: ' + toDate('it', d) + ') <i>' + isPublic + isMassive + isProtected + isAutoDelete + '</i>\n'
					}
					text += '> ' + rows[i].quantity + 'x ' + rows[i].name + ' (' + formatNumber(rows[i].price) + ' §)\n'
				}

				if ((Object.keys(text).length > 4000) || (message.from.id == 20471035)) {
					text = ''
					d = new Date(rows[0].time_end)

					if (rows[0].public == 0) { isPublic = 'Privato' } else { isPublic = 'Pubblico' }
					if (rows[0].massive == 0) { isMassive = ', Massivo Disabilitato' } else if (rows[0].massive == 1) { isMassive = ', Massivo Abilitato' } else { isMassive = ', Massivo Obbligato' }
					if (rows[0].protected == 0) { isProtected = ', Non Protetto' } else { isProtected = ', Protetto' }
					if (rows[0].autodel == 0) { isAutoDelete = ', Cancellazione Automatica Disattivata' } else { isAutoDelete = ', Cancellazione Automatica Attivata' }

					text += '<code>' + rows[0].code + '</code> (Scadenza: ' + toDate('it', d) + ') <i>' + isPublic + isMassive + isProtected + isAutoDelete + '</i>\n'
					for (var i = 0, len = Object.keys(rows).length; i < len; i++) {
						if ((i > 0) && (rows[i].code != rows[i - 1].code)) {
							bot.sendMessage(message.chat.id, text, html)
							text = ''

							d = new Date(rows[i].time_end)

							if (rows[i].public == 0) { isPublic = 'Privato' } else { isPublic = 'Pubblico' }
							if (rows[i].massive == 0) { isMassive = ', Massivo Disabilitato' } else if (rows[i].massive == 1) { isMassive = ', Massivo Abilitato' } else { isMassive = ', Massivo Obbligato' }

							if (rows[i].protected == 0) { isProtected = ', Non Protetto' } else { isProtected = ', Protetto' }
							if (rows[i].autodel == 0) { isAutoDelete = ', Cancellazione Automatica Disattivata' } else { isAutoDelete = ', Cancellazione Automatica Attivata' }

							text += '\n<code>' + rows[i].code + '</code> (Scadenza: ' + toDate('it', d) + ') <i>' + isPublic + isMassive + isProtected + isAutoDelete + '</i>\n'
						}
						text += '> ' + rows[i].quantity + 'x ' + rows[i].name + ' (' + formatNumber(rows[i].price) + ' §)\n'
					}
					bot.sendMessage(message.chat.id, text, html)
				} else { bot.sendMessage(message.chat.id, text, html) }
			} else { bot.sendMessage(message.chat.id, 'Non hai nessun negozio aperto') }
		})
	})
})

bot.onText(/^\/privacy (.+)|^\/privacy/, function (message, match) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		let code = match[1]
		const player_id = rows[0].id

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (message.reply_to_message != undefined) {
			const cod = message.reply_to_message.text.match(/[0-9]{7,11}/g)
			if (cod != undefined) { code = cod[0] }
		}

		if ((code == undefined) || (code == '')) {
			bot.sendMessage(message.chat.id, 'La sintassi è: /privacy CODICE, puoi anche usare /privacy tutti')
			return
		}

		if (code == 'tutti') {
			connection.query('SELECT player_id, public FROM public_shop WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non possiedi nessun negozio')
					return
				}

				const isPublic = rows[0].public

				if (isPublic == 0) {
					connection.query('UPDATE public_shop SET public = 1 WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Tutti i negozi impostati come _pubblici_!', mark)
					})
				} else if (isPublic == 1) {
					connection.query('UPDATE public_shop SET public = 0 WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Tutti i negozi impostati come _privati_!', mark)
					})
				}
			})
			return
		}

		code = parseInt(code)
		if (isNaN(code)) {
			bot.sendMessage(message.chat.id, 'Codice non valido')
			return
		}

		connection.query('SELECT player_id, public FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Non esiste un negozio con quel codice')
				return
			}

			if (player_id != rows[0].player_id) {
				bot.sendMessage(message.chat.id, "Non sei l'amministratore del negozio")
				return
			}

			const isPublic = rows[0].public

			if (isPublic == 0) {
				connection.query('UPDATE public_shop SET public = 1 WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(message.chat.id, 'Il negozio è stato impostato _pubblico_!', mark)
				})
			} else if (isPublic == 1) {
				connection.query('UPDATE public_shop SET public = 0 WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(message.chat.id, 'Il negozio è stato impostato _privato_!', mark)
				})
			}
		})
	})
})

bot.onText(/^\/massivo (.+)|^\/massivo/, function (message, match) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		let code = match[1]
		const player_id = rows[0].id

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (message.reply_to_message != undefined) {
			const cod = message.reply_to_message.text.match(/[0-9]{7,11}/g)
			if (cod != undefined) { code = cod[0] }
		}

		if ((code == undefined) || (code == '')) {
			bot.sendMessage(message.chat.id, 'La sintassi è: /massivo CODICE, puoi anche usare /massivo tutti')
			return
		}

		if (code == 'tutti') {
			connection.query('SELECT player_id, massive FROM public_shop WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non possiedi nessun negozio')
					return
				}

				const massive = rows[0].massive

				if (massive == 0) {
					connection.query('UPDATE public_shop SET massive = 1 WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, "Tutti i negozi _abilitati_ all'acquisto massivo!", mark)
					})
				} else if (massive == 1) {
					connection.query('UPDATE public_shop SET massive = 0 WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, "Tutti i negozi _disabilitati_ all'acquisto massivo!", mark)
					})
				} else if (massive == 2) {
					connection.query('UPDATE public_shop SET massive = 2 WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, "Tutti i negozi _obbligati_ all'acquisto massivo!", mark)
					})
				}
			})
			return
		}

		connection.query('SELECT player_id, massive FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Non esiste un negozio con quel codice')
				return
			}

			if (player_id != rows[0].player_id) {
				bot.sendMessage(message.chat.id, "Non sei l'amministratore del negozio")
				return
			}

			const massive = rows[0].massive

			code = parseInt(code)
			if (isNaN(code)) {
				bot.sendMessage(message.chat.id, 'Codice negozio non valido')
				return
			}
			if (massive == 0) {
				connection.query('UPDATE public_shop SET massive = 1 WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(message.chat.id, "Il negozio è _abilitato_ all'acquisto massivo!", mark)
				})
			} else if (massive == 1) {
				connection.query('UPDATE public_shop SET massive = 0 WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(message.chat.id, "Il negozio è _disabilitato_ all'acquisto massivo!", mark)
				})
			} else if (massive == 2) {
				connection.query('UPDATE public_shop SET massive = 2 WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(message.chat.id, "Il negozio è _obbligato_ all'acquisto massivo!", mark)
				})
			}
		})
	})
})

bot.onText(/^\/protetto (.+)|^\/protetto/, function (message, match) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		let code = match[1]
		const player_id = rows[0].id

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (message.reply_to_message != undefined) {
			const cod = message.reply_to_message.text.match(/[0-9]{7,11}/g)
			if (cod != undefined) { code = cod[0] }
		}

		if ((code == undefined) || (code == '')) {
			bot.sendMessage(message.chat.id, 'La sintassi è: /protetto CODICE, puoi anche usare /protetto tutti')
			return
		}

		if (code == 'tutti') {
			connection.query('SELECT player_id, protected FROM public_shop WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non possiedi nessun negozio')
					return
				}

				const isProtected = rows[0].protected

				if (isProtected == 0) {
					connection.query('UPDATE public_shop SET protected = 1 WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Applicata la protezione a tutti i negozi!', mark)
					})
				} else if (isProtected == 1) {
					connection.query('UPDATE public_shop SET protected = 0 WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Rimossa la protezione da tutti i negozi!', mark)
					})
				}
			})
			return
		}

		connection.query('SELECT player_id, protected FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Non esiste un negozio con quel codice')
				return
			}

			if (player_id != rows[0].player_id) {
				bot.sendMessage(message.chat.id, "Non sei l'amministratore del negozio")
				return
			}

			const isProtected = rows[0].protected

			code = parseInt(code)
			if (isNaN(code)) {
				bot.sendMessage(message.chat.id, 'Codice negozio non valido')
				return
			}
			if (isProtected == 0) {
				connection.query('UPDATE public_shop SET protected = 1 WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(message.chat.id, 'Hai applicato la protezione al negozio!', mark)
				})
			} else if (isProtected == 1) {
				connection.query('UPDATE public_shop SET protected = 0 WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(message.chat.id, 'Hai rimosso la protezione al negozio!', mark)
				})
			}
		})
	})
})

bot.onText(/^\/autocancella (.+)|^\/autocancella/, function (message, match) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		let code = match[1]
		const player_id = rows[0].id

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (message.reply_to_message != undefined) {
			const cod = message.reply_to_message.text.match(/[0-9]{7,11}/g)
			if (cod != undefined) { code = cod[0] }
		}

		if ((code == undefined) || (code == '')) {
			bot.sendMessage(message.chat.id, 'La sintassi è: /autocancella CODICE, puoi anche usare /autocancella tutti')
			return
		}

		if (code == 'tutti') {
			connection.query('SELECT player_id, autodel FROM public_shop WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non possiedi nessun negozio')
					return
				}

				const autodel = rows[0].autodel

				if (autodel == 0) {
					connection.query('UPDATE public_shop SET autodel = 1 WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, "Applicata l'auto cancellazione a tutti i negozi!", mark)
					})
				} else if (autodel == 1) {
					connection.query('UPDATE public_shop SET autodel = 0 WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, "Rimossa l'auto cancellazione da tutti i negozi!", mark)
					})
				}
			})
			return
		}

		connection.query('SELECT player_id, autodel FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Non esiste un negozio con quel codice')
				return
			}

			if (player_id != rows[0].player_id) {
				bot.sendMessage(message.chat.id, "Non sei l'amministratore del negozio")
				return
			}

			const autodel = rows[0].autodel

			code = parseInt(code)
			if (isNaN(code)) {
				bot.sendMessage(message.chat.id, 'Codice negozio non valido')
				return
			}
			if (autodel == 0) {
				connection.query('UPDATE public_shop SET autodel = 1 WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(message.chat.id, "Hai attivato l'auto cancellazione al negozio!", mark)
				})
			} else if (autodel == 1) {
				connection.query('UPDATE public_shop SET autodel = 0 WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(message.chat.id, "Hai rimosso l'auto cancellazione al negozio!", mark)
				})
			}
		})
	})
})

bot.onText(/^\/negoziodesc (.+),(.+)|^\/negoziodesc/, function (message, match) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		let code = match[1]
		var text = match[2]
		const player_id = rows[0].id

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			var text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (message.reply_to_message != undefined) {
			const cod = message.reply_to_message.text.match(/[0-9]{7,11}/g)
			if (cod != undefined) { code = cod[0] }
		}

		if ((code == undefined) || (code == '')) {
			bot.sendMessage(message.chat.id, "La sintassi è: '/negoziodesc CODICE,Descrizione'. Scrivi svuota al posto della descrizione per rimuoverla, è possibile inserire i caratteri alfanumerici, le lettere accentate, ?!'@ e spazi, massimo 500 caratteri")
			return
		}

		if ((text == undefined) || (text == '')) {
			bot.sendMessage(message.chat.id, "La sintassi è: '/negoziodesc CODICE,Descrizione'. Scrivi svuota al posto della descrizione per rimuoverla, è possibile inserire i caratteri alfanumerici, le lettere accentate, ?!'@ e spazi, massimo 500 caratteri")
			return
		}

		const reg = new RegExp("^[a-zA-Z0-9àèìòùé.,\\\?\!\'\@\(\) ]{1,500}$")
		if (reg.test(text) == false) {
			bot.sendMessage(message.chat.id, 'Descrizione non valida, riprova')
			return
		}

		text = capitalizeFirstLetter(text.trim())

		if (code == 'tutti') {
			connection.query('SELECT code FROM public_shop WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non possiedi nessun negozio')
					return
				}
				for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
					if (text.toLowerCase() == 'svuota') {
						connection.query('UPDATE public_shop SET description = NULL WHERE code = "' + rows[i].code + '"', function (err, rows, fields) {
							if (err) throw err
						})
					} else {
						connection.query('UPDATE public_shop SET description = "' + text + '" WHERE code = "' + rows[i].code + '"', function (err, rows, fields) {
							if (err) throw err
						})
					}
				}
				if (text.toLowerCase() == 'svuota') { bot.sendMessage(message.chat.id, 'Hai rimosso correttamente la descrizione a tutti i negozi!') } else { bot.sendMessage(message.chat.id, 'Hai impostato correttamente la descrizione a tutti i negozi!') }
			})
		} else {
			connection.query('SELECT player_id FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
				if (err) throw err

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non esiste un negozio con quel codice')
					return
				}

				if (player_id != rows[0].player_id) {
					bot.sendMessage(message.chat.id, "Non sei l'amministratore del negozio")
					return
				}

				code = parseInt(code)
				if (isNaN(code)) {
					bot.sendMessage(message.chat.id, 'Codice negozio non valido')
					return
				}
				if (text.toLowerCase() == 'svuota') {
					connection.query('UPDATE public_shop SET description = NULL WHERE code = ' + code, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Hai rimosso correttamente la descrizione del negozio!', mark)
					})
				} else {
					connection.query('UPDATE public_shop SET description = "' + text + '" WHERE code = ' + code, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Hai impostato correttamente la descrizione del negozio!', mark)
					})
				}
			})
		}
	})
})

bot.onText(/^\/negozio(?!a|r) (.+)|^\/negozio(?!a|r)$|^\/negozioa$|^\/negozior$|^\/negozioa ([^\s]+) (.+)|^\/negozior ([^\s]+) (.+)|^\/negoziom$|^\/negoziom ([^\s]+) (.+)|^\/negoziou (.+)|^\/negoziou|^\/negozioref ([^\s]+) (.+)|^\/negozioref/, function (message, match) {
	if (!checkSpam(message)) { return }

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			var text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (message.chat.id < 0) {
			if (message.forward_from == undefined) { bot.sendMessage(message.chat.id, 'Non puoi gestire un negozio in un gruppo') }
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		let func = ''
		if (message.text.indexOf('negozioa') != -1) {
			var code = parseInt(match[2])
			var text = match[3]

			func = 'add'

			if ((text == undefined) || (text == '') || (isNaN(code))) {
				bot.sendMessage(message.chat.id, 'Sintassi: /negozioa codice oggetto:prezzo:quantità,oggetto:prezzo:quantità,oggetto:prezzo:quantità.')
				return
			}
		} else if ((message.text.indexOf('negozior') != -1) && (message.text.indexOf('negozioref') == -1)) {
			var code = parseInt(match[4])
			var text = match[5]

			func = 'remove'

			if ((text == undefined) || (text == '') || (isNaN(code))) {
				bot.sendMessage(message.chat.id, 'Sintassi: /negozior codice oggetto,oggetto,oggetto.')
				return
			}
		} else if (message.text.indexOf('negoziom') != -1) {
			var code = parseInt(match[6])
			var text = match[7]
			if (message.reply_to_message != undefined) {
				var cod = message.reply_to_message.text.match(/[0-9]{7,11}/g)
				if (cod != undefined) {
					code = cod[0]
					text = match[6]
				}
			}

			func = 'update'

			if ((text == undefined) || (text == '') || (isNaN(code))) {
				bot.sendMessage(message.chat.id, 'Sintassi: /negoziom codicenegozio oggetto:nuovoprezzo:nuovaquantità,oggetto:nuovoprezzo:nuovaquantità.')
				return
			}
		} else if (message.text.indexOf('negoziou') != -1) {
			var text = match[8]

			func = 'refresh'

			if (message.reply_to_message != undefined) {
				var cod = message.reply_to_message.text.match(/[0-9]{7,11}/g)
				if (cod != undefined) { text = cod[0] }
			}

			if ((text == undefined) || (text == '')) {
				bot.sendMessage(message.chat.id, 'Sintassi: /negoziou codicenegozio1,codicenegozio2,codicenegozio3.')
				return
			}
		} else if (message.text.indexOf('negozioref') != -1) {
			var code = match[9]
			if ((code != 'tutti') && (code != 'pubblici') && (code != 'privati')) {
				code = parseInt(code)
				if (isNaN(code)) {
					bot.sendMessage(message.chat.id, 'Quantità non valida, puoi usare anche tutti/pubblici/privati.\nSintassi: /negozioref codicenegozio (+/-)quantità.')
					return
				}
			}
			var text = match[10]

			func = 'refill'

			if ((text == undefined) || (text == '')) {
				bot.sendMessage(message.chat.id, 'Sintassi: /negozioref codicenegozio (+/-)quantità.')
				return
			}
		} else {
			let codeOk = 0
			var code = 0
			while (codeOk == 0) {
				code = Math.floor(1000000 + Math.random() * 9000000)
				const exist = await connection.queryAsync('SELECT 1 FROM public_shop WHERE code = ' + code)
				if (Object.keys(exist).length == 0) { codeOk = 1 }
			}

			var text = match[1]

			func = 'new'

			if ((text == undefined) || (text == '')) {
				bot.sendMessage(message.chat.id, "Sintassi: /negozio oggetto:prezzo:quantità,oggetto:prezzo:quantità,oggetto:prezzo:quantità.\n\nSimboli:\n# - Imposta la privacy\n! - Imposta la vendita massiva\n!! - Obbliga la vendita massiva\n* - Imposta la protezione\n? - Imposta l'auto cancellazione quando vuoto")
				return
			}
		}

		let privacy = 0
		let massive = 1
		let isProtected = 0
		let autodel = 0
		if (text.indexOf('#') != -1) {
			privacy = 1
			text = text.replace('#', '')
		}
		if (text.indexOf('!!') != -1) {
			massive = 2
			text = text.replace('!!', '')
		} else if (text.indexOf('!') != -1) {
			massive = 0
			text = text.replace('!', '')
		}
		if (text.indexOf('*') != -1) {
			isProtected = 1
			text = text.replace('*', '')
		}
		if (text.indexOf('?') != -1) {
			autodel = 1
			text = text.replace('?', '')
		}

		const d = new Date()
		d.setDate(d.getDate() + 4)
		let long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

		const elements = text.split(',')

		if (func == 'refresh') {
			const arrLen = Object.keys(elements).length
			if (arrLen < 1) {
				bot.sendMessage(message.chat.id, 'Specifica almeno un codice negozio')
				return
			}

			d.setDate(d.getDate() + 3)
			long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

			if (elements[0] == 'tutti') {
				connection.query('UPDATE public_shop SET time_end = "' + long_date + '", notified = 0, time_creation = NOW() WHERE player_id = ' + player_id, function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(message.chat.id, 'Tutti i negozi rinnovati per 7 giorni')
				})
				return
			}

			var code = 0
			for (let i = 0; i < arrLen; i++) {
				code = elements[i]

				var shopQuery = await connection.queryAsync('SELECT 1 FROM public_shop WHERE code = ' + code + ' AND player_id = ' + player_id)
				if (Object.keys(shopQuery).length > 0) {
					connection.query('UPDATE public_shop SET time_end = "' + long_date + '", notified = 0, time_creation = NOW() WHERE code = ' + code, function (err, rows, fields) {
						if (err) throw err
					})
					bot.sendMessage(message.chat.id, 'Negozio ' + code + ' rinnovato per 7 giorni')
				} else { bot.sendMessage(message.chat.id, 'Non hai il permesso per rinnovare il negozio oppure non esiste (' + code + ')') }
			}
			return
		}

		if (func == 'refill') {
			let query = text
			let qnt = text
			let sym = ''
			if (text.indexOf('+') != -1) {
				qnt = text.replace('+', '')
				query = 'quantity + ' + qnt
				sym = '+'
			} else if (text.indexOf('-') != -1) {
				qnt = text.replace('-', '')
				query = 'quantity - ' + qnt
				sym = '-'
			} else if (text.indexOf('max') != -1) {
				query = '(SELECT IV.quantity FROM inventory IV WHERE IV.item_id = public_shop.item_id AND IV.player_id = public_shop.player_id LIMIT 1)'
				sym = ''
			}

			qnt = parseInt(qnt)
			if (isNaN(qnt)) {
				bot.sendMessage(message.chat.id, 'Valore non valido, riprova')
				return
			}

			if ((qnt > 1000) || (qnt < -1000)) {
				bot.sendMessage(message.chat.id, 'Valore non valido, minimo -1000 massimo 1000')
				return
			}

			if (code == 'tutti') {
				connection.query('UPDATE public_shop SET quantity = ' + query + ', time_end = "' + long_date + '" WHERE player_id = ' + player_id, function (err, rows, fields) {
					if (err) throw err
					connection.query('UPDATE public_shop SET quantity = 0 WHERE quantity < 0 AND player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
					})
				})
				bot.sendMessage(message.chat.id, 'Quantità presenti in tutti i negozi impostate a ' + sym + qnt)
			} else if (code == 'privati') {
				connection.query('UPDATE public_shop SET quantity = ' + query + ', time_end = "' + long_date + '" WHERE public = 0 AND player_id = ' + player_id, function (err, rows, fields) {
					if (err) throw err
					connection.query('UPDATE public_shop SET quantity = 0 WHERE public = 0 AND quantity < 0 AND player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
					})
				})
				bot.sendMessage(message.chat.id, 'Quantità presenti in tutti i negozi privati impostate a ' + sym + qnt)
			} else if (code == 'pubblici') {
				connection.query('UPDATE public_shop SET quantity = ' + query + ', time_end = "' + long_date + '" WHERE public = 1 AND player_id = ' + player_id, function (err, rows, fields) {
					if (err) throw err
					connection.query('UPDATE public_shop SET quantity = 0 WHERE public = 1 AND quantity < 0 AND player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
					})
				})
				bot.sendMessage(message.chat.id, 'Quantità presenti in tutti i negozi pubblici impostate a ' + sym + qnt)
			} else {
				var shopQuery = await connection.queryAsync('SELECT 1 FROM public_shop WHERE code = ' + code + ' AND player_id = ' + player_id)
				if (Object.keys(shopQuery).length > 0) {
					connection.query('UPDATE public_shop SET quantity = ' + query + ', time_end = "' + long_date + '" WHERE code = ' + code, function (err, rows, fields) {
						if (err) throw err
						connection.query('UPDATE public_shop SET quantity = 0 WHERE quantity < 0 AND code = ' + code, function (err, rows, fields) {
							if (err) throw err
						})
					})
					bot.sendMessage(message.chat.id, 'Quantità presenti nel negozio ' + code + ' impostate a ' + sym + qnt)
				} else { bot.sendMessage(message.chat.id, 'Non hai il permesso per gestire questo negozio oppure non esiste (' + code + ')') }
			}

			return
		}

		connection.query('SELECT * FROM public_shop WHERE code = ' + code + ' AND player_id = ' + player_id, async function (err, rows, fields) {
			if (err) throw err

			if ((Object.keys(rows).length == 0) && ((func == 'add') || (func == 'remove') || (func == 'update'))) {
				bot.sendMessage(message.chat.id, "Nessun negozio trovato con quel codice, oppure non sei l'amministratore")
				return
			}

			const len = Object.keys(elements).length
			if (len > 10) {
				bot.sendMessage(message.chat.id, 'Massimo 10 oggetti nel negozio, stai provando ad inserirne ' + len)
				return
			}

			if (((Object.keys(rows).length + len) > 10) && (func == 'add')) {
				bot.sendMessage(message.chat.id, 'Massimo 10 oggetti nel negozio, al momento ce ne sono ' + Object.keys(rows).length)
				return
			}

			const items = []
			const prices = []
			const quantities = []

			if (len == 0) {
				bot.sendMessage(message.chat.id, 'Errore, controlla la sintassi')
				return
			}

			var splitted = []
			let text = ''

			const re = new RegExp('^[0-9]*$')

			if (func == 'remove') {
				text = 'Riassunto oggetti rimossi:\n'

				var cnt = 0
				var item_id = 0
				var item_name = ''

				for (var i = 0; i < len; i++) {
					elements[i] = elements[i].trim()
					var itemQuery = await connection.queryAsync('SELECT id, name FROM item WHERE name = "' + elements[i] + '"')
					if (Object.keys(itemQuery).length == 0) { text += 'Oggetto non trovato: ' + elements[i] + '\n' } else {
						item_id = itemQuery[0].id
						item_name = itemQuery[0].name
						var shopQuery = await connection.queryAsync('SELECT id FROM public_shop WHERE item_id = ' + item_id + ' AND code = ' + code)
						if (Object.keys(shopQuery).length == 0) { text += 'Oggetto non presente nel negozio: ' + item_name + '\n' } else {
							connection.query('DELETE FROM public_shop WHERE id = ' + shopQuery[0].id, function (err, rows, fields) {
								if (err) throw err
							})
							text += 'Oggetto rimosso: ' + item_name + '\n'
							cnt++
						}
					}
				}

				if (cnt == 0) { text += 'Nessun oggetto rimosso' } else {
					connection.query('UPDATE public_shop SET time_end = "' + long_date + '", notified = 0 WHERE code = ' + code, function (err, rows, fields) {
						if (err) throw err
					})
				}
			} else if (func == 'update') {
				text = 'Riassunto oggetti modificati:\n'

				var splitted = []
				var item = 0
				var price = 0
				var quantity = 0
				var cnt = 0
				var item_id = 0
				var item_value = 0
				var item_max_value = 0
				var item_name = ''

				for (var i = 0; i < len; i++) {
					splitted = elements[i].split(':')

					item = splitted[0].trim()
					if (splitted[1] == undefined) { price = 0 } else { price = parseInt(splitted[1].replace(/[^\w\s]/gi, '').trim().replaceAll(/\./, '')) }
					if (splitted[2] == undefined) { quantity = 1 } else { quantity = parseInt(splitted[2].replace(/[^\w\s]/gi, '').trim()) }

					if (isNaN(price)) { price = 0 }

					if (isNaN(quantity)) { quantity = 0 }

					if ((price < 0) || (re.test(price) == false)) {
						bot.sendMessage(message.chat.id, 'Il prezzo ' + formatNumber(price) + ' non è valido')
						break
						return
					}

					if ((quantity < 0) || (re.test(quantity) == false)) {
						bot.sendMessage(message.chat.id, 'La quantità ' + quantità + ' non è valida')
						break
						return
					}

					var itemQuery = await connection.queryAsync('SELECT id, name, craftable, value, max_value FROM item WHERE name = "' + item + '"')
					if (Object.keys(itemQuery).length == 0) { text += 'Oggetto non trovato: ' + item + '\n' } else {
						item_name = itemQuery[0].name
						item_id = itemQuery[0].id
						item_value = itemQuery[0].value
						item_max_value = itemQuery[0].max_value

						var shopQuery = await connection.queryAsync('SELECT id FROM public_shop WHERE item_id = ' + item_id + ' AND code = ' + code)
						if (Object.keys(shopQuery).length == 0) { text += 'Oggetto non presente nel negozio: ' + item_name + '\n' } else {
							const itemShopQuery = await connection.queryAsync('SELECT price, quantity FROM public_shop WHERE id = ' + shopQuery[0].id)

							if (price == 0) { price = itemShopQuery[0].price }
							if (quantity == 0) { quantity = itemShopQuery[0].quantity }

							if (price < item_value) {
								text += 'Oggetto impostato prezzo minimo: ' + item_name + ' (' + formatNumber(item_value) + ')\n'
								price = item_value
							}
							if (price > item_max_value) {
								text += 'Oggetto impostato prezzo massimo: ' + item_name + ' (' + formatNumber(item_max_value) + ')\n'
								price = item_max_value
							}

							if ((quantity == 0) || (quantity == '')) {
								text += 'Oggetto impostato quantità: ' + item_name + ' (1)\n'
								quantity = 1
							}

							connection.query('UPDATE public_shop SET price = ' + price + ', quantity = ' + quantity + ', time_creation = NOW() WHERE id = ' + shopQuery[0].id, function (err, rows, fields) {
								if (err) throw err
							})
							text += 'Oggetto aggiornato: ' + quantity + 'x ' + item_name + ' a ' + formatNumber(price) + '§\n'
							cnt++
						}
					}
				}

				if (cnt == 0) { text += 'Nessun oggetto aggiornato' } else {
					connection.query('UPDATE public_shop SET time_end = "' + long_date + '", notified = 0 WHERE code = ' + code, function (err, rows, fields) {
						if (err) throw err
					})
				}
			} else if ((func == 'add') || (func == 'new')) {
				text = 'Riassunto oggetti aggiunti:\n'

				connection.query('UPDATE public_shop SET time_end = "' + long_date + '", notified = 0 WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err
				})

				var splitted = []
				var item = 0
				var price = 0
				var quantity = 0
				var cnt = 0
				var item_id = 0
				var item_value = 0
				var item_max_value = 0
				var item_name = ''
				var cnt = 0

				for (var i = 0; i < len; i++) {
					splitted = elements[i].split(':')

					item = splitted[0].trim()
					if (splitted[1] == undefined) { price = 0 } else { price = parseInt(splitted[1].replace(/[^\w\s]/gi, '').trim().replaceAll(/\./, '')) }
					if (splitted[2] == undefined) { quantity = 1 } else { quantity = parseInt(splitted[2].replace(/[^\w\s]/gi, '').trim()) }

					if (isNaN(price)) { price = 0 }

					if (isNaN(quantity)) { quantity = 1 }

					if ((price < 0) || (re.test(price) == false)) {
						bot.sendMessage(message.chat.id, 'Il prezzo ' + formatNumber(price) + ' non è valido')
						break
						return
					}

					if ((quantity < 0) || (re.test(quantity) == false)) {
						bot.sendMessage(message.chat.id, 'La quantità ' + quantity + ' non è valida')
						break
						return
					}

					var itemQuery = await connection.queryAsync('SELECT id, name, craftable, value, max_value, allow_sell FROM item WHERE name = "' + item + '"')
					if (Object.keys(itemQuery).length == 0) { text += 'Oggetto non trovato: ' + item + '\n' } else {
						item_name = itemQuery[0].name
						if (itemQuery[0].allow_sell == 0) { text += 'Oggetto non vendibile: ' + item_name + '\n' } else {
							item_id = itemQuery[0].id
							item_value = itemQuery[0].value
							item_max_value = itemQuery[0].max_value
							if (price < item_value) {
								text += 'Oggetto impostato prezzo minimo: ' + item_name + ' (' + formatNumber(item_value) + ')\n'
								price = item_value
							}

							if (price > item_max_value) {
								text += 'Oggetto impostato prezzo massimo: ' + item_name + ' (' + formatNumber(item_max_value) + ')\n'
								price = item_max_value
							}

							if ((quantity == 0) || (quantity == '')) {
								text += 'Oggetto impostato quantità: ' + item_name + ' (1)\n'
								quantity = 1
							}

							const paramQuery = await connection.queryAsync('SELECT public, massive, protected, autodel FROM public_shop WHERE code = ' + code)
							var shopQuery = await connection.queryAsync('SELECT id, public, massive, protected, autodel FROM public_shop WHERE item_id = ' + item_id + ' AND code = ' + code)
							if (Object.keys(shopQuery).length > 0) { text += 'Oggetto già presente: ' + item_name + '\n' } else {
								if (func == 'add') {
									privacy = paramQuery[0].public
									massive = paramQuery[0].massive
									isProtected = paramQuery[0].protected
									autodel = paramQuery[0].autodel
								}

								// serve sincrono altrimenti non riesce a controllare l'esistenza dell'oggetto
								await connection.queryAsync('INSERT INTO public_shop (player_id, code, item_id, price, quantity, time_end, public, massive, protected, autodel) VALUES (' + player_id + ',' + code + ',' + item_id + ',' + price + ',' + quantity + ',"' + long_date + '",' + privacy + ',' + massive + ', ' + isProtected + ', ' + autodel + ')')

								text += 'Oggetto aggiunto: ' + quantity + 'x ' + item_name + ' a ' + formatNumber(price) + ' §\n'
								cnt++
							}
						}
					}
				}

				if (cnt == 0) { text += 'Nessun oggetto aggiunto' } else {
					if (func == 'new') {
						text += '\nPrivacy negozio: ' + ((privacy == 1) ? '_Pubblico_' : '_Privato_')
						if (massive == 1) { text += '\nAcquisto massivo: _Abilitato_' } else if (massive == 0) { text += '\nAcquisto massivo: _Disabilitato_' } else { text += '\nAcquisto massivo: _Obbligato_' }
						text += '\nProtezione negozio: ' + ((isProtected == 1) ? '_Abilitata_' : '_Disabilitata_')
						text += '\nAuto cancellazione negozio: ' + ((autodel == 1) ? '_Abilitata_' : '_Disabilitata_')
					}
				}
			}

			if (cnt > 0) {
				text += '\nScadrà il ' + toDate('it', d)
				text += '\n\nInline: `@lootplusbot ' + code + '`'

				const iKeys = []
				iKeys.push([{
					text: 'Condividi Negozio',
					switch_inline_query: code
				}])

				bot.sendMessage(message.chat.id, text, {
					parse_mode: 'Markdown',
					reply_markup: {
						inline_keyboard: iKeys
					}
				})
			} else { bot.sendMessage(message.chat.id, text, mark) }
		})
	})
})

bot.onText(/^\/cancellanegozio (.+)|^\/cancellanegozio$/, function (message, match) {
	connection.query('SELECT id, account_id FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		let code = match[1]
		const player_id = rows[0].id

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (message.reply_to_message != undefined) {
			const cod = message.reply_to_message.text.match(/[0-9]{7,11}/g)
			if (cod != undefined) { code = cod[0] }
		}

		if ((code == undefined) || (code == '')) {
			bot.sendMessage(message.chat.id, 'La sintassi è: /cancellanegozio CODICE, puoi anche usare /cancellanegozio tutti/privati/pubblici/vuoti. Se usato in risposta il messaggio principale deve contenere il codice negozio intero')
			return
		}

		if (code == 'tutti') {
			connection.query('SELECT player_id FROM public_shop WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non possiedi nessun negozio')
					return
				}
				connection.query('DELETE FROM public_shop WHERE player_id = ' + player_id, function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(message.chat.id, 'Tutti i negozi sono stati eliminati!')
				})
			})
			return
		}

		if (code == 'privati') {
			connection.query('SELECT player_id FROM public_shop WHERE public = 0 AND player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non possiedi nessun negozio privato')
					return
				}
				connection.query('DELETE FROM public_shop WHERE public = 0 AND player_id = ' + player_id, function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(message.chat.id, 'Tutti i negozi privati sono stati eliminati!')
				})
			})
			return
		}

		if (code == 'pubblici') {
			connection.query('SELECT player_id FROM public_shop WHERE public = 1 AND player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non possiedi nessun negozio pubblico')
					return
				}
				connection.query('DELETE FROM public_shop WHERE public = 1 AND player_id = ' + player_id, function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(message.chat.id, 'Tutti i negozi pubblici sono stati eliminati!')
				})
			})
			return
		}

		if (code == 'vuoti') {
			connection.query('SELECT code, SUM(quantity) As cnt FROM public_shop WHERE player_id = ' + player_id + ' GROUP BY code HAVING cnt = 0', function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non possiedi nessun negozio vuoto')
					return
				}
				for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
					connection.query('DELETE FROM public_shop WHERE code = "' + rows[i].code + '"', function (err, rows, fields) {
						if (err) throw err
					})
				}
				bot.sendMessage(message.chat.id, 'Tutti i negozi vuoti sono stati eliminati!')
			})
			return
		}

		if (code.indexOf(',') != -1) {
			code = code.split(' ').join('')
			const codes = code.split(',')
			let msg = ''
			for (let i = 0; i < codes.length; i++) {
				var rows = await connection.queryAsync('SELECT player_id FROM public_shop WHERE code = ' + codes[i])
				if (Object.keys(rows).length == 0) {
					msg += codes[i] + ': non trovato\n'
					continue
				}

				if (player_id != rows[0].player_id) {
					msg += codes[i] + ': non autorizzato\n'
					continue
				}

				connection.query('DELETE FROM public_shop WHERE code = ' + codes[i], function (err, rows, fields) {
					if (err) throw err
				})

				msg += codes[i] + ': eliminato\n'
			}

			bot.sendMessage(message.chat.id, msg)
			return
		}

		if (isNaN(code)) {
			bot.sendMessage(message.chat.id, 'Codice negozio non valido')
			return
		}

		connection.query('SELECT player_id FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Non esiste un negozio con quel codice')
				return
			}

			if (player_id != rows[0].player_id) {
				bot.sendMessage(message.chat.id, "Non sei l'amministratore del negozio")
				return
			}

			connection.query('DELETE FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
				if (err) throw err
				bot.sendMessage(message.chat.id, 'Il negozio è stato eliminato!')
			})
		})
	})
})

bot.on('callback_query', async function (message) {
	const func = message.data.split(':')
	if (func[0] == 'SUGGESTION') {
		tipsController.manageCallBack(message).then(function (sugg_results) {
			if (sugg_results.query) {
				bot.answerCallbackQuery(
					sugg_results.query.id,
					sugg_results.query.options
				).catch(function (err) {
					// console.log("Query -> " + err.response.body);
				})
			}
			if (sugg_results.toDelete) {
				bot.deleteMessage(
					sugg_results.toDelete.chat_id,
					sugg_results.toDelete.mess_id
				).catch(function (err) {
					// console.log("!toDelete -> " + err.response.body.description);
				})
			}
			if (sugg_results.toEdit) {
				bot.editMessageText(
					sugg_results.toEdit.message_txt, {
					chat_id: sugg_results.toEdit.chat_id,
					message_id: sugg_results.toEdit.mess_id,
					parse_mode: sugg_results.toEdit.options.parse_mode,
					disable_web_page_preview: true,
					reply_markup: sugg_results.toEdit.options.reply_markup
				}).catch(function (err) {
					// console.log("Errore toEdit: ");
					// console.log(err.response.body);
				})
			}
			if (sugg_results.toSend) {
				bot.sendMessage(
					sugg_results.toSend.chat_id,
					sugg_results.toSend.message_txt,
					sugg_results.toSend.options
				).catch(function (err) {
					// console.log("toSend-> " + err.response.body);
				})
			}
		}).catch(function (err) {
			// console.log("> C'è stato un errore di sotto...");
			// console.log(err);
		})
	}

	connection.query('SELECT account_id, market_ban, money, id, holiday FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			bot.answerCallbackQuery(message.id, { text: 'Non sei registrato al gioco!' })
			return
		}

		var player_id = rows[0].id
		var money = rows[0].money

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.from.id, text, mark)
			return
		}

		if (message.data.indexOf('token_new') != -1) {
			connection.query('SELECT id FROM token WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err

				const token = genToken(player_id)

				if (Object.keys(rows).length == 0) {
					connection.query('INSERT INTO token (player_id, token, status) VALUES (' + player_id + ',"' + token + '","OK")', function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.from.id, 'Il token è stato generato con successo: <code>' + token + '</code>', html)
					})
				} else {
					connection.query('UPDATE token SET token = "' + token + '", status = "UPDATED" WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.from.id, 'Il token è stato rinnovato con successo: <code>' + token + '</code>', html)
					})
				}
			})
			return
		}

		if (message.data.indexOf('token_del') != -1) {
			connection.query('SELECT id FROM token WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) { bot.sendMessage(message.from.id, 'Nessun token impostato') } else {
					connection.query('UPDATE token SET token = NULL, status = "REVOKED" WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.from.id, 'Il token è stato revocato con successo')
					})
				}
			})
			return
		}

		if (message.data.indexOf('okbuy') != -1) {
			var split = message.data.split(':')
			var buy_id = parseInt(split[1])

			if (rows[0].market_ban == 1) { return }

			if (rows[0].holiday == 1) { return }

			var player_id = rows[0].id
			const my_money = rows[0].money

			connection.query('SELECT id, item_id, money, buyer, player_id FROM market_direct WHERE id = ' + buy_id, function (err, rows, fields) {
				if (err) throw err

				if (Object.keys(rows).length == 0) {
					bot.answerCallbackQuery(message.id, { text: 'La vendita non è disponibile.' })
				} else {
					const marketid = rows[0].id
					const item_id = rows[0].item_id
					const money = rows[0].money
					let buyer_id = rows[0].buyer
					const player_id2 = rows[0].player_id

					if (buyer_id != player_id) {
						bot.answerCallbackQuery(message.id, { text: 'Non puoi accettare questa vendita' })
						return
					}

					if (player_id == player_id2) {
						bot.answerCallbackQuery(message.id, { text: 'Non puoi concludere un acquisto con te stesso' })
						return
					}

					if (my_money < money) {
						bot.answerCallbackQuery(message.id, { text: "Non hai abbastanza credito per completare l'acquisto." })
					} else {
						connection.query('SELECT id, chat_id, account_id, nickname FROM player WHERE id = ' + player_id2, function (err, rows, fields) {
							if (err) throw err

							const player_id2 = rows[0].id
							const chat_id2 = rows[0].account_id
							const nick2 = rows[0].nickname

							connection.query('DELETE FROM market_direct WHERE id = ' + marketid, async function (err, rows, fields) {
								if (err) throw err
								await reduceMoney(player_id, money);
								await addMoney(player_id2, money);
								await addItem(player_id, item_id)

								connection.query('SELECT name FROM item WHERE id = ' + item_id, function (err, rows, fields) {
									if (err) throw err
									bot.sendMessage(chat_id2, message.from.username + ' ha acquistato ' + rows[0].name + ' per ' + formatNumber(money) + ' §!')
									bot.answerCallbackQuery(message.id, { text: message.from.username + ", hai completato l'acquisto!" })

									if (buyer_id == -1) { buyer_id = null }

									const d = new Date()
									const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())
									connection.query('INSERT INTO market_direct_history (item_id, price, time, from_id, to_id, buyer, type) VALUES (' + item_id + ',' + money + ',"' + long_date + '",' + player_id2 + ',' + player_id + ',' + buyer_id + ',1)', function (err, rows, fields) {
										if (err) throw err
									})

									bot.editMessageText('Vendita tra ' + message.from.username + ' e ' + nick2 + ' completata!', {
										chat_id: message.message.chat.id,
										message_id: message.message.message_id,
										parse_mode: 'HTML'
									})
								})
							})
						})
					}
				}
			})
			return
		}

		if (message.data.indexOf('notbuy') != -1) {
			var split = message.data.split(':')
			var buy_id = parseInt(split[1])

			connection.query('SELECT player_id, item_id, buyer FROM market_direct WHERE id = ' + buy_id, async function (err, rows, fields) {
				if (err) throw err

				if (Object.keys(rows).length == 0) {
					bot.answerCallbackQuery(message.id, { text: 'Nessuna vendita da rifiutare' })
					return
				}

				if (rows[0].buyer != player_id) {
					bot.answerCallbackQuery(message.id, { text: 'Non puoi rifiutare questa vendita' })
					return
				}

				const creator_id = rows[0].player_id
				const item_id = rows[0].item_id
				await addItem(creator_id, item_id)
				connection.query('DELETE FROM market_direct WHERE player_id = ' + creator_id, function (err, rows, fields) {
					if (err) throw err
					bot.answerCallbackQuery(message.id, { text: 'Vendita rifiutata!' })
					connection.query('SELECT id, chat_id, nickname FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
						if (err) throw err

						const nick2 = rows[0].nickname

						bot.sendMessage(rows[0].chat_id, message.from.username + ' ha rifiutato la tua vendita!')

						const d = new Date()
						d.setMinutes(d.getMinutes() + 10)
						const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

						connection.query('INSERT INTO plus_shop_timeout (player_id, player_id2, datetime) VALUES (' + player_id + ',' + rows[0].id + ',"' + long_date + '")', function (err, rows, fields) {
							if (err) throw err
						})

						bot.editMessageText('Vendita tra ' + message.from.username + ' e ' + nick2 + ' rifiutata!', {
							chat_id: message.message.chat.id,
							message_id: message.message.message_id,
							parse_mode: 'HTML'
						})
					})
				})
			})
			return
		}

		if (message.data.indexOf('oktrade') != -1) {
			var split = message.data.split(':')
			var trade_id = parseInt(split[1])

			if (rows[0].holiday == 1) { return }

			if (rows[0].market_ban == 1) { return }

			var player_id = rows[0].id

			connection.query('SELECT * FROM market WHERE id = ' + trade_id, function (err, rows, fields) {
				if (err) throw err

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.from.id, 'Lo scambio non è disponibile.')
				} else {
					const marketid = rows[0].id
					const item1 = rows[0].item_1_id
					const item2 = rows[0].item_2_id
					let buyer_id = rows[0].buyer
					const player_id2 = rows[0].player_id
					const quantity = rows[0].quantity

					if (rows[0].buyer != player_id) {
						bot.answerCallbackQuery(message.id, { text: 'Non puoi rifiutare questo scambio' })
						return
					}

					if (player_id == player_id2) {
						bot.answerCallbackQuery(message.id, { text: 'Non puoi concludere uno scambio con te stesso' })
						return
					}

					connection.query('SELECT item.id, item.name, quantity FROM item, inventory WHERE item.id = inventory.item_id AND inventory.item_id = ' + item2 + ' AND inventory.player_id = ' + player_id + ' AND inventory.quantity > 0', function (err, rows, fields) {
						if (err) throw err

						if (Object.keys(rows).length == 0) {
							bot.answerCallbackQuery(message.id, { text: "Non possiedi l'oggetto richiesto." })
							return
						}

						if (rows[0].quantity < quantity) {
							bot.answerCallbackQuery(message.id, { text: "Non possiedi abbastanza copie dell'oggetto richiesto." })
							return
						}

						connection.query('SELECT id, chat_id, account_id, nickname FROM player WHERE id = ' + player_id2, function (err, rows, fields) {
							if (err) throw err
							if (Object.keys(rows).length == 0) {
								bot.answerCallbackQuery(message.id, { text: 'Non ho trovato il giocatore con cui completare lo scambio!' })
								return
							}

							const player_id2 = rows[0].id
							const chat_id2 = rows[0].account_id
							const nick2 = rows[0].nickname

							connection.query('DELETE FROM market WHERE id = ' + marketid, async function (err, rows, fields) {
								if (err) throw err
								await addItem(player_id, item1, quantity)
								await addItem(player_id2, item2, quantity)
								delItem(player_id, item2, quantity)

								if (buyer_id == -1) { buyer_id = null }

								const d = new Date()
								const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())
								connection.query('INSERT INTO market_history (item_1, item_2, time, from_id, to_id, buyer, quantity) VALUES (' + item1 + ',' + item2 + ',"' + long_date + '",' + player_id2 + ',' + player_id + ',' + buyer_id + ', ' + quantity + ')', function (err, rows, fields) {
									if (err) throw err
								})

								bot.answerCallbackQuery(message.id, { text: message.from.username + ', hai completato lo scambio!' })
								bot.sendMessage(chat_id2, 'Il giocatore ' + message.from.username + ' ha accettato la tua offerta di scambio!')

								bot.editMessageText('Scambio tra ' + message.from.username + ' e ' + nick2 + ' completato!', {
									chat_id: message.message.chat.id,
									message_id: message.message.message_id,
									parse_mode: 'HTML'
								})
							})
						})
					})
				}
			})
			return
		}

		if (message.data.indexOf('nottrade') != -1) {
			var split = message.data.split(':')
			var trade_id = parseInt(split[1])

			connection.query('SELECT player_id, item_1_id, quantity, buyer FROM market WHERE id = ' + trade_id, async function (err, rows, fields) {
				if (err) throw err

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.from.id, 'Nessuno scambio da rifiutare')
					return
				}

				if (rows[0].buyer != player_id) {
					bot.answerCallbackQuery(message.id, { text: 'Non puoi rifiutare questo scambio' })
					return
				}

				const creator_id = rows[0].player_id
				const item_id = rows[0].item_1_id
				const quantity = rows[0].quantity

				await addItem(creator_id, item_id, quantity)

				connection.query('DELETE FROM market WHERE player_id = ' + creator_id, function (err, rows, fields) {
					if (err) throw err
					bot.answerCallbackQuery(message.id, { text: 'Scambio rifiutato!' })
					connection.query('SELECT id, chat_id, nickname FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
						if (err) throw err

						const nick2 = rows[0].nickname

						bot.sendMessage(rows[0].chat_id, message.from.username + ' ha rifiutato il tuo scambio!')

						const d = new Date()
						d.setMinutes(d.getMinutes() + 10)
						const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

						connection.query('INSERT INTO plus_shop_timeout (player_id, player_id2, datetime) VALUES (' + player_id + ',' + rows[0].id + ',"' + long_date + '")', function (err, rows, fields) {
							if (err) throw err
						})

						bot.editMessageText('Scambio tra ' + message.from.username + ' e ' + nick2 + ' rifiutato!', {
							chat_id: message.message.chat.id,
							message_id: message.message.message_id,
							parse_mode: 'HTML'
						})
					})
				})
			})
			return
		}

		if (message.data.indexOf('asta') != -1) {
			var split = message.data.split(':')
			const auction_id = parseInt(split[1])
			let offer = split[2]

			if (rows[0].market_ban == 1) { return }

			if (rows[0].holiday == 1) { return }

			let update = 0
			if (offer == 'update') {
				update = 1
				offer = 0
			} else { offer = parseInt(offer) }

			var money = rows[0].money
			var player_id = rows[0].id

			connection.query('SELECT auction_list.id, last_price, creator_id, last_player, item_id, time_end, nickname, time_end FROM auction_list, player WHERE player.id = auction_list.creator_id AND auction_list.id = ' + auction_id, function (err, rows, fields) {
				if (err) throw err

				if (Object.keys(rows).length == 0) {
					bot.answerCallbackQuery(message.id, { text: 'L\'asta non esiste più' })
					return
				}

				const last_price = parseInt(rows[0].last_price)
				const auction_id = rows[0].id
				const last_player = rows[0].last_player
				const itemId = rows[0].item_id
				const creator_nickname = rows[0].nickname
				const creator_id = rows[0].creator_id
				let price = last_price + offer
				const original_time_end = rows[0].time_end

				if (update == 0) {
					if (money < price) {
						bot.answerCallbackQuery(message.id, { text: 'Non hai abbastanza credito, ti servono ' + formatNumber(price) + ' §' })
						return
					}

					if (player_id == creator_id) {
						bot.answerCallbackQuery(message.id, { text: 'Non puoi rialzare la tua asta' })
						return
					}

					if (player_id == last_player) {
						bot.answerCallbackQuery(message.id, { text: 'Non puoi rialzare la tua offerta' })
						return
					}
				}

				connection.query('SELECT name FROM item WHERE id = ' + itemId, async function (err, rows, fields) {
					if (err) throw err
					const itemName = rows[0].name

					if (update == 0) {
						connection.query('SELECT account_id FROM player WHERE id = ' + last_player, async function (err, rows, fields) {
							if (err) throw err
							if (Object.keys(rows).length > 0) {
								const account_id = rows[0].account_id
								await addMoney(last_player, last_price);
								bot.sendMessage(account_id, "Sei stato superato nell'asta di " + creator_nickname + ' per ' + itemName + ', dove *' + message.from.username + '* ha offerto *' + formatNumber(price) + '* §', mark);
							}
						})
					}

					let d = new Date()
					d.setMinutes(d.getMinutes() + 15)
					const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())
					let short_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

					if (update == 0) {
						connection.query('UPDATE auction_list SET time_end = "' + long_date + '", last_price = ' + price + ', last_player = ' + player_id + ' WHERE id = ' + auction_id, async function (err, rows, fields) {
							if (err) throw err
							await reduceMoney(player_id, price);
							bot.answerCallbackQuery(message.id, { text: 'Hai offerto ' + formatNumber(price) + ' § per ' + itemName });
						})
					}

					const iKeys = []
					iKeys.push([{
						text: '♻️ Aggiorna',
						callback_data: 'asta:' + auction_id + ':' + 'update'
					}])
					iKeys.push([{
						text: '+1k',
						callback_data: 'asta:' + auction_id + ':' + '1000'
					}])
					iKeys.push([{
						text: '+10k',
						callback_data: 'asta:' + auction_id + ':' + '10000'
					}])
					iKeys.push([{
						text: '+100k',
						callback_data: 'asta:' + auction_id + ':' + '100000'
					}])

					let last = message.from.username
					if (update == 1) {
						const tmp = await connection.queryAsync('SELECT nickname FROM player WHERE id = ' + last_player)
						last = tmp[0].nickname
						price = last_price

						d = new Date(original_time_end)
						short_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

						bot.answerCallbackQuery(message.id, { text: 'Asta aggiornata!' })
					}

					const text = '<b>Asta per ' + itemName + '</b>\n\n<b>Creatore</b>: ' + creator_nickname + '\n<b>Offerta</b>: ' + formatNumber(price) + ' §\n<b>Offerente:</b> ' + last + '\n<b>Scade alle:</b> ' + short_date

					if (message.inline_message_id != undefined) {
						bot.editMessageText(text, {
							inline_message_id: message.inline_message_id,
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: iKeys
							}
						})
					} else {
						bot.editMessageText(text, {
							chat_id: message.chat.id,
							message_id: message.message.message_id,
							parse_mode: 'HTML',
							reply_markup: {
								inline_keyboard: iKeys
							}
						})
					}
				})
			})
			return
		}

		let index = check.indexOf(message.from.id)
		const shop_id = message.data
		let diff = 0

		if (shop_id.indexOf(':') == -1) { await updateShop(message, shop_id, 1, '') }

		if ((shop_id.indexOf(':') == -1) || (shop_id.indexOf('all') != -1) || (shop_id.indexOf('delete') != -1)) {
			if (index == -1) {
				check.push(message.from.id)
				bot.answerCallbackQuery(message.id, { text: 'Premi ancora per confermare' })
				return
			} else { index = check.indexOf(message.from.id) }

			if (timevar[message.from.id] != undefined) {
				diff = Math.round(new Date() / 1000) - timevar[message.from.id]
				if (diff < 2) {
					bot.answerCallbackQuery(message.id, { text: 'Attendi 2 secondi e riprova' })
					return
				}
			}
			timevar[message.from.id] = Math.round(new Date() / 1000)
		}

		if (rows[0].market_ban == 1) {
			bot.answerCallbackQuery(message.id, { text: 'Sei bannato dal mercato!' })
			return
		}

		if (rows[0].holiday == 1) {
			bot.answerCallbackQuery(message.id, { text: 'Sei in modalità vacanza!' })
			return
		}

		if (shop_id.indexOf(':') != -1) {
			var split = shop_id.split(':')
			const code = split[1]

			if (split[0] == 'update') {
				await updateShop(message, code, undefined, '')
				check.splice(index, 1)
			} else if (split[0] == 'delete') {
				connection.query('SELECT player_id FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err

					if (Object.keys(rows).length == 0) {
						bot.answerCallbackQuery(message.id, { text: 'Il codice negozio non esiste' })
						check.splice(index, 1)
						return
					}

					if (player_id != rows[0].player_id) {
						bot.answerCallbackQuery(message.id, { text: 'Puoi cancellare solo i negozi che hai creato tu' })
						check.splice(index, 1)
						return
					}

					connection.query('DELETE FROM public_shop WHERE code = ' + code, async function (err, rows, fields) {
						if (err) throw err
						bot.answerCallbackQuery(message.id, { text: 'Negozio eliminato!' })

						await updateShop(message, code, undefined, '')
						check.splice(index, 1)
					})
				})
			} else if (split[0] == 'all') {
				connection.query('SELECT SUM(quantity) As cnt FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
					if (err) throw err

					if (rows[0].cnt == 0) {
						bot.answerCallbackQuery(message.id, { text: 'Il negozio è vuoto' })
						check.splice(index, 1)
						return
					}

					connection.query('SELECT player_id, price, item_id, quantity, massive, protected, autodel FROM public_shop WHERE code = ' + code, async function (err, rows, fields) {
						if (err) throw err

						if (Object.keys(rows).length == 0) {
							bot.answerCallbackQuery(message.id, { text: 'Il codice negozio non esiste' })
							check.splice(index, 1)
							return
						}

						if (rows[0].massive == 0) {
							bot.answerCallbackQuery(message.id, { text: 'Acquisto massivo disabilitato per questo negozio' })
							check.splice(index, 1)
							return
						}

						if (rows[0].protected == 1) {
							bot.answerCallbackQuery(message.id, { text: 'Il negozio è protetto' })
							check.splice(index, 1)
							return
						}

						const player_id2 = rows[0].player_id
						const autodel = rows[0].autodel
						let total_price = 0
						let pQnt = 0

						for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
							pQnt = await getItemCnt(player_id2, rows[i].item_id)
							if ((rows[i].quantity < 1) || (pQnt < 1)) { continue }

							if (pQnt > rows[i].quantity) { pQnt = rows[i].quantity }

							total_price += rows[i].price * pQnt
						}

						if (total_price == 0) {
							bot.answerCallbackQuery(message.id, { text: 'Il proprietario non possiede abbastanza oggetti!' })
							check.splice(index, 1)
							return
						}

						if (money - total_price < 0) {
							bot.answerCallbackQuery(message.id, { text: 'Non hai abbastanza monete, ti servono ' + formatNumber(total_price) + ' §!' })
							check.splice(index, 1)
							return
						}

						connection.query('SELECT nickname, account_id, market_ban, money FROM player WHERE id = ' + player_id2, async function (err, rows, fields) {
							if (err) throw err

							const player2 = rows[0].nickname
							const chat_id2 = rows[0].account_id

							const banReason = await isBanned(rows[0].account_id)
							if (banReason != null) {
								bot.answerCallbackQuery(message.id, { text: 'Non puoi acquistare da un giocatore bannato' })
								check.splice(index, 1)
								return
							}

							if (rows[0].market_ban == 1) {
								bot.answerCallbackQuery(message.id, { text: 'Non puoi acquistare da un giocatore escluso dal mercato' })
								check.splice(index, 1)
								return
							}

							if (player_id == player_id2) {
								bot.answerCallbackQuery(message.id, { text: 'Non puoi acquistare da te stesso!' })
								check.splice(index, 1)
								return
							}

							if (total_price + rows[0].money > 1000000000) {
								bot.answerCallbackQuery(message.id, { text: 'Il giocatore raggiungerebbe il cap con questo acquisto' })
								check.splice(index, 1)
								return
							}

							await addMoney(player_id2, total_price);
							await reduceMoney(player_id, total_price);

							connection.query('SELECT player_id, price, item_id, quantity FROM public_shop WHERE code = ' + code, async function (err, rows, fields) {
								if (err) throw err

								const d2 = new Date()
								const long_date = d2.getFullYear() + '-' + addZero(d2.getMonth() + 1) + '-' + addZero(d2.getDate()) + ' ' + addZero(d2.getHours()) + ':' + addZero(d2.getMinutes()) + ':' + addZero(d2.getSeconds())

								let text = 'Hai acquistato il negozio di ' + player2 + ' contenente:\n'
								const len = Object.keys(rows).length
								let qnt = 0
								let pQnt = 0

								for (let i = 0; i < len; i++) {
									pQnt = await getItemCnt(player_id2, rows[i].item_id)
									if ((rows[i].quantity > 0) && (pQnt > 0)) {
										if (pQnt > rows[i].quantity) { qnt = rows[i].quantity } else { qnt = pQnt }
										await addItem(player_id, rows[i].item_id, qnt)
										delItem(player_id2, rows[i].item_id, qnt)

										const item = await connection.queryAsync('SELECT name FROM item WHERE id = ' + rows[i].item_id)
										text += '> ' + formatNumber(qnt) + 'x ' + item[0].name + ' per ' + formatNumber(qnt * rows[i].price) + ' §\n'
										// console.log(formatNumber(qnt) + " " + item[0].name + " " + formatNumber(qnt*rows[i].price));

										connection.query('INSERT INTO market_direct_history (item_id, price, quantity, time, from_id, to_id, type) VALUES (' + rows[i].item_id + ',' + rows[i].price + ',' + qnt + ',"' + long_date + '",' + player_id2 + ',' + player_id + ',2)', function (err, rows, fields) {
											if (err) throw err
										})

										connection.query('UPDATE public_shop SET quantity = quantity-' + qnt + ' WHERE quantity > 0 AND item_id = ' + rows[i].item_id + ' AND code = ' + code, function (err, rows, fields) {
											if (err) throw err
										})
									}
								}
								text += '\nPer un totale di ' + formatNumber(total_price) + ' §\n'

								console.log(getNow('it') + ' - Acquisto di tutto il negozio da parte di ' + message.from.username + ' (' + shop_id + ', ' + formatNumber(total_price) + ' §)')

								bot.sendMessage(message.from.id, text)

								connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + player_id2 + ' AND type = 2', function (err, rows, fields) {
									if (err) throw err
									let notify = 0
									if (Object.keys(rows).length == 0) { notify = 1 } else {
										if (rows[0].deny == 0) { notify = 1 }
									}
									if (notify == 1) { bot.sendMessage(chat_id2, message.from.username + ' ha acquistato tutto il tuo negozio (' + code + ') per ' + formatNumber(total_price) + ' §!\nDi conseguenza le quantità relative agli oggetti acquistati sono state ridotte.') }
								})

								if (autodel == 1) {
									connection.query('DELETE FROM public_shop WHERE code = "' + code + '"', function (err, rows, fields) {
										if (err) throw err
										bot.sendMessage(chat_id2, 'Il negozio è stato automaticamente eliminato!')
									})
								}

								await updateShop(message, code, undefined, 'Acquisto completato per ' + formatNumber(total_price) + ' §!')

								check.splice(index, 1)
							})
						})
					})
				})
			}
			return
		}

		connection.query('SELECT player_id, price, item_id, quantity, code, protected, massive, autodel FROM public_shop WHERE id = ' + shop_id, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.answerCallbackQuery(message.id, { text: 'L\'oggetto è stato rimosso, aggiorna il negozio!' })
				check.splice(index, 1)
				return
			}

			const player_id2 = rows[0].player_id
			const price = rows[0].price
			const item_id = rows[0].item_id
			const quantity = rows[0].quantity
			const code = rows[0].code
			const autodel = rows[0].autodel

			if (rows[0].protected == 1) {
				bot.answerCallbackQuery(message.id, { text: 'Il negozio è protetto!' })
				check.splice(index, 1)
				return
			}

			if (rows[0].massive == 2) {
				bot.answerCallbackQuery(message.id, { text: 'Acquisto massivo obbligato per questo negozio' })
				check.splice(index, 1)
				return
			}

			connection.query('SELECT nickname, account_id, market_ban FROM player WHERE id = ' + player_id2, async function (err, rows, fields) {
				if (err) throw err

				const player2 = rows[0].nickname
				const chat_id2 = rows[0].account_id

				const banReason = await isBanned(rows[0].account_id)
				if (banReason != null) {
					bot.answerCallbackQuery(message.id, { text: 'Non puoi acquistare da un giocatore bannato' })
					check.splice(index, 1)
					return
				}

				if (rows[0].market_ban == 1) {
					bot.answerCallbackQuery(message.id, { text: 'Non puoi acquistare da un giocatore escluso dal mercato' })
					check.splice(index, 1)
					return
				}

				if (money - price < 0) {
					bot.answerCallbackQuery(message.id, { text: 'Non hai abbastanza monete!' })
					check.splice(index, 1)
					return
				}

				if (quantity < 1) {
					bot.answerCallbackQuery(message.id, { text: 'Sono finite le scorte dell\'oggetto richiesto!' })
					check.splice(index, 1)
					return
				}

				if (player_id == player_id2) {
					bot.answerCallbackQuery(message.id, { text: 'Non puoi acquistare da te stesso!' })
					check.splice(index, 1)
					return
				}

				connection.query('SELECT item.name, inventory.quantity FROM inventory, item WHERE inventory.item_id = item.id AND item.id = ' + item_id + ' AND inventory.player_id = ' + player_id2 + ' AND inventory.quantity > 0', async function (err, rows, fields) {
					if (err) throw err
					if (Object.keys(rows).length == 0) {
						bot.answerCallbackQuery(message.id, { text: 'Il proprietario del negozio non possiede l\'oggetto' })
						check.splice(index, 1)
						return
					}
					if (rows[0].quantity == 0) {
						bot.answerCallbackQuery(message.id, { text: 'Il proprietario del negozio non possiede l\'oggetto' })
						check.splice(index, 1)
						return
					}

					const item_name = rows[0].name

					await addMoney(player_id2, price);
					await reduceMoney(player_id, price);
					connection.query('UPDATE public_shop SET quantity = quantity - 1 WHERE quantity > 0 AND id = ' + shop_id, async function (err, rows, fields) {
						if (err) throw err
						if (rows.affectedRows == 0) {
							bot.answerCallbackQuery(message.id, { text: 'Errore durante l\'acquisto, riprova' })
							check.splice(index, 1)
							return
						}

						delItem(player_id2, item_id, 1)
						await addItem(player_id, item_id)

						connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + player_id + ' AND type = 4', function (err, rows, fields) {
							if (err) throw err
							let notify = 0
							if (Object.keys(rows).length == 0) { notify = 1 } else {
								if (rows[0].deny == 0) { notify = 1 }
							}
							if (notify == 1) { bot.sendMessage(message.from.id, 'Hai acquistato ' + item_name + ' per ' + formatNumber(price) + ' § dal negozio di ' + player2 + '!') }
						})

						connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + player_id2 + ' AND type = 2', function (err, rows, fields) {
							if (err) throw err
							let notify = 0
							if (Object.keys(rows).length == 0) { notify = 1 } else {
								if (rows[0].deny == 0) { notify = 1 }
							}
							if (notify == 1) { bot.sendMessage(chat_id2, message.from.username + ' ha acquistato ' + item_name + ' per ' + formatNumber(price) + ' § dal tuo negozio (' + code + ')!') }
						})

						if (quantity - 1 == 0) { bot.sendMessage(chat_id2, 'Le scorte di ' + item_name + ' sono terminate!') }

						const d2 = new Date()
						const long_date = d2.getFullYear() + '-' + addZero(d2.getMonth() + 1) + '-' + addZero(d2.getDate()) + ' ' + addZero(d2.getHours()) + ':' + addZero(d2.getMinutes()) + ':' + addZero(d2.getSeconds())

						connection.query('INSERT INTO market_direct_history (item_id, price, time, from_id, to_id, type) VALUES (' + item_id + ',' + price + ',"' + long_date + '",' + player_id2 + ',' + player_id + ',2)', function (err, rows, fields) {
							if (err) throw err
						})

						console.log(getNow('it') + ' - Acquisto da parte di ' + message.from.username + ' (' + shop_id + ', ' + item_name + ', ' + formatNumber(price) + ' §)')

						connection.query('SELECT COUNT(id) As cnt FROM public_shop WHERE quantity > 0 AND code = "' + code + '"', async function (err, rows, fields) {
							if (err) throw err

							if ((autodel == 1) && (rows[0].cnt == 0)) {
								connection.query('DELETE FROM public_shop WHERE code = "' + code + '"', function (err, rows, fields) {
									if (err) throw err
									bot.sendMessage(chat_id2, 'Il negozio è stato automaticamente eliminato!')
								})
							}

							await updateShop(message, code, undefined, 'Acquisto di ' + item_name + ' per ' + formatNumber(price) + ' §!')

							check.splice(index, 1)
							if (Object.keys(check).length > 100) { check = [] }
						})
					})
				})
			})
		})
	})
})

bot.onText(/^\/crealotteria(?!p) (.+)|^\/crealotteria(?!p)$/, function (message, match) {
	let oggetto = match[1]
	if ((oggetto == undefined) || (oggetto == '')) {
		bot.sendMessage(message.chat.id, "Per inserire una lotteria utilizza la seguente sintassi: '/crealotteria NomeOggetto numeroMassimoPartecipanti', l'oggetto viene rimosso dall'inventario appena creata la lotteria e il numero di partecipanti minimo è 5")
		return
	}

	let max_players = -1
	let max_text = ''
	var match = oggetto.match(/\d+/g)
	if (match != null) {
		oggetto = oggetto.replace(/\d+/g, '').trim()
		max_players = parseInt(match[0])
		max_text = ', massimi: ' + max_players
		if (isNaN(max_players) || (max_players < 5)) {
			bot.sendMessage(message.chat.id, 'Numero massimo di partecipanti non valido, minimo 5')
			return
		}
	}

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		connection.query('SELECT 1 FROM public_lottery WHERE creator_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length > 0) {
				bot.sendMessage(message.chat.id, 'Puoi gestire solo una lotteria alla volta')
				return
			}

			connection.query('SELECT 1 FROM public_lottery WHERE chat_id = -1001069842056', function (err, rows, fields) {
				if (err) throw err
				if ((Object.keys(rows).length > 0) && (message.chat.id == -1001069842056)) {
					bot.sendMessage(message.chat.id, 'In questo gruppo può esistere solamente una lotteria alla volta')
					return
				}

				connection.query('SELECT item.allow_sell, item.id FROM inventory, item WHERE inventory.item_id = item.id AND item.name = "' + oggetto + '" AND inventory.player_id = ' + player_id + ' AND inventory.quantity > 0', function (err, rows, fields) {
					if (err) throw err
					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, "Devi possedere l'oggetto per creare una lotteria")
						return
					}

					if (rows[0].allow_sell == 0) {
						bot.sendMessage(message.chat.id, 'Questo oggetto non può essere utilizzato per una lotteria')
						return
					}

					const item_id = rows[0].id
					delItem(player_id, item_id, 1)

					const d = new Date()
					d.setHours(d.getHours() + 48)
					const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

					connection.query('INSERT INTO public_lottery (chat_id, creator_id, item_id, time_end, max_players) VALUES (' + message.chat.id + ',' + player_id + ',' + item_id + ',"' + long_date + '", ' + max_players + ')', function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Lotteria creata! Usa `/lotteria @' + message.from.username + '` per iscriverti e /estrazione per estrarre il vincitore. Partecipanti minimi: 5' + max_text + '.\nScadrà tra 48 ore.', mark)
					})
				})
			})
		})
	})
})

bot.onText(/^\/crealotteriap ([^\s]+) (.+)|^\/crealotteriap$/, function (message, match) {
	if ((message.chat.id == '-1001069842056') || (message.chat.id == '-1001064571576')) {
		bot.sendMessage(message.chat.id, 'Non possono essere create lotterie in questo gruppo')
		return
	}

	let prezzo = parseInt(match[1])
	let oggetto = match[2]
	if ((oggetto == undefined) || (oggetto == '') || (isNaN(prezzo)) || (prezzo == 0)) {
		bot.sendMessage(message.chat.id, "Per inserire una lotteria a pagamento utilizza la seguente sintassi: '/crealotteriap Prezzo NomeOggetto numeroMassimoPartecipanti', l'oggetto viene rimosso dall'inventario appena creata la lotteria e il numero di partecipanti minimo è 5. Se la lotteria viene annullata le monete vengono restituite.", mark)
		return
	}

	let max_players = -1
	let max_text = ''
	var match = oggetto.match(/\d+/g)
	if (match != null) {
		oggetto = oggetto.replace(/\d+/g, '').trim()
		max_players = parseInt(match[0])
		max_text = ', massimi: ' + max_players
		if (isNaN(max_players) || (max_players < 5)) {
			bot.sendMessage(message.chat.id, 'Numero massimo di partecipanti non valido, minimo 5')
			return
		}
	}

	prezzo = prezzo.toString().replaceAll(/\./, '')

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		connection.query('SELECT 1 FROM public_lottery WHERE creator_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length > 0) {
				bot.sendMessage(message.chat.id, 'Puoi gestire solo una lotteria alla volta')
				return
			}

			connection.query('SELECT 1 FROM public_lottery WHERE chat_id = -1001069842056', function (err, rows, fields) {
				if (err) throw err
				if ((Object.keys(rows).length > 0) && (message.chat.id == -1001069842056)) {
					bot.sendMessage(message.chat.id, 'In questo gruppo può esistere solamente una lotteria alla volta')
					return
				}

				connection.query('SELECT item.id, item.allow_sell, item.value, item.rarity FROM inventory, item WHERE inventory.item_id = item.id AND item.name = "' + oggetto + '" AND inventory.player_id = ' + player_id + ' AND inventory.quantity > 0', function (err, rows, fields) {
					if (err) throw err
					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, "Devi possedere l'oggetto per creare una lotteria")
						return
					}

					if ((rows[0].allow_sell == 0) || (rows[0].rarity == 'IN')) {
						bot.sendMessage(message.chat.id, 'Questo oggetto non può essere utilizzato per una lotteria a pagamento')
						return
					}

					const item_id = rows[0].id

					if ((prezzo > parseInt(rows[0].value * 2)) || (prezzo < Math.round(rows[0].value / 100))) {
						bot.sendMessage(message.chat.id, 'Il prezzo inserito non è valido, max: ' + parseInt(rows[0].value * 2) + ', min: ' + Math.round(rows[0].value / 100))
						return
					}

					const d = new Date()
					d.setHours(d.getHours() + 48)
					const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

					delItem(player_id, item_id, 1)

					connection.query('INSERT INTO public_lottery (chat_id, creator_id, item_id, price, time_end, max_players) VALUES (' + message.chat.id + ',' + player_id + ',' + item_id + ',' + prezzo + ',"' + long_date + '", ' + max_players + ')', function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Lotteria creata! Usa `/lotteriap @' + message.from.username + '` per iscriverti e /estrazione per estrarre il vincitore. Partecipanti minimi: 5' + max_text + '\nPrezzo partecipazione: ' + formatNumber(prezzo) + ' §.\nScadrà tra 48 ore.', mark)
					})
				})
			})
		})
	})
})

bot.onText(/^\/estrazione/, async function (message) {
	/*
	if (message.from.id != 20471035){
	  bot.sendMessage(message.chat.id, "L'estrazione manuale è al momento disabilitata", mark)
	  return;
	}
	*/

	if (!checkSpam(message)) { return }

	connection.query('SELECT id, account_id, market_ban, holiday FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		connection.query('SELECT id, item_id, money FROM public_lottery WHERE creator_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Non esiste nessuna lotteria creata da te')
				return
			}

			const lottery_id = rows[0].id
			const item_id = rows[0].item_id
			const money = rows[0].money

			connection.query('SELECT player_id FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
				if (err) throw err
				const num = Object.keys(rows).length
				if (Object.keys(rows).length < 5) {
					bot.sendMessage(message.chat.id, "Non ci sono abbastanza partecipanti per l'estrazione: " + Object.keys(rows).length + '/5')
					return
				}
				const rand = Math.round(Math.random() * (Object.keys(rows).length - 1))
				// console.log("Estrazione: " + rand);
				const extracted = rows[rand].player_id
				connection.query('SELECT nickname FROM player WHERE id = ' + extracted, async function (err, rows, fields) {
					if (err) throw err
					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, 'Non ho trovato il giocatore estratto!')
						return
					}

					const nickname = rows[0].nickname
					await addItem(extracted, item_id)
					connection.query('SELECT item.name FROM item WHERE id = ' + item_id, async function (err, rows, fields) {
						if (err) throw err
						const itemName = rows[0].name
						let extra = ''
						if (money > 0) { extra = ' ed un ammontare pari a ' + formatNumber(money) + ' §' }
						bot.sendMessage(message.chat.id, 'Estrazione per ' + itemName + ' con ' + num + ' partecipanti' + extra + '!\n\nIl vincitore è: @' + nickname + '!')

						await addMoney(player_id, money);

						const d = new Date()
						const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

						connection.query('INSERT INTO public_lottery_history (creator_id, player_id, item_id, money, time) VALUES (' + player_id + ',' + extracted + ',' + item_id + ',' + money + ',"' + long_date + '")', function (err, rows, fields) {
							if (err) throw err
						})

						connection.query('SELECT chat_id, nickname, account_id FROM public_lottery_players, player WHERE player.id = player_id AND lottery_id = ' + lottery_id, function (err, rows, fields) {
							if (err) throw err
							for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
								if (rows[i].nickname != nickname) { bot.sendMessage(rows[i].chat_id, 'Estrazione per ' + itemName + ' terminata, purtroppo hai perso!') } else { bot.sendMessage(rows[i].chat_id, 'Estrazione per ' + itemName + ' terminata, HAI VINTO!') }
							}
							connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
								if (err) throw err
								connection.query('DELETE FROM public_lottery WHERE id = ' + lottery_id, function (err, rows, fields) {
									if (err) throw err
									// console.log("Lotteria terminata");
								})
							})
						})
					})
				})
			})
		})
	})
})

bot.onText(/^\/lotterie/, function (message) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id

		connection.query('SELECT item.id, item.name, player.nickname, P.price, (SELECT COUNT(id) FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = P.id) As subs FROM player, item, public_lottery P WHERE P.item_id = item.id AND P.creator_id = player.id ORDER BY id, price', function (err, rows, fields) {
			if (err) throw err
			let text = 'Non ci sono lotterie disponibili'
			let p = ''
			let s = ''
			const free = 1
			if (Object.keys(rows).length > 0) {
				text = ''
				let last_item = 0
				for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
					if (last_item != rows[i].id) {
						last_item = rows[i].id
						text += '\n> <b>' + rows[i].name + '</b>\n'
					}

					p = ''
					if (rows[i].price > 0) { p = ' (' + formatNumber(rows[i].price) + ' §)' }
					s = ''
					if (rows[i].subs != 0) { s = ' ✅' }

					text += '- <code>' + rows[i].nickname + '</code> ' + p + s + '\n'
				}

				text += '\nPer iscriverti ad una lotteria usa /lotteria o /lotteriap'
				bot.sendMessage(message.chat.id, text, html)
			} else { bot.sendMessage(message.chat.id, 'Nessuna lotteria disponibile', html) }
		})
	})
})

bot.onText(/^\/iscritti/, function (message) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id

		connection.query('SELECT id FROM public_lottery WHERE creator_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Al momento non hai creato una lotteria')
				return
			}

			const lottery_id = rows[0].id

			connection.query('SELECT nickname FROM public_lottery_players L, player P WHERE L.player_id = P.id AND lottery_id = ' + lottery_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Nessun iscritto alla tua lotteria')
					return
				}
				let text = 'Iscritti alla tua lotteria:'
				for (let i = 0, len = Object.keys(rows).length; i < len; i++) { text += '\n> ' + rows[i].nickname }

				bot.sendMessage(message.chat.id, text)
			})
		})
	})
})

bot.onText(/^\/paga (.+)|^\/paga/i, async function (message, match) {
	if (!checkSpam(message)) { return }

	const syntax = "Sintassi: '/paga prezzo,acquirente,messaggio (facoltativo)' (senza acquirente in caso di risposta)"
	let text = ''

	if (message.text.indexOf(' ') != -1) { text = message.text.substring(message.text.indexOf(' ') + 1, message.text.lenght) } else {
		bot.sendMessage(message.from.id, syntax)
		return
	}

	if (message.reply_to_message != undefined) { text = text + ',' + message.reply_to_message.from.username }

	const elements = text.split(',')

	if ((Object.keys(elements).length < 2) || (Object.keys(elements).length > 3)) {
		bot.sendMessage(message.from.id, 'Numero parametri errato: ' + Object.keys(elements).length + ' su 2/3\n' + syntax)
		return
	}

	let price = elements[0]

	const reg = /(\d)k/gm
	if (reg.test(price)) { price = price.replaceAll(/k/gi, '000') }

	if (price != 'tutto') { price = parseInt(price.replace(/\D+/gi, '').trim().replaceAll(/\./, '')) }

	if (price >= 1000000000) {
		bot.sendMessage(message.from.id, 'Puoi inviare al massimo 1.000.000.000 monete!')
		return
	}

	let buyer
	if (message.reply_to_message != undefined) {
		if (Object.keys(elements).length == 3) { buyer = elements[2].replace('@', '').trim() } else { buyer = elements[1].replace('@', '').trim() }
	} else { buyer = elements[1].replace('@', '').trim() }

	let custom_message = ''
	if (message.reply_to_message != undefined) { custom_message = elements[1].trim() } else {
		if (Object.keys(elements).length == 3) { custom_message = elements[2] }
	}

	if (custom_message.indexOf(buyer) != -1) { custom_message = '' }

	if (buyer == '') {
		bot.sendMessage(message.from.id, 'Il parametro acquirente è obbligatorio')
		return
	}

	if (price != 'tutto') {
		if (isNaN(price)) {
			bot.sendMessage(message.from.id, 'Il parametro prezzo non è valido (' + price + ')')
			return
		}
		if (price <= 0) {
			bot.sendMessage(message.from.id, 'Il parametro prezzo deve essere maggiore di zero (' + price + ')')
			return
		}
	}

	connection.query('SELECT account_id, id, money, holiday, market_ban, exp, reborn FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}
		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}
		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		if ((Math.floor(rows[0].exp / 10) < 50) && (rows[0].reborn == 1)) {
			bot.sendMessage(message.from.id, 'Questo comando è utilizzabile solo dal livello 50')
			return
		}

		const player_id = rows[0].id
		const mymoney = rows[0].money

		if (price == 'tutto') { price = mymoney }

		if (mymoney < price) {
			bot.sendMessage(message.from.id, 'Non hai abbastanza credito a disposizione, ti mancano ' + formatNumber(price - mymoney) + ' monete')
			return
		}

		connection.query('SELECT money, id, chat_id, market_ban, account_id FROM player WHERE nickname = "' + buyer + '"', async function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, "L'acquirente inserito non esiste (" + buyer + ')')
				return
			}

			if (message.from.id != 20471035) {
				if (buyer.toLowerCase() == message.from.username.toLowerCase()) {
					bot.sendMessage(message.from.id, 'Non puoi inviare monete a te stesso')
					return
				}
			}

			const banReason = await isBanned(rows[0].account_id)
			if (banReason != null) {
				bot.sendMessage(message.from.id, 'Il destinatario è bannato dal gioco')
				return
			}

			if (rows[0].market_ban == 1) {
				bot.sendMessage(message.from.id, 'Il destinatario è bannato dal mercato')
				return
			}

			if ((parseInt(rows[0].money) + price) > 1000000000) {
				bot.sendMessage(message.from.id, 'Il destinatario raggiungerebbe il limite alle monete possedute con questa cifra, riprova')
				return
			}

			const player_id2 = rows[0].id
			const chat_id = rows[0].account_id

			const d2 = new Date()
			const long_date = d2.getFullYear() + '-' + addZero(d2.getMonth() + 1) + '-' + addZero(d2.getDate()) + ' ' + addZero(d2.getHours()) + ':' + addZero(d2.getMinutes()) + ':' + addZero(d2.getSeconds())

			connection.query('INSERT INTO pay_history (from_id, to_id, price, hist_time) VALUES (' + player_id + ',' + player_id2 + ',' + price + ',"' + long_date + '")', async function (err, rows, fields) {
				if (err) throw err;
				await reduceMoney(player_id, price);
				await addMoney(player_id2, price);
				bot.sendMessage(message.from.id, message.from.username + ', hai inviato <b>' + formatNumber(price) + ' §</b> a ' + buyer, html);
				bot.sendMessage(chat_id, 'Hai ricevuto <b>' + formatNumber(price) + ' §</b> da ' + message.from.username + '!\n<i>' + custom_message + '</i>', html);
			})
		})
	})
})

bot.onText(/^\/annullav/i, function (message) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id

		connection.query('SELECT item_id FROM market_direct WHERE player_id = ' + player_id, async function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, 'Nessun offerta da annullare')
				return
			}

			const item_id = rows[0].item_id
			await addItem(player_id, item_id)
			connection.query('DELETE FROM market_direct WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err
				bot.sendMessage(message.from.id, 'Offerta annullata!')
			})
		})
	})
})

bot.onText(/^\/offri/i, function (message) {
	let text = ''
	let item = ''
	let price = 0
	const time = 0
	let buyer = ''

	const syntax = "Sintassi: '/offri oggetto,prezzo,acquirente' (senza acquirente in caso di risposta)"

	if (message.text.indexOf(' ') != -1) { text = message.text.substring(message.text.indexOf(' ') + 1, message.text.lenght) } else {
		bot.sendMessage(message.from.id, syntax)
		return
	}

	const elements = text.split(',')

	if (Object.keys(elements).length == 1) { elements.push('1') }

	if (message.reply_to_message != undefined) {
		if (message.reply_to_message.from.is_bot == 0) { elements.push(message.reply_to_message.from.username) }
	}

	if (Object.keys(elements).length != 3) {
		bot.sendMessage(message.from.id, "Numero parametri errato nell'offerta: " + Object.keys(elements).length + ' su 3\n' + syntax)
		return
	}

	if (Object.keys(elements).length < 3) {
		bot.sendMessage(message.from.id, "Numero parametri non sufficiente nell'offerta: " + Object.keys(elements).length + ' su 3\n' + syntax)
		return
	}

	item = elements[0].trim()
	price = parseInt(elements[1].replace(/[^\w\s]/gi, '').trim().replaceAll(/\./, '').replaceAll(/\k/, '000'))
	if (elements[2] == undefined) {
		bot.sendMessage(message.from.id, 'Errore parametro')
		return
	}
	buyer = elements[2].replace('@', '').trim()

	if (item == '') {
		bot.sendMessage(message.from.id, 'Il parametro oggetto è obbligatorio')
		return
	}
	if (buyer == '') {
		bot.sendMessage(message.from.id, 'Il parametro acquirente è obbligatorio')
		return
	}
	if (isNaN(price)) { price = 0 } // imposta al minimo dopo

	connection.query('SELECT account_id, holiday, market_ban, id, money FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}
		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}
		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		const player_id = rows[0].id
		const mymoney = rows[0].money

		connection.query('SELECT id FROM market_direct WHERE player_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length > 0) {
				bot.sendMessage(message.from.id, 'Puoi inserire solo una vendita alla volta')
				return
			}

			connection.query('SELECT player_id, datetime FROM plus_shop_timeout WHERE player_id2 = ' + player_id, function (err, rows, fields) {
				if (err) throw err

				let timeout_date = ''
				let timeout_id = 0
				const now = new Date()
				if (Object.keys(rows).length > 0) {
					timeout_date = new Date(rows[0].datetime)
					timeout_id = rows[0].player_id
				}

				connection.query('SELECT 1 FROM item WHERE name = "' + item + '"', function (err, rows, fields) {
					if (err) throw err

					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.from.id, "L'oggetto inserito non esiste.")
						return
					}

					connection.query('SELECT item.allow_sell, item.value, item.max_value, item.id, item.name, inventory.quantity FROM item, inventory WHERE item.id = inventory.item_id AND item.name = "' + item + '" AND inventory.player_id = ' + player_id + ' AND inventory.quantity > 0', function (err, rows, fields) {
						if (err) throw err
						if (Object.keys(rows).length == 0) {
							bot.sendMessage(message.from.id, "Non possiedi l'oggetto che hai inserito.")
							return
						}
						if (rows[0].quantity == 0) {
							bot.sendMessage(message.from.id, "Non possiedi l'oggetto che hai inserito.")
							return
						}
						if (rows[0].allow_sell == 0) {
							bot.sendMessage(message.chat.id, 'Questo oggetto non può essere venduto')
							return
						}

						const item_val = rows[0].value
						const item_max_val = rows[0].max_value
						const item_id = rows[0].id
						const item_name = rows[0].name

						const d2 = new Date()
						d2.setMinutes(d2.getMinutes() + 30)
						const long_date = d2.getFullYear() + '-' + addZero(d2.getMonth() + 1) + '-' + addZero(d2.getDate()) + ' ' + addZero(d2.getHours()) + ':' + addZero(d2.getMinutes()) + ':' + addZero(d2.getSeconds())
						const short_date = addZero(d2.getHours()) + ':' + addZero(d2.getMinutes())

						connection.query('SELECT COUNT(nickname) As cnt, id, nickname FROM player WHERE nickname = "' + buyer + '"', function (err, rows, fields) {
							if (err) throw err

							if (rows[0].cnt == 0) {
								bot.sendMessage(message.from.id, "L'acquirente inserito non esiste")
								return
							}

							if (price < item_val) {
								bot.sendMessage(message.from.id, 'Prezzo per ' + item_name + ' impostato al minimo: ' + formatNumber(item_val) + ' §')
								price = item_val
							}

							if (price > item_max_val) {
								bot.sendMessage(message.from.id, 'Prezzo per ' + item_name + ' impostato al massimo: ' + formatNumber(item_max_val) + ' §')
								price = item_max_val
							}

							const buyer_id = rows[0].id

							if (message.from.id != 20471035) {
								if (buyer_id == player_id) {
									bot.sendMessage(message.from.id, 'Non puoi vendere a te stesso')
									return
								}

								if (timeout_id == buyer_id) {
									if (timeout_date < now) {
										connection.query('DELETE FROM plus_shop_timeout WHERE player_id2 = ' + player_id, function (err, rows, fields) {
											if (err) throw err
										})
									} else {
										bot.sendMessage(message.from.id, "Attendi un po' di tempo prima di poter commerciare ancora con questo utente")
										return
									}
								}
							}

							const nick = rows[0].nickname

							connection.query('SELECT COUNT(id) As qnt FROM market_direct WHERE buyer = ' + rows[0].id, function (err, rows, fields) {
								if (err) throw err

								if (rows[0].qnt > 0) {
									bot.sendMessage(message.chat.id, 'Questo utente ha già una vendita in corso')
									return
								}

								connection.query('SELECT chat_id, id, account_id FROM player WHERE nickname = "' + buyer + '"', function (err, rows, fields) {
									if (err) throw err
									bot.sendMessage(rows[0].account_id, message.from.username + ' vuole vendere:\n' +
										'> ' + item + ' per ' + formatNumber(price) + ' §\n' +
										'Usa /accettav o /rifiutav')
									const toId = rows[0].id

									delItem(player_id, item_id, 1)

									connection.query('INSERT INTO market_direct VALUES (DEFAULT, ' + player_id + ',"' + item_id + '",' + price + ',"' + long_date + '",' + toId + ')', function (err, rows, fields) {
										if (err) throw err

										const iKeys = []

										iKeys.push([{
											text: '✅ Accetta',
											callback_data: 'okbuy:' + rows.insertId
										}, {
											text: '❌ Rifiuta',
											callback_data: 'notbuy:' + rows.insertId
										}])

										bot.sendMessage(message.chat.id, 'La messa in vendita da parte di ' + message.from.username + ' per ' + item_name + ' a ' + formatNumber(price) + ' § verso ' + nick + ' è stata registrata (scadenza: ' + short_date + ')\n' + message.from.username + ', puoi usare /annullav\n' + nick + ', puoi usare /accettav o /rifiutav', {
											parse_mode: 'HTML',
											disable_web_page_preview: true,
											reply_markup: {
												inline_keyboard: iKeys
											}
										})
									})
								})
							})
						})
					})
				})
			})
		})
	})
})

bot.onText(/^\/rifiutav/i, function (message) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id

		connection.query('SELECT player_id, item_id FROM market_direct WHERE buyer = ' + player_id, async function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, 'Nessuna vendita da rifiutare')
				return
			}

			const creator_id = rows[0].player_id
			const item_id = rows[0].item_id
			await addItem(creator_id, item_id)
			connection.query('DELETE FROM market_direct WHERE player_id = ' + creator_id, function (err, rows, fields) {
				if (err) throw err
				bot.sendMessage(message.from.id, 'Vendita rifiutata!')
				connection.query('SELECT id, chat_id FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(rows[0].chat_id, message.from.username + ' ha rifiutato la tua vendita!')

					const d = new Date()
					d.setMinutes(d.getMinutes() + 10)
					const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

					connection.query('INSERT INTO plus_shop_timeout (player_id, player_id2, datetime) VALUES (' + player_id + ',' + rows[0].id + ',"' + long_date + '")', function (err, rows, fields) {
						if (err) throw err
					})
				})
			})
		})
	})
})

bot.onText(/^\/annullas/i, function (message) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id

		connection.query('SELECT item_1_id, quantity FROM market WHERE player_id = ' + player_id, async function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, 'Nessuno scambio da annullare')
				return
			}

			const item_id = rows[0].item_1_id
			const quantity = rows[0].quantity

			await addItem(player_id, item_id, quantity)

			connection.query('DELETE FROM market WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err
				bot.sendMessage(message.from.id, 'Scambio annullato!')
			})
		})
	})
})

bot.onText(/^\/scambia/i, function (message) {
	connection.query('SELECT account_id, market_ban, holiday, id FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			var text = 'Il tuo account è stato *bannato* per il seguente motivo: _' + banReason + '_'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}
		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		const player_id = rows[0].id
		var text = ''
		let item1 = ''
		let item2 = ''
		let buyer = ''
		let quantity = 1

		const syntax = "Sintassi: '/scambia oggetto1,oggetto2,acquirente,quantità' (senza acquirente in caso di risposta)"

		if (message.text.indexOf(' ') != -1) { text = message.text.substring(message.text.indexOf(' ') + 1, message.text.lenght) } else {
			bot.sendMessage(message.from.id, syntax)
			return
		}

		let noBuyer = 0
		if (message.reply_to_message != undefined) {
			text = text + ',' + message.reply_to_message.from.username
			noBuyer = 1
		}

		const elements = text.split(',')

		if (Object.keys(elements).length < 3) {
			bot.sendMessage(message.from.id, "Numero parametri minimi errato nell'offerta: " + Object.keys(elements).length + ' su 3\n' + syntax)
			return
		}

		item1 = elements[0].trim()
		item2 = elements[1].trim()
		if (noBuyer == 1) { buyer = elements[3].replace('@', '').trim() } else { buyer = elements[2].replace('@', '').trim() }

		if (Object.keys(elements).length == 4) {
			if (noBuyer == 1) { quantity = parseInt(elements[2].trim()) } else { quantity = parseInt(elements[3].trim()) }
		}

		if (item1 == '') {
			bot.sendMessage(message.from.id, 'Il parametro oggetto 1 è obbligatorio')
			return
		}
		if (item2 == '') {
			bot.sendMessage(message.from.id, 'Il parametro oggetto 2 è obbligatorio')
			return
		}
		if (item1.toLowerCase() == item2.toLowerCase()) {
			bot.sendMessage(message.from.id, 'Non puoi inserire due oggetti uguali')
			return
		}
		if (buyer == '') {
			bot.sendMessage(message.from.id, 'Il parametro acquirente è obbligatorio')
			return
		}
		if ((quantity < 1) || (quantity > 100) || (isNaN(quantity))) {
			bot.sendMessage(message.from.id, 'Quantità non valida, minimo 1 massimo 100')
			return
		}

		connection.query('SELECT id FROM market WHERE player_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length > 0) {
				bot.sendMessage(message.from.id, 'Puoi inserire solo uno scambio alla volta')
				return
			}

			connection.query('SELECT player_id, datetime FROM plus_shop_timeout WHERE player_id2 = ' + player_id, function (err, rows, fields) {
				if (err) throw err

				let timeout_date = ''
				let timeout_id = 0
				const now = new Date()
				if (Object.keys(rows).length > 0) {
					timeout_date = new Date(rows[0].datetime)
					timeout_id = rows[0].player_id
				}

				connection.query('SELECT COUNT(nickname) As cnt, id FROM player WHERE nickname = "' + buyer + '"', function (err, rows, fields) {
					if (err) throw err

					if (rows[0].cnt == 0) {
						bot.sendMessage(message.from.id, "L'acquirente inserito non esiste")
						return
					}

					const buyer_id = rows[0].id

					if (message.from.id != 20471035) {
						if (buyer_id == player_id) {
							bot.sendMessage(message.from.id, 'Non puoi scambiare a te stesso')
							return
						}

						if (timeout_id == buyer_id) {
							if (timeout_date < now) {
								connection.query('DELETE FROM plus_shop_timeout WHERE player_id2 = ' + player_id, function (err, rows, fields) {
									if (err) throw err
								})
							} else {
								bot.sendMessage(message.from.id, "Attendi un po' di tempo prima di poter commerciare ancora con questo utente")
								return
							}
						}
					}

					connection.query('SELECT COUNT(id) As qnt FROM market WHERE buyer = ' + buyer_id, function (err, rows, fields) {
						if (err) throw err

						if (rows[0].qnt > 0) {
							bot.sendMessage(message.chat.id, 'Questo utente ha già uno scambio in corso')
							return
						}

						const d2 = new Date()
						d2.setMinutes(d2.getMinutes() + 30)
						const long_date = d2.getFullYear() + '-' + addZero(d2.getMonth() + 1) + '-' + addZero(d2.getDate()) + ' ' + addZero(d2.getHours()) + ':' + addZero(d2.getMinutes()) + ':' + addZero(d2.getSeconds())
						const short_date = addZero(d2.getHours()) + ':' + addZero(d2.getMinutes())

						connection.query('SELECT item.id, item.allow_sell, quantity FROM item, inventory WHERE item.id = inventory.item_id AND item.name = "' + item1 + '" AND inventory.player_id = ' + player_id + ' AND inventory.quantity > 0', function (err, rows, fields) {
							if (err) throw err
							if (Object.keys(rows).length == 0) {
								bot.sendMessage(message.from.id, "L'oggetto " + item1 + ' non è presente nel tuo inventario o non è consentito.')
								return
							}

							if (rows[0].quantity < quantity) {
								bot.sendMessage(message.from.id, "Non hai abbastanza copie dell'oggetto specificato.")
								return
							}

							if (rows[0].allow_sell == 0) {
								bot.sendMessage(message.chat.id, 'Questo oggetto non può essere scambiato')
								return
							}

							const item1_id = rows[0].id

							connection.query('SELECT item.id, item.allow_sell FROM item WHERE item.name = "' + item2 + '"', function (err, rows, fields) {
								if (err) throw err
								if (Object.keys(rows).length == 0) {
									bot.sendMessage(message.from.id, "L'oggetto " + item2 + ' che hai indicato non esiste o non è consentito.')
									return
								}

								if (rows[0].allow_sell == 0) {
									bot.sendMessage(message.chat.id, 'Questo oggetto non può essere scambiato')
									return
								}

								const item2_id = rows[0].id

								connection.query('SELECT chat_id, account_id, id, nickname FROM player WHERE nickname = "' + buyer + '"', function (err, rows, fields) {
									if (err) throw err

									bot.sendMessage(rows[0].account_id, message.from.username + ' vuole scambiare:\n' +
										'> ' + quantity + 'x ' + item1 + ' per ' + quantity + 'x ' + item2 + '\n' +
										'Usa /accettas o /rifiutas')
									const buyer_id = rows[0].id
									const nick = rows[0].nickname

									connection.query('INSERT INTO market VALUES (DEFAULT, ' + player_id + ', ' + item1_id + ',' + item2_id + ',"' + long_date + '",' + buyer_id + ', ' + quantity + ')', function (err, rows, fields) {
										if (err) throw err

										const iKeys = []

										iKeys.push([{
											text: '✅ Accetta',
											callback_data: 'oktrade:' + rows.insertId
										}, {
											text: '❌ Rifiuta',
											callback_data: 'nottrade:' + rows.insertId
										}])

										delItem(player_id, item1_id, quantity)

										bot.sendMessage(message.chat.id, 'Lo scambio dove ' + message.from.username + ' offre ' + quantity + 'x ' + item1 + ' e ' + nick + ' offre ' + quantity + 'x ' + item2 + ' è stato registrato (scadenza: ' + short_date + ')\n' + message.from.username + ' puoi annullarla con /annullas', {
											parse_mode: 'HTML',
											disable_web_page_preview: true,
											reply_markup: {
												inline_keyboard: iKeys
											}
										})
									})
								})
							})
						})
					})
				})
			})
		})
	})
})

bot.onText(/^\/accettav/i, async function (message) {
	if (!checkSpam(message)) { return }

	connection.query('SELECT exp, holiday, id, money, account_id, market_ban FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}
		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}
		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		const player_id = rows[0].id
		const my_money = rows[0].money

		connection.query('SELECT id, item_id, money, buyer, player_id FROM market_direct WHERE buyer = ' + player_id, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, 'La vendita non è disponibile.')
			} else {
				const marketid = rows[0].id
				const item_id = rows[0].item_id
				const money = rows[0].money
				let buyer_id = rows[0].buyer
				const player_id2 = rows[0].player_id

				if (player_id == player_id2) {
					bot.sendMessage(message.from.id, 'Non puoi concludere un acquisto con te stesso')
					return
				}

				if (my_money < money) {
					bot.sendMessage(message.from.id, "Non hai abbastanza credito per completare l'acquisto.")
				} else {
					connection.query('SELECT id, chat_id, account_id, nickname FROM player WHERE id = ' + player_id2, function (err, rows, fields) {
						if (err) throw err

						const player_id2 = rows[0].id
						const chat_id2 = rows[0].account_id
						const nick2 = rows[0].nickname

						connection.query('DELETE FROM market_direct WHERE id = ' + marketid, async function (err, rows, fields) {
							if (err) throw err
							await reduceMoney(player_id, money);
							await addMoney(player_id2, money);
							await addItem(player_id, item_id)

							connection.query('SELECT name FROM item WHERE id = ' + item_id, function (err, rows, fields) {
								if (err) throw err
								bot.sendMessage(chat_id2, message.from.username + ' ha acquistato ' + rows[0].name + ' per ' + formatNumber(money) + ' §!')
								bot.sendMessage(message.chat.id, message.from.username + ", hai completato l'acquisto con " + nick2 + ' per ' + formatNumber(money) + ' §!')

								if (buyer_id == -1) { buyer_id = null }

								const d = new Date()
								const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())
								connection.query('INSERT INTO market_direct_history (item_id, price, time, from_id, to_id, buyer, type) VALUES (' + item_id + ',' + money + ',"' + long_date + '",' + player_id2 + ',' + player_id + ',' + buyer_id + ',1)', function (err, rows, fields) {
									if (err) throw err
								})
							})
						})
					})
				}
			}
		})
	})
})

bot.onText(/^\/rifiutas/i, function (message) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id

		connection.query('SELECT player_id, item_1_id, quantity FROM market WHERE buyer = ' + player_id, async function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, 'Nessuno scambio da rifiutare')
				return
			}

			const creator_id = rows[0].player_id
			const item_id = rows[0].item_1_id
			const quantity = rows[0].quantity

			await addItem(creator_id, item_id, quantity)

			connection.query('DELETE FROM market WHERE player_id = ' + creator_id, function (err, rows, fields) {
				if (err) throw err
				bot.sendMessage(message.from.id, 'Scambio rifiutato!')
				connection.query('SELECT id, chat_id FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(rows[0].chat_id, message.from.username + ' ha rifiutato il tuo scambio!')

					const d = new Date()
					d.setMinutes(d.getMinutes() + 10)
					const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

					connection.query('INSERT INTO plus_shop_timeout (player_id, player_id2, datetime) VALUES (' + player_id + ',' + rows[0].id + ',"' + long_date + '")', function (err, rows, fields) {
						if (err) throw err
					})
				})
			})
		})
	})
})

bot.onText(/^\/accettas/i, function (message) {
	if (!checkSpam(message)) { return }

	connection.query('SELECT id, exp, holiday, account_id, market_ban FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}
		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}
		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		const player_id = rows[0].id

		connection.query('SELECT * FROM market WHERE buyer = ' + player_id, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, 'Lo scambio non è disponibile.')
			} else {
				const marketid = rows[0].id
				const item1 = rows[0].item_1_id
				const item2 = rows[0].item_2_id
				let buyer_id = rows[0].buyer
				const player_id2 = rows[0].player_id
				const quantity = rows[0].quantity

				if (player_id == player_id2) {
					bot.sendMessage(message.from.id, 'Non puoi concludere un acquisto con te stesso')
					return
				}

				connection.query('SELECT item.id, item.name, quantity FROM item, inventory WHERE item.id = inventory.item_id AND inventory.item_id = ' + item2 + ' AND inventory.player_id = ' + player_id + ' AND inventory.quantity > 0', function (err, rows, fields) {
					if (err) throw err

					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.from.id, "Non possiedi l'oggetto richiesto.")
						return
					}

					if (rows[0].quantity < quantity) {
						bot.sendMessage(message.from.id, "Non possiedi abbastanza copie dell'oggetto richiesto.")
						return
					}

					connection.query('SELECT id, chat_id, account_id, nickname FROM player WHERE id = ' + player_id2, function (err, rows, fields) {
						if (err) throw err
						if (Object.keys(rows).length == 0) {
							bot.sendMessage(message.from.id, 'Non ho trovato il giocatore con cui completare lo scambio!')
							return
						}

						const player_id2 = rows[0].id
						const chat_id2 = rows[0].account_id
						const nick2 = rows[0].nickname

						connection.query('DELETE FROM market WHERE id = ' + marketid, async function (err, rows, fields) {
							if (err) throw err
							await addItem(player_id, item1, quantity)
							await addItem(player_id2, item2, quantity)
							delItem(player_id, item2, quantity)

							if (buyer_id == -1) { buyer_id = null }

							const d = new Date()
							const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())
							connection.query('INSERT INTO market_history (item_1, item_2, time, from_id, to_id, buyer, quantity) VALUES (' + item1 + ',' + item2 + ',"' + long_date + '",' + player_id2 + ',' + player_id + ',' + buyer_id + ', ' + quantity + ')', function (err, rows, fields) {
								if (err) throw err
							})

							bot.sendMessage(message.chat.id, message.from.username + ', hai completato lo scambio con ' + nick2 + '!')
							bot.sendMessage(chat_id2, 'Il giocatore ' + message.from.username + ' ha accettato la tua offerta di scambio!')
						})
					})
				})
			}
		})
	})
})

bot.onText(/^\/aste/, function (message) {
	connection.query('SELECT player.nickname, item.name, auction_list.time_end, auction_list.last_price FROM player, item, auction_list WHERE auction_list.item_id = item.id AND auction_list.creator_id = player.id', function (err, rows, fields) {
		if (err) throw err
		let text = 'Non ci sono aste disponibili'
		const p = ''
		if (Object.keys(rows).length > 0) {
			text = 'Aste disponibili:\n'
			const now = new Date()
			const diff = 0
			let time_end = new Date()

			for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
				time_end = new Date(rows[i].time_end)
				min = Math.round(((time_end - now) / 1000) / 60)

				text += '> <code>' + rows[i].nickname + '</code> - ' + rows[i].name + ' (offerta: ' + rows[i].last_price + ' §, scade tra ' + min + ' minuti)' + '\n'
			}
		}
		bot.sendMessage(message.chat.id, text, html)
	})
})

bot.onText(/^\/lotteria(?!p) (.+)|^\/lotteria(?!p)/, function (message, match) {
	if (!checkSpam(message)) { return }

	let nickname = match[1]
	if ((nickname == undefined) || (nickname == '')) {
		bot.sendMessage(message.chat.id, 'Per partecipare ad una lotteria utilizza la seguente sintassi: /lotteria @nickname, mentre /crealotteria per iniziarne una nuova. Puoi anche usare /lotteria tutte')
		return
	}

	nickname = nickname.replace('@', '')

	connection.query('SELECT id, market_ban, money, account_id, holiday FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const money = rows[0].money

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		if (nickname == 'tutte') {
			connection.query('SELECT L.creator_id, L.id, L.price, P.chat_id, P.nickname, L.max_players FROM public_lottery L, player P WHERE P.id = L.creator_id AND L.price = 0 AND L.creator_id != ' + player_id, function (err, rows, fields) {
				if (err) throw err

				const len = Object.keys(rows).length
				let count = 0

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non ci sono lotterie gratuite disponibili!')
					return
				}

				let lottery_id = 0
				let one = 0
				let creator_chat = 0
				let creator_id = 0
				let notify = 0
				let max_players = 0

				for (let i = 0; i < len; i++) {
					lottery_id = rows[i].id
					creator_chat = rows[i].chat_id
					creator_id = rows[i].creator_id
					max_players = rows[i].max_players

					connection.query('SELECT * FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, function (err, rows, fields) {
						if (err) throw err
						if (Object.keys(rows).length == 0) {
							one = 1
							connection.query('INSERT INTO public_lottery_players (lottery_id, player_id) VALUES (' + this.lottery_id + ',' + this.player_id + ')', function (err, rows, fields) {
								if (err) throw err

								if (this.max_players > -1) {
									connection.query('SELECT COUNT(id) As cnt FROM public_lottery_players WHERE lottery_id = ' + this.lottery_id, function (err, rows, fields) {
										if (err) throw err
										if (rows[0].cnt >= this.max_players) { endLottery(this.creator_id, 2) }
									}.bind({
										creator_id: this.creator_id,
										max_players: this.max_players
									}))
								}

								count++

								connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + this.creator_id + ' AND type = 1', function (err, rows, fields) {
									if (err) throw err
									notify = 0
									if (Object.keys(rows).length == 0) { notify = 1 } else {
										if (rows[0].deny == 0) { notify = 1 }
									}
									if (notify == 1) { bot.sendMessage(this.creator_chat, message.from.username + ' si è registrato alla tua lotteria gratuita!') }
								}.bind({
									creator_chat: this.creator_chat
								}))

								if (this.i + 1 == this.len) { bot.sendMessage(message.chat.id, 'Ti sei registrato correttamente a ' + count + ' lotterie gratuite!') }
							}.bind({
								i: this.i,
								len: this.len,
								creator_chat: this.creator_chat,
								creator_id: this.creator_id,
								max_players: this.max_players
							}))
						}
						if ((this.i + 1 == this.len) && (one == 0)) { bot.sendMessage(message.chat.id, 'Sei già registrato a tutte le lotterie gratuite!') }
					}.bind({
						player_id: player_id,
						lottery_id: lottery_id,
						i: i,
						len: len,
						creator_chat: creator_chat,
						creator_id: creator_id,
						max_players: max_players
					}))
				}
			})
			return
		}

		if (nickname.indexOf('+') != -1) {
			const item_name = nickname.replace('+', '')
			connection.query('SELECT L.creator_id, L.id, L.price, P.chat_id, P.nickname FROM public_lottery L, player P, item I WHERE P.item_id = I.id AND P.id = L.creator_id AND L.price = 0 AND L.creator_id != ' + player_id + ' AND I.name = "' + item_name + '"', function (err, rows, fields) {
				if (err) throw err

				const len = Object.keys(rows).length
				let count = 0

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Non ci sono lotterie gratuite disponibili per l'oggetto selezionato!")
					return
				}

				let lottery_id = 0
				let one = 0
				let creator_chat = 0
				let creator_id = 0
				let notify = 0

				for (let i = 0; i < len; i++) {
					lottery_id = rows[i].id
					creator_chat = rows[i].chat_id
					creator_id = rows[i].creator_id

					connection.query('SELECT * FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, function (err, rows, fields) {
						if (err) throw err
						if (Object.keys(rows).length == 0) {
							one = 1
							connection.query('INSERT INTO public_lottery_players (lottery_id, player_id) VALUES (' + this.lottery_id + ',' + this.player_id + ')', function (err, rows, fields) {
								if (err) throw err

								if (this.max_players > -1) {
									connection.query('SELECT COUNT(id) As cnt FROM public_lottery_players WHERE lottery_id = ' + this.lottery_id, function (err, rows, fields) {
										if (err) throw err
										if (rows[0].cnt >= this.max_players) { endLottery(this.creator_id, 2) }
									}.bind({
										creator_id: this.creator_id,
										max_players: this.max_players
									}))
								}

								count++

								connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + this.creator_id + ' AND type = 1', function (err, rows, fields) {
									if (err) throw err
									notify = 0
									if (Object.keys(rows).length == 0) { notify = 1 } else {
										if (rows[0].deny == 0) { notify = 1 }
									}
									if (notify == 1) { bot.sendMessage(this.creator_chat, message.from.username + ' si è registrato alla tua lotteria gratuita!') }
								}.bind({
									creator_chat: this.creator_chat
								}))

								if (this.i + 1 == this.len) { bot.sendMessage(message.chat.id, 'Ti sei registrato correttamente a ' + count + " lotterie gratuite per l'oggetto selezionato!") }
							}.bind({
								i: this.i,
								len: this.len,
								creator_chat: this.creator_chat,
								creator_id: this.creator_id,
								max_players: this.max_players
							}))
						}
						if ((this.i + 1 == this.len) && (one == 0)) { bot.sendMessage(message.chat.id, "Sei già registrato a tutte le lotterie gratuite per l'oggetto selezionato!") }
					}.bind({
						player_id: player_id,
						lottery_id: lottery_id,
						i: i,
						len: len,
						creator_chat: creator_chat,
						creator_id: creator_id,
						max_players: max_players
					}))
				}
			})
			return
		}

		connection.query('SELECT id FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Il nickname che hai inserito non esiste, riprova')
				return
			}
			const creator_id = rows[0].id

			connection.query('SELECT id, price, max_players FROM public_lottery WHERE creator_id = ' + creator_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Il nickname che hai inserito non è associato a nessuna lotteria, riprova')
					return
				}

				const price = rows[0].price
				const lottery_id = rows[0].id
				const max_players = rows[0].max_players

				if (price > 0) {
					bot.sendMessage(message.chat.id, 'Questa è una lotteria a pagamento, usa /lotteriap per iscriverti')
					return
				}

				if (player_id == creator_id) {
					connection.query('SELECT 1 FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Ci sono attualmente ' + Object.keys(rows).length + ' partecipanti')
					})
					return
				}

				connection.query('SELECT 1 FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, function (err, rows, fields) {
					if (err) throw err
					if (Object.keys(rows).length > 0) {
						bot.sendMessage(message.chat.id, 'Sei già registrato a questa lotteria!')
						return
					}
					connection.query('INSERT INTO public_lottery_players (lottery_id, player_id) VALUES (' + lottery_id + ',' + player_id + ')', function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Ti sei registrato correttamente alla lotteria!\nPer rimuovere la registrazione usa /dlotteria')

						if (max_players > -1) {
							connection.query('SELECT COUNT(id) As cnt FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
								if (err) throw err
								if (rows[0].cnt >= max_players) { endLottery(creator_id, 2) }
							})
						}

						connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + creator_id + ' AND type = 1', function (err, rows, fields) {
							if (err) throw err
							let notify = 0
							if (Object.keys(rows).length == 0) { notify = 1 } else {
								if (rows[0].deny == 0) { notify = 1 }
							}
							if (notify == 1) {
								connection.query('SELECT chat_id FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
									if (err) throw err
									bot.sendMessage(rows[0].chat_id, message.from.username + ' si è registrato alla tua lotteria gratuita!')
								})
							};
						})
					})
				})
			})
		})
	})
})

bot.onText(/^\/dlotteria(?!p) (.+)|^\/dlotteria(?!p)/, function (message, match) {
	if (!checkSpam(message)) { return }

	let nickname = match[1]
	if ((nickname == undefined) || (nickname == '')) {
		bot.sendMessage(message.chat.id, 'Per eliminare la partecipazione ad una lotteria utilizza la seguente sintassi: /dlotteria @nickname')
		return
	}

	nickname = nickname.replace('@', '')

	connection.query('SELECT id, market_ban, money, account_id, holiday FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const money = rows[0].money

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		if (nickname == 'tutte') {
			connection.query('SELECT PL.id, PL.price, PL.creator_id FROM public_lottery PL, public_lottery_players PLP WHERE PL.id = PLP.lottery_id AND price = 0 AND PLP.player_id = ' + player_id, async function (err, rows, fields) {
				if (err) throw err

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non sei registrato ad alcuna lotteria gratuita')
					return
				}

				let creator_id = 0
				for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
					connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + rows[i].id + ' AND player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
					})

					creator_id = rows[i].creator_id

					const notifySql = await connection.queryAsync('SELECT deny FROM plus_notify WHERE player_id = ' + creator_id + ' AND type = 1')
					let notify = 0
					if (Object.keys(notifySql).length == 0) { notify = 1 } else {
						if (notifySql[0].deny == 0) { notify = 1 }
					}
					if (notify == 1) {
						connection.query('SELECT chat_id FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
							if (err) throw err
							bot.sendMessage(rows[0].chat_id, message.from.username + ' ha rimosso la registrazione alla tua lotteria gratuita!')
						})
					};
				}
				bot.sendMessage(message.chat.id, 'Hai rimosso la registrazione a tutte le lotterie gratuite!')
			})
			return
		}

		connection.query('SELECT id FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Il nickname che hai inserito non esiste, riprova')
				return
			}
			const creator_id = rows[0].id

			connection.query('SELECT id, price FROM public_lottery WHERE creator_id = ' + creator_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Il nickname che hai inserito non è associato a nessuna lotteria, riprova')
					return
				}

				const price = rows[0].price
				const lottery_id = rows[0].id

				if (price > 0) {
					bot.sendMessage(message.chat.id, "Questa è una lotteria a pagamento, usa /dlotteriap per rimuovere l'iscrizione")
					return
				}

				connection.query('SELECT 1 FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, function (err, rows, fields) {
					if (err) throw err
					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, 'Non sei registrato a questa lotteria!')
						return
					}
					connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id + ' AND player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Hai rimosso la registrazione alla lotteria!')

						connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + creator_id + ' AND type = 1', function (err, rows, fields) {
							if (err) throw err
							let notify = 0
							if (Object.keys(rows).length == 0) { notify = 1 } else {
								if (rows[0].deny == 0) { notify = 1 }
							}
							if (notify == 1) {
								connection.query('SELECT chat_id FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
									if (err) throw err
									bot.sendMessage(rows[0].chat_id, message.from.username + ' ha rimosso la registrazione alla tua lotteria gratuita!')
								})
							};
						})
					})
				})
			})
		})
	})
})

bot.onText(/^\/statoincarichi/, function (message, match) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id

		connection.query('SELECT team_id FROM team_player WHERE team_id = (SELECT team_id FROM team_player WHERE player_id = ' + player_id + ') ORDER BY id', function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Entra in un team per utilizzare questa funzione')
				return
			}
			const team_id = rows[0].team_id

			connection.query('SELECT mission_day_count FROM team WHERE id = ' + team_id, function (err, rows, fields) {
				if (err) throw err
				const mission_day_left = 10 - rows[0].mission_day_count

				connection.query('SELECT T.parts, T.title, T.duration, M.party_id, M.part_id, M.mission_time_end, M.mission_time_limit, M.wait FROM mission_team_list T, mission_team_party M WHERE T.ready = 1 AND T.id = M.assigned_to AND M.team_id = ' + team_id + ' ORDER BY T.progress_num ASC, T.duration ASC', function (err, rows, fields) {
					if (err) throw err

					let text = '*Incarichi in corso:*\n\n'
					if (Object.keys(rows).length > 0) {
						let time_end
						let time_next
						for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
							time_end = ''
							if (rows[i].mission_time_end != null) {
								var d = new Date(rows[i].mission_time_end)
								const now = new Date()
								var long_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ' del ' + addZero(d.getDate()) + '/' + addZero(d.getMonth() + 1) + '/' + d.getFullYear()
								let wait_text = 'Prossima scelta alle'
								if (d.getTime() < now.getTime()) { wait_text = 'Scelta in attesa dalle' }
								let wait_icon = ''
								if (rows[i].wait == 1) { wait_icon = ' ❗️' }
								time_end = wait_text + ' ' + long_date + wait_icon + '\n'
							}
							time_next = ''
							if (rows[i].mission_time_limit != null) {
								var d = new Date(rows[i].mission_time_limit)
								var long_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ' del ' + addZero(d.getDate()) + '/' + addZero(d.getMonth() + 1) + '/' + d.getFullYear()
								time_next = 'Scadenza alle ' + long_date + '\n'
							}
							text += '> Party ' + rows[i].party_id + '\n' +
								rows[i].title + ' - ' + rows[i].part_id + '/' + rows[i].parts + '\n' +
								time_end +
								time_next +
								'\n'
						}
					} else { text = 'Nessun incarico in corso' }

					bot.sendMessage(message.chat.id, text + '\n\nIl team può svolgere ancora ' + mission_day_left + ' incarichi', mark)
				})
			})
		})
	})
})

bot.onText(/^\/statolotteria (.+)|^\/statolotteria/, function (message, match) {
	let nickname = match[1]
	if ((nickname == undefined) || (nickname == '')) { nickname = message.from.username }

	nickname = nickname.replace('@', '')

	connection.query('SELECT id, nickname FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.chat.id, 'Il nickname che hai inserito non esiste, riprova')
			return
		}

		const creator_id = rows[0].id
		const nick = rows[0].nickname

		connection.query('SELECT id, price, item_id, time_end FROM public_lottery WHERE creator_id = ' + creator_id, function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Il nickname che hai inserito non è associato a nessuna lotteria, riprova')
				return
			}

			const d = new Date(rows[0].time_end)
			const long_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds()) + ' del ' + addZero(d.getDate()) + '/' + addZero(d.getMonth() + 1) + '/' + d.getFullYear()

			const price = rows[0].price
			const itemId = rows[0].item_id
			let command = 'lotteria'
			let priceText = 'No'
			if (price > 0) {
				command = 'lotteriap'
				priceText = 'Si (' + formatNumber(price) + ' §)'
			}

			const lottery_id = rows[0].id

			connection.query('SELECT name, rarity FROM item WHERE id = ' + itemId, function (err, rows, fields) {
				if (err) throw err

				const name = rows[0].name
				const rarity = ' (' + rows[0].rarity + ')'

				connection.query('SELECT COUNT(*) As num FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
					if (err) throw err

					const players = rows[0].num

					const text = 'Informazioni Lotteria:\n\nGestore: ' + nick +
						'\nOggetto: ' + name + rarity +
						'\nA pagamento: ' + priceText +
						'\nPartecipanti: ' + players +
						'\nScade alle: ' + long_date +
						'\n\nIscriviti con <code>/' + command + ' ' + nick + '</code>'
					bot.sendMessage(message.chat.id, text, html)
				})
			})
		})
	})
})

bot.onText(/^\/statoasta (.+)|^\/statoasta/, function (message, match) {
	let nickname = match[1]
	if ((nickname == undefined) || (nickname == '')) {
		bot.sendMessage(message.chat.id, 'Per ricevere informazioni su un asta utilizza la seguente sintassi: /statoasta @nickname')
		return
	}

	nickname = nickname.replace('@', '')

	connection.query('SELECT id, nickname FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.chat.id, 'Il nickname che hai inserito non esiste, riprova')
			return
		}

		const creator_id = rows[0].id
		const nick = rows[0].nickname

		connection.query('SELECT id, last_price, last_player, item_id, time_end FROM auction_list WHERE creator_id = ' + creator_id, function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Il nickname che hai inserito non è associato a nessuna asta, riprova')
				return
			}

			const d = new Date(rows[0].time_end)
			const long_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds()) + ' del ' + addZero(d.getDate()) + '/' + addZero(d.getMonth() + 1) + '/' + d.getFullYear()

			const itemId = rows[0].item_id
			const last_price = rows[0].last_price
			const last_player = rows[0].last_player

			connection.query('SELECT name, rarity FROM item WHERE id = ' + itemId, function (err, rows, fields) {
				if (err) throw err

				const name = rows[0].name
				const rarity = ' (' + rows[0].rarity + ')'

				connection.query('SELECT nickname FROM player WHERE id = ' + last_player, function (err, rows, fields) {
					if (err) throw err

					let nickname = ''

					if (Object.keys(rows).length == 0) {
						nickname = 'Nessuno'
					} else {
						nickname = rows[0].nickname
					}

					const text = 'Informazioni Asta:\n\nGestore: ' + nick +
						'\nOggetto: ' + name + rarity +
						'\nOfferente: ' + nickname +
						'\nOfferta: ' + formatNumber(last_price) + ' §' +
						'\nScade alle: ' + long_date
					bot.sendMessage(message.chat.id, text)
				})
			})
		})
	})
})

bot.onText(/^\/lotteriap (.+)|^\/lotteriap/, function (message, match) {
	if ((message.chat.id == '-1001069842056') || (message.chat.id == '-1001064571576')) { return }

	if (!checkSpam(message)) { return }

	let nickname = match[1]
	if ((nickname == undefined) || (nickname == '')) {
		bot.sendMessage(message.chat.id, 'Per partecipare ad una lotteria utilizza la seguente sintassi: /lotteriap @nickname, mentre /crealotteriap per iniziarne una nuova. Puoi anche usare /lotteriap tutte')
		return
	}

	nickname = nickname.replace('@', '')

	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const money = rows[0].money

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		if (nickname == 'tutte') {
			connection.query('SELECT L.creator_id, player.chat_id, L.id, L.price, (SELECT COUNT(id) FROM public_lottery_players P WHERE P.lottery_id = L.id AND P.player_id = ' + player_id + ') As sub, L.max_players FROM public_lottery L, player WHERE player.id = L.creator_id AND L.price > 0 AND L.creator_id != ' + player_id + ' HAVING sub = 0', function (err, rows, fields) {
				if (err) throw err

				if ((Object.keys(rows).length == 0) || (rows[0].tot == 0)) {
					bot.sendMessage(message.chat.id, 'Non ci sono lotterie a pagamento disponibili!')
					return
				}

				let tot = 0

				for (var i = 0, len = Object.keys(rows).length; i < len; i++) { tot += rows[i].price }

				if (money < tot) {
					bot.sendMessage(message.chat.id, 'Non hai abbastanza monete per partecipare a tutte le lotterie, ti servono ' + formatNumber(tot) + ' §!')
					return
				}

				var len = Object.keys(rows).length
				let count = 0

				let lottery_id = 0
				let price = 0
				let one = 0
				let creator_chat = 0
				let creator_id = 0
				let notify = 0
				let max_players = 0

				for (var i = 0; i < len; i++) {
					lottery_id = rows[i].id
					price = rows[i].price
					creator_chat = rows[i].chat_id
					creator_id = rows[i].creator_id
					max_players = rows[i].max_players

					connection.query('SELECT * FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, async function (err, rows, fields) {
						if (err) throw err
						if (Object.keys(rows).length == 0) {
							one = 1
							connection.query('INSERT INTO public_lottery_players (lottery_id, player_id) VALUES (' + this.lottery_id + ',' + this.player_id + ')', async function (err, rows, fields) {
								if (err) throw err

								count++

								connection.query('UPDATE public_lottery SET money = money+' + this.price + ' WHERE id = ' + this.lottery_id, function (err, rows, fields) {
									if (err) throw err
								})

								if (this.max_players > -1) {
									connection.query('SELECT COUNT(id) As cnt FROM public_lottery_players WHERE lottery_id = ' + this.lottery_id, function (err, rows, fields) {
										if (err) throw err
										console.log('lotteriap tutte', rows[0].cnt, this.max_players)
										if (rows[0].cnt >= this.max_players) { endLottery(this.creator_id, 2) }
									}.bind({
										creator_id: this.creator_id,
										max_players: this.max_players
									}))
								}

								connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + this.creator_id + ' AND type = 1', function (err, rows, fields) {
									if (err) throw err
									notify = 0
									if (Object.keys(rows).length == 0) { notify = 1 } else {
										if (rows[0].deny == 0) { notify = 1 }
									}
									if (notify == 1) { bot.sendMessage(this.creator_chat, message.from.username + ' si è registrato alla tua lotteria a pagamento!') }
								}.bind({
									creator_chat: this.creator_chat
								}))

								if (this.i + 1 == this.len) {
									bot.sendMessage(message.chat.id, 'Ti sei registrato correttamente a ' + count + ' lotterie a pagamento spendendo ' + formatNumber(tot) + ' §!');
									await reduceMoney(player_id, tot);
								};
							}.bind({
								i: this.i,
								len: this.len,
								price: this.price,
								lottery_id: this.lottery_id,
								creator_chat: this.creator_chat,
								creator_id: this.creator_id,
								max_players: this.max_players
							}))
						}
						if ((this.i + 1 == this.len) && (one == 0)) { bot.sendMessage(message.chat.id, 'Sei già registrato a tutte le lotterie a pagamento!') }
					}.bind({
						player_id: player_id,
						lottery_id: lottery_id,
						i: i,
						len: len,
						price: price,
						creator_chat: creator_chat,
						creator_id: creator_id,
						max_players: max_players
					}))
				}
			})
			return
		}

		if (nickname.indexOf('+') != -1) {
			const item_name = nickname.replace('+', '')
			connection.query('SELECT L.creator_id, player.chat_id, L.id, L.price, (SELECT COUNT(id) FROM public_lottery_players P WHERE P.lottery_id = L.id AND P.player_id = ' + player_id + ') As sub, L.max_players FROM public_lottery L, player, item I WHERE L.item_id = I.id AND player.id = L.creator_id AND L.price > 0 AND L.creator_id != ' + player_id + ' AND I.name = "' + item_name + '" HAVING sub = 0', function (err, rows, fields) {
				if (err) throw err

				if ((Object.keys(rows).length == 0) || (rows[0].tot == 0)) {
					bot.sendMessage(message.chat.id, "Non ci sono lotterie a pagamento disponibili per l'oggetto specificato!")
					return
				}

				let tot = 0

				for (var i = 0, len = Object.keys(rows).length; i < len; i++) { tot += rows[i].price }

				if (money < tot) {
					bot.sendMessage(message.chat.id, "Non hai abbastanza monete per partecipare a tutte le lotterie per l'oggetto specificato, ti servono " + formatNumber(tot) + ' §!')
					return
				}

				var len = Object.keys(rows).length
				let count = 0

				let lottery_id = 0
				let price = 0
				let one = 0
				let creator_chat = 0
				let creator_id = 0
				let notify = 0
				let max_players = 0

				for (var i = 0; i < len; i++) {
					lottery_id = rows[i].id
					price = rows[i].price
					creator_chat = rows[i].chat_id
					creator_id = rows[i].creator_id
					max_players = rows[i].max_players

					connection.query('SELECT * FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, function (err, rows, fields) {
						if (err) throw err
						if (Object.keys(rows).length == 0) {
							one = 1
							connection.query('INSERT INTO public_lottery_players (lottery_id, player_id) VALUES (' + this.lottery_id + ',' + this.player_id + ')', async function (err, rows, fields) {
								if (err) throw err

								count++

								connection.query('UPDATE public_lottery SET money = money+' + this.price + ' WHERE id = ' + this.lottery_id, function (err, rows, fields) {
									if (err) throw err
								})

								if (this.max_players > -1) {
									connection.query('SELECT COUNT(id) As cnt FROM public_lottery_players WHERE lottery_id = ' + this.lottery_id, function (err, rows, fields) {
										if (err) throw err
										console.log('lotteriap +', rows[0].cnt, this.max_players)
										if (rows[0].cnt >= this.max_players) { endLottery(this.creator_id, 2) }
									}.bind({
										creator_id: this.creator_id,
										max_players: this.max_players
									}))
								}

								connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + this.creator_id + ' AND type = 1', function (err, rows, fields) {
									if (err) throw err
									notify = 0
									if (Object.keys(rows).length == 0) { notify = 1 } else {
										if (rows[0].deny == 0) { notify = 1 }
									}
									if (notify == 1) { bot.sendMessage(this.creator_chat, message.from.username + ' si è registrato alla tua lotteria a pagamento!') }
								}.bind({
									creator_chat: this.creator_chat
								}))

								if (this.i + 1 == this.len) {
									bot.sendMessage(message.chat.id, 'Ti sei registrato correttamente a ' + count + " lotterie a pagamento, relative all'oggetto specificato, spendendo " + formatNumber(tot) + ' §!');
									await reduceMoney(player_id, tot);
								};
							}.bind({
								i: this.i,
								len: this.len,
								price: this.price,
								lottery_id: this.lottery_id,
								creator_chat: this.creator_chat,
								creator_id: this.creator_id,
								max_players: this.max_players
							}))
						}
						if ((this.i + 1 == this.len) && (one == 0)) { bot.sendMessage(message.chat.id, "Sei già registrato a tutte le lotterie a pagamento per l'oggetto specificato!") }
					}.bind({
						player_id: player_id,
						lottery_id: lottery_id,
						i: i,
						len: len,
						price: price,
						creator_chat: creator_chat,
						creator_id: creator_id,
						max_players: max_players
					}))
				}
			})
			return
		}

		connection.query('SELECT id FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Il nickname che hai inserito non esiste, riprova')
				return
			}
			const creator_id = rows[0].id

			connection.query('SELECT id, price, max_players FROM public_lottery WHERE creator_id = ' + creator_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Il nickname che hai inserito non è associato a nessuna lotteria, riprova')
					return
				}

				const price = rows[0].price
				const lottery_id = rows[0].id
				const max_players = rows[0].max_players

				if (player_id == creator_id) {
					connection.query('SELECT 1 FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Ci sono attualmente ' + Object.keys(rows).length + ' partecipanti')
					})
					return
				}

				if (price == 0) {
					bot.sendMessage(message.chat.id, 'Questa è una lotteria non a pagamento, usa /lotteria per partecipare')
					return
				}

				if (money - price <= 0) {
					bot.sendMessage(message.chat.id, 'Non hai abbastanza monete per partecipare')
					return
				}

				connection.query('SELECT 1 FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, function (err, rows, fields) {
					if (err) throw err
					if (Object.keys(rows).length > 0) {
						bot.sendMessage(message.chat.id, 'Sei già registrato a questa lotteria!')
						return
					}
					connection.query('INSERT INTO public_lottery_players (lottery_id, player_id) VALUES (' + lottery_id + ',' + player_id + ')', async function (err, rows, fields) {
						if (err) throw err
						if (price != 0) {
							await reduceMoney(player_id, price);
							connection.query('UPDATE public_lottery SET money = money+' + price + ' WHERE id = ' + lottery_id, function (err, rows, fields) {
								if (err) throw err
							})

							if (max_players > -1) {
								connection.query('SELECT COUNT(id) As cnt FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
									if (err) throw err
									console.log('lotteriap', rows[0].cnt, max_players)
									if (rows[0].cnt >= max_players) { endLottery(creator_id, 2) }
								})
							}

							bot.sendMessage(message.chat.id, 'Ti sei registrato alla lotteria al prezzo di ' + formatNumber(price) + ' §!\nPer rimuovere la registrazione usa /dlotteriap')

							connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + creator_id + ' AND type = 1', function (err, rows, fields) {
								if (err) throw err
								let notify = 0
								if (Object.keys(rows).length == 0) { notify = 1 } else {
									if (rows[0].deny == 0) { notify = 1 }
								}
								if (notify == 1) {
									connection.query('SELECT chat_id FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
										if (err) throw err
										bot.sendMessage(rows[0].chat_id, message.from.username + ' si è registrato alla tua lotteria a pagamento!')
									})
								};
							})
						}
					})
				})
			})
		})
	})
})

bot.onText(/^\/dlotteriap (.+)|^\/dlotteriap/, async function (message, match) {
	if ((message.chat.id == '-1001069842056') || (message.chat.id == '-1001064571576')) { return }

	if (!checkSpam(message)) { return }

	let nickname = match[1]
	if ((nickname == undefined) || (nickname == '')) {
		bot.sendMessage(message.chat.id, 'Per rimuovere la partecipazione ad una lotteria a pagamento utilizza la seguente sintassi: /dlotteriap @nickname')
		return
	}

	nickname = nickname.replace('@', '')

	connection.query('SELECT id, market_ban, account_id, money, holiday FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const money = rows[0].money

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		if (rows[0].market_ban == 1) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(message.chat.id, '...')
			return
		}

		if (nickname == 'tutte') {
			connection.query('SELECT PL.id, PL.price, PL.creator_id FROM public_lottery PL, public_lottery_players PLP WHERE PL.id = PLP.lottery_id AND price > 0 AND PLP.player_id = ' + player_id, async function (err, rows, fields) {
				if (err) throw err

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Non sei registrato ad alcune lotteria a pagamento')
					return
				}

				let price = 0
				let creator_id = 0
				for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
					await addMoney(player_id, rows[i].price);
					await reduceMoney(rows[i].id, rows[i].price);
					connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + rows[i].id + ' AND player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err
					})

					price += rows[i].price
					creator_id = rows[i].creator_id

					const notifySql = await connection.queryAsync('SELECT deny FROM plus_notify WHERE player_id = ' + creator_id + ' AND type = 1')
					let notify = 0
					if (Object.keys(notifySql).length == 0) { notify = 1 } else {
						if (notifySql[0].deny == 0) { notify = 1 }
					}
					if (notify == 1) {
						connection.query('SELECT chat_id FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
							if (err) throw err
							bot.sendMessage(rows[0].chat_id, message.from.username + ' ha rimosso la registrazione alla tua lotteria a pagamento!')
						})
					};
				}
				bot.sendMessage(message.chat.id, 'Hai rimosso la registrazione a tutte le lotterie a pagamento ed hai recuperato ' + formatNumber(price) + ' §!')
			})
			return
		}

		connection.query('SELECT id FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Il nickname che hai inserito non esiste, riprova')
				return
			}
			const creator_id = rows[0].id

			connection.query('SELECT id, price FROM public_lottery WHERE creator_id = ' + creator_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Il nickname che hai inserito non è associato a nessuna lotteria, riprova')
					return
				}

				const price = rows[0].price
				const lottery_id = rows[0].id

				if (price == 0) {
					bot.sendMessage(message.chat.id, 'Questa è una lotteria non a pagamento, usa /dlotteria per rimuovere la registrazione')
					return
				}

				connection.query('SELECT 1 FROM public_lottery_players WHERE player_id = ' + player_id + ' AND lottery_id = ' + lottery_id, function (err, rows, fields) {
					if (err) throw err
					if (Object.keys(rows).length == 0) {
						bot.sendMessage(message.chat.id, 'Non sei registrato a questa lotteria!')
						return
					}
					connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id + ' AND player_id = ' + player_id, async function (err, rows, fields) {
						if (err) throw err
						await addMoney(player_id, price);
						connection.query('UPDATE public_lottery SET money = money-' + price + ' WHERE id = ' + lottery_id, function (err, rows, fields) {
							if (err) throw err
						})
						bot.sendMessage(message.chat.id, 'Hai rimosso la registrazione alla lotteria e hai recuperato ' + formatNumber(price) + ' §!')

						connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + creator_id + ' AND type = 1', function (err, rows, fields) {
							if (err) throw err
							let notify = 0
							if (Object.keys(rows).length == 0) { notify = 1 } else {
								if (rows[0].deny == 0) { notify = 1 }
							}
							if (notify == 1) {
								connection.query('SELECT chat_id FROM player WHERE id = ' + creator_id, function (err, rows, fields) {
									if (err) throw err
									bot.sendMessage(rows[0].chat_id, message.from.username + ' ha rimosso la registrazione alla tua lotteria a pagamento!')
								})
							};
						})
					})
				})
			})
		})
	})
})

bot.onText(/^\/scuola/, function (message) {
	bot.sendMessage(message.chat.id, 'Entra nella scuola per giovani avventurieri: https://t.me/joinchat/AThc-0DH8FaFEpYpLg-rOA', html)
})

bot.onText(/^\/statistiche|^\/stats$/, function (message) {
	connection.query('SELECT MAX(id) As tot, SUM(achievement_count) As achievement, SUM(dungeon_count) As dungeon_tot, SUM(money) As money, SUM(craft_count) As craft, SUM(mission_count) As miss2 FROM player', function (err, rows, fields) {
		if (err) throw err
		const tot = rows[0].tot
		const achievement = rows[0].achievement
		const money = rows[0].money
		const craft = rows[0].craft
		const miss2 = rows[0].miss2
		const dungeon_tot = rows[0].dungeon_tot
		connection.query('SELECT COUNT(*) As miss FROM player WHERE mission_id != 0', function (err, rows, fields) {
			if (err) throw err
			const miss = rows[0].miss
			connection.query('SELECT SUM(quantity) As inv FROM inventory', function (err, rows, fields) {
				if (err) throw err
				const inv = rows[0].inv
				connection.query('SELECT COUNT(id) As dragon FROM dragon', function (err, rows, fields) {
					if (err) throw err
					const dragon = rows[0].dragon
					connection.query('SELECT SUM(quantity) As chest FROM inventory_chest', function (err, rows, fields) {
						if (err) throw err
						const chest = rows[0].chest
						connection.query('SELECT MAX(id) As heist, COUNT(*) As heistn FROM heist', function (err, rows, fields) {
							if (err) throw err
							const heist = rows[0].heist
							const heistn = rows[0].heistn
							connection.query('SELECT COUNT(*) As travel FROM player WHERE travel_id != 0', function (err, rows, fields) {
								if (err) throw err
								const travel = rows[0].travel
								connection.query('SELECT MAX(id) As teamn FROM team', function (err, rows, fields) {
									if (err) throw err
									const teamn = rows[0].teamn
									connection.query('SELECT COUNT(id) As cnt FROM card_inventory', function (err, rows, fields) {
										if (err) throw err
										const cards = rows[0].cnt
										connection.query('SELECT SUM(IV.quantity) As u FROM item I, inventory IV WHERE I.id = IV.item_id AND I.rarity = "U"', function (err, rows, fields) {
											if (err) throw err
											const u = rows[0].u
											const d = new Date()
											const today = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate())
											connection.query('SELECT COUNT(L.id) As active, COUNT(IF(P.gender = "M" AND P.real_name IS NOT NULL, 1, NULL)) As male, COUNT(IF(P.gender = "F" AND P.real_name IS NOT NULL, 1, NULL)) As female FROM last_command L, player P WHERE L.account_id = P.account_id AND time LIKE "' + today + '%"', function (err, rows, fields) {
												if (err) throw err
												const act = rows[0].active
												const act_male = rows[0].male
												const act_female = rows[0].female
												const today_birth = addZero(d.getMonth() + 1) + '-' + addZero(d.getDate())
												connection.query('SELECT COUNT(*) As birthday FROM player WHERE birth_date LIKE "%' + today_birth + '"', function (err, rows, fields) {
													if (err) throw err
													let birthday = ''
													if (rows[0].birthday > 0) {
														let plur = 'e'
														let fplur = 'compie'
														if (rows[0].birthday > 1) {
															plur = 'i'
															fplur = 'compiono'
														}
														birthday = 'Oggi ' + fplur + ' gli anni *' + rows[0].birthday + '* giocator' + plur + '! 🎉\n'
													}

													connection.query('SELECT birth_date FROM player WHERE birth_date IS NOT NUlL', function (err, rows, fields) {
														if (err) throw err

														let avg_age = 0
														let age = 0
														let count = 0
														for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
															age = parseInt(calculateAge(new Date(rows[i].birth_date)))
															if (age < 90) {
																avg_age += age
																count++
															}
														}

														avg_age = Math.round(avg_age / count)

														connection.query('SELECT COUNT(*) As active FROM last_command WHERE DATEDIFF(NOW(), time) < 30', function (err, rows, fields) {
															if (err) throw err
															const act_monthly = rows[0].active
															connection.query('SELECT COUNT(*) As active FROM last_command WHERE DATEDIFF(NOW(), time) < 7', function (err, rows, fields) {
																if (err) throw err
																const act_weekly = rows[0].active
																connection.query('SELECT SUM(quantity) As cnt FROM inventory WHERE item_id = 646', function (err, rows, fields) {
																	if (err) throw err
																	const dust = rows[0].cnt
																	connection.query('SELECT `AUTO_INCREMENT` As lottery FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "public_lottery"', function (err, rows, fields) {
																		if (err) throw err
																		const lottery = rows[0].lottery
																		connection.query('SELECT `AUTO_INCREMENT` As shop FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "public_shop"', function (err, rows, fields) {
																			if (err) throw err
																			const shop = rows[0].shop
																			connection.query('SELECT `AUTO_INCREMENT` As daily FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "daily_chest"', function (err, rows, fields) {
																				if (err) throw err
																				const daily = rows[0].daily
																				connection.query('SELECT `AUTO_INCREMENT` As dungeon FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "dungeon_list"', function (err, rows, fields) {
																					if (err) throw err
																					const dungeon = rows[0].dungeon
																					connection.query('SELECT `AUTO_INCREMENT` As room FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "dungeon_rooms"', function (err, rows, fields) {
																						if (err) throw err
																						const room = rows[0].room
																						connection.query('SELECT SUM(ability_level) As ablevel FROM `ability`', function (err, rows, fields) {
																							if (err) throw err
																							const ablevel = rows[0].ablevel
																							connection.query('SELECT `AUTO_INCREMENT` As invite FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "referral_list"', function (err, rows, fields) {
																								if (err) throw err
																								const invite = rows[0].invite
																								connection.query('SELECT TRUNCATE(SUM(CASE WHEN fail = 0 THEN 1 ELSE 0 END)/COUNT(*)*100,0) As perc FROM heist_history', function (err, rows, fields) {
																									if (err) throw err
																									const perc = rows[0].perc
																									connection.query('SELECT COUNT(*) As groups, SUM(members) As members FROM plus_groups WHERE last_update < NOW() - INTERVAL 1 WEEK', function (err, rows, fields) {
																										if (err) throw err
																										const groups = rows[0].groups
																										const members = rows[0].members
																										connection.query('SELECT SUM(mana_1+mana_2+mana_3) As mana FROM event_mana_status', function (err, rows, fields) {
																											if (err) throw err
																											const mana = rows[0].mana
																											connection.query('SELECT SUM(quantity) As mag FROM magic', function (err, rows, fields) {
																												if (err) throw err
																												const magic = rows[0].mag
																												connection.query('SELECT `AUTO_INCREMENT` As search FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "search_history"', function (err, rows, fields) {
																													if (err) throw err
																													const search = rows[0].search
																													connection.query('SELECT `AUTO_INCREMENT` As top_log FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "LootBot" AND TABLE_NAME = "dragon_top_log"', function (err, rows, fields) {
																														if (err) throw err
																														const top_log = rows[0].top_log
																														connection.query('SELECT SUM(quantity) As shop_tot FROM market_direct_history WHERE type = 2', function (err, rows, fields) {
																															if (err) throw err
																															const shop_tot = rows[0].shop_tot
																															connection.query('SELECT SUM(pay) As cnt FROM game_house_stats', function (err, rows, fields) {
																																if (err) throw err
																																const house_tot = rows[0].cnt
																																connection.query('SELECT COUNT(1) As cnt FROM mission_team_party WHERE assigned_to IS NOT NULL', function (err, rows, fields) {
																																	if (err) throw err
																																	const mission_team_current = rows[0].cnt
																																	connection.query('SELECT SUM(mission_count) As cnt FROM team', function (err, rows, fields) {
																																		if (err) throw err
																																		const mission_team = rows[0].cnt
																																		connection.query('SELECT COUNT(id) As cnt FROM artifacts', function (err, rows, fields) {
																																			if (err) throw err
																																			const artifacts = rows[0].cnt
																																			connection.query('SELECT COUNT(id) As cnt FROM assault WHERE time_end IS NOT NULL', function (err, rows, fields) {
																																				if (err) throw err
																																				const assaults = rows[0].cnt
																																				connection.query('SELECT SUM(completed) As compl, SUM(lost) As persi FROM assault', function (err, rows, fields) {
																																					if (err) throw err
																																					const assaults_win = rows[0].compl
																																					const assaults_lost = rows[0].persi
																																					connection.query('SELECT map_lobby_id As cnt FROM map_history ORDER BY id DESC LIMIT 1', function (err, rows, fields) {
																																						if (err) throw err
																																						let map_plays = 0
																																						if (Object.keys(rows).length > 0) { map_plays = rows[0].cnt }
																																						connection.query('SELECT SUM(kills) As cnt FROM map_history', function (err, rows, fields) {
																																							if (err) throw err
																																							let map_kills = 0
																																							if (rows[0].cnt != null) { map_kills = rows[0].cnt }

																																							connection.query('SELECT SUM(death_count) As cnt FROM player', function (err, rows, fields) {
																																								if (err) throw err
																																								let death_count = 0
																																								if (rows[0].cnt != null) { death_count = rows[0].cnt }

																																								bot.sendMessage(message.chat.id, '*Statistiche:*\n\n' +
																																									'*Giocatori registrati:* ' + formatNumber(tot) + '\n' +
																																									'*Missioni in corso*: ' + miss + '\n' +
																																									'*Missioni completate*: ' + formatNumber(miss2) + '\n' +
																																									'*Viaggi in corso*: ' + travel + '\n' +
																																									'*Utenti attivi (1):* ' + formatNumber(act) + '\n' +
																																									'_Dei quali ' + formatNumber(act_male) + ' esploratori e ' + formatNumber(act_female) + ' esploratrici_\n' +
																																									'_Età media: ' + avg_age + ' anni_\n' +
																																									birthday +
																																									'*Utenti attivi mensili (2):* ' + formatNumber(act_monthly) + '\n' +
																																									'*Utenti attivi settimanali (3):* ' + formatNumber(act_weekly) + '\n' +
																																									'*Monete attuali*: ' + formatNumber(money) + ' §\n' +
																																									'*Oggetti*: ' + formatNumber(inv) + '\n' +
																																									'*Scrigni attuali*: ' + formatNumber(chest) + '\n' +
																																									'*Creazioni*: ' + formatNumber(craft) + '\n' +
																																									'*Draghi*: ' + formatNumber(dragon) + '\n' +
																																									'*Team:* ' + formatNumber(teamn) + '\n' +
																																									'*Ispezioni/in corso/rapporto:* ' + formatNumber(heist) + '/' + heistn + '/' + perc + '%\n' +
																																									'*Lotterie:* ' + formatNumber(lottery) + '\n' +
																																									'*Oggetti nei negozi:* ' + formatNumber(shop) + '\n' +
																																									'*Oggetti acquistati:* ' + formatNumber(shop_tot) + '\n' +
																																									'*Scrigni giornalieri consegnati:* ' + formatNumber(daily) + '\n' +
																																									'*Dungeon completati:* ' + formatNumber(dungeon_tot) + '\n' +
																																									'*Dungeon creati:* ' + formatNumber(dungeon) + '\n' +
																																									'*Stanze create:* ' + formatNumber(room) + '\n' +
																																									'*Livelli skill:* ' + formatNumber(ablevel) + '\n' +
																																									'*Utenti invitati:* ' + formatNumber(invite) + '\n' +
																																									'*Mana grezzo:* ' + formatNumber(mana) + '\n' +
																																									'*Polvere:* ' + formatNumber(dust) + '\n' +
																																									'*Incantesimi:* ' + formatNumber(magic) + '\n' +
																																									'*Oggetti cercati:* ' + formatNumber(search) + '\n' +
																																									'*Imprese completate:* ' + formatNumber(achievement) + '\n' +
																																									'*Spese Casa dei Giochi:* ' + formatNumber(house_tot) + ' §\n' +
																																									'*Battaglie nella Vetta:* ' + formatNumber(top_log) + '\n' +
																																									'*Incarichi in corso/completati:* ' + formatNumber(mission_team_current) + '/' + formatNumber(mission_team) + '\n' +
																																									'*Artefatti ottenuti:* ' + formatNumber(artifacts) + '\n' +
																																									'*Assalti in corso/completati/falliti:* ' + formatNumber(assaults) + '/' + formatNumber(assaults_win) + '/' + formatNumber(assaults_lost) + '\n' +
																																									'*Figurine:* ' + formatNumber(cards) + '\n' +
																																									'*Partite giocate nelle Mappe:* ' + formatNumber(map_plays) + '\n' +
																																									'*Uccisioni nelle Mappe:* ' + formatNumber(map_kills) + '\n' +
																																									'*Uccisioni giocatori:* ' + formatNumber(death_count) + '\n' +
																																									'\n*Gruppi attivi (4):* ' + formatNumber(groups) + '\n' +
																																									'*Membri nei gruppi attivi (4):* ' + formatNumber(members) + '\n' +

																																									"\n(1) Utenti che hanno inviato un comando oggi\n(2) Utenti che hanno inviato un comando negli ultimi 30 giorni\n(3) Utenti che hanno inviato un comando negli ultimi 7 giorni\n(4) Utenti/gruppi che hanno inviato un comando nell'ultima settimana", mark)
																																							})
																																						})
																																					})
																																				})
																																			})
																																		})
																																	})
																																})
																															})
																														})
																													})
																												})
																											})
																										})
																									})
																								})
																							})
																						})
																					})
																				})
																			})
																		})
																	})
																})
															})
														})
													})
												})
											})
										})
									})
								})
							})
						})
					})
				})
			})
		})
	})
})

bot.onText(/^\/valorezaino (.+)|^\/valorezaino$/, function (message, match) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		if (match[1] == undefined) {
			if (player_id == 1) {
				bot.sendMessage(message.chat.id, message.from.username + ', il tuo zaino vale <b>troppi</b> §', html)
				return
			}

			connection.query('SELECT SUM(I.value*IV.quantity) As val FROM item I, inventory IV WHERE I.id = IV.item_id AND IV.player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err

				if (rows[0].val == null) { rows[0].val = 0 }

				let sym = ''
				if ((new Date().getDate() == 1) && (new Date().getMonth() == 3)) {
					rows[0].val = Math.round(getRandomArbitrary(0, 10000000000))
					sym = ' 👀'
				}

				bot.sendMessage(message.chat.id, message.from.username + ', il tuo zaino vale <b>' + formatNumber(rows[0].val) + '</b> §' + sym, html)
			})
		} else {
			connection.query('SELECT SUM(I.value*IV.quantity) As val FROM item I, inventory IV WHERE I.id = IV.item_id AND rarity = "' + match[1] + '" AND IV.player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err
				if (rows[0].val == null) {
					bot.sendMessage(message.chat.id, 'Rarità non valida o non possiedi oggetti')
					return
				}

				let sym = ''
				if ((new Date().getDate() == 1) && (new Date().getMonth() == 3)) {
					rows[0].val = Math.round(getRandomArbitrary(0, 500000000))
					sym = ' 👀'
				}

				bot.sendMessage(message.chat.id, message.from.username + ', il tuo zaino per rarità ' + match[1].toUpperCase() + ' vale <b>' + formatNumber(rows[0].val) + '</b> §' + sym, html)
			})
		}
	})
})

bot.onText(/^\/valorezainob (.+)|^\/valorezainob$/, function (message, match) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		let rarity = ''
		let raritytxt = ''
		if (match[1] != undefined) {
			rarity = " AND rarity = '" + match[1] + "'"
			raritytxt = ' ' + match[1].toUpperCase()
		}

		const player_id = rows[0].id
		connection.query('SELECT SUM(I.value*IV.quantity) As val FROM item I, inventory IV, rarity R WHERE R.shortname = I.rarity AND I.craftable = 0 AND I.id = IV.item_id AND IV.player_id = ' + player_id + rarity, function (err, rows, fields) {
			if (err) throw err

			if (rows[0].val == null) { rows[0].val = 0 }

			bot.sendMessage(message.chat.id, message.from.username + ', il tuo zaino per gli oggetti <i>Base</i> vale <b>' + formatNumber(rows[0].val) + '</b> §', html)
		})
	})
})

bot.onText(/^\/valorezainoc (.+)|^\/valorezainoc$/, function (message, match) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		let rarity = ''
		let raritytxt = ''
		if (match[1] != undefined) {
			rarity = " AND rarity = '" + match[1] + "'"
			raritytxt = ' ' + match[1].toUpperCase()
		}

		const player_id = rows[0].id
		connection.query('SELECT SUM(I.value*IV.quantity) As val FROM item I, inventory IV, rarity R WHERE R.shortname = I.rarity AND I.craftable = 1 AND I.id = IV.item_id AND IV.player_id = ' + player_id + rarity, function (err, rows, fields) {
			if (err) throw err

			if (rows[0].val == null) { rows[0].val = 0 }

			bot.sendMessage(message.chat.id, message.from.username + ', il tuo zaino per gli oggetti <i>Creati' + raritytxt + '</i> vale <b>' + formatNumber(rows[0].val) + '</b> §', html)
		})
	})
})

bot.onText(/^\/creazioni/, function (message, match) {
	connection.query('SELECT id, craft_count, craft_week, craft_day FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		bot.sendMessage(message.chat.id, message.from.username + ', hai ottenuto <b>' + formatNumber(rows[0].craft_count) + '</b> punti creazione totali, <b>' + formatNumber(rows[0].craft_week) + '</b> settimanali e <b>' + formatNumber(rows[0].craft_day) + '</b> giornalieri', html)
	})
})

bot.onText(/^\/rango/, function (message, match) {
	connection.query('SELECT id, rank, dungeon_count FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const player_rank_b = rows[0].rank
		const dungeon_count = rows[0].dungeon_count
		const rank = getRankName(player_rank_b, 0)
		let next_rank = 0
		next_rank = parseInt(getRankName(player_rank_b, 1))
		bot.sendMessage(message.chat.id, 'Informazioni rango per ' + message.from.username + ':\n<b>Rango Attuale</b>: ' + formatNumber(rank) + ' (' + player_rank_b + ')\n<b>Aumento Rango</b>: ' + formatNumber(next_rank) + ' punti\n<b>Dungeon completati</b>: ' + formatNumber(dungeon_count), html)
		setTimeout(function () {
			bot.sendSticker(message.chat.id, getRankFileId(player_rank_b))
		}, 500)
	})
})

bot.onText(/^\/lega/, function (message, match) {
	connection.query('SELECT id, mission_count FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const mission_count = rows[0].mission_count
		let league_name
		let next_pnt = 0
		if (mission_count <= 300) {
			league_name = 'Lega degli Esploratori'
			next_pnt = 300
		} else if (mission_count <= 600) {
			league_name = 'Lega degli Esperti'
			next_pnt = 600
		} else if (mission_count <= 1000) {
			league_name = 'Lega dei Veterani'
			next_pnt = 1000
		} else if (mission_count <= 2000) {
			league_name = 'Lega dei Maestri'
			next_pnt = 2000
		} else if (mission_count <= 5000) {
			league_name = 'Lega dei Campioni'
			next_pnt = 5000
		} else if (mission_count <= 10000) {
			league_name = 'Lega degli Eroi'
			next_pnt = 10000
		} else { league_name = 'Lega delle Leggende' }

		let next_pnt_text = ''
		if (next_pnt != 0) { next_pnt_text = '\n<b>Aumento lega</b>: ' + formatNumber(next_pnt) + ' missioni' }

		bot.sendMessage(message.chat.id, 'Informazioni lega per ' + message.from.username + ':\n<b>Lega Attuale</b>: ' + league_name + next_pnt_text + '\n<b>Missioni completate</b>: ' + formatNumber(mission_count), html)
	})
})

bot.onText(/^\/abilità/, function (message, match) {
	connection.query('SELECT id FROM player ORDER BY ability DESC LIMIT 1', function (err, rows, fields) {
		if (err) throw err

		const best_id = rows[0].id

		connection.query('SELECT id, ability FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) { return }

			let text = ''
			if (rows[0].ability < 10) { text = 'puoi fare di meglio!' } else if (rows[0].ability < 50) { text = 'sei sulla strada giusta!' } else if (rows[0].ability < 100) { text = 'forza, stai andando bene!' } else if (rows[0].ability < 250) { text = 'stai diventando un maestro!' } else if (rows[0].ability < 500) { text = 'sei il migliore!' } else { text = 'sei irraggiungibile!' }

			if (best_id == rows[0].id) { text = 'sei in vetta alla classifica!' }
			bot.sendMessage(message.chat.id, message.from.username + ', hai raggiunto <b>' + formatNumber(rows[0].ability) + '</b> punti abilità, ' + text, html)
		})
	})
})

bot.onText(/^\/posizione$/, function (message, match) {
	connection.query('SELECT id, global_event, reborn FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const global_event = rows[0].global_event
		const reborn = rows[0].reborn;

		connection.query('SELECT global_eventwait, global_cap, global_eventhide FROM config', function (err, rows, fields) {
			if (err) throw err

			if (rows[0].global_eventwait == 1) {
				bot.sendMessage(message.chat.id, "La funzione è disponibile solo quando l'impresa globale è in corso")
				return
			}

			const global_cap = rows[0].global_cap;
			const global_eventhide = rows[0].global_eventhide;

			connection.query('SELECT SUM(value) As tot FROM achievement_global WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err;

				if ((Object.keys(rows).length == 0) && (player_id != 1)) {
					bot.sendMessage(message.chat.id, "Contribuisci all'obbiettivo dell'impresa globale per visualizzarne la classifica");
					return;
				}

				const my_pnt = rows[0].tot;
				const global_limit_perc = 0.15 + (reborn * 0.03);
				const global_limit_val = Math.round(global_cap * global_limit_perc / 100);

				var limit_msg = "";
				if (global_eventhide == 0) {
					if (my_pnt >= global_limit_val)
						limit_msg = "\nA questo punteggio la partecipazione all'impresa <b>verrà considerata</b> nelle tue statistiche! (Beta)";
					else
						limit_msg = "\nA questo punteggio la partecipazione all'impresa <b>NON verrà</b> considerata nelle tue statistiche. (Beta)";
				}

				connection.query('SELECT P.id, nickname, value As cnt FROM achievement_global A, player P WHERE account_id NOT IN (SELECT account_id FROM banlist) AND P.id NOT IN (1,3) AND A.player_id = P.id GROUP BY player_id ORDER BY SUM(value) DESC', function (err, rows, fields) {
					if (err) throw err

					let pos = 0
					let pnt = 0
					for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
						if (rows[i].id == player_id) {
							pos = i + 1
							pnt = rows[i].cnt
						}
					}

					if (pos == 0) {
						bot.sendMessage(message.chat.id, 'Non sei presente nella classifica')
						return
					}

					bot.sendMessage(message.chat.id, message.from.username + ', hai raggiunto la posizione <b>' + formatNumber(pos) + '</b> con <b>' + formatNumber(pnt) + "</b> punti nell'Impresa Globale in corso!" + limit_msg, html)
				})
			})
		})
	})
})

bot.onText(/^\/partecipanti/, function (message, match) {
	if (message.chat.id == -1001142821592) {
		connection.query('SELECT id, global_event FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) { return }

			const player_id = rows[0].id

			connection.query('SELECT global_cap FROM config', function (err, rows, fields) {
				if (err) throw err

				const global_cap = rows[0].global_cap;

				connection.query('SELECT P.reborn, COUNT(P.reborn) As cnt FROM achievement_global A, player P WHERE A.player_id = P.id GROUP BY reborn', async function (err, rows, fields) {
					if (err) throw err

					var tot = 0;
					var tot_ok = 0;
					var text = "";
					var global_limit_perc;
					var global_limit_val;
					var players;
					for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
						tot += rows[i].cnt;
						global_limit_perc = 0.15 + (rows[i].reborn * 0.03);
						global_limit_val = Math.round(global_cap * global_limit_perc / 100);
						players = await connection.queryAsync("SELECT COUNT(A.id) As tot FROM achievement_global A, player P WHERE A.player_id = P.id AND A.value >= " + global_limit_val + " AND P.reborn = " + rows[i].reborn);
						text += "R" + (rows[i].reborn - 1) + " (" + formatNumber(global_limit_val) + "): " + rows[i].cnt + " (" + players[0].tot + ")\n";
						tot_ok += players[0].tot;
					}

					bot.sendMessage(message.chat.id, "Totali: " + tot + " (" + tot_ok + ")\n" + text);
				});
			});
		});
	}
});

bot.onText(/^\/posizioneteam/, function (message, match) {
	connection.query('SELECT id, global_event FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const global_event = rows[0].global_event

		connection.query('SELECT global_eventwait FROM config', function (err, rows, fields) {
			if (err) throw err

			if (rows[0].global_eventwait == 1) {
				bot.sendMessage(message.chat.id, "La funzione è disponibile solo quando l'impresa globale è in corso")
				return
			}

			connection.query('SELECT team_id, player_id FROM team_player WHERE player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
				if (err) throw err

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.from.id, 'Non sei in team')
					return
				}

				const team_id = rows[0].team_id

				connection.query('SELECT P.nickname, T.player_id FROM team_player T, player P WHERE T.player_id = P.id AND team_id = ' + team_id + ' ORDER BY nickname', function (err, rows_team, fields) {
					if (err) throw err

					connection.query('SELECT P.id, nickname, value As cnt FROM achievement_global A, player P WHERE account_id NOT IN (SELECT account_id FROM banlist) AND P.id NOT IN (1,3) AND A.player_id = P.id GROUP BY player_id ORDER BY SUM(value) DESC', function (err, rows, fields) {
						if (err) throw err

						class player {
							constructor(nickname, pos, pnt) {
								this.nickname = nickname
								this.pos = pos
								this.pnt = pnt
							}
						}

						var arrayPlayers = []
						var pos = 0
						var pnt = 0
						for (let i = 0, len = Object.keys(rows_team).length; i < len; i++) {
							for (let j = 0, len = Object.keys(rows).length; j < len; j++) {
								if (rows[j].id == rows_team[i].player_id) {
									pos = j + 1
									pnt = rows[j].cnt
									arrayPlayers.push(new player(rows_team[i].nickname, pos, pnt))
								}
							}
							if (pos == 0)
								arrayPlayers.push(new player(rows_team[i].nickname, 0, 0))
							else {
								pos = 0
								pnt = 0
							}
						}

						function compare(a, b) {
							if (a.pnt < b.pnt) return -1;
							if (a.pnt > b.pnt) return 1;
							return 0;
						}

						arrayPlayers.sort(compare);
						arrayPlayers.reverse();

						var text = "Posizione in globale dei membri del team:\n";
						for (let i = 0, len = arrayPlayers.length; i < len; i++) {
							if (arrayPlayers[i].pos == 0) {
								text += "> <b>" + arrayPlayers[i].nickname + "</b> non presente in classifica\n"
							} else {
								text += "> <b>" + arrayPlayers[i].nickname + "</b> alla posizione <i>" + arrayPlayers[i].pos + "</i> con " + formatNumber(arrayPlayers[i].pnt) + " punti\n"
							}
						}

						bot.sendMessage(message.chat.id, text, html)
					})
				});
			});
		})
	})
})

bot.onText(/^\/checkmarket (.+)/, function (message, match) {
	if (message.chat.id != -1001064797183) {
		if (message.from.id != 20471035) { return }
	}

	connection.query('SELECT id, nickname FROM player WHERE nickname = "' + match[1] + '"', function (err, rows, fields) {
		if (err) throw err

		const player_id = rows[0].id
		const nickname = rows[0].nickname

		connection.query('SELECT P1.nickname As fromNick, P2.nickname As toNick, COUNT(from_id) As transac, (SELECT COUNT(to_id) FROM market_direct_history H WHERE (H.from_id = ' + player_id + ' OR H.to_id = ' + player_id + ')) As tot, ROUND(COUNT(from_id)/(SELECT COUNT(to_id) FROM market_direct_history H WHERE (H.from_id = ' + player_id + ' OR H.to_id = ' + player_id + '))*100, 2) As perc FROM market_direct_history H INNER JOIN player P1 ON P1.id = H.from_id INNER JOIN player P2 ON P2.id = H.to_id WHERE (H.from_id = ' + player_id + ' OR H.to_id = ' + player_id + ') GROUP BY from_id, to_id ORDER BY perc DESC', function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Nessuna transazione')
				return
			}

			let text = 'Transazioni per ' + nickname + ':\n'
			let len = Object.keys(rows).length
			if (len > 50) { len = 50 }
			for (let i = 0; i < len; i++) { text += rows[i].fromNick + ' > ' + rows[i].toNick + ' (' + rows[i].transac + ') ' + rows[i].perc + '%\n' }
			bot.sendMessage(message.chat.id, text)
		})
	})
})

bot.onText(/^\/checkmarketAll (.+)|^\/checkmarketAll/, function (message, match) {
	if (message.chat.id != -1001064797183) {
		if (message.from.id != 20471035) { return }
	}

	if (match[1] == undefined) { match[1] = 90 }

	let player_id = 0
	let nickname = ''
	let text = 'Transazioni sospette (>= ' + match[1] + '%, almeno 50) per gli utenti attivi:\n'
	let len = 0
	let cnt = 0

	console.log('Inizio controllo...')
	connection.query('SELECT P.id, P.nickname FROM last_command L, player P WHERE L.account_id = P.account_id AND L.time > NOW() - INTERVAL 1 WEEK', async function (err, rows, fields) {
		if (err) throw err

		console.log('Controllo transazioni sospette per ' + Object.keys(rows).length + ' utenti')
		for (let j = 0; j < Object.keys(rows).length; j++) {
			player_id = rows[j].id
			nickname = rows[j].nickname

			const transactions = await connection.queryAsync('SELECT P1.nickname As fromNick, P2.nickname As toNick, COUNT(from_id) As transac, (SELECT COUNT(to_id) FROM market_direct_history H WHERE (H.from_id = ' + player_id + ' OR H.to_id = ' + player_id + ')) As tot, ROUND(COUNT(from_id)/(SELECT COUNT(to_id) FROM market_direct_history H WHERE (H.from_id = ' + player_id + ' OR H.to_id = ' + player_id + '))*100, 2) As perc FROM market_direct_history H INNER JOIN player P1 ON P1.id = H.from_id INNER JOIN player P2 ON P2.id = H.to_id WHERE  (H.from_id = ' + player_id + ' OR H.to_id = ' + player_id + ') GROUP BY from_id, to_id ORDER BY perc DESC')

			len = Object.keys(transactions).length
			if (len > 50) { len = 50 }
			let transaction = ''
			for (let i = 0; i < len; i++) {
				if ((transactions[i].perc > match[1]) && (transactions[i].transac > 50)) {
					transaction = transactions[i].fromNick + ' > ' + transactions[i].toNick + ' (' + transactions[i].transac + ') ' + transactions[i].perc + '%'
					text += transaction + '\n'
					console.log(transaction)
				}
				cnt++
			}
		}
		if (cnt > 0) { bot.sendMessage(message.chat.id, text) } else { bot.sendMessage(message.chat.id, text + 'Nessun risultato') }
		console.log('Fine')
	})
})

bot.onText(/^\/gruzzolo/, function (message) {
	connection.query('SELECT id, money FROM player WHERE id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		if (rows[0].id == 1) {
			bot.sendMessage(message.chat.id, message.from.username + ', possiedi <b>troppissimi</b> §', html)
			return
		}
		let options = { parse_mode: 'HTML' }
		if (message.reply_to_message != undefined) { options = { parse_mode: 'HTML', reply_to_message_id: message.reply_to_message.message_id } }
		bot.sendMessage(message.chat.id, message.from.username + ', possiedi <b>' + formatNumber(rows[0].money) + '</b> §', options)
	})
})

bot.onText(/^\/trofei/, function (message) {
	connection.query('SELECT id, trophies FROM player WHERE id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const trophies = rows[0].trophies
		const player_id = rows[0].id

		connection.query('SELECT P.id FROM player P WHERE trophies > 0 ORDER BY trophies DESC', function (err, rows, fields) {
			if (err) throw err

			let pos = 1
			let found = 0
			let extra = ''
			for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
				if (rows[i].id == player_id) {
					found = 1
					break
				}
				pos++
			}

			if (found == 1) { extra = ' ed hai raggiunto la posizione <b>' + pos + '</b> della classifica' }

			let options = { parse_mode: 'HTML' }
			if (message.reply_to_message != undefined) { options = { parse_mode: 'HTML', reply_to_message_id: message.reply_to_message.message_id } }
			bot.sendMessage(message.chat.id, message.from.username + ', hai accumulato <b>' + formatNumber(trophies) + '</b> 🏆' + extra + ' in questa stagione', options)
		})
	})
})

bot.onText(/^\/vette/, function (message) {
	connection.query('SELECT id FROM player WHERE id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id

		connection.query('SELECT id FROM dragon WHERE player_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Non possiedi il drago.')
				return
			}

			connection.query('SELECT top_id FROM dragon_top_status WHERE player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, "Non hai effettuato l'accesso alle Vette.")
					return
				}

				const top_id = rows[0].top_id

				if (top_id == 0) {
					bot.sendMessage(message.chat.id, 'Accedi ad un Monte per utilizzare questo comando.')
					return
				}

				connection.query('SELECT name FROM dragon_top_list WHERE id = ' + top_id, function (err, rows, fields) {
					if (err) throw err

					const top_name = rows[0].name

					connection.query('SELECT rank FROM dragon_top_rank WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err

						let options = { parse_mode: 'HTML' }
						if (message.reply_to_message != undefined) { options = { parse_mode: 'HTML', reply_to_message_id: message.reply_to_message.message_id } }
						bot.sendMessage(message.chat.id, message.from.username + ', hai raggiunto il <b>' + top_name + '</b> con <b>' + rows[0].rank + '</b> Ð', options)
					})
				})
			})
		})
	})
})

bot.onText(/^\/imprese/, function (message) {
	connection.query('SELECT id, reborn, achievement_count, achievement_count_all FROM player WHERE id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '")', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		const reborn = rows[0].reborn
		const daily = rows[0].achievement_count
		const triplet = rows[0].achievement_count_all

		connection.query('SELECT D.achievement_id, L.name, L.value, L.multiply, L.limit_reborn FROM achievement_daily D, achievement_list L WHERE D.achievement_id = L.id ORDER BY D.id', async function (err, rows, fields) {
			if (err) throw err

			let achievement = ''
			let reb_lim = reborn
			if (Object.keys(rows).length > 0) {
				for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
					achievement += '<b>' + rows[i].name + '</b>:'
					const ach = await connection.queryAsync('SELECT completed, progress FROM achievement_status WHERE player_id = ' + player_id + ' AND achievement_id = ' + rows[i].achievement_id)
					if (Object.keys(ach).length > 0) {
						if (rows[i].multiply == 1) {
							reb_lim = reborn
							if (rows[i].limit_reborn != 0) {
								if (reborn > rows[i].limit_reborn) { reb_lim = rows[i].limit_reborn }
							}
							rows[i].reward = rows[i].reward * reb_lim
							rows[i].value = rows[i].value * reb_lim
						}
						if (ach[0].completed == 1) { achievement += ' ✅' } else { achievement += ' ❌ ' + formatNumber(ach[0].progress) + '/' + formatNumber(rows[i].value) }
					} else { achievement += ' ❌' }
					achievement += '\n'
				}

				let options = { parse_mode: 'HTML' }
				if (message.reply_to_message != undefined) { options = { parse_mode: 'HTML', reply_to_message_id: message.reply_to_message.message_id } }
				bot.sendMessage(message.chat.id, message.from.username + ', ecco il tuo progresso nelle imprese di oggi:\n' + achievement + 'Hai completato ' + formatNumber(daily) + ' imprese giornaliere e ottenuto ' + formatNumber(triplet) + ' triplette', options)
			};
		})
	})
})

bot.onText(/^\/oggetto (.+)|^\/oggetto/, function (message, match) {
	const oggetto = match[1]
	if (oggetto == undefined) {
		bot.sendMessage(message.chat.id, "Inserisci il nome dell'oggetto (es. /oggetto Spada Antimateria) per visualizzare quanti ne possiedi")
		return
	}

	if (reg.test(oggetto) == false) {
		bot.sendMessage(message.chat.id, 'Oggetto non valido, riprova')
		return
	}

	connection.query('SELECT * FROM item WHERE name = "' + oggetto + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length > 0) {
			const id = rows[0].id
			const name = rows[0].name
			const value = rows[0].value
			const max_value = rows[0].max_value
			const est = rows[0].estimate
			const power = rows[0].power
			const power_s = rows[0].power_shield
			const power_a = rows[0].power_armor
			const rarity = rows[0].rarity
			const critical = rows[0].critical
			const spread = rows[0].spread
			const spread_tot = rows[0].spread_tot

			connection.query('SELECT inventory.quantity As num FROM inventory, item WHERE item.id = inventory.item_id AND item.name = "' + oggetto + '" AND inventory.player_id = (SELECT id FROM player WHERE nickname = "' + message.from.username + '") AND quantity > 0', function (err, rows, fields) {
				if (err) throw err

				let posseduti = 0
				if (Object.keys(rows).length > 0) { posseduti = rows[0].num }

				let pow = ''
				if (power != 0) { pow = '\n*Giocatore:* ' + power + ', ' + critical + '%' } else if (power_a != 0) { pow = '\n*Giocatore:* ' + power_a + ', ' + critical + '%' } else if (power_s != 0) { pow = '\n*Giocatore:* ' + power_s + ', ' + critical + '%' }

				bot.sendMessage(message.chat.id, '*Nome oggetto:* ' + name + '\n' +
					'*Rarità:* ' + rarity + pow + '\n' +
					'*Prezzo base:* ' + formatNumber(value) + ' §\n' +
					'*Prezzo massimo:* ' + formatNumber(max_value) + ' §\n' +
					(est != 0 ? '*Valore:* ' + formatNumber(est) + ' §\n' : '') +
					'*Posseduti:* ' + formatNumber(posseduti) + '\n' +
					'*Diffusione:* ' + spread + '% (' + spread_tot + '%)', mark)
			})
		} else {
			bot.sendMessage(message.chat.id, "Non ho trovato l'oggetto specificato")
		}
	})
})

bot.onText(/^\/oggetti (.+)|^\/oggetti/, async function (message, match) {
	const inputMatch = match[1]
	if (inputMatch == undefined) {
		bot.sendMessage(message.chat.id, "Inserisci il nome parziale dell'oggetto (es. /oggetti Spada Anti) per visualizzare la lista e la quantità, per una ricerca precisa usa l'asterisco")
		return
	}
	if (reg.test(inputMatch) == false) {
		bot.sendMessage(message.chat.id, 'Oggetto non valido, riprova')
		return
	}

	const options = { parse_mode: 'HTML' }
	if (message.reply_to_message != undefined) options.reply_to_message_id = message.reply_to_message.message_id

	const players = await connection.queryAsync('SELECT id FROM player WHERE nickname = "' + message.from.username + '"')
	const player_id = players[0].id

	let oggetti = []
	if (inputMatch.indexOf(',') != -1) {
		oggetti = inputMatch.split(',')
		oggetti = cleanArray(oggetti)
	} else { oggetti.push(inputMatch) }

	const len = Object.keys(oggetti).length

	const results = await Promise.all(oggetti
		.map(oggetto => {
			oggetto = oggetto.trim()
			let part = 'like "%' + oggetto + '%"'
			if (oggetto.indexOf('*') != -1) {
				oggetto = oggetto.replace('*', '')
				part = '= "' + oggetto + '"'
			}
			const query = 'SELECT item.name, item.rarity, inventory.quantity As num FROM item, inventory WHERE item.name ' + part + ' AND inventory.item_id = item.id AND inventory.player_id = ' + player_id + ' AND inventory.quantity > 0'
			return connection.queryAsync(query)
		}))

	let text = ''
	for (const resultRows of results) {
		if (resultRows.length > 4000) {
			bot.sendMessage(message.chat.id, 'Troppi risultati, prova con un filtro più limitato')
			break
		}
		for (const result of resultRows) text += `\n> ${result.name} (${result.rarity}, ${formatNumber(result.num)})`
	}

	if (text.length > 0) {
		bot.sendMessage(message.chat.id, `<b>${message.from.username}</b> possiedi: ${text}`, options)
	} else {
		bot.sendMessage(message.chat.id, 'Non possiedi nessun oggetto con i filtri specificati')
	}
})

bot.onText(/^\/ricerca (.+)|^\/ricerca/, async function (message, match) {
	if (!checkSpam(message)) { return }

	const oggetto = match[1]
	if (oggetto == undefined) {
		bot.sendMessage(message.chat.id, "Inserisci il nome dell'oggetto (es. /ricerca Spada Antimateria) per cercare in tutte le vendite e scambi, puoi specificarne fino a 3 separati da virgola, anche parziali")
		return
	}

	if (reg.test(oggetto) == false) {
		bot.sendMessage(message.chat.id, 'Oggetto non valido, riprova')
		return
	}

	const o = oggetto.trim()
	let oggetti = []
	let ogg = ''

	if (o.indexOf(',') != -1) {
		oggetti = o.split(',')
		oggetti = cleanArray(oggetti)
	} else { oggetti.push(o) }

	const len = Object.keys(oggetti).length
	let plur = 'i'
	if (len == 1) { plur = 'o' }
	let text = 'Risultati ricerca di ' + len + ' oggett' + plur + ':\n'

	if (len > 3) {
		bot.sendMessage(message.chat.id, 'Massimo 3 oggetti grazie!')
		return
	}

	for (let m = 0; m < Object.keys(oggetti).length; m++) {
		ogg = oggetti[m].trim()
		const items = await connection.queryAsync('SELECT id, name FROM item WHERE name LIKE "%' + ogg + '%"')

		for (let i = 0; i < Object.keys(items).length; i++) {
			const itemId = items[i].id
			const itemName = items[i].name

			const lottery = await connection.queryAsync('SELECT player.nickname, public_lottery.price FROM public_lottery, player WHERE player.id = public_lottery.creator_id AND item_id = ' + itemId)

			if (Object.keys(lottery).length > 0) {
				text += '\n<b>Lotterie</b> per ' + itemName + ':\n'
				for (let j = 0; j < Object.keys(lottery).length; j++) {
					if (lottery[j].price == 0) { lottery[j].price = 'Gratis' } else { lottery[j].price = formatNumber(lottery[j].price) + ' §' }
					text += '> ' + lottery[j].nickname + ' (' + formatNumber(lottery[j].price) + ' - Lotteria)\n'
				}
			}

			const market_pack = await connection.queryAsync('SELECT price FROM market_pack WHERE pack_id != 9 AND item_id = ' + itemId)

			if (Object.keys(market_pack).length > 0) {
				text += '\n<b>Pacchetti</b> per ' + itemName + ':\n'
				for (let k = 0; k < Object.keys(market_pack).length; k++) { text += '> Mercante Pazzo (' + formatNumber(market_pack[k].price) + ' § - Pacchetto)\n' }
			}

			const public_shop = await connection.queryAsync('SELECT player.nickname, public_shop.code, public_shop.price FROM public_shop JOIN ( SELECT public_shop.code, MIN(public_shop.price) As minPrice, player.nickname FROM public_shop, player, inventory WHERE inventory.player_id = player.id AND inventory.item_id = ' + itemId + ' AND inventory.quantity > 0 AND public_shop.public = 1 AND public_shop.quantity > 0 AND player.id = public_shop.player_id AND public_shop.item_id = ' + itemId + ' GROUP BY nickname ) As t2, player, inventory WHERE inventory.player_id = player.id AND inventory.item_id = ' + itemId + ' AND inventory.quantity > 0 AND public_shop.public = 1 AND public_shop.quantity > 0 AND player.id = public_shop.player_id AND public_shop.item_id = ' + itemId + ' AND public_shop.price = t2.minPrice AND player.nickname = t2.nickname ORDER BY public_shop.price ASC, time_creation ASC')

			if (Object.keys(public_shop).length > 0) {
				text += '\n<b>Negozi</b> per ' + itemName + ':\n'
				for (let l = 0; l < Object.keys(public_shop).length; l++) { text += '> ' + public_shop[l].nickname + ' (' + formatNumber(public_shop[l].price) + ' § - <code>' + public_shop[l].code + '</code>)\n' }
			}
		}
	};

	if (Object.keys(text).length > 50) {
		if (Object.keys(text).length < 4000) { bot.sendMessage(message.chat.id, text, html) } else { bot.sendMessage(message.chat.id, 'Troppi risultati, prova con un filtro più limitato') }
	} else { bot.sendMessage(message.chat.id, 'Non ho trovato nessun offerta in corso per gli oggetti specificati') }
})

bot.onText(/^\/necessari (.+)|^\/necessari/, function (message, match) {
	const oggetto = match[1]
	if (oggetto == undefined) {
		bot.sendMessage(message.chat.id, "Inserisci il nome dell'oggetto (es. /necessari Spada Antimateria) per visualizzare tutti i materiali necessari")
		return
	}

	connection.query('SELECT id, name, searchable FROM item WHERE name = "' + oggetto + '"', function (err, rows, fields) {
		if (err) throw err

		let main = ''
		let mainId = 0

		if (Object.keys(rows).length > 0) {
			main = rows[0].name
			mainId = rows[0].id
		} else {
			bot.sendMessage(message.chat.id, "L'oggetto non esiste!")
			return
		}

		if (rows[0].searchable == 0) {
			bot.sendMessage(message.chat.id, "L'oggetto è nascosto!")
			return
		}

		connection.query('SELECT material_1, material_2, material_3 FROM craft WHERE material_result = ' + mainId, function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length > 0) {
				connection.query('SELECT name, rarity, searchable FROM item WHERE id IN (' + rows[0].material_1 + ',' + rows[0].material_2 + ',' + rows[0].material_3 + ')', function (err, rows, fields) {
					if (err) throw err
					let text = 'Oggetti necessari per *' + main + '*:\n'
					text += '> ' + rows[0].name + ' (' + rows[0].rarity + ')\n'
					text += '> ' + rows[1].name + ' (' + rows[1].rarity + ')\n'
					text += '> ' + rows[2].name + ' (' + rows[2].rarity + ')\n'
					bot.sendMessage(message.chat.id, text, mark)
				})
			} else {
				bot.sendMessage(message.chat.id, "L'oggetto non è creabile!")
			}
		})
	})
})

bot.onText(/^\/notifiche (.+)|^\/notifiche/, function (message, match) {
	if (match[1] == undefined) {
		bot.sendMessage(message.chat.id, 'Usa /notifiche <funzione> per disattivare le notifiche relative a quella funzione. Funzioni possibili:\n- Lotterie\n- Negozi\n- Aste\n- Acquisti')
		return
	}

	const func = match[1].toLowerCase()
	let func_txt = ''
	let type = 0
	if (func == 'lotterie') {
		type = 1
		func_txt = 'alle lotterie'
	} else if (func == 'negozi') {
		type = 2
		func_txt = 'ai negozi'
	} else if (func == 'aste') {
		type = 3
		func_txt = 'alle aste'
	} else if (func == 'acquisti') {
		type = 4
		func_txt = 'agli acquisti'
	} else {
		bot.sendMessage(message.chat.id, 'Funzione non valida, riprova')
		return
	}

	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const player_id = rows[0].id
		connection.query('SELECT deny FROM plus_notify WHERE player_id = ' + player_id + ' AND type = ' + type, function (err, rows, fields) {
			if (err) throw err
			let deny = 0

			if (Object.keys(rows).length > 0) {
				deny = rows[0].deny
				if (deny == 0) {
					connection.query('UPDATE plus_notify SET deny = 1 WHERE player_id = "' + player_id + '" AND type = ' + type, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Le notifiche relative ' + func_txt + ' sono state disattivate')
					})
				} else {
					connection.query('UPDATE plus_notify SET deny = 0 WHERE player_id = "' + player_id + '" AND type = ' + type, function (err, rows, fields) {
						if (err) throw err
						bot.sendMessage(message.chat.id, 'Le notifiche relative ' + func_txt + ' sono state riattivate')
					})
				}
			} else {
				connection.query('INSERT INTO plus_notify (player_id, type, deny) VALUES (' + player_id + ',' + type + ',1)', function (err, rows, fields) {
					if (err) throw err
					bot.sendMessage(message.chat.id, 'Le notifiche relative ' + func_txt + ' sono state disattivate')
				})
			}
		})
	})
})

bot.onText(/^\/prezzo (.+)|^\/prezzo/, function (message, match) {
	const oggetto = match[1]
	if (oggetto == undefined) {
		bot.sendMessage(message.chat.id, "Inserisci il nome dell'oggetto (es. /prezzo Spada Antimateria) per conoscerne gli ultimi prezzi")
		return
	}

	if (message.chat.id < 0) { bot.sendMessage(message.chat.id, '_Messaggio inviato in privato_', mark) }

	connection.query('SELECT id, value FROM item WHERE name = "' + oggetto + '"', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.chat.id, "L'oggetto inserito non esiste")
			return
		}

		const item_id = rows[0].id
		const value = rows[0].value

		connection.query('SELECT quantity, price, (SELECT nickname FROM market_direct_history, player WHERE player.id = from_id AND item_id = ' + item_id + ' LIMIT 1) As fromId, (SELECT nickname FROM market_direct_history, player WHERE player.id = to_id AND item_id = ' + item_id + ' LIMIT 1) As toId, (SELECT SUM(quantity) FROM market_direct_history WHERE item_id = ' + item_id + ') As cnt, market_direct_history.time FROM market_direct_history WHERE type != 4 AND item_id = ' + item_id + ' AND price != ' + value + ' ORDER BY id DESC LIMIT 1000', function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length > 0) {
				let text = 'Ultimi prezzi trovati per ' + oggetto + ':'

				let len = 25
				if (Object.keys(rows).length < len) { len = Object.keys(rows).length }

				let long_date = ''
				let d = new Date()
				let last_row = ''
				let this_row = ''
				let row_cnt = 0
				const this_qnt = 0
				for (let i = 0; i < Object.keys(rows).length; i++) {
					d = new Date(rows[i].time)
					long_date = ' alle ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds()) + ' del ' + addZero(d.getDate()) + '/' + addZero(d.getMonth() + 1) + '/' + d.getFullYear()
					this_row = '\n> ' + formatNumber(Math.round(rows[i].price)) + ' § per ' + formatNumber(rows[i].quantity) + ' copie'
					if (this_row != last_row) {
						text += this_row + long_date
						last_row = this_row
						row_cnt++
					}

					if (row_cnt >= len) { break }
				}
				bot.sendMessage(message.from.id, text + '\nVenduto ' + formatNumber(rows[0].cnt) + ' volte')
			} else {
				bot.sendMessage(message.from.id, "Non ho trovato l'ultimo prezzo dell'oggetto specificato")
			}
		})
	})
})

bot.onText(/^\/totale (.+)|^\/totale/, function (message, match) {
	const oggetto = match[1]
	if (oggetto == undefined) {
		bot.sendMessage(message.chat.id, "Inserisci il nome dell'oggetto (es. /totale Spada Antimateria) per calcolarne gli ultimi prezzi sommando i materiali necessari")
		return
	}

	if (message.chat.id < 0) { bot.sendMessage(message.chat.id, '_Messaggio inviato in privato_', mark) }

	connection.query('SELECT material_1, material_2, material_3 FROM craft WHERE material_result = (SELECT id FROM item WHERE name = "' + oggetto + '" LIMIT 1)', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.from.id, "L'oggetto inserito non esiste o non è creabile")
			return
		}

		const material_1 = rows[0].material_1
		const material_2 = rows[0].material_2
		const material_3 = rows[0].material_3

		const m1 = []
		const m2 = []
		const m3 = []

		connection.query('SELECT price, (SELECT nickname FROM market_direct_history, player WHERE player.id = from_id AND item_id = ' + material_1 + ' LIMIT 1) As fromId, (SELECT nickname FROM market_direct_history, player WHERE player.id = to_id AND item_id = ' + material_1 + ' LIMIT 1) As toId, (SELECT SUM(quantity) FROM market_direct_history WHERE item_id = ' + material_1 + ') As cnt FROM market_direct_history WHERE item_id = ' + material_1 + ' ORDER BY id DESC', function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length > 0) {
				let text = 'Prezzi calcolati per ' + oggetto + ' (basato sulle ultime 100 transazioni):'

				let len = 10
				if (Object.keys(rows).length < len) { len = Object.keys(rows).length }

				for (let i = 0; i < len; i++) { m1.push([Math.round(rows[i].price)]) }

				connection.query('SELECT price, (SELECT nickname FROM market_direct_history, player WHERE player.id = from_id AND item_id = ' + material_2 + ' LIMIT 1) As fromId, (SELECT nickname FROM market_direct_history, player WHERE player.id = to_id AND item_id = ' + material_2 + ' LIMIT 1) As toId, (SELECT SUM(quantity) FROM market_direct_history WHERE item_id = ' + material_2 + ') As cnt FROM market_direct_history WHERE item_id = ' + material_2 + ' ORDER BY id DESC', function (err, rows, fields) {
					if (err) throw err
					if (Object.keys(rows).length > 0) {
						if (Object.keys(rows).length < len) { len = Object.keys(rows).length }

						for (let i = 0; i < len; i++) { m2.push([Math.round(rows[i].price)]) }

						connection.query('SELECT price, (SELECT nickname FROM market_direct_history, player WHERE player.id = from_id AND item_id = ' + material_3 + ' LIMIT 1) As fromId, (SELECT nickname FROM market_direct_history, player WHERE player.id = to_id AND item_id = ' + material_3 + ' LIMIT 1) As toId, (SELECT SUM(quantity) FROM market_direct_history WHERE item_id = ' + material_3 + ') As cnt FROM market_direct_history WHERE item_id = ' + material_3 + ' ORDER BY id DESC', function (err, rows, fields) {
							if (err) throw err
							if (Object.keys(rows).length > 0) {
								if (Object.keys(rows).length < len) { len = Object.keys(rows).length }

								for (var i = 0; i < len; i++) { m3.push([Math.round(rows[i].price)]) }

								for (var i = 0; i < len; i++) { text += '\n> ' + (parseInt(m1[i]) + parseInt(m2[i]) + parseInt(m3[i])) + ' §' }

								bot.sendMessage(message.from.id, text)
							} else { bot.sendMessage(message.from.id, "Non ho trovato dati sufficienti per l'oggetto specificato") }
						})
					} else { bot.sendMessage(message.from.id, "Non ho trovato dati sufficienti per l'oggetto specificato") }
				})
			} else { bot.sendMessage(message.from.id, "Non ho trovato dati sufficienti per l'oggetto specificato") }
		})
	})
})

bot.onText(/^\/giocatore|^\/giocatrice/, function (message) {
	const player = message.from.username
	const account_id = 0

	getInfo(message, player, 6, 0, account_id)
})

bot.onText(/^\/drago (.+),(.+)|^\/drago/, function (message, match) {
	connection.query('SELECT id, money FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err
		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.chat.id, 'Non sei registrato!')
			return
		}

		let player_id = [rows[0].id]
		const money = rows[0].money

		const isSpy = 0
		if ((match[1] != undefined) && (match[2] != undefined)) {
			const name = match[1].toLowerCase()
			const typeArray = ['delle montagne', 'dei cieli', 'infernale', "dell'oscurità", 'dei mari', 'dei ghiacci']
			let type
			const sim = stringSimilarity.findBestMatch(match[2], typeArray)
			if (sim.bestMatch.rating >= 0.6) { type = sim.bestMatch.target } else {
				bot.sendMessage(message.chat.id, 'Tipo del drago non riconosciuto (' + sim.bestMatch.rating + ')')
				return
			}

			if (money < 50000) {
				bot.sendMessage(message.chat.id, 'Non hai abbastanza monete, ne servono 50.000!')
				return
			}

			var dragon = await connection.queryAsync('SELECT player_id FROM dragon WHERE name LIKE "%' + name + '%" AND type = "' + type + '"')
			if (Object.keys(dragon).length == 0) {
				bot.sendMessage(message.from.id, 'Il drago cercato non esiste!')
				return
			}
			await reduceMoney(player_id, 50000);

			if (Object.keys(dragon).length > 25) {
				bot.sendMessage(message.chat.id, 'Troppi risultati, riprova con un nome più preciso')
				return
			}

			player_id = []
			for (i = 0, len = Object.keys(dragon).length; i < len; i++) { player_id.push(dragon[i].player_id) }
		}

		let text = ''
		for (i = 0; i < player_id.length; i++) {
			var rows = await connection.queryAsync('SELECT D.*, P.nickname, P.class, P.charm_id, P.reborn, P.dragon_description, P.power_dragon_dmg, P.power_dragon_def, P.power_dragon_crit FROM player P, dragon D WHERE P.id = D.player_id AND P.id = ' + player_id[i])

			const power_dragon_dmg = rows[0].power_dragon_dmg
			const power_dragon_def = rows[0].power_dragon_def
			const power_dragon_crit = rows[0].power_dragon_crit

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.from.id, 'Non possiedi ancora un drago!')
				return
			}

			const charm_id = rows[0].charm_id
			const class_id = rows[0].class
			const reborn = rows[0].reborn
			const dragon_description = rows[0].dragon_description

			let dragon_name = '-'
			let dragon_level = '-'
			let dragon_damage = '-'
			let dragon_defence = '-'
			let dragon_critical = '-'
			let dragon_clawsid = 0
			let dragon_saddleid = 0
			let dragon_armsid = 0
			let dragon_claws = 0
			var dragon = 0
			let dragon_status = 'In salute'
			let player_name = ''
			let player_class = 0

			if (Object.keys(rows).length > 0) {
				dragon = 1

				if (charm_id == 602) {
					rows[0].damage += 25
					rows[0].critical += 10
				}
				if (charm_id == 695) {
					rows[0].damage += 30
					rows[0].critical += 15
				}

				if ((class_id == 7) && (reborn > 1)) {
					rows[0].claws += rows[0].claws * 0.5
					rows[0].saddle += rows[0].saddle * 0.5
				}
				if ((class_id == 7) && (reborn >= 5)) {
					rows[0].claws += rows[0].claws * 0.5
					rows[0].saddle += rows[0].saddle * 0.5
				}
				if ((class_id == 7) && (reborn == 6)) {
					rows[0].claws += rows[0].claws * 0.1
					rows[0].saddle += rows[0].saddle * 0.1
				}

				if ((class_id == 7) && (reborn == 3)) { rows[0].critical += 5 }
				if ((class_id == 7) && (reborn >= 4)) { rows[0].critical += 7 }

				dragon_name = rows[0].name.trim() + ' ' + rows[0].type
				dragon_level = rows[0].level
				dragon_damage = '+' + Math.round(rows[0].damage + rows[0].claws + power_dragon_dmg)
				dragon_defence = '-' + Math.round(rows[0].defence + rows[0].saddle + power_dragon_def)
				dragon_critical = Math.round(rows[0].critical + power_dragon_crit)

				dragon_claws = parseInt(rows[0].claws)

				dragon_clawsid = rows[0].claws_id
				dragon_saddleid = rows[0].saddle_id
				dragon_armsid = rows[0].arms_id

				if (rows[0].life <= 0) { dragon_status = 'Esausto' }
				if (rows[0].sleep_h > 0) { dragon_status = 'Dorme' }

				player_name = rows[0].nickname
				player_class = classSym(rows[0].class)
			}

			const claws = await connection.queryAsync('SELECT name, COUNT(name) As num FROM item WHERE id = ' + dragon_clawsid)

			let dragon_claws_n = '-'
			if (claws[0].num > 0) { dragon_claws_n = claws[0].name }

			const saddle = await connection.queryAsync('SELECT name, COUNT(name) As num FROM item WHERE id = ' + dragon_saddleid)

			let dragon_saddle_n = '-'
			if (saddle[0].num > 0) { dragon_saddle_n = saddle[0].name }

			const arms = await connection.queryAsync('SELECT name, COUNT(name) As num FROM item WHERE id = ' + dragon_armsid)

			let dragon_arms_n = '-'
			if (arms[0].num > 0) { dragon_arms_n = arms[0].name }

			text += (dragon ? '\n<b>' + dragon_name + ' (L' + dragon_level + ')</b> 🐉\n' : '') +
				'Proprietario: ' + player_name + ' ' + player_class + '\n' +
				(dragon ? 'Stato: ' + dragon_status + '\n' : '') +
				(dragon ? dragon_claws_n + ' (' + dragon_damage + ')\n' : '') +
				(dragon ? dragon_saddle_n + ' (' + dragon_defence + ')\n' : '') +
				(dragon ? dragon_arms_n + '\n' : '') +
				(dragon ? 'Critico (' + dragon_critical + '%)\n' : '') +
				(dragon_description != null ? '<i>' + dragon_description + '</i>' : '')
		};

		bot.sendMessage(message.chat.id, text, html)
	})
})

bot.onText(/^\/figurine$/, function (message, match) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err
		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.chat.id, 'Non sei registrato!')
			return
		}

		const player_id = rows[0].id

		connection.query('SELECT COUNT(I.id) As cnt FROM card_inventory I, card_list L WHERE I.card_id = L.id AND quantity > 0 AND player_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err
			const have = rows[0].cnt

			connection.query('SELECT rarity, COUNT(I.id) As cnt FROM card_inventory I, card_list L WHERE I.card_id = L.id AND quantity > 0 AND player_id = ' + player_id + ' GROUP BY rarity', function (err, rows, fields) {
				if (err) throw err

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, message.from.username + ', non possiedi alcuna figurina con i filtri selezionati!', html)
					return
				}

				let text = message.from.username + ', possiedi ' + formatNumber(have) + ' figurine suddivise per rarità:\n'
				for (i = 0, len = Object.keys(rows).length; i < len; i++) { text += '> Rarità ' + rows[i].rarity + ': ' + rows[i].cnt + '\n' }

				if (text.length >= 3500) {
					bot.sendMessage(message.chat.id, message.from.username + ', il messaggio è troppo lungo, riprova con /figurinel', html)
					return
				}

				bot.sendMessage(message.chat.id, text, html)
			})
		})
	})
})

bot.onText(/^\/figurinem (\d+)?|^\/figurinem/, function (message, match) {
	if (match[1] == undefined) {
		bot.sendMessage(message.chat.id, 'Specifica la rarità alla fine del comando, da 1 a 10')
		return
	}
	if ((match[1] < 1) || (match[1] > 10)) {
		bot.sendMessage(message.chat.id, 'La rarità deve essere compresa tra 1 e 10!')
		return
	}

	const rarity = match[1];

	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err
		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.chat.id, 'Non sei registrato!')
			return
		}

		const player_id = rows[0].id

		connection.query('SELECT name, rarity FROM card_list WHERE id NOT IN (SELECT card_id FROM card_inventory WHERE player_id = ' + player_id + ' AND quantity > 0) AND rarity = ' + rarity, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, message.from.username + ', possiedi tutte le figurine per rarità ' + rarity + '!', html)
				return
			}

			let text = message.from.username + ', ti mancano ' + formatNumber(Object.keys(rows).length) + ' figurine per rarità ' + rarity + ':\n'
			for (i = 0, len = Object.keys(rows).length; i < len; i++) { text += '> ' + rows[i].name + ' (' + rows[i].rarity + ')\n' }

			if (text.length >= 3500) {
				bot.sendMessage(message.chat.id, message.from.username + ', troppi risultati, prova con una rarità diversa', html)
				return
			}

			bot.sendMessage(message.chat.id, text, html)
		})
	});
});

bot.onText(/^\/figurinel (\w+)(\s\d+)?|^\/figurinel/, function (message, match) {
	let rarityFilter = ''
	let nameFilter = ''
	let quantityFilter = ''
	let orderFilter = 'ORDER BY name'
	let filterName = ''
	if (match[1] != undefined) {
		if (match[1] == 'doppie') {
			filterName = ' doppie'
			quantityFilter = ' AND quantity > 1'
		} else if (match[1] == 'rarità') {
			filterName = ' ordinate per rarità'
			orderFilter = 'ORDER BY rarity ASC'
		} else if (match[1] == 'raritàinv') {
			filterName = ' ordinate per rarità inverse'
			orderFilter = 'ORDER BY rarity DESC'
		} else if (isNaN(parseInt(match[1]))) {
			filterName = ' con nome parziale'
			nameFilter = " AND name LIKE '%" + match[1] + "%'"
		} else {
			if ((match[1] < 1) || (match[1] > 10)) {
				bot.sendMessage(message.chat.id, 'La rarità deve essere compresa tra 1 e 10!')
				return
			}

			filterName = ' di rarità ' + match[1]
			rarityFilter = ' AND rarity = ' + match[1]
		}
		if (match[2] != undefined) {
			if ((match[2] < 1) || (match[2] > 10)) {
				bot.sendMessage(message.chat.id, 'La rarità deve essere compresa tra 1 e 10!')
				return
			}

			filterName += ' di rarità ' + match[2]
			rarityFilter += ' AND rarity = ' + match[2]
		}
	}

	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err
		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.chat.id, 'Non sei registrato!')
			return
		}

		const player_id = rows[0].id

		connection.query('SELECT COUNT(I.id) As cnt FROM card_inventory I, card_list L WHERE I.card_id = L.id AND quantity > 0' + rarityFilter + nameFilter + quantityFilter + ' AND player_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err
			const have = rows[0].cnt

			connection.query('SELECT name, rarity, quantity FROM card_inventory I, card_list L WHERE I.card_id = L.id AND quantity > 0 AND player_id = ' + player_id + rarityFilter + nameFilter + quantityFilter + ' ' + orderFilter, function (err, rows, fields) {
				if (err) throw err

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, message.from.username + ', non possiedi alcuna figurina con i filtri selezionati!', html)
					return
				}

				let text = message.from.username + ', possiedi ' + formatNumber(have) + ' figurine' + filterName + ':\n'
				for (i = 0, len = Object.keys(rows).length; i < len; i++) { text += '> ' + rows[i].name + ' (' + rows[i].rarity + ', ' + rows[i].quantity + ')\n' }

				if (text.length >= 3500) {
					bot.sendMessage(message.chat.id, message.from.username + ', troppi risultati, riprova con un filtro', html)
					return
				}

				bot.sendMessage(message.chat.id, text, html)
			})
		})
	})
})

bot.onText(/^\/figurina (.+)|^\/figurina/, function (message, match) {
	if (match[1] == undefined) {
		bot.sendMessage(message.chat.id, 'Specifica il nome parziale della figurina dopo il comando!', html)
		return
	}

	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err
		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.chat.id, 'Non sei registrato!')
			return
		}

		const player_id = rows[0].id

		connection.query('SELECT id, name, rarity, creation_date FROM card_list WHERE name LIKE "%' + match[1] + '%" ORDER BY name', async function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Nessuna figurina trovata con i criteri specificati', html)
				return
			}

			if (Object.keys(rows).length > 20) {
				bot.sendMessage(message.chat.id, 'Troppi risultati, riprova con un filtro più preciso', html)
				return
			}

			let text = message.from.username + ', ' + Object.keys(rows).length + ' risultati per la ricerca:\n'
			for (i = 0, len = Object.keys(rows).length; i < len; i++) {
				const card = await connection.queryAsync('SELECT quantity FROM card_inventory WHERE card_id = ' + rows[i].id + ' AND player_id = ' + player_id)
				let poss = ''
				if (Object.keys(card).length > 0) {
					if (card[0].quantity >= 1) { poss = ' ✅' }
					if (card[0].quantity > 1) { poss += ' ' + card[0].quantity }
				}

				const dist = await connection.queryAsync('SELECT COUNT(id) As cnt FROM card_inventory WHERE quantity > 0 AND card_id = ' + rows[i].id)
				const tot = await connection.queryAsync('SELECT COUNT(id) As cnt FROM card_inventory WHERE quantity > 0')

				let creation_date = 'Prima del 09/19'
				if (rows[i].creation_date != null) {
					const d = new Date(rows[i].creation_date)
					creation_date = addZero(d.getDate()) + '/' + addZero(d.getMonth() + 1) + '/' + d.getFullYear()
				}

				text += '> <b>' + rows[i].name + '</b> (' + rows[i].rarity + ')' + poss + '\n Data creazione: ' + creation_date + '\n In circolazione: ' + formatNumber(dist[0].cnt) + '\n Distribuzione: ' + Math.round(dist[0].cnt / tot[0].cnt * 100) + '%\n\n'
			}

			bot.sendMessage(message.chat.id, text, html)
		})
	})
})

bot.onText(/^\/ispeziona (.+)|^\/ispeziona/, function (message, match) {
	if (message.reply_to_message == undefined) {
		bot.sendMessage(message.chat.id, message.from.username + ', questo comando va utilizzato in <i>risposta</i>', html)
		return
	}

	if (!checkSpam(message)) { return }

	const usr = message.reply_to_message.from.username

	if (usr == message.from.username) {
		bot.sendMessage(message.from.id, 'Non puoi ispezionare te stesso')
		return
	}

	let method = 1
	if (match[1] != undefined) {
		if (match[1].toLowerCase() == 'piedelesto') { method = 1 } else if (match[1].toLowerCase() == 'testacalda') { method = 2 } else if (match[1].toLowerCase() == 'occhiofurbo') { method = 3 }
	}

	connection.query('SELECT * FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}
		if (rows[0].holiday == 1) {
			bot.sendMessage(message.from.id, 'Non puoi ispezionare in vacanza')
			return
		}

		if (rows[0].heist_protection != null) {
			bot.sendMessage(message.from.id, 'A causa del campo di forza non puoi ispezionare gli altri utenti')
			return
		}

		const account_id = rows[0].account_id
		const myexp = rows[0].exp
		const lev = Math.floor(myexp / 10)
		const reborn = rows[0].reborn
		const from_id = rows[0].id
		const weapon_bonus = rows[0].weapon
		const life = rows[0].life
		const house_id = rows[0].house_id
		const money = rows[0].money
		const heist_count = rows[0].heist_count
		const global_end = rows[0].global_end
		const boost_id = rows[0].boost_id
		const boost_mission = rows[0].boost_mission

		if ((lev < 15) && (reborn == 1)) {
			bot.sendMessage(message.from.id, 'Il tuo livello è ancora troppo basso.')
			return
		}

		const travel = rows[0].travel_id
		const cave = rows[0].cave_id

		connection.query('SELECT COUNT(*) As num, datetime FROM heist WHERE from_id=' + from_id, function (err, rows, fields) {
			if (err) throw err
			if (rows[0].num > 0) {
				const date = new Date(rows[0].datetime)
				const short_date = addZero(date.getHours()) + ':' + addZero(date.getMinutes())
				bot.sendMessage(message.from.id, 'Ispezione in corso fino alle ' + short_date)
				return
			}
			connection.query('SELECT id FROM heist_progress WHERE from_id=' + from_id, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length > 0) {
					bot.sendMessage(message.from.id, "Stai svolgendo un ispezione, completala prima di iniziarne un'altra")
					return
				}

				if (money < 3000) {
					bot.sendMessage(message.from.id, 'Non hai abbastanza monete!')
					return
				}

				connection.query('SELECT id, account_id, reborn, holiday FROM player WHERE nickname = "' + usr + '"', async function (err, rows, fields) {
					if (err) throw err
					if (Object.keys(rows).length > 0) {
						if (await isBanned(rows[0].account_id) != null) {
							bot.sendMessage(message.from.id, 'Non puoi ispezionare un giocatore bannato')
							return
						}

						const d = new Date()
						const time = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate())

						if (reborn > rows[0].reborn) {
							bot.sendMessage(message.from.id, 'Puoi ispezionare solamente un giocatore con una rinascita pari o superiore alla tua')
							return
						}
						if (heist_count >= 10) {
							bot.sendMessage(message.from.id, 'Puoi ispezionare un rifugio solamente 10 volte al giorno, riprova domani.')
							return
						}

						if (rows[0].holiday == 1) {
							bot.sendMessage(message.from.id, 'Non puoi ispezionare un giocatore in modalità vacanza.')
							return
						}

						const to_id = rows[0].id

						var rows = await connection.queryAsync('SELECT id FROM heist_history WHERE from_id = ' + from_id + ' AND to_id = ' + to_id + ' AND time LIKE "' + time + '%"')
						if (Object.keys(rows).length > 2) {
							bot.sendMessage(message.from.id, 'Hai ispezionato troppe volte questo giocatore oggi, riprova domani.')
							return
						}

						var rows = await connection.queryAsync('SELECT id FROM heist_history WHERE from_id = ' + from_id + ' AND to_id = ' + to_id + ' AND time > DATE_SUB("' + time + '", INTERVAL 7 DAY)')
						if (Object.keys(rows).length > 10) {
							bot.sendMessage(message.from.id, 'Hai ispezionato troppe volte questo giocatore durante gli ultimi 7 giorni.')
							return
						}

						attack(usr, message, from_id, weapon_bonus, 3000, 0, account_id, global_end, boost_id, boost_mission, method)
					}
				})
			})
		})
	})
})

bot.onText(/^\/spia$/, function (message) {
	if (message.reply_to_message == undefined) {
		bot.sendMessage(message.chat.id, message.from.username + ', questo comando va utilizzato in <i>risposta</i>', html)
		return
	}

	if (!checkSpam(message)) { return }

	const player = message.reply_to_message.from.username

	connection.query('SELECT account_id, holiday, spy_count, heist_protection, account_id, id, exp, weapon, house_id, money, spy_description FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			bot.sendMessage(message.chat.id, '...', mark)
			return
		}

		if (rows[0].holiday == 1) {
			bot.sendMessage(account_id, 'Non puoi spiare in vacanza')
			return
		}

		if (rows[0].spy_count >= 30) {
			bot.sendMessage(account_id, 'Hai raggiunto il limite giornaliero.')
			return
		}

		if (rows[0].heist_protection != null) {
			bot.sendMessage(account_id, 'A causa del campo di forza non puoi spiare gli altri utenti')
			return
		}

		var account_id = rows[0].account_id
		const player_id = rows[0].id
		const level = Math.floor(rows[0].exp / 10)
		const power = rows[0].weapon
		const myhouse = rows[0].house_id

		let spy_description = ''
		if (rows[0].spy_description != null) { spy_description = '\nPortano con sè un messaggio su una pergamena: <i>' + rows[0].spy_description + '</i>' }

		if (rows[0].money < 5000) {
			bot.sendMessage(account_id, 'Non hai abbastanza monete')
			return
		}

		connection.query('SELECT id, heist_protection, chat_id, account_id, house_id FROM player WHERE nickname = "' + player + '"', async function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length > 0) {
				const chat_id = rows[0].chat_id
				const house_id = rows[0].house_id
				if (rows[0].id == 1) {
					bot.sendMessage(account_id, 'Guardone :>')
					return
				}

				if (rows[0].id == 3) {
					bot.sendMessage(account_id, 'Non si fanno ste cose :c')
					return
				}

				if (player_id == rows[0].id) {
					bot.sendMessage(account_id, 'Per visualizzare il tuo equipaggiamento utilizza il comando /giocatore')
					return
				}

				if (await isBanned(rows[0].account_id) != null) {
					bot.sendMessage(account_id, 'Non puoi spiare un giocatore bannato')
					return
				}

				if (rows[0].heist_protection != null) {
					bot.sendMessage(account_id, 'Il bersaglio è sotto protezione')
					return
				}

				getInfo(message, player, myhouse, 1, account_id)

				await reduceMoney(player_id, 5000);
				connection.query('UPDATE player SET spy_count = spy_count+1 WHERE id = ' + player_id, function (err, rows, fields) {
					if (err) throw err
				})

				if (message.from.id != 20471035) {
					if (house_id == 1) {
						bot.sendMessage(chat_id, 'Le pattuglie intorno al villaggio ci hanno avvisato che qualcuno ha spiato il tuo rifugio!' + spy_description, html)
					} else if (house_id == 2) {
						bot.sendMessage(chat_id, 'Le pattuglie intorno al villaggio ci hanno avvisato che qualcuno <b>di livello ' + level + '</b> ha spiato il tuo rifugio!' + spy_description, html)
					} else if ((house_id == 3) || (house_id == 4)) {
						bot.sendMessage(chat_id, 'Le pattuglie intorno al villaggio ci hanno avvisato che <b>un livello ' + level + ', con +' + power + ' di danno</b> ha spiato il tuo rifugio!' + spy_description, html)
					} else if (house_id >= 5) {
						bot.sendMessage(chat_id, 'Le pattuglie intorno al villaggio ci hanno avvisato che <b>' + message.from.username + '</b> ha spiato il tuo rifugio!' + spy_description, html)
					}
				}
			} else { bot.sendMessage(account_id, 'Giocatore non trovato.') }
		})
	})
})

bot.onText(/^\/scrigni/, function (message, match) {
	if (message.chat.id == '-1001069842056') {
		bot.sendMessage(message.chat.id, 'Lo zaino non può essere visualizzato in questo gruppo')
		return
	}

	connection.query('SELECT id, total_life, life, account_id FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		const player_id = rows[0].id
		let bottext = '<b>' + message.from.username + '</b> possiedi:\n'

		connection.query('SELECT chest.name, quantity As num FROM chest, inventory_chest WHERE chest.id = inventory_chest.chest_id AND inventory_chest.player_id = ' + player_id + ' AND quantity > 0 ORDER BY chest.id', function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length > 0) {
				for (i = 0, len = Object.keys(rows).length; i < len; i++) { bottext = bottext + '> ' + rows[i].name + ' (' + formatNumber(rows[i].num) + ')\n' }
			} else { bottext = bottext + 'Nessuno scrigno disponibile\n' }

			if ((new Date().getDate() == 1) && (new Date().getMonth() == 3)) { bot.sendMessage(message.chat.id, 'Nessuno scrigno disponibile 👀', html) } else { bot.sendMessage(message.chat.id, bottext, html) }
		})
	})
})

bot.onText(/^\/zaino (.+)|^\/zaino$/, function (message, match) {
	if (message.chat.id == '-1001069842056') {
		bot.sendMessage(message.chat.id, 'Lo zaino non può essere visualizzato in questo gruppo')
		return
	}

	let options = { parse_mode: 'HTML' }
	if (message.reply_to_message != undefined) { options = { parse_mode: 'HTML', reply_to_message_id: message.reply_to_message.message_id } }

	connection.query('SELECT id, total_life, life, account_id FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		const player_id = rows[0].id

		if (match[1] == undefined) {
			connection.query('SELECT rarity.shortname As rname, SUM(inventory.quantity) As num FROM inventory, item, rarity WHERE player_id = ' + player_id + ' AND rarity.shortname = item.rarity AND inventory.item_id = item.id AND inventory.quantity > 0 GROUP BY rarity.id ORDER BY rarity.id ASC', function (err, rows, fields) {
				if (err) throw err

				let bottext = '<b>' + message.from.username + '</b> possiedi troppi oggetti per poterli visualizzare, ecco un riassunto:\n'

				for (i = 0, len = Object.keys(rows).length; i < len; i++) { bottext += '> ' + rows[i].rname + ': ' + formatNumber(rows[i].num) + '\n' }

				bot.sendMessage(message.chat.id, bottext, html)
			})
			return
		}

		if (match[1].toLowerCase() == 'completo') {
			connection.query('SELECT inventory.player_id, item.name, rarity.id, rarity.shortname As rname, inventory.quantity As num, craftable FROM inventory, item, rarity WHERE player_id = ' + player_id + ' AND rarity.shortname = item.rarity AND inventory.item_id = item.id AND inventory.quantity > 0 ORDER BY rarity.id DESC, item.name ASC', function (err, rows, fields) {
				if (err) throw err
				let bottext = ''
				if (Object.keys(rows).length > 0) {
					let rarityPre = rows[0].rname
					for (i = 0, len = Object.keys(rows).length; i < len; i++) {
						if (rarityPre != rows[i].rname) {
							bot.sendMessage(message.chat.id, '<b>' + message.from.username + '</b> possiedi (' + rarityPre + '):\n' + bottext, options)
							rarityPre = rows[i].rname
							bottext = ''
						}
						if (rows[i].craftable == 0) { rows[i].name = '<b>' + rows[i].name + '</b>' }
						bottext += '> ' + rows[i].name + ' (' + rows[i].rname + ', ' + formatNumber(rows[i].num) + ')\n'
					}
					bot.sendMessage(message.chat.id, '<b>' + message.from.username + '</b> possiedi (' + rarityPre + '):\n' + bottext, options)
				}
			})
		} else if (match[1].toLowerCase() == 'consumabili') {
			const orderBy = 'ORDER BY rarity.id DESC, item.name ASC'

			let bottext = '<b>' + message.from.username + '</b> possiedi (Consumabili):\n'

			connection.query('SELECT inventory.player_id, item.name, rarity.id, rarity.shortname As rname, inventory.quantity As num FROM inventory, item, rarity WHERE player_id = ' + player_id + ' AND rarity.shortname = item.rarity AND inventory.item_id = item.id AND item.cons = 1 AND inventory.quantity > 0 ' + orderBy, function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length > 0) {
					for (i = 0, len = Object.keys(rows).length; i < len; i++) { bottext = bottext + '> ' + rows[i].name + ' (' + rows[i].rname + ', ' + formatNumber(rows[i].num) + ')\n' }
				} else { bottext = bottext + 'Nessun oggetto per questo filtro disponibile\n' }
				if (Object.keys(bottext).length > 4000) { bottext = 'Purtroppo lo zaino non può essere visualizzato poichè contiene troppi oggetti' }

				bot.sendMessage(message.chat.id, bottext, options)
			})
		} else if (match[1].toLowerCase() == 'i') {
			connection.query('DELETE FROM magic WHERE quantity <= 0 AND player_id = ' + player_id, function (err, rows, fields) {
				if (err) throw err

				let bottext = message.from.username + ', ecco i tuoi incantesimi:\n\n'

				connection.query('SELECT type, power, quantity FROM magic WHERE player_id = ' + player_id, function (err, rows, fields) {
					if (err) throw err

					if (Object.keys(rows).length > 0) {
						let n = ''
						for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
							if (rows[i].type == 1) { n = 'Furia dei Mari' } else if (rows[i].type == 2) { n = 'Tempesta Folgorante' } else if (rows[i].type == 3) { n = 'Impeto di Fiamme' } else if (rows[i].type == 4) { n = 'Ira Astrale' }
							bottext = bottext + '> ' + n + ' ' + rows[i].power + ' (' + rows[i].quantity + ')\n'
						}
					} else { bottext = bottext + 'Nessun incantesimo disponibile\n' }
					bot.sendMessage(message.chat.id, bottext, options)
				})
			})
		} else {
			let query = "= '" + match[1] + "'"
			let rarity_text = match[1].toUpperCase()
			if (match[1].indexOf(',') != -1) {
				rarity_text = match[1].split(',').join(', ')
				const rarities = match[1].split(',').join("','")
				query = "IN ('" + rarities + "')"
			}

			connection.query('SELECT shortname FROM rarity WHERE shortname ' + query, function (err, rows, fields) {
				if (err) throw err

				if (Object.keys(rows).length == 0) {
					bot.sendMessage(message.chat.id, 'Rarità non valida', mark)
					return
				}

				let orderBy = 'ORDER BY rarity.id DESC, item.name ASC'
				if (rows[0].shortname == 'D') { orderBy = 'ORDER BY item.id ASC' }

				let bottext = '<b>' + message.from.username + '</b> possiedi (' + rarity_text + '):\n'

				connection.query('SELECT inventory.player_id, item.name, rarity.id, rarity.shortname As rname, inventory.quantity As num, craftable FROM inventory, item, rarity WHERE player_id = ' + player_id + ' AND rarity.shortname = item.rarity AND inventory.item_id = item.id AND rarity.shortname ' + query + ' AND inventory.quantity > 0 ' + orderBy, function (err, rows, fields) {
					if (err) throw err
					if (Object.keys(rows).length > 0) {
						for (i = 0, len = Object.keys(rows).length; i < len; i++) {
							if (rows[i].craftable == 0) { rows[i].name = '<b>' + rows[i].name + '</b>' }
							bottext = bottext + '> ' + rows[i].name + ' (' + rows[i].rname + ', ' + formatNumber(rows[i].num) + ')\n'
						}
					} else { bottext = bottext + 'Nessun oggetto di questa rarità disponibile\n' }
					if (Object.keys(bottext).length > 4000) { bottext = 'Purtroppo lo zaino non può essere visualizzato poichè contiene troppi oggetti' }

					bot.sendMessage(message.chat.id, bottext, options)
				})
			})
		}
	})
})

bot.onText(/^\/zainob (.+)|^\/zainoc (.+)|^\/zainob|^\/zainoc/, function (message, match) {
	if (message.chat.id == '-1001069842056') {
		bot.sendMessage(message.chat.id, 'Lo zaino non può essere visualizzato in questo gruppo')
		return
	}

	connection.query('SELECT id, total_life, life, account_id FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		const player_id = rows[0].id
		let craftable = 0
		let craftTxt = ''
		if (message.text.indexOf('/zainob') != -1) { craftTxt = 'Base' } else if (message.text.indexOf('/zainoc') != -1) {
			craftable = 1
			craftTxt = 'Creati'
		} else {
			bot.sendMessage(message.chat.id, 'Comando non valido')
			return
		}

		let rarity = ''
		let desc = ''
		if (match[1] != undefined) {
			rarity = " AND rarity.shortname IN ('" + match[1].split(',').map(Function.prototype.call, String.prototype.trim).join("','") + "')"
			desc = ' - ' + match[1].toUpperCase()
		} else if (match[2] != undefined) {
			rarity = " AND rarity.shortname IN ('" + match[2].split(',').map(Function.prototype.call, String.prototype.trim).join("','") + "')"
			desc = ' - ' + match[2].toUpperCase()
		}

		let bottext = '<b>' + message.from.username + '</b> possiedi (' + craftTxt + desc + '):\n'

		connection.query('SELECT inventory.player_id, item.name, rarity.id, rarity.shortname As rname, inventory.quantity As num FROM inventory, item, rarity WHERE player_id = ' + player_id + ' AND rarity.shortname = item.rarity AND inventory.item_id = item.id AND item.craftable = ' + craftable + ' AND inventory.quantity > 0' + rarity + ' ORDER BY item.name ASC', function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length > 0) {
				for (i = 0, len = Object.keys(rows).length; i < len; i++) { bottext += '> ' + rows[i].name + ' (' + rows[i].rname + ', ' + formatNumber(rows[i].num) + ')\n' }
			} else { bottext = bottext + 'Nessun oggetto con questo filtro disponibile\n' }
			if (Object.keys(bottext).length > 4000) {
				connection.query('SELECT rarity.shortname As rname, SUM(inventory.quantity) As num FROM inventory, item, rarity WHERE player_id = ' + player_id + ' AND rarity.shortname = item.rarity AND inventory.item_id = item.id AND item.craftable = ' + craftable + ' AND inventory.quantity > 0 GROUP BY rarity.id ORDER BY rarity.id ASC', function (err, rows, fields) {
					if (err) throw err

					let bottext = '<b>' + message.from.username + '</b> possiedi troppi oggetti ' + craftTxt.toLowerCase() + ' per poterli visualizzare, ecco un riassunto:\n'

					for (i = 0, len = Object.keys(rows).length; i < len; i++) { bottext += '> ' + rows[i].rname + ': ' + formatNumber(rows[i].num) + '\n' }

					bot.sendMessage(message.chat.id, bottext, html)
				})
			} else { bot.sendMessage(message.chat.id, bottext, html) }
		})
	})
})

bot.onText(/^\/zainor/, function (message, match) {
	if (message.chat.id == '-1001069842056') {
		bot.sendMessage(message.chat.id, 'Lo zaino non può essere visualizzato in questo gruppo')
		return
	}

	connection.query('SELECT id, total_life, life, account_id, gems, mkeys, money, moon_coin, necro_pnt, gain_exp FROM player WHERE nickname = "' + message.from.username + '"', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) { return }

		const banReason = await isBanned(rows[0].account_id)
		if (banReason != null) {
			const text = '...'
			bot.sendMessage(message.chat.id, text, mark)
			return
		}

		const player_id = rows[0].id

		let bottext = '<b>' + message.from.username + '</b> possiedi:\n'

		bottext += 'Monete: ' + formatNumber(rows[0].money) + ' §\n'
		if (rows[0].gems > 0) { bottext += 'Gemme: ' + formatNumber(rows[0].gems) + ' 💎\n' }
		if (rows[0].mkeys > 0) { bottext += 'Chiavi Mistiche: ' + formatNumber(rows[0].mkeys) + ' 🗝\n' }
		if (rows[0].moon_coin > 0) { bottext += 'Monete Lunari: ' + formatNumber(rows[0].moon_coin) + ' 🌕\n' }
		if (rows[0].necro_pnt > 0) { bottext += 'Necrospiriti: ' + formatNumber(rows[0].necro_pnt) + ' 💠\n' }
		if (rows[0].gain_exp > 0) { bottext += 'Esperienza accumulata: ' + formatNumber(rows[0].gain_exp) + ' ✨\n' }
		const dust = await connection.queryAsync('SELECT IFNULL(SUM(quantity), 0) As quantity FROM inventory WHERE item_id = 646 AND player_id = ' + player_id)
		if (dust[0].quantity > 0) { bottext += 'Polvere: ' + formatNumber(dust[0].quantity) + ' ♨️\n' }
		const inventory_val = await connection.queryAsync('SELECT SUM(I.value*IV.quantity) As val FROM item I, inventory IV WHERE I.id = IV.item_id AND IV.player_id = ' + player_id)
		bottext += 'Valore zaino: ' + formatNumber(inventory_val[0].val) + ' §\n'

		connection.query('SELECT mana_1, mana_2, mana_3 FROM event_mana_status WHERE player_id = ' + player_id, function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length > 0) { bottext += 'Mana:\n> ' + formatNumber(rows[0].mana_1) + ' Blu 🌊\n> ' + formatNumber(rows[0].mana_2) + ' Giallo ⚡️\n> ' + formatNumber(rows[0].mana_3) + ' Rosso 🔥\n' }

			bot.sendMessage(message.chat.id, bottext, html)
		})
	})
})

// Funzioni

function cleanForMerge(text) {
	return text.replaceAll(/<[^>]*>/, '')
}

function attack(nickname, message, from_id, weapon_bonus, cost, source, account_id, global_end, boost_id, boost_mission, method) {
	connection.query('SELECT exp, ability, chat_id, heist_count, heist_limit, heist_protection, house_id, custom_name_h, id, money FROM player WHERE nickname = "' + nickname + '"', async function (err, rows, fields) {
		if (err) throw err
		const chat_id_nickname = rows[0].chat_id
		const isMatch = source

		if (Object.keys(rows).length == 0) {
			bot.sendMessage(message.from.id, 'Questo nickname non esiste, riprova.')
			return
		}

		const to_id = rows[0].id

		if ((to_id == 1) || (to_id == 3)) {
			bot.sendMessage(message.from.id, "Dice il saggio: 'Campa cavallo sulla panca insieme alla capra facendo i cavolacci propri... In poche parole, fatti gli affari tuoi :>'")
			return
		}

		const house_id = rows[0].house_id
		const heist_count = parseInt(rows[0].heist_count)
		let heist_limit = parseInt(rows[0].heist_limit)
		const ability = parseInt(rows[0].ability)
		const custom_name_h = rows[0].custom_name_h

		// per contare anche quelli in viaggio nelle subite
		const limitProgress = await connection.queryAsync('SELECT COUNT(id) As cnt FROM heist WHERE to_id = ' + to_id)
		heist_limit += limitProgress[0].cnt

		if (rows[0].heist_protection != null) {
			bot.sendMessage(message.from.id, 'Il bersaglio è sotto protezione')
			return
		}
		if (rows[0].money <= 0) {
			bot.sendMessage(message.from.id, 'Il bersaglio ha poche monete, riprova cambiando giocatore.')
			return
		}

		if ((rows[0].exp <= 150) && (isMatch == 0)) {
			bot.sendMessage(message.from.id, 'Il bersaglio ha poca esperienza, riprova cambiando giocatore.')
			return
		}

		connection.query('SELECT level, name, type FROM dragon WHERE player_id = ' + to_id, function (err, rows, fields) {
			if (err) throw err

			let dragon_lev = 0
			let dragon_name = ''

			if (Object.keys(rows).length > 0) {
				dragon_lev = rows[0].level
				dragon_name = rows[0].name + ' ' + rows[0].type
			}

			connection.query('SELECT team.name FROM team_player, team WHERE team.id = team_player.team_id AND player_id = ' + to_id, function (err, rows, fields) {
				if (err) throw err

				let team_name = '-'
				if (Object.keys(rows).length == 0) {
					if (heist_limit >= 3) {
						bot.sendMessage(message.from.id, 'Il bersaglio non possiede un team e ha raggiunto il limite di ispezioni subite. Riprova domani.')
						return
					}
				} else {
					if (heist_limit >= 10) {
						bot.sendMessage(message.from.id, 'Il bersaglio ha raggiunto il limite di ispezioni subite. Riprova domani.')
						return
					}
					team_name = rows[0].name
				}

				if (isMatch == 1) {
					connection.query('UPDATE player SET last_mm = ' + to_id + ' WHERE id = ' + from_id, function (err, rows, fields) {
						if (err) throw err
					})
				}

				connection.query('SELECT name, rooms, grade FROM house WHERE id=' + house_id, async function (err, rows, fields) {
					if (err) throw err

					const house_name = rows[0].name
					const grade = rows[0].grade
					const rooms = rows[0].rooms

					await reduceMoney(from_id, cost);

					// var method = 1;  //piedelesto default
					const query = ''
					// Secondi (massimo 6*600 + 100)
					let totTime = (grade * 900)
					let rate = 50
					let gnome = 'Testacalda'

					if (method == 1) {
						totTime = Math.round(totTime * 0.6)
						rate = 40
						gnome = 'Piedelesto'
					} else if (method == 3) {
						totTime = Math.round(totTime * 1.2)
						rate = 60
						gnome = 'Occhiofurbo'
					}

					/*
					if (global_end == 1){
					  totTime = Math.round(totTime / 2);
					}
					*/

					if (boost_id == 9) {
						if (boost_mission - 1 == 0) {
							connection.query('UPDATE player SET boost_mission = 0, boost_id = 0 WHERE id = ' + from_id, function (err, rows, fields) {
								if (err) throw err
							})
						} else {
							connection.query('UPDATE player SET boost_mission = boost_mission-1 WHERE id = ' + from_id, function (err, rows, fields) {
								if (err) throw err
							})
						}

						totTime = Math.round(totTime / 2)
					}

					const now = new Date()
					now.setSeconds(now.getSeconds() + totTime)
					const short_date = addZero(now.getHours()) + ':' + addZero(now.getMinutes())
					const long_date = now.getFullYear() + '-' + addZero(now.getMonth() + 1) + '-' + addZero(now.getDate()) + ' ' + addZero(now.getHours()) + ':' + addZero(now.getMinutes()) + ':' + addZero(now.getSeconds())

					connection.query('INSERT INTO heist (from_id, to_id, datetime, rate, grade, matchmaking) ' +
						'VALUES (' + from_id + ',' + to_id + ',"' + long_date + '",' + rate + ',' + grade + ',' + isMatch + ')',
						function (err, rows, fields) {
							if (err) throw err

							bot.sendMessage(message.chat.id, message.from.username + ', hai inviato ' + gnome + " all'ispezione del rifugio di " + nickname + ', tornerà alle ' + short_date + '!')
						})
					connection.query('UPDATE player SET heist_count = heist_count+1 WHERE id = ' + from_id, function (err, rows, fields) {
						if (err) throw err
					})
				})
			})
		})
	})
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1)
}

function classSym(className) {
	let classSym = '🐓'
	if ((className == 'Sciamano Elementalista') || (className == 2)) { classSym = '🦉' } else if ((className == 'Esploratore Druido') || (className == 3)) { classSym = '🐅' } else if ((className == 'Incantaspade') || (className == 4)) { classSym = '🦅' } else if ((className == 'Consacratore Divino') || (className == 5)) { classSym = '🕊' } else if ((className == 'Spaccateste') || (className == 6)) { classSym = '🦍' } else if ((className == 'Discepolo dei Draghi') || (className == 7)) { classSym = '🐲' } else if ((className == 'Barbaro') || (className == 8)) { classSym = '🦏' } else if ((className == 'Predone') || (className == 9)) { classSym = '🦊' }
	return classSym
}

function rebSym(reborn) {
	let rebSym = ''
	if (reborn == 1) { rebSym = '✨' } else if (reborn == 2) { rebSym = '🔆' } else if (reborn == 3) { rebSym = '💫' } else if (reborn == 4) { rebSym = '⭐️' } else if (reborn == 5) { rebSym = '🌟' } else if (reborn == 6) { rebSym = '🎖' }
	return rebSym
}

function getInfo(message, player, myhouse_id, from, account_id) {
	connection.query('SELECT id FROM player WHERE nickname = "' + message.from.username + '"', function (err, rows, fields) {
		if (err) throw err
		if (Object.keys(rows).length == 0) { return }

		const my_player_id = rows[0].id

		connection.query('SELECT * FROM player WHERE nickname = "' + player + '"', async function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length == 0) {
				bot.sendMessage(message.chat.id, 'Il giocatore non è registrato')
				return
			}

			let gender_text = 'Giocatore'
			let gender_sym = '🏃‍♂️'
			if (rows[0].gender == 'F') {
				gender_text = 'Giocatrice'
				gender_sym = '🏃‍♀️'
			}

			const player_id = rows[0].id
			const nickname = rows[0].nickname
			let exp = rows[0].exp
			let lev = Math.floor(exp / 10)
			var reborn = rows[0].reborn
			let money = rows[0].money
			let rank = rows[0].rank
			const ability = rows[0].ability
			let mission_team_count = rows[0].mission_team_count
			const player_description = rows[0].player_description
			const dragon_description = rows[0].dragon_description
			const player_custom_nickname = rows[0].player_custom_nickname
			let life = rows[0].life
			let total_life = rows[0].total_life
			const gems = rows[0].gems
			let heist_count = rows[0].heist_count
			let spy_count = rows[0].spy_count
			const craft_count = rows[0].craft_count
			const craft_week = rows[0].craft_week
			const custom_name = rows[0].custom_name
			const custom_name2 = rows[0].custom_name2
			const custom_name3 = rows[0].custom_name3
			const custom_name_h = rows[0].custom_name_h
			const weapon_id = rows[0].weapon_id
			const weapon2_id = rows[0].weapon2_id
			const weapon3_id = rows[0].weapon3_id
			let weapon = rows[0].weapon
			let weapon2 = rows[0].weapon2
			const weapon3 = rows[0].weapon3
			const weapon_enchant_bonus = rows[0].weapon_enchant_bonus
			const weapon2_enchant_bonus = rows[0].weapon2_enchant_bonus
			const weapon3_enchant_bonus = rows[0].weapon3_enchant_bonus
			const weapon_enchant = rows[0].weapon_enchant
			const weapon2_enchant = rows[0].weapon2_enchant
			const weapon3_enchant = rows[0].weapon3_enchant
			const power_dmg = rows[0].power_dmg
			const power_def = rows[0].power_def
			const power_weapon = rows[0].power_weapon
			const power_armor = rows[0].power_armor
			const power_shield = rows[0].power_shield
			const power_dragon_dmg = rows[0].power_dragon_dmg
			const power_dragon_def = rows[0].power_dragon_def
			const power_dragon_crit = rows[0].power_dragon_crit
			let weapon_crit = rows[0].weapon_crit
			let weapon2_crit = rows[0].weapon2_crit
			let weapon3_crit = rows[0].weapon3_crit
			const charm_id = rows[0].charm_id
			const house_id = rows[0].house_id
			var reborn = rows[0].reborn
			const class_id = rows[0].class
			const boost_id = rows[0].boost_id
			const creation_date = rows[0].creation_date
			const top_win = rows[0].top_win
			const top_win_best = rows[0].top_win_best
			const map_win_best = rows[0].map_win_best
			const global_win = rows[0].global_win
			const trophies = rows[0].trophies
			const total_trophies = rows[0].total_trophies

			let top_win_text = ''
			if (top_win > 0) { top_win_text = 'Vittorie Vette: ' + top_win + ' (' + top_win_best + ' Ð)\n' }

			let map_win_text = ''
			const map_win = await connection.queryAsync('SELECT COUNT(id) As cnt FROM map_history WHERE player_id = ' + player_id + ' AND position = 1')
			if (map_win[0].cnt > 0) { map_win_text = 'Vittorie Mappe: ' + map_win[0].cnt + ' (' + map_win_best + ' 🏆)\n' }

			let global_win_text = ''
			if (global_win > 0) { global_win_text = 'Vittorie Globali: ' + global_win + '\n' }

			let trophies_text = ''
			if (total_trophies > 0) { trophies_text = 'Trofei Mappe: ' + trophies + ' / ' + total_trophies + '\n' }

			if (mission_team_count > 0) { mission_team_count = 'Incarichi: ' + formatNumber(mission_team_count) + '\n' } else { mission_team_count = '' }

			if (rank > 0) { rank = 'Rango: ' + getRankName(rank, 0) + ' (' + rank + ')\n' } else { rank = '' }

			connection.query('SELECT name, id FROM item WHERE id = ' + weapon_id, function (err, rows, fields) {
				if (err) throw err
				let weapon_name = '-'
				let weapon_id = 0
				if (Object.keys(rows).length > 0) {
					weapon_id = rows[0].id
					if ((weapon_id == 638) || (weapon_id == 639) || (weapon_id == 640) || (weapon_id == 754)) {
						if (custom_name != null) { weapon_name = custom_name + rows[0].name.replace('Necro', '') } else { weapon_name = rows[0].name }
						if (weapon_id == 638) { weapon_name += ' ⚡️' } else if (weapon_id == 639) { weapon_name += ' 🔥' } else if (weapon_id == 640) { weapon_name += ' 🌊' } else if (weapon_id == 754) { weapon_name += ' ✨' }
					} else { weapon_name = rows[0].name }
				};

				connection.query('SELECT ability_level FROM ability WHERE player_id = ' + player_id + ' AND ability_id = 1', function (err, rows, fields) {
					if (err) throw err

					let abBonus = 0
					if (Object.keys(rows).length > 0) { abBonus = rows[0].ability_level }

					connection.query('SELECT COUNT(item_id) As cnt FROM artifacts WHERE player_id = ' + player_id, function (err, rows, fields) {
						if (err) throw err

						let artifacts = ''
						if (rows[0].cnt > 0) { artifacts = 'Artefatti: ' }
						if (rows[0].cnt >= 1) { artifacts += '🔥' }
						if (rows[0].cnt >= 2) { artifacts += '⚡️' }
						if (rows[0].cnt >= 3) { artifacts += '⛈' }
						if (rows[0].cnt >= 4) { artifacts += '🌑' }
						if (rows[0].cnt >= 5) { artifacts += '🔮' }
						if (rows[0].cnt >= 6) { artifacts += '🌪' }
						if (rows[0].cnt > 0) { artifacts += '\n' }

						connection.query('SELECT name, description FROM item WHERE id = ' + charm_id, function (err, rows, fields) {
							if (err) throw err
							let talismano = '-'
							let talismano_desc = ''
							if (Object.keys(rows).length > 0) {
								talismano = rows[0].name
								talismano_desc = ' (' + rows[0].description + ')'
							};

							connection.query('SELECT name FROM house WHERE grade = ' + house_id, function (err, rows, fields) {
								if (err) throw err
								let rifugio = '-'
								if (Object.keys(rows).length > 0) {
									if (house_id >= 5) {
										if (custom_name_h != null) { rifugio = 'Rifugio ' + custom_name_h + ' (' + house_id + ')' } else { rifugio = rows[0].name + ' (' + house_id + ')' }
									} else { rifugio = rows[0].name + ' (' + house_id + ')' }
								};

								connection.query('SELECT name FROM player, team, team_player WHERE player.id = ' + player_id + ' AND team.id = team_player.team_id AND team_player.player_id = player.id', function (err, rows, fields) {
									if (err) throw err
									let team_desc = ''
									if (Object.keys(rows).length > 0) { team_desc = '⚜️ ' + rows[0].name.trim() + '\n' }

									connection.query('SELECT COUNT(id) As cnt, (SELECT COUNT(id) FROM card_list) As tot FROM card_inventory WHERE quantity > 0 AND player_id = ' + player_id, function (err, rows, fields) {
										if (err) throw err
										let cards_txt = ''
										if (rows[0].cnt > 0) { cards_txt = 'Figurine diverse: ' + formatNumber(rows[0].cnt) + '/' + formatNumber(rows[0].tot) + '\n' }

										connection.query('SELECT name FROM house WHERE id = ' + house_id, function (err, rows, fields) {
											if (err) throw err
											const house_name = rows[0].name

											connection.query('SELECT name FROM item WHERE id = ' + weapon2_id, function (err, rows, fields) {
												if (err) throw err
												let weapon2_name = '-'
												if (Object.keys(rows).length > 0) {
													if ((weapon2_id == 688) || (weapon2_id == 689) || (weapon2_id == 690) || (weapon2_id == 790)) {
														if (custom_name2 != null) { weapon2_name = rows[0].name.replace('Necro', custom_name2) } else { weapon2_name = rows[0].name }
														if (weapon2_id == 688) { weapon2_name += ' 🔥' } else if (weapon2_id == 689) { weapon2_name += ' 🌊' } else if (weapon2_id == 690) { weapon2_name += ' ⚡️' } else if (weapon2_id == 790) { weapon2_name += ' ✨' }
													} else { weapon2_name = rows[0].name }
												}

												connection.query('SELECT name FROM item WHERE id = ' + weapon3_id, function (err, rows, fields) {
													if (err) throw err
													let weapon3_name = '-'
													if (Object.keys(rows).length > 0) {
														if ((weapon3_id == 671) || (weapon3_id == 672) || (weapon3_id == 673) || (weapon3_id == 791)) {
															if (custom_name3 != null) { weapon3_name = rows[0].name.replace('Necro', custom_name3) } else { weapon3_name = rows[0].name }
															if (weapon3_id == 671) { weapon3_name += ' ⚡️' } else if (weapon3_id == 672) { weapon3_name += ' 🔥' } else if (weapon3_id == 673) { weapon3_name += ' 🌊' } else if (weapon3_id == 791) { weapon3_name += ' ✨' }
														} else { weapon3_name = rows[0].name }
													}

													connection.query('SELECT dragon.* FROM player, dragon WHERE player.id = dragon.player_id AND player.id = ' + player_id, function (err, rows, fields) {
														if (err) throw err
														let dragon_name = '-'
														let dragon_level = '-'
														let dragon_damage = '-'
														let dragon_defence = '-'
														let dragon_critical = '-'
														let dragon_clawsid = 0
														let dragon_saddleid = 0
														let dragon_armsid = 0
														let dragon_claws = 0
														let dragon = 0
														let dragon_status = 'In salute'

														if (Object.keys(rows).length > 0) {
															dragon = 1

															if (charm_id == 602) {
																rows[0].damage += 25
																rows[0].critical += 10
															}
															if (charm_id == 695) {
																rows[0].damage += 30
																rows[0].critical += 15
															}

															if ((class_id == 7) && (reborn > 1)) {
																rows[0].claws += rows[0].claws * 0.5
																rows[0].saddle += rows[0].saddle * 0.5
															}
															if ((class_id == 7) && (reborn >= 5)) {
																rows[0].claws += rows[0].claws * 0.5
																rows[0].saddle += rows[0].saddle * 0.5
															}
															if ((class_id == 7) && (reborn == 6)) {
																rows[0].claws += rows[0].claws * 0.1
																rows[0].saddle += rows[0].saddle * 0.1
															}

															if ((class_id == 7) && (reborn == 3)) { rows[0].critical += 5 }

															if ((class_id == 7) && (reborn >= 4)) { rows[0].critical += 7 }

															dragon_name = rows[0].name.trim() + ' ' + rows[0].type
															dragon_level = rows[0].level
															dragon_damage = '+' + Math.round(rows[0].damage + rows[0].claws + power_dragon_dmg)
															dragon_defence = '-' + Math.round(rows[0].defence + rows[0].saddle + power_dragon_def)
															dragon_critical = Math.round(rows[0].critical + power_dragon_crit)

															dragon_claws = parseInt(rows[0].claws)

															dragon_clawsid = rows[0].claws_id
															dragon_saddleid = rows[0].saddle_id
															dragon_armsid = rows[0].arms_id

															if (rows[0].life <= 0) { dragon_status = 'Esausto' }
															if (rows[0].sleep_h > 0) { dragon_status = 'Dorme' }
														}

														connection.query('SELECT name, COUNT(name) As num FROM item WHERE id = ' + dragon_clawsid, function (err, rows, fields) {
															if (err) throw err

															let dragon_claws_n = '-'
															if (rows[0].num > 0) { dragon_claws_n = rows[0].name }

															connection.query('SELECT name, COUNT(name) As num FROM item WHERE id = ' + dragon_saddleid, function (err, rows, fields) {
																if (err) throw err

																let dragon_saddle_n = '-'
																if (rows[0].num > 0) { dragon_saddle_n = rows[0].name }

																connection.query('SELECT name, COUNT(name) As num FROM item WHERE id = ' + dragon_armsid, function (err, rows, fields) {
																	if (err) throw err

																	let dragon_arms_n = '-'
																	if (rows[0].num > 0) { dragon_arms_n = rows[0].name }

																	connection.query('SELECT player_nick As player, new_player_nick As new, time FROM referral_list WHERE new_player = ' + player_id, function (err, rows, fields) {
																		if (err) throw err

																		let referral = ''
																		if (Object.keys(rows).length > 0) {
																			var d = new Date(rows[0].time)
																			var short_date = addZero(d.getDate()) + '/' + addZero(d.getMonth() + 1) + '/' + d.getFullYear()
																			referral = 'Invitato da: ' + rows[0].player + ' (' + short_date + ')\n'
																		} else if (creation_date != null) {
																			var d = new Date(creation_date)
																			var short_date = addZero(d.getDate()) + '/' + addZero(d.getMonth() + 1) + '/' + d.getFullYear()
																			referral = 'Registrato il ' + short_date + '\n'
																		}

																		let relation = '\n<b>Relazioni commerciali</b> 💰\n'

																		connection.query('SELECT COUNT(id) As cnt FROM market_history WHERE (from_id = ' + my_player_id + ' AND to_id = ' + player_id + ') OR (from_id = ' + player_id + ' AND to_id = ' + my_player_id + ')', function (err, rows, fields) {
																			if (err) throw err

																			const history_cnt = rows[0].cnt
																			if (history_cnt > 0) { relation += 'Scambi: ' + formatNumber(history_cnt) + '\n' }

																			connection.query('SELECT COUNT(id) As cnt FROM market_direct_history WHERE (from_id = ' + my_player_id + ' AND to_id = ' + player_id + ') OR (from_id = ' + player_id + ' AND to_id = ' + my_player_id + ') AND type = 2', function (err, rows, fields) {
																				if (err) throw err

																				const history_direct_cnt = rows[0].cnt
																				if (history_direct_cnt > 0) { relation += 'Vendite: ' + formatNumber(history_direct_cnt) + '\n' }

																				connection.query('SELECT SUM(price) As cnt FROM pay_history WHERE (from_id = ' + my_player_id + ' AND to_id = ' + player_id + ') OR (from_id = ' + player_id + ' AND to_id = ' + my_player_id + ')', function (err, rows, fields) {
																					if (err) throw err

																					const history_pay_cnt = rows[0].cnt
																					if (history_pay_cnt != null) { relation += 'Pagamenti: ' + formatNumber(history_pay_cnt) + '§\n' }

																					if ((history_cnt == 0) && (history_direct_cnt == 0) && (history_pay_cnt == null)) { relation = '' }

																					if (my_player_id == player_id) { relation = '' }

																					connection.query('SELECT COUNT(inventory.item_id) As cnt, (SELECT COUNT(id) As tot FROM item WHERE rarity = "IN") As tot FROM inventory, item WHERE inventory.item_id = item.id AND player_id = ' + player_id + ' AND rarity = "IN" AND inventory.quantity > 0', function (err, rows, fields) {
																						if (err) throw err

																						const inest = rows[0].cnt + '/' + rows[0].tot

																						connection.query('SELECT name FROM class WHERE id = ' + class_id, function (err, rows, fields) {
																							if (err) throw err

																							let class_name = '-'
																							if (Object.keys(rows).length > 0) { class_name = rows[0].name }
																							const class_sym = classSym(class_name)

																							let stars = rebSym(reborn)

																							if (player_id == 1) { stars = '👑' }

																							let enchant1 = ''
																							if (weapon_enchant_bonus == 1) { enchant1 = ' 🌊' } else if (weapon_enchant_bonus == 2) { enchant1 = ' ⚡️' } else if (weapon_enchant_bonus == 3) { enchant1 = ' 🔥' }
																							let enchant2 = ''
																							if (weapon2_enchant_bonus == 1) { enchant2 = ' 🌊' } else if (weapon2_enchant_bonus == 2) { enchant2 = ' ⚡️' } else if (weapon2_enchant_bonus == 3) { enchant2 = ' 🔥' }
																							let enchant3 = ''
																							if (weapon3_enchant_bonus == 1) { enchant3 = ' 🌊' } else if (weapon3_enchant_bonus == 2) { enchant3 = ' ⚡️' } else if (weapon3_enchant_bonus == 3) { enchant3 = ' 🔥' }

																							// Talismani

																							if (charm_id == 62) { weapon += 10 }
																							if (charm_id == 184) { weapon += 25 }
																							if (charm_id == 188) { weapon += 30 }
																							if (charm_id == 404) { weapon_crit += 6 }
																							if (charm_id == 493) { weapon_crit += 2 }
																							if (charm_id == 494) { weapon_crit += 3 }
																							if (charm_id == 495) { weapon2_crit += 3 }
																							if (charm_id == 496) { weapon3_crit += 3 }
																							if (charm_id == 696) {
																								weapon_crit += 5
																								weapon2_crit += 5
																								weapon3_crit += 3
																							}
																							if (charm_id == 698) { weapon += 50 }
																							if (abBonus > 0) {
																								weapon_crit += abBonus
																								weapon2_crit += abBonus
																								weapon3_crit += abBonus
																							}

																							// Vocazioni

																							if ((class_id == 2) && (reborn == 3)) { weapon2_crit += 2 }
																							if ((class_id == 2) && (reborn >= 4)) {
																								weapon2_crit += 3
																								weapon3_crit += 3
																							}
																							if ((class_id == 4) && (reborn == 3)) {
																								weapon_crit += 1
																								weapon2_crit += 1
																								weapon3_crit += 1
																							}
																							if ((class_id == 4) && (reborn >= 4)) {
																								weapon_crit += 2
																								weapon2_crit += 2
																								weapon3_crit += 2
																							}
																							if ((class_id == 5) && (reborn == 3)) { weapon3_crit += 2 }
																							if ((class_id == 5) && (reborn >= 4)) { weapon3_crit += 4 }
																							if ((class_id == 6) && (reborn == 3)) { weapon2_crit += 2 }
																							if ((class_id == 6) && (reborn == 3)) { weapon3_crit += 2 }
																							if ((class_id == 6) && (reborn >= 4)) { weapon2_crit += 3 }
																							if ((class_id == 6) && (reborn >= 4)) { weapon3_crit += 3 }
																							if ((class_id == 6) && (reborn >= 5)) { weapon2_crit += 4 }
																							if ((class_id == 6) && (reborn >= 5)) { weapon3_crit += 4 }
																							if ((class_id == 6) && (reborn == 6)) { weapon2_crit += 4 }
																							if ((class_id == 6) && (reborn == 6)) { weapon3_crit += 4 }
																							if ((class_id == 8) && (reborn == 3)) { weapon3_crit += 2 }
																							if ((class_id == 8) && (reborn >= 4)) { weapon3_crit += 3 }
																							if ((class_id == 8) && (reborn >= 5)) { weapon_crit += 3 }
																							if ((class_id == 8) && (reborn == 6)) { weapon_crit += 3 }
																							if ((class_id == 9) && (reborn == 3)) {
																								weapon_crit += 1
																								weapon3_crit += 1
																							}
																							if ((class_id == 9) && (reborn >= 4)) {
																								weapon_crit += 2
																								weapon3_crit += 2
																							}

																							if ((class_id == 7) && (reborn >= 5)) { weapon_crit += Math.round(dragon_critical / 2) }

																							if ((class_id == 8) && (reborn == 2)) { weapon += weapon * 0.10 } else if ((class_id == 8) && (reborn == 3)) { weapon += weapon * 0.15 } else if ((class_id == 8) && (reborn == 4)) { weapon += weapon * 0.20 } else if ((class_id == 8) && (reborn == 5)) { weapon += weapon * 0.38 } else if ((class_id == 8) && (reborn == 6)) { weapon += weapon * 0.40 }

																							// Descrizioni

																							let weapon_desc = ''
																							if (weapon_name != '-') {
																								weapon += power_dmg
																								weapon_crit += power_weapon
																								weapon_desc = ' (+' + Math.round(weapon) + ', ' + weapon_crit + '%, ' + weapon_enchant + enchant1 + ')'
																							}
																							let weapon2_desc = ''
																							if (weapon2_name != '-') {
																								weapon2 -= power_def
																								weapon2_crit += power_armor
																								weapon2_desc = ' (' + Math.round(weapon2) + ', ' + weapon2_crit + '%, ' + weapon2_enchant + enchant2 + ')'
																							}
																							let weapon3_desc = ''
																							if (weapon3_name != '-') {
																								weapon3_crit += power_shield
																								weapon3_desc = ' (' + Math.round(weapon3) + ', ' + weapon3_crit + '%, ' + weapon3_enchant + enchant3 + ')'
																							}

																							if (player != message.from.username) {
																								if (myhouse_id == 1) {
																									life = '?'
																									total_life = '?'
																									heist_count = '?'
																									spy_count = '?'
																									money = '?'
																									exp = '?'
																									lev = '?'
																									weapon_name = '?'
																									weapon_desc = ''
																									weapon2_name = '?'
																									weapon2_desc = ''
																									weapon3_name = '?'
																									weapon3_desc = ''
																									talismano = '?'
																									talismano_desc = ''
																									dragon_name = '?'
																									dragon_level = '?'
																									dragon_claws_n = '?'
																									dragon_damage = '?'
																									dragon_saddle_n = '?'
																									dragon_defence = '?'
																									dragon_critical = '?'
																									dragon_status = '?'
																								} else if (myhouse_id == 2) {
																									heist_count = '?'
																									spy_count = '?'
																									money = '?'
																									weapon_name = '?'
																									weapon_desc = ''
																									weapon2_name = '?'
																									weapon2_desc = ''
																									weapon3_name = '?'
																									weapon3_desc = ''
																									talismano = '?'
																									talismano_desc = ''
																									dragon_name = '?'
																									dragon_level = '?'
																									dragon_claws_n = '?'
																									dragon_damage = '?'
																									dragon_saddle_n = '?'
																									dragon_arms_n = '?'
																									dragon_defence = '?'
																									dragon_critical = '?'
																								} else if (myhouse_id == 3) {
																									heist_count = '?'
																									spy_count = '?'
																									money = '?'
																									talismano = '?'
																									talismano_desc = ''
																									dragon_name = '?'
																									dragon_level = '?'
																									dragon_claws_n = '?'
																									dragon_damage = '?'
																									dragon_saddle_n = '?'
																									dragon_defence = '?'
																									dragon_critical = '?'
																								} else if (myhouse_id == 4) {
																									heist_count = '?'
																									spy_count = '?'
																									money = '?'
																								} else if (myhouse_id == 5) { money = '?' }
																							}

																							if (from == 1) { message.chat.id = account_id }

																							bot.sendMessage(message.chat.id, '<b>' + gender_text + '</b> ' + class_sym + '\n' +
																								gender_sym + ' ' + nickname + (player_custom_nickname != null ? ' <i>' + player_custom_nickname + '</i>' : '') + '\n' +
																								team_desc +
																								stars + ' ' + formatNumber(lev) + ' (' + formatNumber(exp) + ' xp)\n\n' +
																								'🏹 ' + class_name + '\n' +
																								'💎 ' + gems + ' 🏆 ' + inest + '\n' +
																								'💰 ' + formatNumber(money) + ' §\n' +
																								'❤️ ' + formatNumber(life) + ' / ' + formatNumber(total_life) + ' hp\n' +
																								'📦 ' + formatNumber(craft_count) + ' (' + formatNumber(craft_week) + ')\n' +
																								'🏕 ' + rifugio + '\n' +
																								'\n<b>Equipaggiamento</b> ⚔️\n' +
																								'🗡 ' + weapon_name + weapon_desc + '\n' +
																								'🥋 ' + weapon2_name + weapon2_desc + '\n' +
																								'🛡 ' + weapon3_name + weapon3_desc + '\n' +
																								'📿 ' + talismano + '\n' +

																								(dragon ? '\n<b>' + dragon_name + ' (L' + dragon_level + ')</b> 🐉\n' : '') +
																								(dragon ? 'Stato: ' + dragon_status + '\n' : '') +
																								(dragon ? dragon_claws_n + ' (' + dragon_damage + ')\n' : '') +
																								(dragon ? dragon_saddle_n + ' (' + dragon_defence + ')\n' : '') +
																								(dragon ? dragon_arms_n + '\n' : '') +
																								(dragon ? 'Critico (' + dragon_critical + '%)\n' : '') +
																								(dragon_description != null ? '\n<i>' + dragon_description + '</i>\n' : '') +

																								relation +

																								'\n<b>Altro</b> 💱\n' +
																								'Abilità: ' + formatNumber(ability) + '\n' +
																								referral +
																								artifacts +
																								cards_txt +
																								rank +
																								mission_team_count +
																								top_win_text +
																								map_win_text +
																								global_win_text +
																								trophies_text +
																								(player_description != null ? '\n<i>' + player_description + '</i>' : ''), html)
																						})
																					})
																				})
																			})
																		})
																	})
																})
															})
														})
													})
												})
											})
										})
									})
								})
							})
						})
					})
				})
			})
		})
	})
};

function cleanArray(actual) {
	const newArray = new Array()
	for (let i = 0; i < actual.length; i++) {
		if (actual[i]) {
			newArray.push(actual[i])
		}
	}
	return newArray
}

async function updateShop(message, code, isId, customQueryMessage) {
	const query = ''
	if (isId == 1) {
		const shopCode = await connection.queryAsync('SELECT code FROM public_shop WHERE id = ' + code)
		if (shopCode[0] == undefined) {
			bot.answerCallbackQuery(message.id, { text: 'Codice negozio non specificato!' })
			return
		}
		code = shopCode[0].code
	}
	connection.query('SELECT public_shop.id, player.id As player_id, player.nickname, quantity, item.name, price, massive, protected, public_shop.description, item_id, time_end FROM public_shop, item, player WHERE player.id = public_shop.player_id AND item.id = item_id AND code = ' + code + ' ORDER BY item.name', async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			bot.editMessageText('Questo negozio è stato cancellato :(', {
				inline_message_id: message.inline_message_id
			})
			return
		}

		const iKeys = []
		let name = ''
		let total_price = 0
		let pQnt = 0
		let qntTot = 0
		for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
			name = cutTextW(rows[i].name)
			iKeys.push([{
				text: name + ' (' + rows[i].quantity + ') - ' + formatNumberK(rows[i].price) + ' §',
				callback_data: rows[i].id.toString()
			}])
			pQnt = await getItemCnt(rows[i].player_id, rows[i].item_id)
			if (pQnt > rows[i].quantity) { pQnt = rows[i].quantity }
			total_price += parseInt(rows[i].price * pQnt)
			qntTot += pQnt
		}

		if (rows[0].massive != 0) {
			iKeys.push([{
				text: '💰 Compra tutto - ' + formatNumberK(total_price) + ' §',
				callback_data: 'all:' + code.toString()
			}])
		}

		iKeys.push([{
			text: '♻️ Aggiorna',
			callback_data: 'update:' + code.toString()
		}, {
			text: '🗑 Elimina',
			callback_data: 'delete:' + code.toString()
		}])

		var d = new Date()
		const short_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

		var d = new Date(rows[0].time_end)
		const long_date = addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ' del ' + addZero(d.getDate()) + '/' + addZero(d.getMonth() + 1) + '/' + d.getFullYear()

		let isProtected = ''
		if (rows[0].protected == 1) { isProtected = ' 🚫' }
		let description = ''
		if (rows[0].description != null) { description = '\n<i>' + rows[0].description + '</i>' }

		let plur = 'i'
		if (qntTot == 1) { plur = 'o' }

		const text = '<b>Negozio di ' + rows[0].nickname + '</b>\nAggiornato alle ' + short_date + '\nScadrà alle ' + long_date + '\nContiene ' + formatNumber(qntTot) + ' oggett' + plur + isProtected + description

		bot.editMessageText(text, {
			inline_message_id: message.inline_message_id,
			parse_mode: 'HTML',
			reply_markup: {
				inline_keyboard: iKeys
			}
		})

		if (isId == undefined) {
			if (customQueryMessage != '') {
				if (customQueryMessage.length > 200) { customQueryMessage = customQueryMessage.substr(0, 197) + '...' }
				bot.answerCallbackQuery(message.id, { text: customQueryMessage })
			} else { bot.answerCallbackQuery(message.id, { text: 'Negozio aggiornato!' }) }
		} else { bot.answerCallbackQuery(message.id) }
	})
}

function genToken(player_id) {
	const randPassword = Array(16).fill('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz').map(function (x) {
		return x[Math.floor(Math.random() * x.length)]
	}).join('')
	return randPassword + player_id
}

function funz(x) {
	return 1 + (Math.pow(x, 1.8)) / 100000
}

function checkStatus(message, nickname, accountid, type) {
	if (message.from.id == 777000) // Telegram
	{ return }

	connection.query('SELECT id, exp, reborn, nickname, market_ban, group_ban, player_custom_nickname FROM player WHERE nickname = "' + nickname + '"', function (err, rows, fields) {
		if (err) throw err

		let exist = 0
		let exp = 0
		let lev = 0
		let reb = 0
		let player_id = 0
		let market = 0
		let group_ban = 0
		let player_custom_nickname = ''

		if (Object.keys(rows).length > 0) {
			exist = 1
			exp = rows[0].exp
			lev = Math.floor(exp / 10)
			reb = rows[0].reborn

			player_id = rows[0].id
			nickname = rows[0].nickname
			market = rows[0].market_ban
			group_ban = rows[0].group_ban
			player_custom_nickname = rows[0].player_custom_nickname
		} else { nickname = "L'utente" }

		accountid = (accountid).toString()

		connection.query('SELECT * FROM plus_groups WHERE chat_id = ' + message.chat.id, async function (err, rows, fields) {
			if (err) throw err

			if (Object.keys(rows).length == 0) {
				console.log('Gruppo non memorizzato')
				return
			}

			const chat_id = rows[0].chat_id
			const group_name = rows[0].name.trim()

			if (player_id == 1) { return }

			const non = rows[0].kickreg
			if (non == 1) {
				if (exist == 0) {
					bot.kickChatMember(message.chat.id, accountid).then(function (result) {
						if (result != false) {
							bot.sendMessage(message.chat.id, nickname + " non è iscritto, l'ho bannato dal gruppo")
							bot.sendMessage(message.from.id, 'Sei stato bannato dal gruppo ' + group_name + ' a causa del fatto che non sei registrato al gioco')
						}
					})
					return
				}
			}

			const gb = rows[0].groupban
			if (gb == 1) {
				if ((group_ban == 1) && (exist == 1)) {
					bot.kickChatMember(message.chat.id, accountid).then(function (result) {
						if (result != false) {
							bot.sendMessage(message.chat.id, nickname + " è bannato dai gruppi, l'ho bannato dal gruppo")
							bot.sendMessage(message.from.id, 'Sei stato bannato dal gruppo ' + group_name + ' a causa del ban da tutti i gruppi')
						}
					})
					return
				}
			}

			const bon = rows[0].kickban
			if (bon == 1) {
				if (exist == 1) {
					if (await isBanned(accountid) != null) {
						bot.kickChatMember(message.chat.id, accountid).then(function (result) {
							if (result != false) {
								bot.sendMessage(message.chat.id, nickname + " è bannato dal gioco, l'ho bannato dal gruppo")
								bot.sendMessage(message.from.id, 'Sei stato bannato dal gruppo ' + group_name + ' a causa del ban dal gioco')
							}
						})
						return
					}
				}
			}

			const photodocs = rows[0].photodocs
			if (photodocs == 1) {
				if (exist == 1) {
					if (message.photo != undefined) {
						if (getRealLevel(reb, lev) < 50) {
							bot.deleteMessage(chat_id, message.message_id).then(function (result) {
								if (result != false) {
									bot.sendMessage(message.chat.id, message.from.username + ', devi aver superato il livello 50 per postare foto in questo gruppo.')
								}
							})
						}
					}
					if (message.document != undefined) {
						if (getRealLevel(reb, lev) < 50) {
							bot.deleteMessage(chat_id, message.message_id).then(function (result) {
								if (result != false) {
									bot.sendMessage(message.chat.id, message.from.username + ', devi aver superato il livello 50 per postare documenti in questo gruppo.')
								}
							})
						}
					}
				}
			}

			const min = rows[0].min_lev
			const max = rows[0].max_lev
			const lon = rows[0].level
			const levReal = getRealLevel(reb, lev)

			if (lon == 1) {
				if (exist == 1) {
					if ((levReal < min) || (levReal > max)) {
						bot.kickChatMember(message.chat.id, accountid).then(function (result) {
							if (result != 'False') {
								bot.sendMessage(message.chat.id, nickname + ' non rispetta i requisiti del livello (' + levReal + "), l'ho bannato dal gruppo")
								bot.sendMessage(message.from.id, 'Sei stato bannato dal gruppo ' + group_name + ' a causa dei requisiti relativi al livello minimo o massimo')
							}
						})
						return
					};
				};
			}

			if (type == 0) {
				let welcome = rows[0].welcome_text
				const on = rows[0].welcome

				if ((on == 1) && (exist == 1) && (welcome != null)) {
					connection.query('SELECT name, type FROM dragon WHERE player_id = ' + player_id, async function (err, rows, fields) {
						if (err) throw err

						if (Object.keys(rows).length > 0) { welcome = welcome.replace(new RegExp('#drago#', 'g'), rows[0].name + ' ' + rows[0].type) } else { welcome = welcome.replace(new RegExp('#drago#', 'g'), '-') }

						welcome = welcome.replace(new RegExp('#giocatore#', 'g'), nickname)
						welcome = welcome.replace(new RegExp('#livello#', 'g'), lev)
						welcome = welcome.replace(new RegExp('#rinascita#', 'g'), reb - 1)
						if (await isBanned(accountid) != null) { welcome = welcome.replace(new RegExp('#iscritto#', 'g'), '🚫') } // Bannato
						else {
							if (market == 1) { welcome = welcome.replace(new RegExp('#iscritto#', 'g'), '❌') } // Bannato dal mercato
							else { welcome = welcome.replace(new RegExp('#iscritto#', 'g'), '👍') } // Iscritto
						}
						if (chat_id == '-1001069842056') {
							const team = await connection.queryAsync('SELECT team_id FROM team_player WHERE player_id = ' + player_id)
							let haveTeam = 0
							if (Object.keys(team).length == 1) { haveTeam = 1 }

							let custom_name_text = ''
							if (player_custom_nickname != null) { custom_name_text = ' detto <i>' + player_custom_nickname + '</i>' }

							if (haveTeam == 0) {
								welcome = 'Benvenuto nella Taverna, giovane <b>' + nickname + '</b> 🍻\nStai cercando un gruppo di avventurieri a cui unirti?\nPotrebbe esserci qualcuno pronto ad accogliere un Lv ' + lev + ' R' + (reb - 1) + "...\nPer imparare le basi del gioco, entra nella <a href='https://t.me/joinchat/EXFobEDH8FaawvMWE7p-Jg'>LootBot School</a>!"
							} else if ((haveTeam == 1) && (lev < 250)) {
								var team_name = await connection.queryAsync('SELECT name FROM team WHERE id = ' + team[0].team_id)
								welcome = 'Benvenuto nella Taverna, <b>' + nickname + '</b> del team <b>' + team_name[0].name + '</b>\nCosa porta un Lv ' + lev + ' R' + (reb - 1) + ' da queste parti?'
							} else if (haveTeam == 1) {
								var team_name = await connection.queryAsync('SELECT name FROM team WHERE id = ' + team[0].team_id)
								welcome = 'Bentornato nella Taverna, <b>' + nickname + '</b>' + custom_name_text + ' del team <b>' + team_name[0].name + '</b> 🍻'
							} else { welcome = 'Bentornato nella Taverna, <b>' + nickname + '</b>' + custom_name_text + ' 🍻' }
						}
						bot.sendMessage(message.chat.id, welcome, html)
					})
				};
			};
		})
	})
};

function getRealLevel(reb, lev) {
	if (reb == 2) {
		lev += 100
	}
	if (reb == 3) {
		lev += 100
		lev += 150
	}
	if (reb == 4) {
		lev += 100
		lev += 150
		lev += 200
	}
	if (reb == 5) {
		lev += 100
		lev += 150
		lev += 200
		lev += 300
	}
	if (reb == 6) {
		lev += 100
		lev += 150
		lev += 200
		lev += 300
		lev += 1000
	}
	return lev
}

function toDate(lang, d) {
	let datetime
	if (lang == 'it') {
		datetime = addZero(d.getDate()) + '/' + addZero(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())
	} else if (lang == 'en') {
		datetime = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())
	} else { datetime = 'Lingua non specificata' }
	return datetime
}

function removeFromAssault(player_id) {
	connection.query('DELETE FROM assault_place_player_id WHERE player_id = ' + player_id, function (err, rows, fields) {
		if (err) throw err
	})
	connection.query('DELETE FROM assault_place_magic WHERE player_id = ' + player_id, function (err, rows, fields) {
		if (err) throw err
	})
	connection.query('DELETE FROM assault_place_cons WHERE player_id = ' + player_id, function (err, rows, fields) {
		if (err) throw err
	})
	connection.query('DELETE FROM assault_place_miniboost WHERE player_id = ' + player_id, function (err, rows, fields) {
		if (err) throw err
	})
}

function calculateAge(dob) {
	const diff_ms = Date.now() - dob.getTime()
	const age_dt = new Date(diff_ms)

	return Math.abs(age_dt.getUTCFullYear() - 1970)
}

function cutText(text) {
	const len = Object.keys(text).length
	if (len > 20) {
		const start = text.substring(0, 8)
		const end = text.substring(len - 8, len)

		text = start + '...' + end
	}
	return text
}

function cutTextW(text) {
	const len = text.split(' ').length - 1
	if (len > 1) {
		const text_arr = text.split(' ')
		return text_arr[0] + ' ... ' + text_arr[text_arr.length - 1]
	} else { return cutText(text) }
}

function checkSpam(message) {
	let isOk = true
	if (timevarSpam[message.from.id] != undefined) {
		diff = new Date() / 1000 - timevarSpam[message.from.id]
		if (diff < 1) {
			console.log('SPAM Utente ' + message.from.username + ' - ' + diff)
			isOk = false
		}
	}
	timevarSpam[message.from.id] = Math.round(new Date() / 1000)

	return isOk
}

function checkFlood(message) {
	let isOk = true
	if (timevarFlood[message.from.id] != undefined) {
		diff = new Date() / 1000 - timevarFlood[message.from.id]
		if (diff < 0.4) {
			console.log('FLOOD Utente ' + message.from.username + ' - ' + diff)
			isOk = false
		}
	}
	timevarFlood[message.from.id] = Math.round(new Date() / 1000)

	return isOk
}

function getRankFileId(rank) {
	let fileid = ''
	if (rank < rankList[0]) { fileid = 'CAADAgADGgADotsCAQ5SJkme2h2bAg' } else if (rank < rankList[1]) { fileid = 'CAADAgADJAADotsCAT4JAAGfG9ECkAI' } else if (rank < rankList[2]) { fileid = 'CAADAgADJQADotsCAapCRcaM7LsgAg' } else if (rank < rankList[3]) { fileid = 'CAADAgADHQADotsCAdM1n5lYdhnhAg' } else if (rank < rankList[4]) { fileid = 'CAADAgADHgADotsCARhzy43RSldJAg' } else if (rank < rankList[5]) { fileid = 'CAADAgADHwADotsCAdlRncszacM4Ag' } else if (rank < rankList[6]) { fileid = 'CAADAgADIAADotsCAUnlb5EAAUm7iwI' } else if (rank < rankList[7]) { fileid = 'CAADAgADIQADotsCAfwVvhD-OyLdAg' } else if (rank < rankList[8]) { fileid = 'CAADAgADIgADotsCAc_f5ai7tAS6Ag' } else { fileid = 'CAADAgADIwADotsCAbPikwR4V2YHAg' }

	return fileid
}

function getRankName(rank, opt) {
	if (opt == 0) {
		let text = ''

		if (rank < rankList[0]) { text = 'Esploratore Novizio' } else if (rank < rankList[1]) { text = 'Esploratore Modesto' } else if (rank < rankList[2]) { text = 'Esploratore Professionista' } else if (rank < rankList[3]) { text = 'Avventuriero Giovane' } else if (rank < rankList[4]) { text = 'Avventuriero Forestiero' } else if (rank < rankList[5]) { text = 'Avventuriero della Notte' } else if (rank < rankList[6]) // 500
		{ text = 'Avventuriero Impavido' } else if (rank < rankList[7]) // 750
		{ text = 'Avventuriero Eroico' } else if (rank < rankList[8]) // 1000
		{ text = 'Eroe delle Esplorazioni' } else { text = 'Mappatore Avanzato' }

		return text
	} else if (opt == 1) {
		let next = 0
		for (let i = 0, len = Object.keys(rankList).length; i < len; i++) {
			if (rank < rankList[i]) {
				next = rankList[i]
				break
			}
		}
		return next
	}
}

function checkAuction() {
	connection.query('SELECT creator_id FROM `auction_list` WHERE time_end < NOW() AND time_end IS NOT NULL', function (err, rows, fields) {
		if (err) throw err
		if (Object.keys(rows).length > 0) {
			if (Object.keys(rows).length == 1) { console.log(getNow('it') + '\x1b[32m 1 asta terminata\x1b[0m') } else { console.log(getNow('it') + '\x1b[32m ' + Object.keys(rows).length + ' aste terminate\x1b[0m') }
			rows.forEach(setFinishedAuction)
		}
	})
};

function checkShopNotification() {
	connection.query('SELECT DISTINCT(code) AS code, player_id FROM `public_shop` WHERE TIMESTAMPDIFF(MINUTE, NOW(), time_end) < 60 AND time_end IS NOT NULL AND notified = 0', function (err, rows, fields) {
		if (err) throw err
		if (Object.keys(rows).length > 0) {
			if (Object.keys(rows).length == 1) { console.log(getNow('it') + '\x1b[32m 1 negozio notificato\x1b[0m') } else { console.log(getNow('it') + '\x1b[32m ' + Object.keys(rows).length + ' negozi notificati\x1b[0m') }
			rows.forEach(setFinishedShopNotification)
		}
	})
};

function setFinishedShopNotification(element, index, array) {
	const player_id = element.player_id
	const code = element.code

	connection.query('SELECT chat_id FROM player WHERE id = ' + player_id, function (err, rows, fields) {
		if (err) throw err
		const chat_id = rows[0].chat_id
		connection.query('UPDATE public_shop SET notified = 1 WHERE code = ' + code, function (err, rows, fields) {
			if (err) throw err
			bot.sendMessage(chat_id, 'Il negozio con codice <code>' + code + '</code> verrà eliminato a breve, aggiornalo o cancellalo', html)
		})
	})
};

function checkShop() {
	connection.query('SELECT DISTINCT(code) As code, player_id FROM `public_shop` WHERE time_end < NOW() AND time_end IS NOT NULL', function (err, rows, fields) {
		if (err) throw err
		if (Object.keys(rows).length > 0) {
			if (Object.keys(rows).length == 1) { console.log(getNow('it') + '\x1b[32m 1 negozio terminato\x1b[0m') } else { console.log(getNow('it') + '\x1b[32m ' + Object.keys(rows).length + ' negozi terminati\x1b[0m') }
			rows.forEach(setFinishedShop)
		}
	})
};

function setFinishedShop(element, index, array) {
	const code = element.code
	const player_id = element.player_id

	connection.query('SELECT id, chat_id FROM player WHERE id = ' + player_id, function (err, rows, fields) {
		if (err) throw err

		const chat_id = rows[0].chat_id

		connection.query('DELETE FROM public_shop WHERE code = ' + code, function (err, rows, fields) {
			if (err) throw err
			bot.sendMessage(chat_id, 'Il negozio <code>' + code + '</code> è scaduto ed è stato eliminato', html)
		})
	})
};

async function setFinishedAuction(element, index, array) {
	connection.query('SELECT id, chat_id, item_id, last_price, last_player FROM auction_list WHERE creator_id = ' + element.creator_id, function (err, rows, fields) {
		if (err) throw err

		const auction_id = rows[0].id
		const item_id = rows[0].item_id
		const money = rows[0].last_price
		const last_player = rows[0].last_player
		const last_price = rows[0].last_price
		const chat_id = rows[0].chat_id

		connection.query('SELECT chat_id, nickname FROM player WHERE id = ' + last_player, async function (err, rows, fields) {
			if (err) throw err
			if (Object.keys(rows).length == 0) {
				await addMoney(last_player, last_price);
				connection.query('DELETE FROM auction_list WHERE id = ' + auction_id, async function (err, rows, fields) {
					if (err) throw err
					await addItem(element.creator_id, item_id)
					bot.sendMessage(chat_id, 'Non ci sono offerte, asta annullata!')
				})
				return
			}

			const nickname = rows[0].nickname
			const winner_chat_id = rows[0].chat_id

			await addItem(last_player, item_id)
			connection.query('SELECT item.name FROM item WHERE id = ' + item_id, async function (err, rows, fields) {
				if (err) throw err
				const itemName = rows[0].name
				bot.sendMessage(chat_id, 'Asta terminata per ' + itemName + '!\n\nIl vincitore è: @' + nickname + " con l'offerta di " + formatNumber(last_price) + ' §!')
				bot.sendMessage(winner_chat_id, 'Asta terminata per ' + itemName + '!\n\nSei il vincitore!')

				await addMoney(element.creator_id, money);

				const d = new Date()
				const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

				connection.query('INSERT INTO auction_history (creator_id, player_id, price, item_id, time) VALUES (' + element.creator_id + ',' + last_player + ',' + last_price + ',' + item_id + ',"' + long_date + '")', function (err, rows, fields) {
					if (err) throw err
				})

				connection.query('DELETE FROM auction_list WHERE id = ' + auction_id, function (err, rows, fields) {
					if (err) throw err
				})
			})
		})
	})
};

function checkLottery() {
	connection.query('SELECT creator_id FROM `public_lottery` WHERE time_end < NOW() AND time_end IS NOT NULL', function (err, rows, fields) {
		if (err) throw err
		if (Object.keys(rows).length > 0) {
			if (Object.keys(rows).length == 1) { console.log(getNow('it') + '\x1b[32m 1 lotteria terminata\x1b[0m') } else { console.log(getNow('it') + '\x1b[32m ' + Object.keys(rows).length + ' lotterie terminate\x1b[0m') }
			rows.forEach(setFinishedLottery)
		}
	})
};

function setFinishedLottery(element, index, array) {
	endLottery(element.creator_id, 1)
};

async function endLottery(creator_id, mode) {
	connection.query('SELECT id, price, chat_id, item_id, money FROM public_lottery WHERE creator_id = ' + creator_id, function (err, rows, fields) {
		if (err) throw err

		const lottery_id = rows[0].id
		const item_id = rows[0].item_id
		const money = rows[0].money
		const chat_id = rows[0].chat_id
		const price = rows[0].price

		connection.query('SELECT player_id FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
			if (err) throw err
			const members_num = Object.keys(rows).length
			if (Object.keys(rows).length < 5) {
				connection.query('SELECT player_id FROM public_lottery_players WHERE lottery_id = ' + lottery_id, async function (err, rows, fields) {
					if (err) throw err

					if (price > 0) {
						for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
							await addMoney(rows[i].player_id, price);
						};
					}

					connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
						if (err) throw err
						connection.query('DELETE FROM public_lottery WHERE id = ' + lottery_id, function (err, rows, fields) {
							if (err) throw err
							bot.sendMessage(chat_id, "Non ci sono abbastanza partecipanti per estrarre automaticamente, la lotteria è annullata e l'oggetto è stato ritirato dalla segreteria.")
						})
					})
				})
				return
			}
			const rand = Math.round(Math.random() * (Object.keys(rows).length - 1))
			const extracted = rows[rand].player_id
			connection.query('SELECT nickname FROM player WHERE id = ' + extracted, async function (err, rows, fields) {
				if (err) throw err
				if (Object.keys(rows).length == 0) {
					bot.sendMessage(chat_id, 'Non ho trovato il giocatore estratto!')
					return
				}
				const nickname = rows[0].nickname
				await addItem(extracted, item_id)
				connection.query('SELECT item.name FROM item WHERE id = ' + item_id, async function (err, rows, fields) {
					if (err) throw err
					const itemName = rows[0].name
					let extra = ''
					if (money > 0) {
						extra = ' ed un ammontare pari a ' + formatNumber(money) + ' §'
					}

					let mode_text = 'automatica (scaduta)'
					if (mode == 2) { mode_text = 'automatica (raggiunto limite partecipanti)' }

					bot.sendMessage(chat_id, 'Estrazione ' + mode_text + ' per ' + itemName + ' con ' + members_num + ' partecipanti' + extra + '!\n\nIl vincitore è: @' + nickname + '!')

					// bot.sendMessage(chat_id, "Estrazione automatica per " + itemName + "!\n\nIl vincitore è: @" + nickname + "!");

					await addMoney(creator_id, money);

					connection.query('SELECT nickname, account_id, chat_id FROM public_lottery_players, player WHERE player.id = player_id AND lottery_id = ' + lottery_id, function (err, rows, fields) {
						if (err) throw err
						for (let i = 0, len = Object.keys(rows).length; i < len; i++) {
							if (rows[i].nickname != nickname) { bot.sendMessage(rows[i].chat_id, 'Estrazione ' + mode_text + ' per ' + itemName + ' terminata, purtroppo hai perso!') } else { bot.sendMessage(rows[i].chat_id, 'Estrazione ' + mode_text + ' per ' + itemName + ' terminata, HAI VINTO!') }
						}
						connection.query('DELETE FROM public_lottery_players WHERE lottery_id = ' + lottery_id, function (err, rows, fields) {
							if (err) throw err
							connection.query('DELETE FROM public_lottery WHERE id = ' + lottery_id, function (err, rows, fields) {
								if (err) throw err
								// console.log("Lotteria terminata");
							})
						})
					})

					const d = new Date()
					const long_date = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())

					connection.query('INSERT INTO public_lottery_history (creator_id, player_id, item_id, money, time) VALUES (' + creator_id + ',' + extracted + ',' + item_id + ',' + money + ',"' + long_date + '")', function (err, rows, fields) {
						if (err) throw err
					})
				})
			})
		})
	})
}

function checkMarket() {
	connection.query('SELECT id, player_id, item_1_id, quantity FROM market WHERE time_end < NOW()', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length > 0) {
			if (Object.keys(rows).length == 1) { console.log(getNow('it') + '\x1b[32m 1 offerta terminata\x1b[0m') } else { console.log(getNow('it') + '\x1b[32m ' + Object.keys(rows).length + ' offerte terminate\x1b[0m') }
			rows.forEach(setFinishedMarket)
		}
	})
};

function setFinishedMarket(element, index, array) {
	connection.query('SELECT chat_id, account_id, id FROM player WHERE id = ' + element.player_id, async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			console.log('ERRORE scambio: ' + element.player_id)
			return
		}

		const chat_id = rows[0].account_id
		const player_id = rows[0].id
		const item1 = element.item_1_id
		const quantity = element.quantity

		await addItem(player_id, item1, quantity)

		connection.query('DELETE FROM market WHERE id = ' + element.id, function (err, rows, fields) {
			if (err) throw err
			bot.sendMessage(chat_id, "La vendita è scaduta, gli oggetti sono tornati nell'inventario.")
		})
	})
}

function checkMarketDirect() {
	connection.query('SELECT player_id, item_id, id FROM market_direct WHERE time_end < NOW()', function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length > 0) {
			if (Object.keys(rows).length == 1) { console.log(getNow('it') + '\x1b[32m 1 offerta vendita terminata\x1b[0m') } else { console.log(getNow('it') + '\x1b[32m ' + Object.keys(rows).length + ' offerte vendita terminate\x1b[0m') }
			rows.forEach(setFinishedMarketDirect)
		}
	})
};

function setFinishedMarketDirect(element, index, array) {
	connection.query('SELECT chat_id, account_id, id FROM player WHERE id = ' + element.player_id, async function (err, rows, fields) {
		if (err) throw err

		if (Object.keys(rows).length == 0) {
			console.log('ERRORE vendi: ' + element.player_id)
			return
		}

		const chat_id = rows[0].account_id
		const player_id = rows[0].id
		const item1 = element.item_id

		await addItem(player_id, item1)

		connection.query('DELETE FROM market_direct WHERE id = ' + element.id, function (err, rows, fields) {
			if (err) throw err
			bot.sendMessage(chat_id, "L'offerta è scaduta, l'oggetto è tornato nell'inventario.")
		})
	})
}

// Gestione oggetti

async function addItem(player_id, item_id, qnt = 1) {
	qnt = parseInt(qnt)
	if (isNaN(qnt)) {
		console.log('ERRORE! addItem di ' + qnt + 'x ' + item_id + ' per player ' + player_id)
		return
	}

	const rows = await connection.queryAsync('UPDATE inventory SET quantity = quantity+' + qnt + ' WHERE player_id = ' + player_id + ' AND item_id = ' + item_id)
	if (rows.affectedRows == 0) {
		await connection.queryAsync('INSERT INTO inventory (player_id, item_id, quantity) VALUES (' + player_id + ',' + item_id + ', ' + qnt + ')')
	}
}

function delItem(player_id, item_id, qnt = 1) {
	qnt = parseInt(qnt)
	if (isNaN(qnt)) {
		console.log('ERRORE! delItem di ' + qnt + 'x ' + item_id + ' per player ' + player_id)
		return
	}

	connection.query('UPDATE inventory SET quantity = quantity-' + qnt + ' WHERE player_id = ' + player_id + ' AND item_id = ' + item_id, function (err, rows, fields) {
		if (err) throw err
	})
}

function delAllItem(player_id, item_id) {
	connection.query('DELETE FROM inventory WHERE player_id = ' + player_id + ' AND item_id = ' + item_id, function (err, rows, fields) {
		if (err) throw err
	})
}

async function delAllInventory(player_id) {
	await connection.queryAsync('DELETE FROM inventory WHERE player_id = ' + player_id)
}

async function getItemCnt(player_id, item_id) {
	const item = await connection.queryAsync('SELECT quantity FROM inventory WHERE player_id = ' + player_id + ' AND item_id = ' + item_id)
	if (Object.keys(item).length == 0) { return 0 } else { return item[0].quantity }
}

// Gestione scrigni

async function addChest(player_id, chest_id, qnt = 1) {
	qnt = parseInt(qnt)
	if (isNaN(qnt)) {
		console.log('ERRORE! addChest di ' + qnt + 'x ' + chest_id + ' per player ' + player_id)
		return
	}

	const rows = await connection.queryAsync('UPDATE inventory_chest SET quantity = quantity+' + qnt + ' WHERE player_id = ' + player_id + ' AND chest_id = ' + chest_id)
	if (rows.affectedRows == 0) {
		await connection.queryAsync('INSERT INTO inventory_chest (player_id, chest_id, quantity) VALUES (' + player_id + ',' + chest_id + ', ' + qnt + ')')
	}
}

function delChest(player_id, chest_id, qnt = 1) {
	qnt = parseInt(qnt)
	if (isNaN(qnt)) {
		console.log('ERRORE! delChest di ' + qnt + 'x ' + chest_id + ' per player ' + player_id)
		return
	}
	connection.query('UPDATE inventory_chest SET quantity = quantity-' + qnt + ' WHERE player_id = ' + player_id + ' AND chest_id = ' + chest_id, function (err, rows, fields) {
		if (err) throw err
	})
}

function delAllChest(player_id, chest_id) {
	connection.query('DELETE FROM inventory_chest WHERE player_id = ' + player_id + ' AND chest_id = ' + chest_id, function (err, rows, fields) {
		if (err) throw err
	})
}

async function delAllChestInventory(player_id) {
	await connection.queryAsync('DELETE FROM inventory_chest WHERE player_id = ' + player_id)
}

async function getChestCnt(player_id, chest_id) {
	const item = await connection.queryAsync('SELECT quantity FROM inventory_chest WHERE player_id = ' + player_id + ' AND chest_id = ' + chest_id)
	if (Object.keys(item).length == 0) { return 0 } else { return item[0].quantity }
}

// Gestione monete

async function addMoney(player_id, qnt) {
	qnt = parseInt(qnt);
	if (isNaN(qnt)) {
		console.log("ERRORE! addMoney di " + qnt + " § per player " + player_id);
		return;
	}

	await connection.queryAsync('UPDATE player SET money = money + ' + qnt + ' WHERE id = ' + player_id);
}

async function reduceMoney(player_id, qnt) {
	qnt = parseInt(qnt);
	if (isNaN(qnt)) {
		console.log("ERRORE! reduceMoney di " + qnt + " § per player " + player_id);
		return;
	}

	await connection.queryAsync('UPDATE player SET money = money - ' + qnt + ' WHERE id = ' + player_id);
}

async function isBanned(account_id) {
	const banned = await connection.queryAsync('SELECT reason FROM banlist WHERE account_id = ' + account_id)
	if (Object.keys(banned).length == 0) { return null } else {
		console.log(account_id + ' è bannato')
		return banned[0].reason
	}
}

function getRandomArbitrary(min, max) {
	return Math.random() * (max - min) + min
}

function addZero(i) {
	if (i < 10) { i = '0' + i }
	return i
}

function formatNumber(num) {
	return ('' + num).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, function ($1) {
		return $1 + '.'
	})
}

function formatNumberK(num) {
	num = ('' + num).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, function ($1) {
		return $1 + '.'
	})
	return num.replaceAll(/\.000/, 'k')
}

function getNow(lang, obj) {
	const d = new Date()
	obj = typeof obj !== 'undefined' ? obj : false

	if (lang == 'it') {
		var datetime = addZero(d.getDate()) + '/' + addZero(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())
	} else if (lang == 'en') {
		var datetime = d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate()) + ' ' + addZero(d.getHours()) + ':' + addZero(d.getMinutes()) + ':' + addZero(d.getSeconds())
	} else { var datetime = 'Lingua non specificata' }
	if (obj == true) { datetime = new Date(datetime) }
	return datetime
}

function callNTimes(time, fn) {
	function callFn() {
		if (1 < 0) return
		fn()
		setTimeout(callFn, time)
	}
	setTimeout(callFn, time)
}

function findAndRemove(array, str) {
	for (let i = 0; i < array.length; i++) {
		if (array[i] == str) { array.splice(i, 1) }
	}
	return array
}

function findInArray(array, str) {
	for (let i = 0; i < array.length; i++) {
		if (array[i] == str) { return true }
	}
	return false
}

String.prototype.replaceAll = function (search, replacement) {
	const target = this
	return target.replace(new RegExp(search, 'g'), replacement)
}
