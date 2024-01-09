/*  Oggi è sabato 10 luglio 2021... mumble
# TUTTO di questo modulo deve essere aggiornato!
  Spesso le funzioni sono ridondanti, composte di chiamate multiple al database 
  Nulla sembra ottimizzato :(
*/

const mysql = require('mysql');
const got = require('got');
const fs = require('fs');
const path = require("path");
const config = require('../../LootBot/utility/config');
module.exports.config = config;

const manual_log = config.manual_log; //log orribile! 

const databaseUser = config.database.suggestion_user;
const databaseHost = config.database.host;
const databasePsw = config.database.suggestion_user_password;
const databaseName = config.database.suggestion_database;


const tables_names = {
	sugg: "Suggestions",
	usr: "SuggestionsUsers",
	votes: "SuggestionsVotes",
	banditw: "BanditWords"
};
const banditw_file = './models/bandit_w.txt';

let sugg_pool = mysql.createPool({
	host: databaseHost,
	user: databaseUser,
	password: databasePsw,
	database: databaseName,

	charset: 'utf8mb4'
});

const phenix_id = config.phenix_id;
const creatore_id = config.creatore_id;
const antiflood_time = config.sugg_antifloodTime;

function getBestSuggestionsFrom(query, single_connection, id) {
	if (id == null) {
		return new Promise(function (getBestSuggestionsFrom_resolve) {
			single_connection.query(query, function (err, res) {
				if (typeof res != 'undefined')
					getBestSuggestionsFrom_resolve(res);
				else
					getBestSuggestionsFrom_resolve(null);
			});
		});
	} else {
		//console.log("Chiesti i migliori sugg di: " + id);
		return new Promise(function (getBestSuggestionsFrom_resolve) {
			single_connection.query(query, id, function (err, res) {
				if (typeof res != 'undefined')
					getBestSuggestionsFrom_resolve(res);
				else
					getBestSuggestionsFrom_resolve(null);
			});
		});
	}
}

function getBestSuggestions() {
	return new Promise(function (getBestSuggestions_resolve) {

		let bestDropped_query = "SELECT STEXT AS 'text', MSG_ID AS 'id', SUSER_ID AS 'author_id', (SONCLOSE_UPVOTE + SONCLOSE_DOWNVOTE) AS 'votes' FROM " + tables_names.sugg;
		bestDropped_query += " WHERE (SONCLOSE_UPVOTE + SONCLOSE_DOWNVOTE) > 40 AND SCLOSED = -1";
		bestDropped_query += " ORDER BY (SONCLOSE_UPVOTE + SONCLOSE_DOWNVOTE) DESC LIMIT 15;";

		let bestAccepted_query = "SELECT STEXT AS 'text', MSG_ID AS 'id', SUSER_ID AS 'author_id', (SONCLOSE_UPVOTE + SONCLOSE_DOWNVOTE) AS 'votes' FROM " + tables_names.sugg;
		bestAccepted_query += " WHERE (SONCLOSE_UPVOTE + SONCLOSE_DOWNVOTE) > 40 AND SCLOSED = 1";
		bestAccepted_query += " ORDER BY (SONCLOSE_UPVOTE + SONCLOSE_DOWNVOTE) DESC LIMIT 15;";

		let audaci_query = "SELECT STEXT AS 'text', MSG_ID AS 'id', SUSER_ID AS 'author_id', SONCLOSE_DOWNVOTE AS 'votes' FROM " + tables_names.sugg;
		audaci_query += " WHERE SCLOSED = 1";
		audaci_query += " ORDER BY SONCLOSE_DOWNVOTE LIMIT 15;";

		let notAppreciated_query = "SELECT STEXT AS 'text', MSG_ID AS 'id', SUSER_ID AS 'author_id', (SONCLOSE_UPVOTE + SONCLOSE_DOWNVOTE) AS 'votes' FROM " + tables_names.sugg;
		notAppreciated_query += " WHERE SCLOSED = -1";
		notAppreciated_query += " ORDER BY (SONCLOSE_UPVOTE + SONCLOSE_DOWNVOTE) LIMIT 15;";

		return sugg_pool.getConnection(function (conn_err, single_connection) {
			if (single_connection) {
				let array = [];
				array.push(getBestSuggestionsFrom(bestDropped_query, single_connection, null));
				array.push(getBestSuggestionsFrom(bestAccepted_query, single_connection, null));
				array.push(getBestSuggestionsFrom(audaci_query, single_connection, null));
				array.push(getBestSuggestionsFrom(notAppreciated_query, single_connection, null));

				return Promise.all(array).then(function (res) {
					sugg_pool.releaseConnection(single_connection);

					if (typeof res != 'undefined') {
						return getBestSuggestions_resolve({
							dropped: res[0],
							accepted: res[1],
							audaci: res[2],
							notAppreciated: res[3]
						});
					} else {
						return getBestSuggestions_resolve(null);
					}
				});
			}
		});
	});

}
module.exports.getBestSuggestions = getBestSuggestions;

module.exports.getTop = function getTop() {
	return new Promise(function (suggTops) {
		let query = "SELECT ";
		query += "SUM(SONCLOSE_UPVOTE-SONCLOSE_DOWNVOTE) AS `voti`, ";
		query += "SUM(CASE WHEN SCLOSED=1 THEN 1 ELSE 0 END) AS `approvati`, ";
		query += "SUM(CASE WHEN SCLOSED=-1 THEN 1 ELSE 0 END) AS `scartati`, ";
		query += "SUSER_ID AS `autore` ";

		query += "FROM " + tables_names.sugg + " ";
		query += "GROUP BY `autore` ";
		query += "ORDER BY `voti` DESC ";
		query += "LIMIT 15";


		return sugg_pool.query(query, function (error, results) {
			if (!error) {
				return suggTops(results);
			} else {
				console.error(error);
				return suggTops(-1);
			}

		});
	});

}

function activityOf(user_id) {
	return new Promise(function (activityOf_resolve) {

		let bestDropped_query = "SELECT STEXT AS 'text', MSG_ID AS 'id', SONCLOSE_UPVOTE AS 'upVotes', SONCLOSE_DOWNVOTE AS 'downVotes' FROM " + tables_names.sugg;
		bestDropped_query += " WHERE SUSER_ID = ? AND SCLOSED = -1 ORDER BY SONCLOSE_UPVOTE DESC LIMIT 5;"

		let bestAccepted_query = "SELECT STEXT AS 'text', MSG_ID AS 'id', SONCLOSE_UPVOTE AS 'upVotes', SONCLOSE_DOWNVOTE AS 'downVotes' FROM " + tables_names.sugg;
		bestAccepted_query += " WHERE SUSER_ID = ? AND SCLOSED = 1 ORDER BY SONCLOSE_UPVOTE DESC LIMIT 5;"

		let droppedCount = "SELECT COUNT(*) as dropCount FROM " + tables_names.sugg + " WHERE SUSER_ID = ? AND SCLOSED = -1;";
		let acceptedCount = "SELECT COUNT(*) as acceptCount FROM " + tables_names.sugg + " WHERE SUSER_ID = ? AND SCLOSED = 1;";

		sugg_pool.getConnection(function (conn_err, single_connection) {
			if (single_connection) {
				let array = [];
				array.push(getBestSuggestionsFrom(bestDropped_query, single_connection, user_id));
				array.push(getBestSuggestionsFrom(droppedCount, single_connection, user_id));
				array.push(getBestSuggestionsFrom(bestAccepted_query, single_connection, user_id));
				array.push(getBestSuggestionsFrom(acceptedCount, single_connection, user_id));
				Promise.all(array).then(function (res) {

					if (typeof res != 'undefined') {
						let retournSugg = {};
						retournSugg.dropped = res[0];
						retournSugg.droppedCount = res[1][0].dropCount;
						retournSugg.accepted = res[2];
						retournSugg.acceptedCount = res[3][0].acceptCount;

						return activityOf_resolve(retournSugg);
					} else {
						return activityOf_resolve(null);
					}
				});
			}
			sugg_pool.releaseConnection(single_connection);
		});
	});

}
module.exports.activityOf = activityOf;

function getOpensSuggestions(user_id) {
	return new Promise(function (getOpensSuggestions_resolve) {

		let query = "SELECT DISTINCT" +
			" " + tables_names.sugg + ".SUGGESTION_ID AS 'id'," +
			" " + tables_names.sugg + ".STEXT AS 'text', " +
			" " + tables_names.sugg + ".SDATE AS 'date'," +
			" " + tables_names.sugg + ".MSG_ID AS 'number'" +
			" FROM Suggestions" +
			" WHERE SCLOSED = 0" +
			//" INNER JOIN SuggestionsVotes ON "+tables_names.sugg+".SUGGESTION_ID = SuggestionsVotes.SUGGESTION_ID" +
			" ORDER BY " + tables_names.sugg + ".SDATE DESC";

		let userQuery = "SELECT DISTINCT" +
			" " + tables_names.votes + ".SUGGESTION_ID AS 'id'," +
			"  SUVOTE AS 'vote'" +
			"  FROM " + tables_names.votes + "" +
			" INNER JOIN Suggestions ON " + tables_names.sugg + ".SUGGESTION_ID = " + tables_names.votes + ".SUGGESTION_ID" +
			" WHERE " + tables_names.votes + ".USER_ID = ?";

		return sugg_pool.getConnection(function (conn_err, single_connection) {
			if (single_connection) {
				let array = [];
				array.push(getBestSuggestionsFrom(query, single_connection, null));
				array.push(getBestSuggestionsFrom(userQuery, single_connection, user_id));

				Promise.all(array).then(function (res) {
					sugg_pool.releaseConnection(single_connection);

					if (typeof res != 'undefined') {
						let toRes = {};
						toRes.opens = res[0];
						toRes.votedByUser = res[1];

						return getOpensSuggestions_resolve(toRes);
					} else {
						return getOpensSuggestions_resolve(null);
					}
				});


			}
		});


	});

}
module.exports.getOpensSuggestions = getOpensSuggestions;

function getMajorOpenSuggestion() { // -1 (err su aperti), -2 (err su Suggestions), false (no aperti), sugg_infos )
	return new Promise(function (getMajorOpenSuggestion_resolve) {
		let first_query = "SELECT SUGGESTION_ID as 'sugg_id',";
		first_query += " COUNT(*) as 'votes',";
		first_query += " SUM(case when SUVOTE < 0 then 1 else 0 end) AS negativi,";
		first_query += " SUM(case when SUVOTE > 0 then 1 else 0 end) AS positivi";
		first_query += " FROM " + tables_names.votes + " GROUP BY SUGGESTION_ID ASC LIMIT 1;";

		return sugg_pool.getConnection(function (conn_err, single_connection) {
			if (conn_err) {
				console.error("> Non posso connettermi al db...");
				return getGlobalStats_resolve(false);
			} else if (single_connection) {
				return single_connection.query(first_query, function (error, results) {
					if (!error) {
						if (results.length <= 0) {
							console.log("> Nessun suggerimento aperto...");
							sugg_pool.releaseConnection(single_connection);
							return getMajorOpenSuggestion_resolve(false);
						} else if (results[0].sugg_id) {
							return single_connection.query("SELECT * FROM " + tables_names.sugg + " WHERE SUGGESTION_ID = ?;", [results[0].sugg_id], function (error, sugg_infos) {
								sugg_pool.releaseConnection(single_connection);
								if (error) {
									console.error(error);
									return getMajorOpenSuggestion_resolve(-2);
								}
								if (sugg_infos.length != 1) {
									console.error(sugg_infos);
									return getMajorOpenSuggestion_resolve(-2);
								}
								return getMajorOpenSuggestion_resolve({
									s_id: results[0].sugg_id,
									status: 0,
									totalVotes: results[0].votes,
									downVotes: results[0].negativi,
									upVotes: results[0].positivi,
									msg_id: sugg_infos[0].MSG_ID,
									sDate: sugg_infos[0].SDATE,
									sugg_text: sugg_infos[0].STEXT,
									author: sugg_infos[0].SUSER_ID
								});
							});
						} else {
							if (manual_log) console.error(results);
							console.log(results);
							sugg_pool.releaseConnection(single_connection);
							return getMajorOpenSuggestion_resolve(false);
						}
					} else {
						console.error(error);
						sugg_pool.releaseConnection(single_connection);
						return getMajorOpenSuggestion_resolve(-1);
					}

				});
			}
		});
	});
}
module.exports.getMajorOpenSuggestion = getMajorOpenSuggestion;


function getRecentlyApproved() {
	return new Promise(function (getRecentlyApproved_resolve) {
		let query = "SELECT STEXT AS 'text', SUGGESTION_ID AS s_id,  MSG_ID AS 'id', SONCLOSE_UPVOTE AS 'upVotes', SONCLOSE_DOWNVOTE AS 'downVotes' FROM " + tables_names.sugg;
		query += "  WHERE SCLOSED = 1 AND SDATE != 0 ORDER BY SDATE DESC LIMIT 10;";

		return sugg_pool.query(query, function (error, results) {
			if (!error) {
				return getRecentlyApproved_resolve(results);
			} else {
				console.error(error);
				return getRecentlyApproved_resolve(-1);
			}

		});
	});
}
module.exports.getRecentlyApproved = getRecentlyApproved;

function getRecentlyRefused() {
	return new Promise(function (getRecentlyRefused_resolve) {
		let query = "SELECT STEXT AS 'text', SUGGESTION_ID AS s_id, MSG_ID AS 'id', SONCLOSE_UPVOTE AS 'upVotes', SONCLOSE_DOWNVOTE AS 'downVotes' FROM " + tables_names.sugg;
		query += "  WHERE SCLOSED = -1 AND SDATE != 0 ORDER BY SDATE DESC LIMIT 10;";

		return sugg_pool.query(query, function (error, results) {
			if (!error) {
				return getRecentlyRefused_resolve(results);
			} else {
				console.error(error);
				return getRecentlyRefused_resolve(-1);
			}

		});
	});
}
module.exports.getRecentlyRefused = getRecentlyRefused;

function getOpensFor(id) {
	return new Promise(function (getOpensFor_resolve) {

		// let query = "SELECT DISTINCT" +
		// 	" "+tables_names.sugg+".SUGGESTION_ID AS 'id'," +
		// 	" MSG_ID AS 'number'" +
		// 	" FROM Suggestions" +
		// 	" INNER JOIN "+tables_names.votes+" ON "+tables_names.sugg+".SUGGESTION_ID = "+tables_names.votes+".SUGGESTION_ID" +
		// 	" WHERE "+tables_names.sugg+".SUSER_ID = " + id;
		let query = "SELECT STEXT AS 'text', MSG_ID AS 'id', SCLOSED AS 'state' FROM " + tables_names.sugg;
		query += " WHERE SUSER_ID = ? ORDER BY SDATE DESC LIMIT 10";

		sugg_pool.query(query, id,
			function (error, results) {
				if (!error) {
					getOpensFor_resolve(results);
				}
				else {
					getOpensFor_resolve(-1);
				}

			});
	});

}
module.exports.getOpensFor = getOpensFor;

function getSuggestionStatus(sugg_id, connection) { //0, -1, 1
	return new Promise(function (getSuggestionStatus_resolve) {
		if (manual_log) { console.log(">\t\tgetSuggestionStatus of: " + sugg_id); }

		return connection.query(
			"SELECT SCLOSED AS status," +
			" SDATE AS sDate," +
			" SONCLOSE_UPVOTE AS upOnClose," +
			" SONCLOSE_DOWNVOTE AS downOnClose," +
			" MSG_ID AS msg_id" +
			" FROM " + tables_names.sugg + " WHERE SUGGESTION_ID LIKE ?",
			sugg_id,
			function (err, count) {
				if (!err) {
					return getSuggestionStatus_resolve(count[0]);
				}
				else {
					console.error(err);
					return getSuggestionStatus_resolve(null);
				}
			});
	});
}

function setSuggestionLimit(newLimit) {
	return new Promise(function (setSuggestionStatus_resolve) {
		return sugg_pool.query("UPDATE " + tables_names.usr + " SET WARN = ? WHERE USER_ID = ?;"
			, [newLimit, phenix_id],
			function (error, results) {
				if (!error) {
					return setSuggestionStatus_resolve(newLimit);
				} else {
					console.error(error);
					return setSuggestionStatus_resolve(0);
				}
			});
	});
}
module.exports.setSuggestionLimit = setSuggestionLimit;

function getSuggestionsLimit(single_connection) {
	return new Promise(function (setSuggestionStatus_resolve) {
		return single_connection.query("SELECT WARN AS 'limit' FROM " + tables_names.usr + " WHERE USER_ID = ?;", [phenix_id],
			function (error, results) {
				if (!error) {
					if (results.length > 0) {
						return setSuggestionStatus_resolve(results[0]);
					} else {
						if (manual_log) console.log(results);
						return setSuggestionStatus_resolve(0);
					}
				} else {
					console.error(error);
					return setSuggestionStatus_resolve(-1);
				}
			});
	});
}
module.exports.getSuggestionsLimit = getSuggestionsLimit;

function setSuggestionStatus(sugg_id, status) { //0, -1, 1
	return new Promise(function (setSuggestionStatus_resolve) {
		if (manual_log) console.log(">\t\tsetSuggestionStatus of: " + sugg_id + ", new status: " + status);

		return sugg_pool.query("UPDATE " + tables_names.sugg + " SET SCLOSED = ? WHERE SUGGESTION_ID = ?",
			[status, sugg_id],
			function (error, results) {
				if (!error) {
					if (manual_log) console.log(">\t\t\tUpdate dello status -> " + !error);
					return setSuggestionStatus_resolve(sugg_id);
				}
				else {
					return setSuggestionStatus_resolve(-1);
				}
			});
	});
}
module.exports.setSuggestionStatus = setSuggestionStatus;

function setMsgID(check, sugg_id, msg_id) { //0, -1, 1
	return new Promise(function (setSuggestionStatus_resolve) {
		if (check == null || check <= 0) {
			sugg_pool.query(
				"UPDATE " + tables_names.sugg + " SET MSG_ID = ? WHERE SUGGESTION_ID = ?",
				[msg_id, sugg_id],
				function (error, results) {
					if (!error) {
						return setSuggestionStatus_resolve(sugg_id);
					} else {
						return setSuggestionStatus_resolve(-1);
					}

				});
		} else {
			return setSuggestionStatus_resolve(sugg_id);
		}
	});
}
module.exports.setMsgID = setMsgID;

function getSuggestionN_byStatus(connection) { //0, -1, 1
	return new Promise(function (getSuggestionN_byStatus_resolve) {

		let query = "SELECT COUNT(*) AS 'total', "
		query += "sum(case when SCLOSED > 0 then 1 else 0 end) AS 'approved', "
		query += "sum(case when SCLOSED < 0 then 1 else 0 end) AS 'closed', "
		query += "sum(case when SCLOSED = 0 then 1 else 0 end) AS 'opens' "
		query += "FROM " + tables_names.sugg + ";"

		return connection.query(query,
			function (err, count) {
				if (!err) {
					return getSuggestionN_byStatus_resolve(count[0]);
				}
				else {
					console.error(err);
					return getSuggestionN_byStatus_resolve(null);
				}
			});
	});
}

function getSuggestionN_byUser(user, connection) {
	return new Promise(function (getSuggestionN_byUser_resolve) {
		if (manual_log) { console.log(">\t\tgetSuggestionN_byUser: " + user); }

		return connection.query("SELECT COUNT(*) AS byuser FROM " + tables_names.sugg + " WHERE SUSER_ID = ?", user,
			function (err, count) {
				if (!err) {
					return getSuggestionN_byUser_resolve(count[0]);
				}
				else {
					console.error(err);
					return getSuggestionN_byUser_resolve(null);
				}
			});
	});
}

function getSuggestionOpensByUser(user, connection) {
	return new Promise(function (getSuggestionOpensByUser_resolve) {
		if (manual_log) { console.log(">\t\tgetSuggestionOpensByUser: " + user); }
		let aWeekAgo = Date.now() - 604800000;
		return connection.query(
			"SELECT SUM(case when SCLOSED = 0 then 1 else 0 end) AS 'opensByUser',  " +
			"SUM(case when SDATE > " + (aWeekAgo / 1000) + " then 1 else 0 end) AS 'recents' " +
			"FROM " + tables_names.sugg +
			" WHERE SUSER_ID = ?",
			user,
			function (err, count) {
				if (!err) {
					return getSuggestionOpensByUser_resolve(count[0]);
				}
				else {
					console.error(err);
					return getSuggestionOpensByUser_resolve(null);
				}
			});
	});

}

function getSuggestionApprovedOfUser(user, connection) {
	return new Promise(function (getSuggestionOpensByUser_resolve) {
		if (manual_log) { console.log(">\t\tgetSuggestionOpensByUser: " + user); }

		return connection.query(
			"SELECT COUNT(*) AS opensByUser " +
			"FROM " + tables_names.sugg +
			" WHERE SCLOSED = 1" +
			" AND SUSER_ID = ?",
			user,
			function (err, count) {
				if (!err) {
					return getSuggestionOpensByUser_resolve(count[0]);
				} else {
					console.error(err);
					return getSuggestionOpensByUser_resolve(null);
				}
			});
	});

}

function getVotesFor(sugg_id, flagN, connection) {
	return new Promise(function (getVotesFor_resolve) {
		if (manual_log) { console.log(">\t\tgetVotesFor: " + sugg_id); }

		return connection.query(
			"SELECT" +
			" SUM(SUVOTE) AS votes" +
			" FROM " + tables_names.votes +
			" WHERE SUGGESTION_ID LIKE ? " +
			" AND SUVOTE = ?",
			[sugg_id, flagN],
			function (err, count) {
				if (!err) {
					return getVotesFor_resolve(count[0]);
				} else {
					console.error(err);
					return getVotesFor_resolve(null);
				}
			});
	});
}

function getVotesOnOpens_recivedByUser(user, connection) {
	return new Promise(function (getVotesOnOpens_recivedByUser_resolve) {
		if (manual_log) { console.log(">\t\tgetVotesOnOpensRecivedByUser: " + user); }

		return connection.query(
			"SELECT SUM(SUVOTE) AS onOpens" +
			" FROM " + tables_names.votes +
			" INNER JOIN " + tables_names.sugg +
			" ON " + tables_names.votes + ".SUGGESTION_ID =" +
			" " + tables_names.sugg + ".SUGGESTION_ID " +
			" WHERE " + tables_names.sugg + ".SCLOSED = 0" +
			" AND " + tables_names.votes + ".AUTHOR_ID = ?",
			user,
			function (err, count) {
				if (!err) {
					return getVotesOnOpens_recivedByUser_resolve(count[0]);
				} else {
					console.error(err);
					return getVotesOnOpens_recivedByUser_resolve(null);
				}
			});
	});
}

function getTotalVotesRecivedByUser(user_id, connection) {
	return new Promise(function (getTotalVotesRecivedByUser_resolve) {
		if (manual_log) { console.log(">\t\tgetTotalVotesRecivedByUser: " + user_id); }

		if (connection) {
			let count = [];

			count.push(getTotalVotesCount(user_id, 'closed', connection));
			count.push(getTotalVotesCount(user_id, 'approved', connection));

			Promise.all(count).then(function (res) {
				let total_count = {
					closedTotalCount: { up: res[0].closedUpTotalCount, down: res[0].closedDownTotalCount },
					approvedTotalCount: { up: res[1].approvedUpTotalCount, down: res[1].approvedDownTotalCount }
				}
				return getTotalVotesRecivedByUser_resolve(total_count);

			}).catch(function (err) { console.error(err); return getTotalVotesRecivedByUser_resolve(0) });
		}

	});
}

function getTotalSuggestionCount(connection) {
	return new Promise(function (getTotalSuggestionCount_resolve) {
		if (manual_log) { console.log(">\t\tgetTotalSuggestionCount"); }
		return connection.query("SELECT COUNT(*) AS totalSugg FROM " + tables_names.sugg,
			function (err, count) {
				if (!err) {
					return getTotalSuggestionCount_resolve(count[0]);
				} else {
					console.error(err);
					return getTotalSuggestionCount_resolve(null);
				}
			});
	});
}

function getTotalVotesCount(user_id, sugg_flag, connection) { // oh mamma!
	return new Promise(function (getTotalVotesCount_resolve) {
		if (manual_log) { console.log(">\t\tgetTotalVotesCount for " + sugg_flag + " suggestion of user ->" + user_id); }
		let flagN = 1;
		if (sugg_flag == 'closed')
			flagN = -1;

		return connection.query(
			"SELECT" +
			" SUM(SONCLOSE_UPVOTE) AS " + sugg_flag + "UpTotalCount," +
			" SUM(SONCLOSE_DOWNVOTE) AS " + sugg_flag + "DownTotalCount" +
			" FROM " + tables_names.sugg +
			" WHERE SUSER_ID = " + user_id +
			" AND SCLOSED = " + flagN,
			function (err, count) {
				if (!err) {
					return getTotalVotesCount_resolve(count[0]);
				}
				else {
					console.error(err);
					return getTotalVotesCount_resolve(null);
				}
			});
	});
}

function getTotalUserCount(connection) {
	return new Promise(function (getTotalSuggestionCount_resolve) {
		if (manual_log) { console.log(">\t\tgetTotalUserCount"); }
		let date = ((Date.now() / 1000) - 2592000).toFixed();
		connection.query("SELECT COUNT(*) AS totalUsers FROM " + tables_names.usr +
			" WHERE USER_LASTQUERYDATE > ?", date, //" WHERE NOT USER_LASTQUERYDATE = 0",
			function (err, count) {
				if (!err) {
					return getTotalSuggestionCount_resolve(count[0]);
				} else {
					console.error(err);
					return getTotalSuggestionCount_resolve(null);
				}
			});
	});
}

function getTotalActiveCount(connection) {
	return new Promise(function (getTotalActiveCount_resolve) {
		let date = (Date.now() / 1000) - (86400);
		connection.
			query("SELECT COUNT(*) AS active FROM " + tables_names.usr +
				" WHERE USER_LASTQUERYDATE > ?", date,
				function (err, count) {
					if (!err) {
						getTotalActiveCount_resolve(count[0]);
					}
					else {
						console.error(err);
						getTotalActiveCount_resolve(null);
					}
				});
	});
}

function getNormalUserTotalCount(connection) {
	return new Promise(function (getNormalUserTotalCount_resolve) {
		if (manual_log) { console.log(">\t\tgetNormakUserCount"); }
		connection.
			query("SELECT COUNT(*) AS normaUsers FROM " + tables_names.usr +
				" WHERE NOT USER_LASTSUGG = 0",
				function (err, count) {
					if (!err) {
						getNormalUserTotalCount_resolve(count[0]);
					}
					else {
						console.error(err);
						getNormalUserTotalCount_resolve(null);
					}
				});
	});
}

function getLastUserVotes(user_id) {
	return new Promise(function (getLastUserVotes_resolve) {
		if (manual_log) { console.log(">\t\tgetLastUserVotes: id " + user_id); }
		sugg_pool.query("SELECT SUGGESTION_ID AS sugg_id," +
			" SUVOTE AS usr_vote" +
			" FROM " + tables_names.votes +
			" WHERE USER_ID = ? LIMIT 10",
			user_id,
			function (error, results) {
				if (!error) {
					if (manual_log) { console.log(">\t\t\tgetLastUserVote -> " + results.length); }
					getLastUserVotes_resolve(results);
				}
				else {
					console.error(error);
					getLastUserVotes_resolve(-1);
				}


			});
	});
}
module.exports.getLastUserVotes = getLastUserVotes;

function getIDOf(sugg_id) {
	return new Promise(function (getIDOf_resolve) {
		if (manual_log) console.log(">\t\tChiesta getIDOf per " + sugg_id);
		if (sugg_id == "nrc") {
			return getIDOf_resolve([]);
		} else {
			sugg_pool.query("SELECT MSG_ID AS 'id' FROM " + tables_names.sugg + " WHERE SUGGESTION_ID LIKE  ?", sugg_id,
				function (err, results) {
					if (manual_log) console.log(">\tEsito -> " + results);
					if (!err) {
						if (manual_log) console.log(">\tNiente errori -> " + results);
						return getIDOf_resolve(results);
					}
					else {
						console.error(err);
						return getIDOf_resolve(-1);
					}
				});

		}
	});
}
module.exports.getIDOf = getIDOf;

function getIDSOf(sugg_id_array) {
	return new Promise(function (getIDOf_resolve) {
		if (manual_log) console.log(">\t\tChiesta getIDOf per " + sugg_id_array.length + " id's");
		let query = "SELECT ";
		query += "MSG_ID as link, SUBSTRING(STEXT, 1, 60) as partial_text, SUGGESTION_ID as id";
		query += " FROM " + tables_names.sugg + " WHERE SUGGESTION_ID IN ?";

		return sugg_pool.query(
			query,
			[[sugg_id_array]],
			function (err, results) {
				if (!err) {
					if (manual_log) console.log(">\tNiente errori -> " + results);
					return getIDOf_resolve(results);
				} else {
					console.error(err);
					return getIDOf_resolve(-1);
				}
			});


	});
}
module.exports.getIDSOf = getIDSOf;

function getGlobalStats() {
	return new Promise(function (getGlobalStats_resolve) {

		sugg_pool.getConnection(function (conn_err, single_connection) {
			if (conn_err) {
				console.error("> Non posso connettermi al db...");
				return getGlobalStats_resolve(false);

			} else if (single_connection) {
				let stats_count = [];

				stats_count.push(getTotalSuggestionCount(single_connection)); //suggerimenti totali - totalSugg
				stats_count.push(getTotalUserCount(single_connection)); //utenti totali - totalUsers
				stats_count.push(getTotalActiveCount(single_connection));
				stats_count.push(getNormalUserTotalCount(single_connection)); // non limitati - normaUsers

				Promise.all(stats_count).then(function (res) {
					let res_stats = {
						totalSugg: (res[0] != null ? res[0].totalSugg : 0),
						totalUsers: (res[1] != null ? res[1].totalUsers : 0),
						activUser: (res[2] != null ? res[2].active : 0),
						propositiveUser: (res[3] != null ? res[3].normaUsers : 0)
					}
					sugg_pool.releaseConnection(single_connection);
					return getGlobalStats_resolve(res_stats);
				}).
					catch(function (err) { console.error(err); sugg_pool.releaseConnection(single_connection); })
			}
		});
	});
}
module.exports.getGlobalStats = getGlobalStats;

function getSuggestionsCount(user_id) {
	// in un set: (suggerimenti aperti, suggerimenti chiusi, suggerimenti dall'utente)
	return new Promise(function (getSuggestionsCount_resolve) {
		if (manual_log) { console.log(">\t\tgetSuggestionsCount for:" + user_id + ")"); }
		sugg_pool.getConnection(function (conn_err, single_connection) {
			if (single_connection) {
				let count = [];
				count.push(getSuggestionN_byStatus(single_connection)); 					// 0
				count.push(getSuggestionN_byUser(user_id, single_connection));				// 1  -- USR
				count.push(getSuggestionOpensByUser(user_id, single_connection));			// 2  -- USR
				count.push(getTotalVotesRecivedByUser(user_id, single_connection));			// 3  -- USR
				count.push(getVotesOnOpens_recivedByUser(user_id, single_connection));		// 4  -- USR
				count.push(getGlobalVotesFor(user_id, 1, single_connection));				// 5  -- USR
				count.push(getGlobalVotesFor(user_id, -1, single_connection));				// 6  -- USR
				count.push(getSuggestionApprovedOfUser(user_id, single_connection));		// 7  -- USR
				count.push(getSuggestionsLimit(single_connection));							// 8

				Promise.all(count).then(function (res) {
					let total_count = {
						//Su Suggestions
						opens: (res[0].opens != null ? res[0].opens : 0),
						closed: (res[0].closed != null ? res[0].closed : 0),
						approved: (res[0].approved != null ? res[0].approved : 0),
						totalSuggsN: (res[0].total != null ? res[0].total : 0),
						suggLimit: (res[8].limit != null ? res[8].limit : 0),
						// Su Users
						usr_total: (res[1].byuser != null ? res[1].byuser : 0),
						usr_opens: (res[2].opensByUser != null ? res[2].opensByUser : 0),
						usr_recents: (res[2].recents != null ? res[2].recents : 0),
						usr_approved: (res[7].opensByUser != null ? res[7].opensByUser : 0),
						usr_recivedVotes: {
							onClosed: { up: res[3].closedTotalCount.up, down: res[3].closedTotalCount.down },
							onApproved: { up: res[3].approvedTotalCount.up, down: res[3].approvedTotalCount.down }
						},
						usr_onOpensRecived: (res[4].onOpens != null ? res[4].onOpens : 0),
						usr_upVotes: (res[5].global_upVotes != null ? res[5].global_upVotes : 0),
						usr_downVotes: (res[6].global_downVotes != null ? (-1) * res[6].global_downVotes : 0)

					}
					sugg_pool.releaseConnection(single_connection);
					getSuggestionsCount_resolve(total_count);

				}).catch(function (err) { console.error(err); })
			}
		});
	});
}
module.exports.getSuggestionsCount = getSuggestionsCount;

function getSuggestionInfos(sugg_id, usr_id) {
	return new Promise(function (getSuggestionVotes_resolve) {
		if (manual_log) { console.log(">\t\tgetSuggestionInfos of: " + sugg_id + ", user: " + usr_id); }
		if (sugg_id.length != 5) {
			return getSuggestionVotes_resolve(-1);
		}

		return sugg_pool.getConnection(function (conn_err, single_connection) {
			if (single_connection) {
				let votesCount = [];
				votesCount.push(getSuggestionAuthorFor(sugg_id, single_connection));
				votesCount.push(getVotesOn(sugg_id, "upVotes", single_connection));
				votesCount.push(getVotesOn(sugg_id, "downVotes", single_connection));
				votesCount.push(getVotesOn(sugg_id, "totalVotes", single_connection));
				votesCount.push(checkVoteFor(sugg_id, usr_id, single_connection));
				votesCount.push(getSuggestionStatus(sugg_id, single_connection));

				Promise.all(votesCount).then(function (res) {
					sugg_pool.releaseConnection(single_connection);

					if (res[0] == null) {
						return getSuggestionVotes_resolve(-1);
					} else {

						return getSuggestionVotes_resolve({
							s_id: sugg_id,
							author: (res[0] != null ? res[0].author : "NOAUTHOR"),
							sugg_text: ((res[0] != null) ? res[0].sugg_text : ""),
							devs: ((res[0] != null) ? res[0].devs : ""),
							upVotes: ((res[1].upVotes != null) ? res[1].upVotes : 0),
							downVotes: ((res[2].downVotes != null) ? res[2].downVotes : 0),
							totalVotes: ((res[3].totalVotes != null) ? res[3].totalVotes : 0),
							usr_prevVote: ((res[4].prevVote != null) ? res[4].prevVote : 0),
							status: ((res[5] != null) ? res[5].status : -3),
							sDate: ((res[5] != null) ? res[5].sDate : 0),
							upOnClose: ((res[5] != null) ? res[5].upOnClose : 0),
							downOnClose: ((res[5] != null) ? res[5].downOnClose : 0),
							msg_id: ((res[5] != null) ? res[5].msg_id : 0)
						});
					}
				}).catch(function (err) { console.error(err); return getSuggestionVotes_resolve(-1) })
			}
		});


	});

}
module.exports.getSuggestionInfos = getSuggestionInfos;

function getApprovedOf(user_id) {
	return new Promise(function (getApprovedOf_resolve) {
		let queryText = "SELECT STEXT AS 'text', MSG_ID AS 'id', (SONCLOSE_UPVOTE + SONCLOSE_DOWNVOTE) AS 'votes' FROM " + tables_names.sugg;
		queryText += " WHERE SCLOSED = 1 AND SUSER_ID = ?";
		queryText += " ORDER BY (SONCLOSE_UPVOTE + SONCLOSE_DOWNVOTE) DESC LIMIT 10;";
		sugg_pool.query(queryText, user_id,
			function (err, res) {
				if (!err) {
					//console.log(res);
					return getApprovedOf_resolve(res);
				} else {
					console.error(err);
					getApprovedOf_resolve(null);
				}
			});
	});
}
module.exports.getApprovedOf = getApprovedOf;

function getRefusedOf(user_id) {
	return new Promise(function (getRefusedOf_resolve) {
		let queryText = "SELECT STEXT AS 'text', MSG_ID AS 'id', (SONCLOSE_UPVOTE + SONCLOSE_DOWNVOTE) AS 'votes' FROM " + tables_names.sugg;
		queryText += " WHERE SCLOSED = -1 AND SUSER_ID = ? AND SONCLOSE_UPVOTE > 15";
		queryText += " ORDER BY (SONCLOSE_UPVOTE + SONCLOSE_DOWNVOTE) DESC LIMIT 10;";
		sugg_pool.query(queryText, user_id,
			function (err, res) {
				if (!err) {
					//console.log(res);
					getRefusedOf_resolve(res);
				}
				else {
					console.error(err);
					getRefusedOf_resolve(null);
				}
			});
	});
}
module.exports.getRefusedOf = getRefusedOf;

function getSuggestionAuthorFor(sugg_id, connection) {
	return new Promise(function (getSuggestionAuthorFor_resolve) {
		if (manual_log) { console.log(">\t\tgetSuggestionAuthorFor: " + sugg_id); }
		connection.query("SELECT SUSER_ID, STEXT, DEVS" +
			" FROM " + tables_names.sugg +
			" WHERE SUGGESTION_ID LIKE ?", sugg_id,
			function (err, count) {
				if (!err && count.length != 0 && typeof (count[0]) != 'undefined') {
					return getSuggestionAuthorFor_resolve({ author: count[0].SUSER_ID, sugg_text: count[0].STEXT, devs: count[0].DEVS });
				} else {
					console.log(count);
					console.error(err);
					return getSuggestionAuthorFor_resolve(null);
				}
			});
	});
}

function insertSuggestion(user_id, suggestion_txt) {
	return new Promise(function (insertSuggestion_resolve) {
		if (manual_log) { console.log(">\t\tInsertSuggestion(" + user_id + ")"); }

		return unique_suggId(suggestionID_builder(), 0).then(function (unique_id) {
			if (unique_id == -1) {
				return insertSuggestion_resolve(false);
			} else {
				if (manual_log) { console.log(">\t\t\tID UNICO: " + unique_id); }
				let new_suggestion = {
					SUGGESTION_ID: unique_id,
					SUSER_ID: user_id,
					STEXT: suggestion_txt,
					SDATE: Date.now() / 1000
				};
				return insertSuggestion_resolve(insertOn(tables_names.sugg, new_suggestion));
			}
		}).
			catch(function (err) { console.error(err); });
	});
}
module.exports.insertSuggestion = insertSuggestion;

function closeSuggestion(sugg_id, val, new_text, author_id) {
	return new Promise(function (close_Suggestion_resolve) {
		if (manual_log) console.log(">\t\tclose_Suggestion (" + sugg_id + ") -> " + val);

		return sugg_pool.getConnection(function (conn_err, single_connection) {
			if (single_connection) {
				let retriveCounts = [];
				retriveCounts.push(getVotesFor(sugg_id, 1, single_connection));
				retriveCounts.push(getVotesFor(sugg_id, -1, single_connection));
				retriveCounts.push(saveTmp_Suggestion(author_id, ""))

				return Promise.all(retriveCounts).then(function (res) {

					let query = "UPDATE " + tables_names.sugg;
					query += " SET SCLOSED = ?,";
					query += " STEXT = ?,"
					query += " SONCLOSE_UPVOTE = SONCLOSE_UPVOTE +?,";
					query += " SONCLOSE_DOWNVOTE = SONCLOSE_DOWNVOTE +?";
					query += " WHERE SUGGESTION_ID LIKE ?";
					let values = [val, new_text, (res[0].votes != null ? res[0].votes : 0), (res[1].votes != null ? res[1].votes : 0), sugg_id];

					return single_connection.query(query, values, function (error, results) {
						sugg_pool.releaseConnection(single_connection);

						if (!error) {
							if (manual_log) console.log(">\t\t\tChiusura -> ");
							if (manual_log) console.log(res);

							return removeVote(sugg_id, null).then(function (drop_res) {
								if (manual_log) console.log(">\t\t\tRisultato drop -> " + drop_res);
								return close_Suggestion_resolve([sugg_id, drop_res]);
							}).catch(function (err) { console.error(err) });

						} else {
							console.error(">\t\t\tErrore in chiusura del suggerimento: " + sugg_id);
							console.error(error);

							return close_Suggestion_resolve([-1, 0]);
						}


					});
				}).catch(function (err) {
					console.error(err);
					sugg_pool.releaseConnection(single_connection);
				});
			}
		});
	});
}
module.exports.closeSuggestion = closeSuggestion;

function dropSuggestion(sugg_id) {
	return new Promise(function (dropSuggestion_resolve) {
		if (manual_log) { console.log(">\t\tDropSuggestion (" + sugg_id + ")"); }
		return removeVote(sugg_id, null).then(function (res) {
			return dropSuggestion_resolve(res);
		}).catch(function (err) { console.error(err) });
	});
}
module.exports.dropSuggestion = dropSuggestion;


//___________________________________________________________//
//TABLE USERS: **********************************************//
//___________________________________________________________//


function getUserInfo(user_id, addNew) {
	return new Promise(function (check_resolve) {
		if (manual_log) { console.log(">\t\tgetUserInfo(" + user_id + ")"); }

		return queryOn(tables_names.usr, user_id).then(function (check_res) {
			let user_info = {};

			if (Array.isArray(check_res) && check_res.length > 0) {
				if (manual_log) { console.log(">\t\t\tL'utente esiste: lo restituisco"); }
				let forced_role = check_res[0].USER_ROLE;
				if (forced_role >= 5 && (check_res[0].USER_ID != phenix_id && check_res[0].USER_ID != creatore_id)) {
					forced_role = 1;
				}

				user_info.id = check_res[0].USER_ID;
				user_info.role = forced_role;
				user_info.lastSugg = check_res[0].USER_LASTSUGG;
				user_info.lastmsg = check_res[0].USER_LASTMESS;
				user_info.tmpSugg = check_res[0].USER_TMP_MSG;
				user_info.lastQDate = check_res[0].USER_LASTQUERYDATE;
				user_info.lastcheck = check_res[0].LAST_CHECK;
				user_info.lastReview = check_res[0].LAST_REVIEW;
				user_info.warn = check_res[0].WARN;
				user_info.last_discussion_date = check_res[0].USER_LAST_DISCUSSION;
				user_info.dev_nick = check_res[0].DEV_NICK;
				user_info.isDev = user_info.dev_nick != null;


				return check_resolve(user_info);
			} else if (typeof addNew == "undefined" || addNew) {
				if (manual_log) console.log(check_res);
				if (check_res == false) {
					if (manual_log) { console.log(">\t\t\tL'utente non esiste: lo inserisco"); }
					return insertUser(user_id, 1).then(function (add_new_res) {
						if (add_new_res == -1) {
							return check_resolve(-1);
						}

						if (manual_log) console.log(">\t\tInserito il nuovo utente:");
						if (manual_log) console.log(add_new_res);

						if (add_new_res) {
							user_info.isNew = true;
							user_info.id = add_new_res.USER_ID;
							user_info.role = add_new_res.USER_ROLE;
							user_info.lastmsg = add_new_res.USER_LASTMESS;
							user_info.lastSugg = add_new_res.USER_LASTSUGG;
							user_info.tmpSugg = add_new_res.USER_TMP_MSG;
							user_info.lastQDate = add_new_res.USER_LASTQUERYDATE;
							user_info.lastcheck = add_new_res.LAST_CHECK;
							user_info.lastReview = add_new_res.LAST_REVIEW;
							user_info.warn = 0;
							user_info.last_discussion_date = add_new_res.USER_LAST_DISCUSSION;
							user_info.dev_nick = check_res[0].DEV_NICK;
							user_info.isDev = false;


							return check_resolve(user_info);
						}
					}).catch(function (catch_err) {
						if (manual_log) {
							console.log(">\t\t\tErrore durante l'aggiunta!\n");
						}
						console.error(catch_err);
						return check_resolve(-1);

					});
				} else { if (manual_log) { console.error(">\t\t\tCosa impossibile, ci sono due utenti con lo stesso user id!!\n"); } check_resolve(-1); }
			} else {
				return check_resolve(-1);
			}

		}).catch(function (catch_err) {
			console.error(">\t\t\tErrore durante il controllo!\n");
			console.error(catch_err);
		});
	});


}
module.exports.getUserInfo = getUserInfo;

function insertUser(user_id, u_role, u_message_time) {
	return new Promise(function (insertUser_resolve) {
		if (manual_log) { console.log(">\t\tInsertUser(" + user_id + ", " + u_role + ")"); }

		if (typeof (user_id) != 'number' || user_id < 999) {
			console.log(">\t\t- Id non valido, scarto!")
			return insertUser_resolve(-1);
		}
		if (manual_log) console.log(">\t\t- Id valido, proseguo...")
		let now_date = (Date.now() / 1000) - antiflood_time * 2;

		let new_user = {
			USER_ID: user_id,
			USER_ROLE: u_role,
			USER_LASTMESS: (u_message_time > 0 ? u_message_time : now_date),
			USER_LASTQUERYDATE: now_date
		};
		return insertUser_resolve(insertOn(tables_names.usr, new_user));
	});
}

function saveTmp_Suggestion(user_id, tmp_suggestion, isAvviso) {
	return new Promise(function (saveTmp_Suggestion_resolve) {
		if (isAvviso == true && user_id != phenix_id) {
			return saveTmp_Suggestion_resolve(user_id);
		}

		if (manual_log) { console.log(">\t\tsaveTmp_Suggestion( " + user_id + ")"); }
		let query = "UPDATE " + tables_names.usr + " SET USER_TMP_MSG = ? WHERE USER_ID = ?";
		let object_update = [tmp_suggestion, user_id]; // , USER_LASTSUGG = ? * [tmp_suggestion, (Date.now() / 1000), user_id]
		return sugg_pool.query(query, object_update, function (error) {
			if (!error) {
				if (manual_log) { console.log(">\t\t\tUpdate del tmp_sugg -> " + !error); }
				return saveTmp_Suggestion_resolve(user_id);
			} else {
				console.error("> Update del tmp_sugg");
				if (manual_log) { console.log(error); }
				return saveTmp_Suggestion_resolve(-1);
			}
		});
	});
}
module.exports.saveTmp_Suggestion = saveTmp_Suggestion;

function updateSuggestionText(sugg_id, text) {
	return new Promise(function (updateSuggestionText_resolve) {
		if (manual_log) { console.log(">\t\tsaveTmp_Suggestion( " + sugg_id + ")"); }

		return sugg_pool.query("UPDATE " + tables_names.sugg + " SET STEXT = ? WHERE SUGGESTION_ID = ?",
			[text, sugg_id],
			function (error, results) {
				if (!error) {
					if (manual_log) { console.log(">\t\t\tUpdate del tmp_sugg -> " + !error); }
					return updateSuggestionText_resolve(sugg_id);
				}
				else {
					return updateSuggestionText_resolve(-1);
				}
			});
	});
}
module.exports.updateSuggestionText = updateSuggestionText;

function updateLast(user_id, msg_time, isSuggestion) {
	return new Promise(function (updateLastMessage_resolve) {
		if (manual_log) { console.log(">\t\tUpdateLastMessage( " + user_id + ", " + msg_time + " )"); }

		let toUpdate = "USER_LASTMESS";
		if (isSuggestion)
			toUpdate = "USER_LASTSUGG";

		return sugg_pool.query("UPDATE " + tables_names.usr + " SET " + toUpdate + " = ? WHERE USER_ID = ?",
			[msg_time, user_id],
			function (error, results) {
				if (!error) {
					if (manual_log) { console.log(">\t\t\tUpdate del'ultimo " + (isSuggestion == true ? "suggerimento di " : "messaggio di ") + user_id + " tempo -> " + msg_time); }
					return updateLastMessage_resolve(msg_time);
				}
				else {
					return updateLastMessage_resolve(-1);
				}
			});

	});
}
module.exports.updateLast = updateLast;

function updateUserLastDiscussion(user_id, msg_time, text) {
	return new Promise(function (updateLastDiss_resolve) {
		if (manual_log) { console.log(">\t\tUpdateLastMessage( " + user_id + ", " + msg_time + " )"); }

		let toUpdate = "USER_LAST_DISCUSSION";


		return sugg_pool.query("UPDATE " + tables_names.usr + " SET " + toUpdate + " = ? WHERE USER_ID = ?",
			[msg_time, user_id],
			function (error, results) {
				if (!error) {
					if (manual_log) { console.log(">\t\t\tUpdate del'ultimo " + (isSuggestion == true ? "suggerimento di " : "messaggio di ") + user_id + " tempo -> " + msg_time); }
					return updateLastDiss_resolve(msg_time);
				}
				else {
					return updateLastDiss_resolve(-1);
				}
			});

	});
}
module.exports.updateUserLastDiscussion = updateUserLastDiscussion;

function getUserFromDiscussionDate(discussion_date) {
	return new Promise(function (getUserFromDiscussionDate_resolve) {
		return sugg_pool.query("SELECT USER_ID AS 'user_id' FROM " + tables_names.usr + " WHERE USER_LAST_DISCUSSION = ?",
			discussion_date,
			function (error, results) {
				if (!error) {
					if (results.length > 0) {
						return getUserFromDiscussionDate_resolve(results[0]);
					} else {
						console.log(results);
						return getUserFromDiscussionDate_resolve(-1);
					}
				}
				else {
					console.log(error);
					return getUserFromDiscussionDate_resolve(-2);
				}
			});
	});
}
module.exports.getUserFromDiscussionDate = getUserFromDiscussionDate;

function updateAfterPublish(user_id, msg_time, sugg_time) {
	return new Promise(function (updateAfterPublish_resolve) {
		if (manual_log) { console.log(">\t\tUpdateLastMessage( " + user_id + ", " + msg_time + " )"); }

		let query = "UPDATE " + tables_names.usr + " SET USER_LASTMESS = ?, USER_LASTSUGG = ? WHERE USER_ID = ?"

		return sugg_pool.query(query, [msg_time, sugg_time, user_id],
			function (error) {
				if (!error) {
					//if (manual_log) { console.log(">\t\t\tUpdate del'ultimo " + (isSuggestion == true ? "suggerimento di " : "messaggio di ") + user_id + " tempo -> " + msg_time); }
					return updateAfterPublish_resolve(msg_time);
				} else {
					console.error(error);
					return updateAfterPublish_resolve(-1);
				}
			});

	});
}
module.exports.updateAfterPublish = updateAfterPublish;

function currQueryOf(user_id, query_date) {
	return new Promise(function (currQueryOf_resolve) {
		if (manual_log) { console.log(">\t\tcurrQuery " + query_date + " forUser " + user_id); }

		sugg_pool.query("UPDATE " + tables_names.usr + " SET USER_LASTQUERYDATE = ? WHERE USER_ID = ?",
			[query_date, user_id],
			function (error, results) {
				if (!error) {
					if (manual_log) { console.log(">\tMODEL: Update ultima query -> " + results[0]); }
					return currQueryOf_resolve(user_id);
				}
				else {
					console.error(error);
					return currQueryOf_resolve(-1);
				}
			});
	});
}
module.exports.currQueryOf = currQueryOf;

function saveReview(user_id, review) {
	return new Promise(function (saveReview_resolve) {
		if (manual_log) { console.log(">\t\saveReview " + review + " forUser " + user_id); }

		return sugg_pool.query(
			"UPDATE " + tables_names.usr + " SET LAST_REVIEW = ? WHERE USER_ID = ?",
			[review, user_id],
			function (error, results) {
				if (!error) {
					if (manual_log) { console.log(">\tMODEL: Update ultima REVIEW -> " + results[0]); }
					return saveReview_resolve(user_id);
				}
				else {
					console.error(error);
					return saveReview_resolve(-1);
				}
			});


	});
}
module.exports.saveReview = saveReview;

function setUserRole(user_id, role_n, sugg_text, warm) {
	return new Promise(function (role_resolve) {
		if (manual_log) { console.log(">\t\tRichiesto update per " + user_id + " [Ruolo: " + role_n + "]"); }
		if (typeof (user_id) != 'number' || typeof (role_n) != 'number') {
			return role_resolve(false);
		}

		let query = "";
		let values = [];
		if (role_n <= 0) {
			query = "INSERT INTO " + tables_names.usr;
			query += " (USER_ID, USER_ROLE, USER_LASTSUGG, USER_TMP_MSG";
			if (typeof warm == "number" && warm > 0) {
				query += ", WARN"
			}
			query += ") VALUES ? ";
			query += "ON DUPLICATE KEY UPDATE USER_ROLE = VALUES(USER_ROLE), USER_LASTSUGG = VALUES(USER_LASTSUGG), USER_TMP_MSG = VALUES(USER_TMP_MSG)";
			if (typeof warm == "number" && warm > 0) {
				query += ", WARN = WARN+VALUES(WARN);"
			}
			values.push([user_id, role_n, (Date.now() / 1000), sugg_text]);
			if (typeof warm == "number" && warm > 0) {
				values[0].push(warm);
			}
		} else {
			query = "INSERT INTO " + tables_names.usr;
			query += "(USER_ID, USER_ROLE, USER_LASTSUGG) ";
			query += "VALUES ? ";
			query += "ON DUPLICATE KEY UPDATE USER_ROLE = VALUES(USER_ROLE), USER_LASTSUGG = VALUES(USER_LASTSUGG);";
			values.push([user_id, role_n, (Date.now() / 1000)]);
		}

		return sugg_pool.query(query, [values], function (error, results, fields) {
			if (!error) {
				if (manual_log) (">\t\t\tUpdate dello status utente avvenuto con successo!");
				return role_resolve(role_n);
			} else {
				console.log(">\t\t\tUpdate dello status utente fallito!");
				console.error(error);
				return role_resolve(-1);
			}
		});



	});
}
module.exports.setUserRole = setUserRole;

//___________________________________________________________//
//TABLE VOTES ******************************************//
//___________________________________________________________//

function insertVote(usr_id, sugg_id, vote, author) {
	return new Promise(function (insertVote_resolve) {
		if (manual_log) { console.log(">\t\tinsertVote(" + usr_id + ", " + sugg_id + ", " + vote + ")"); }

		let toInsert_vals = [];
		toInsert_vals.push([usr_id, sugg_id, vote, author]);
		return sugg_pool.query("INSERT INTO " + tables_names.votes + " (USER_ID, SUGGESTION_ID, SUVOTE, AUTHOR_ID) VALUES ?", [toInsert_vals],
			function (err, count) {
				if (!err) {
					return insertVote_resolve(count.affectedRows);
				} else {
					if (err.code == 'ER_DUP_ENTRY') {
						return removeVote(sugg_id, usr_id).then(function (res) {
							return insertVote_resolve(-1);
						}).catch(function (error) { console.error(error); });
					} else {
						console.error(error)
						return insertVote_resolve(-2);
					}
				}
			});
	});
}
module.exports.insertVote = insertVote;

function checkVoteFor(sugg_id, user_id, connection) {
	return new Promise(function (checkVoteFor_resolve) {
		if (manual_log) { console.log(">\t\tcheckVoteFor: " + sugg_id); }

		connection.query(
			"SELECT SUVOTE AS 'prevVote' " +
			"FROM " + tables_names.votes +
			" WHERE SUGGESTION_ID LIKE ?" +
			" AND USER_ID = ?",
			[sugg_id, user_id],
			function (err, prevV) {
				if (!err) {
					return checkVoteFor_resolve(prevV[0] != null ? prevV[0] : 0);
				} else {
					console.log(err);
					return checkVoteFor_resolve(null);
				}
			});
	});

}

function spoilVotesOn(sugg_id) {
	return new Promise(function (spoilVotesOn) {
		return sugg_pool.query("SELECT USER_ID AS 't_id', SUVOTE AS 'vote'" +
			" FROM " + tables_names.votes +
			" WHERE SUGGESTION_ID LIKE ? ", [sugg_id],
			function (err, array) {
				if (!err) {
					return spoilVotesOn(array);
				} else {
					console.error(err);
					return spoilVotesOn([]);
				}
			});
	});
}
module.exports.spoilVotesOn = spoilVotesOn;


function getVotesOn(sugg_id, type, connection) {
	return new Promise(function (getVotesOn_resolve) {
		if (manual_log) { console.log(">\t\tgetVotesOn: " + sugg_id + "(" + type + ")"); }

		let integrateQuery = "";
		if (type == 'upVotes')
			integrateQuery = " AND SUVOTE = 1";
		if (type == 'downVotes')
			integrateQuery = " AND SUVOTE = -1";
		if (type == "totalVotes")
			integrateQuery = "";

		connection.query("SELECT SUM(ABS(SUVOTE)) AS " + type +
			" FROM " + tables_names.votes +
			" WHERE SUGGESTION_ID LIKE ?" + integrateQuery,
			sugg_id,
			function (err, count) {
				if (!err) {
					return getVotesOn_resolve(count[0]);
				} else {
					console.error(err);
					return getVotesOn_resolve(0);
				}
			});
	});
}

function getGlobalVotesFor(user_id, type, connection) {
	return new Promise(function (getGlobalVotesFor_resolve) {
		if (manual_log) { console.log(">\t\tgetGlobalVotesFor: " + user_id + " (" + type + ")"); }
		let type_str = "global_upVotes";
		if (type < 0)
			type_str = "global_downVotes";

		connection.query("SELECT SUM(SUVOTE) AS " + type_str +
			" FROM " + tables_names.votes +
			" WHERE USER_ID = ?" +
			" AND SUVOTE = ?",
			[user_id, type],
			function (err, count) {
				if (!err) {
					return getGlobalVotesFor_resolve(count[0]);
				}
				else {
					console.error(err);
					return getGlobalVotesFor_resolve(0);
				}
			});
	});
}

//___________________________________________________________//
//GENERICHE    **********************************************//
//___________________________________________________________//

function suggestionID_builder() {
	let id = [];
	let idPossible_char = "ABCDEFGHIJKLMNOPQRSTQVXYWZ"; // 26

	id.push(Math.floor(Math.random() * 9));
	id.push(Math.ceil(Math.random() * 9));


	for (let i = 0; i < 3; i++) {
		id.push(idPossible_char.charAt(Math.floor(Math.random() * idPossible_char.length)));
	}

	return id.join(""); // 9*9*26*26*26 = 1.423.656 

}

function isValidID(to_test) {
	let string = (to_test + "").toUpperCase();
	let idPossible_char = "ABCDEFGHIJKLMNOPQRSTQVXYWZ";

	return (!isNaN(parseInt(string.slice(0, 2))) && idPossible_char.indexOf(string.charAt(2)) >= 0 && idPossible_char.indexOf(string.charAt(3)) >= 0 && idPossible_char.indexOf(string.charAt(4)) >= 0);
}
module.exports.isValidID = isValidID;

function unique_suggId(test_id, loop_n) {
	if (manual_log) { console.log(">\t\tGenero ID, tentativo n: " + loop_n); }

	if (loop_n > 10) {
		console.error(">\t\tTroppi tentativi, esco!");
		return Promise.resolve(-1);
	} else {
		return queryOn(tables_names.sugg, test_id).then(function (res) {
			if (!res) {
				if (manual_log) console.log(">\t\tNUOVO ID: " + test_id);
				return test_id;
			} else {
				if (manual_log) console.log(">\t\tID DUPLICATO (sfiga?): " + test_id);
				return unique_suggId(suggestionID_builder(), loop_n + 1);
			}

		}).catch(function (error) { console.error(error); });
	}
}

function insertOn(table, set) {
	return new Promise(function (insertUser_resolve) {
		if (manual_log) { console.log(">\t\tChiesta Insert su " + table); }

		sugg_pool.query("INSERT INTO " + table + " SET ?", set,
			function (err, rows) {
				if (!err) {
					return insertUser_resolve(set);
				} else {
					console.error(err);
					return insertUser_resolve(false);
				}
			});


	});
}

function removeVote(sugg_id, usr_id) {
	return new Promise(function (removeVote_resolve) {
		if (manual_log) { console.log(">\t\tChiesta rimozione dei voti su " + sugg_id + (usr_id != null ? ", per user_id: " + usr_id : " [RIMOZIONE TOTALE]")); }
		let set = [];
		set.push(sugg_id);

		let str_query = "DELETE FROM " + tables_names.votes + " WHERE SUGGESTION_ID = ?";
		if (usr_id != null) {
			str_query = "DELETE FROM " + tables_names.votes + " WHERE SUGGESTION_ID = ? AND USER_ID = ?";
			set.push(usr_id);
		}

		return sugg_pool.query(
			str_query,
			(set.length > 1 ? [set[0], set[1]] : set[0]),
			function (err, rows) {
				if (!err) {
					return removeVote_resolve(rows.affectedRows);
				} else {
					console.error(err);
					return removeVote_resolve(false);
				}
			});
	});
}

function queryOn(table, id) { // Oh mamma mia!
	return new Promise(function (query_resolve) {
		if (manual_log) { console.log(">\t\tQuery per -> " + id + " sulla tabella -> " + table); }

		let id_name = "USER_ID";
		if (table == tables_names.sugg)
			id_name = "SUGGESTION_ID";

		return sugg_pool.query("SELECT * FROM " + table + " WHERE " + id_name + " =  ?", id,
			function (err, rows) {
				if (!err) {
					let controll = (typeof rows != "undefined" && rows != null && rows.length != null && rows.length > 0);
					if (manual_log) { console.log(">\t\t\tEsito -> " + controll); }

					if (controll)
						query_resolve(rows);
					else {
						query_resolve(false);
					}
				}
				else {
					if (manual_log) { console.log(">\t\t\tErrore nella select " + err); }
					return query_resolve(null);
				}
			});

	});
}

function getLootUser(lootName, bool, usr_id) {
	return new Promise(function (getLootUser_resolve) {
		if (bool) {
			if (manual_log) { console.log(`${lootName} (${usr_id}) controllo: ${bool}`); }
			return got.get(`https://fenixweb.net:6600/api/v2/GbeUaWrGXKNYUcs910310/players/${lootName}`, { responseType: 'json' }).then(function (full_infos) {
				let json = full_infos.body;

				if (typeof json.res != "undefined") {
					for (let i = 0; i < json.res.length; i++) {
						if (json.res[i].nickname.toLowerCase() == lootName.toLowerCase()) {
							if (json.res[i].greater_50 == 1) {
								return sugg_pool.query(
									"UPDATE " + tables_names.usr + " SET LAST_CHECK = ? WHERE USER_ID LIKE ?",
									[(Date.now() / 1000), usr_id],
									function (error, results) {
										if (!error) {
											if (manual_log) { console.log(">\t\tUpdate dell'ultimo check -> " + !error); }
										} else {
											console.error(error);
										}
										return getLootUser_resolve(json.res[i]);
									});
							} else {
								return getLootUser_resolve(json.res[i]);
							}
						}
					} // fine loop

					return getLootUser_resolve(false);
				} else {
					if (manual_log) console.log("Chiamando: " + info.uri + "\n");
					if (manual_log) console.log(json);
					return getLootUser_resolve(false);

				}
			}).catch(function (err) {
				console.error(err);
				return getLootUser_resolve(null);
			});
		} else {
			return getLootUser_resolve(true);
		}
	});

}
module.exports.getLootUser = getLootUser;



// SVILUPPATORI DI LOOTIA

function pseudonimo_libero(pseudonimo){
	return new Promise(function (risposta_db){
		return sugg_pool.query(
			`SELECT DEV_NICK FROM ${tables_names.usr} WHERE DEV_NICK LIKE ?`,
			pseudonimo,
			function (err, rows) {
				if (!err) {
					return risposta_db(rows.length <= 0);
				} else {
					return risposta_db(false);
				}
			});
	});
}
module.exports.pseudonimo_libero = pseudonimo_libero;

function pseudonimo_temporaneo(id_utente, pseudonimo, username){
	return new Promise(function (risposta_db){
		return sugg_pool.query(
			`UPDATE ${tables_names.usr} SET DEV_NICK = ?, DEV_USERNAME = ? WHERE USER_ID = ?;`,
			[pseudonimo, username, id_utente],
			function (err, rows) {
				if (!err) {
					return risposta_db(true);
				} else {
					console.error(err);
					return risposta_db(false);
				}
			});
	});
}
module.exports.pseudonimo_temporaneo = pseudonimo_temporaneo;

function cancella_pseudonimo_temporaneo(id_utente){
	return new Promise(function (risposta_db){
		return sugg_pool.query(
			`UPDATE ${tables_names.usr} SET DEV_NICK = NULL, DEV_USERNAME = NULL WHERE USER_ID = ?;`,
			id_utente,
			function (err, rows) {
				if (!err) {
					return risposta_db(true);
				} else {
					console.error(err);
					return risposta_db(false);
				}
			});
	});
}
module.exports.cancella_pseudonimo_temporaneo = cancella_pseudonimo_temporaneo;

function aggiorna_stato_pseudonimo(id_utente, nuovo_pseudonimo){
	return new Promise(function (risposta_db){
		return sugg_pool.query(
			`UPDATE ${tables_names.usr} SET DEV_NICK = ? WHERE USER_ID = ?;`,
			[nuovo_pseudonimo, id_utente],
			function (err, rows) {
				if (!err) {
					return risposta_db(true);
				} else {
					console.error(err);
					return risposta_db(false);
				}
			});
	});
}
module.exports.aggiorna_stato_pseudonimo = aggiorna_stato_pseudonimo;

function lista_sviluppatori(){
	return new Promise(function (risposta_db){
		return sugg_pool.query(
			`SELECT USER_ID, DEV_NICK, DEV_USERNAME FROM ${tables_names.usr} WHERE DEV_NICK IS NOT NULL;`,
			function (err, rows) {
				if (!err) {
					console.log("lista_sviluppatori");
					console.log(rows);

					let lista_ordinata = {
						in_attesa: [],
						da_contattare: [],
						rifiutati: [],
						abilitati: [],
						zombie: []
					}


					for (let i = 0; i< rows.length; i++){
						let riga_temporanea = {id: -1, pseudonimo: "", username: ""};
						let split_temporaneo;

						riga_temporanea.id = rows[i].USER_ID;
						riga_temporanea.username = rows[i].DEV_USERNAME;
						split_temporaneo = rows[i].DEV_NICK.split(":");

						if (split_temporaneo.length == 1){
							riga_temporanea.pseudonimo = split_temporaneo[0];
							lista_ordinata.abilitati.push(riga_temporanea);
						} else{
							riga_temporanea.pseudonimo = split_temporaneo[1];

							switch (split_temporaneo[0]){
								case ("attesa"):{
									lista_ordinata.in_attesa.push(riga_temporanea);
									break;
								}
								case ("chat"):{
									lista_ordinata.da_contattare.push(riga_temporanea);
									break;
								}
								case ("rifiutata"):{
									lista_ordinata.rifiutati.push(riga_temporanea);
									break;
								}
								default:{
									lista_ordinata.zombie.push(riga_temporanea);
									break;
								}
							}
						}	
					}

					return risposta_db(lista_ordinata);
				} else {
					console.error(err);
					return risposta_db(false);
				}
			});
	});
}
module.exports.lista_sviluppatori = lista_sviluppatori;

function info_sviluppatore(user_id){
	return new Promise(function (risposta_db){
		return sugg_pool.query(
			`SELECT USER_ID, DEV_NICK, DEV_USERNAME FROM ${tables_names.usr} WHERE USER_ID = ?`,
			user_id,
			function (err, rows) {
				if (!err) {
					console.log(rows);
					let sviluppatore = {
						id: rows[0].USER_ID,
						pseudonimo: rows[0].DEV_NICK,
						username: rows[0].DEV_USERNAME
					}

					return risposta_db(sviluppatore);
				} else {
					console.error(err);
					return risposta_db(false);
				}
			});
	});
}
module.exports.info_sviluppatore = info_sviluppatore;

function aggiorna_lista_sviluppatoriDisponibili(sugg_id, nuova_lista){
	return new Promise(function (risposta_db){
		return sugg_pool.query(
			`UPDATE ${tables_names.sugg} SET DEVS = ? WHERE SUGGESTION_ID = ?;`,
			[nuova_lista, sugg_id],
			function (err, rows) {
				if (!err) {
					return risposta_db(true);
				} else {
					console.error(err);
					return risposta_db(false);
				}
			});
	});
}
module.exports.aggiorna_lista_sviluppatoriDisponibili = aggiorna_lista_sviluppatoriDisponibili;


//_________________________//
//RESET *********************
//_________________________//


function initialize() {
	return new Promise(function (init_resolve) {
		if (manual_log) { console.log(">\t\tRichiesta inizzializzazione delle tabelle..."); }
		sugg_pool.getConnection(function (conn_err, single_connection) {

			if (single_connection) {
				let reset = [];
				reset.push(drop_table(tables_names.sugg, single_connection));
				reset.push(drop_table(tables_names.usr, single_connection));
				reset.push(drop_table(tables_names.votes, single_connection));
				reset.push(drop_table(tables_names.banditw, single_connection));

				Promise.all(reset).then(function (del_res, del_err) {
					if (del_res) {
						let create = [];
						create.push(create_table(tables_names.sugg, tables_structs.sugg, single_connection));
						create.push(create_table(tables_names.usr, tables_structs.usr, single_connection));
						create.push(create_table(tables_names.votes, tables_structs.votes, single_connection));
						create.push(create_table(tables_names.banditw, tables_structs.banditw, single_connection));

						Promise.all(create).then(function (create_res) {
							if (create_res) {
								if (manual_log) { console.log(">\t\t\tCreate tutte le tabelle senza Errori"); }
								return repopulate_BanditWords().then(function (res) {
									return init_resolve(true);
								}).catch(function (err) { console.log(err) });
							} else {
								if (manual_log) { console.log(">\t\t\tErrore nella creazione delle tabelle"); }
								return init_resolve(false);
							}
						}).catch(function (err) {
							if (manual_log) {
								console.log(">\t\t\tErrore nella creazione delle tabelle");
								console.log(err);
							}
							init_resolve(null);
						});
					} else {
						if (manual_log) { console.log(">\t\t\tErrore nella rimozione delle tabelle " + del_err); }
						init_resolve(null);
					}
					sugg_pool.releaseConnection(single_connection);
				}).
					catch(function (catch_err) { console.log(catch_err); });
			}
		});

	});
}
//module.exports.initialize = initialize;


function recreateAllTablesStruct() {
	return new Promise(function (local_tables_struct) {
		let main_dir = path.dirname(require.main.filename);
		main_dir = path.join(main_dir, "./models/SuggestionsTables/allTables_struct.json");
		console.log("> Path per il source.json: " + main_dir);
		fs.access(main_dir, fs.F_OK, function (err) {
			if (err) {
				console.error("> Woops!");
				console.log("> Non ho trovato il file!!\n");
				console.log(err);
				return local_tables_struct(false);
			} else {
				return sugg_pool.getConnection(function (conn_err, single_connection) {
					if (conn_err) {
						console.error("> Woops!");
						console.log("> Non sono riuscito a connettermi al database...\n");
						let tmp_connection = mysql.createConnection({
							host: databaseHost,
							user: databaseUser,
							password: databasePsw
						});
						return tmp_connection.connect(function (connection_error) {
							if (connection_error) {
								console.error("> Nope... non sono riuscito neanche a creare il DB")
								throw err;
							}
							console.log("> Connesso all'istanza mysql, (ri)creo il DB...");
							tmp_connection.query("CREATE DATABASE " + databaseName, function (err, result) {
								if (err) throw err;
								console.log("Database Creato, ricomincio!");
								return recreateAllTablesStruct();

							});
						})
					} else if (single_connection) {
						console.log("> Creo le tabelle nel database " + databaseName);
						console.log(tables_names);
						let rawdata = fs.readFileSync(main_dir);
						let tables_structs = JSON.parse(rawdata);
						let recreate = [];
						recreate.push(create_table(tables_names.sugg, tables_structs.sugg, single_connection));
						recreate.push(create_table(tables_names.usr, tables_structs.usr, single_connection));
						recreate.push(create_table(tables_names.votes, tables_structs.votes, single_connection));
						recreate.push(create_table(tables_names.banditw, tables_structs.banditw, single_connection));


						Promise.all(recreate).then(function (create_res) {
							if (create_res) {
								console.log("> Ricreate tutte le tabelle senza Errori");
								sugg_pool.releaseConnection(single_connection);

								return repopulate_BanditWords().then(function (res) {
									//aggiungo edo come admin
									return insertUser(phenix_id, 5, Date.now() / 1000).then(function (edo_insert_res) {
										console.log("> Aggiunto edo come Admin (ID: " + phenix_id + ")");
										return local_tables_struct(true);
									});
								}).catch(function (err) {
									console.log(err);
									sugg_pool.releaseConnection(single_connection);
									return local_tables_struct(false);
								});
							} else {
								console.log("> Errore nella creazione delle tabelle");
								sugg_pool.releaseConnection(single_connection);
								return local_tables_struct(false);
							}
						}).catch(function (err) {
							console.log("> Errore nella creazione delle tabelle");
							sugg_pool.releaseConnection(single_connection);
							return local_tables_struct(false);
						});
					} // <-


				}); // <-

			}
		});
	});
}
module.exports.recreateAllTablesStruct = recreateAllTablesStruct


function drop_table(string, connection) {
	return new Promise(function (drop_resolve) {
		return connection.query("DROP TABLE IF EXISTS " + string + ";",
			function (err, res) {
				if (res) {
					if (manual_log) console.log(">\t\t\tEliminata la tabella: " + string);
					return drop_resolve(true);
				}
				else {
					console.error(err);
					return drop_resolve(false);
				}
			});
	});
}

function create_table(string, struct, connection) {
	return new Promise(function (create_resolve) {
		return connection.query("CREATE TABLE " + string + struct,
			function (err, res) {
				if (res) {
					if (manual_log) console.log(">\t\t\tCreata la tabella: " + string);
					return create_resolve(true);
				} else {
					if (manual_log) console.log(">\t\t\tErrore nell'eliminazione della tabella: " + string);
					console.error(err);
					return create_resolve(false);
				}
			});
	});
}

function repopulate_BanditWords() {
	return new Promise(function (repopulate_resolve) {
		if (manual_log) console.log("> Ripopolo la lista parole bandite.")

		let main_dir = path.join(path.dirname(require.main.filename), banditw_file);
		if (manual_log) console.log("> Cerco il file banditw_file.txt al percorso: " + main_dir);

		fs.access(main_dir, fs.F_OK, function (err) {
			if (err) {
				console.error(error);
				return repopulate_resolve(false);
			} else {
				let rawdata = fs.readFileSync(main_dir, "utf8").split("\n");
				let bandit_list = [];


				for (let i = 0; i < rawdata.length; i++) {
					bandit_list.push([i, rawdata[i]]);
				}

				return sugg_pool.query("INSERT INTO " + tables_names.banditw + " (BW_POS, B_WORD) VALUES ?", [bandit_list],
					function (err, result) {

						if (manual_log) console.log("> Parole bandite: " + rawdata.length + ", salvate su database: " + result.affectedRows);
						return repopulate_resolve(rawdata.length);
					});

			}
		});
	}).catch(function (repopulate_error) {
		console.error("> Errore!");
		console.error(repopulate_error);
	});
}
module.exports.repopulate_BanditWords = repopulate_BanditWords;

function getBannedWords() {
	return new Promise(function (getBannedWords_resolve) {
		sugg_pool.query("SELECT B_WORD AS 'banditw' FROM " + tables_names.banditw,
			function (err, rows) {
				if (!err) {
					if (manual_log) {
						console.log(">\t\tControllata con successo la tabella " + tables_names.banditw);
					}
					return getBannedWords_resolve(rows);
				}
				else {
					return getBannedWords_resolve(null);
				}
			});

	});
}
module.exports.getBannedWords = getBannedWords;

function addBannedW(bannedw) {
	return new Promise(function (addBannedW_resolve) {
		return getBannedWords().then(function (bannedCount) {
			return sugg_pool.query("INSERT INTO " + tables_names.banditw + " (BW_POS, B_WORD) VALUES ?", [bannedCount, bannedw],
				function (err, result) {
					if (manual_log) console.log("> Parole bandite: " + result.affectedRows);
					return repopulate_resolve(result.affectedRows);
				});

		}).catch(function (err) {
			console.error(err);
			return addBannedW(false);
		});
	});
}




