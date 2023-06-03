// Espone una funzione query per query verso il database

const mysql = require('mysql');
const config = require('./specific/db_config');
const queries = require("./queries");
const error_messages = require("../../views/errors");


module.exports.queries = queries;
module.exports.messaggi_errore = error_messages;

module.exports = {
  queries: queries,
  error_messages: error_messages,
  query: query, // esegue query sulla pool
  closeConnection: closeConnection // chiude la connessione verso il database. Da chiamare allo spegnimento
}

// Connessione verso il database 
const pool = mysql.createPool({
  connectionLimit: 10,
  host: config.host,
  user: config.dbuser,
  password: config.dbpassword,
  database: config.dbdatabase,
})


// Funzione per query sul DB
function query(queryString, values=[]) {
  return new Promise((resolve) => {
    try {
      pool.query(queryString, values, (error, results) => {
        if (error) {
          console.error(error_messages.print(error_messages.str.database.query, queryString));
          console.error(error);
          return resolve(false);
        }

        return resolve(results);
      });
    } catch (error) {
      console.error(error_messages.print(error_messages.str.database.query, queryString));
      console.error(error);
      return resolve(false);
    }
  });
}


// Chiude la connessione verso il db (da chiamare pirma della chiusura del main.js)
function closeConnection() {
  connection.end((error) => {
    if (error) {
      console.error(error_messages.print(error_messages.str.database.chiusura));
      return;
    }
    //console.log('Connessione al database chiusa con successo!');
  });
}