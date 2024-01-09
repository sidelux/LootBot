const config = require("../../../utility/config");
const utility = require("../../../utility/utils"); // per poter esporre structures

const db_config = {};

db_config.dbuser = config.database.main_user             // utente database
db_config.dbpassword = config.database.main_user_password       // password database
db_config.dbdatabase = config.database.main_database
db_config.host = config.database.main_host;

db_config.tables = {
    inventory: "inventory",
    items: "item",
    craft: "craft",
    players: "player",
    team_player: "team_player",
    assault: "assault",
    smuggler_offerts: "merchant_offer",
    assault_places: "assault_place_player_id",
    assault_items: "assault_place_item",
}

db_config.structures = utility.db_structures; // Per comodità

module.exports = db_config;