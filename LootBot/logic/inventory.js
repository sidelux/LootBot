// Gestisce la parte della logica dedicata agli zaini (inventories)


const model = require("../model/DB_managers/specific/inventory");					// Il modello che cura l'interazione con il database (per le specifiche su inventory)
//const view = require("../views/");										// Non sono affatto sicuro sia un buon modo di gestire le stringhe…	

module.exports = {
	complete: model.complete,														// Restituisce lo zaino completo di un giocatore
	update_items_quantityOf: model.items.update_quantities_Of,
	hasItem: inventory_hasItem,														// Controlla se in uno zaino è presente un oggetto (LootItem)
	inventory_cap: inventory_cap,

}

function inventory_cap() {
	const affected_rarities = {
		C: 6000,
		NC: 4500,
		R: 3000,
		UR: 2000,
		L: 1000,
		E: 1000,
		UE: 500,
		X: 500,
		U: 500,
	};

	return {
		get_rarity: () => Object.keys(affected_rarities),
		get_cap_forRarity: (rarity) => affected_rarities[rarity] ? affected_rarities[rarity] : true,
		cap_check: (rarity, quantity) => {
			console.log(rarity, quantity)
			const cap = affected_rarities[rarity];
			return (cap && quantity < cap);
		},
	};
}


// controlla se nello zaino è presente oggetto, non saprei cosa altro aggiungere al commento.  
function inventory_hasItem(item_id, player_inventory) {
	const item = player_inventory.find((item) => item.item_id === parseInt(item_id));
	return {
		has_item: (Boolean(item) && item.quantity > 0),
		quantity: item ? item.quantity : -1,
	};
}











/*  Metto in pausa il portin di queste funzioni. C'è troppa roba e va divisa diversamente…


function equip_hasItem(item_id, player_equip){
	return  player_equip.some(equipitem_id => Object.values(equipitem_id).includes(item_id));
}

async function get_playerEquip(player_id){
	let response = { // c'è tanta roba in player per l'equip... metto in pausa queste funzioni
		esit: false,
		equip: {
			sword: -1,
			armor: -1,
			shield: -1
		}
	}

	let raw_data= await model.equip.complete(player_id);


}

async function durability_controll_onAdd(player_id, item_durability,){
	let response = {
		update_durability: false,
		update_max_durability: flase
	}

	if (item_durability == null) {

		let equip = await model.equip.complete(player_id);

		var rows = await connection.queryAsync('SELECT weapon_id, weapon2_id, weapon3_id FROM player WHERE id = ' + player_id);
		var weapon_id = rows[0].weapon_id;
		var weapon2_id = rows[0].weapon2_id;
		var weapon3_id = rows[0].weapon3_id;
		var rows = await connection.queryAsync('SELECT power, power_armor, power_shield, rarity FROM item WHERE id = ' + item_id);
		
		if ((rows[0].power > 0) || (rows[0].power_armor < 0) || (rows[0].power_shield < 0)) {
			var item_durability = getDurability(rows[0].rarity);
			var rows = await connection.queryAsync('SELECT quantity FROM inventory WHERE player_id = ' + player_id + ' AND item_id = ' + item_id);
			// se non avevo copie dell'oggetto e non è equipaggiato, imposta la durabilità massima, altrimenti mantieni quella attuale
			if (((Object.keys(rows).length == 0) || (rows[0].quantity == 0)) && (weapon_id != item_id) && (weapon2_id != item_id) && (weapon3_id != item_id))
				durability_query = ", durability = " + item_durability + ', durability_max = ' + item_durability;
		}
	} else
		durability_query = ", durability = " + item_durability;
}

async function addItem(player_id, item_id, item_quantity = 1, item_durability = null, item_iscollected = true) {
	let response = {
		esit: false,
		message_text: ""
	}


	item_quantity = parseInt(item_quantity);
	if (isNaN(item_quantity)) {
		let function_paparameters = [{player_id: player_id, item_id: item_id, item_quantity: item_quantity}]
		response.message_text = view.print(view.logic.error.item_quantity, view.flatted_function_paparameters(function_paparameters))
		return response;
	}

	if (item_id == 646){
		// gestione polvere?
	}

	var durability_query = "";
	

	
	var exclude_items = [646];
	if (!exclude_items.includes(item_id)) {
		var inv_quantity = getItemCnt(player_id, item_id);
		if (inv_quantity >= 1000)
			return;

		if (inv_quantity+qnt >= 1000) {
			qnt = 1000-inv_quantity;
			return;
		}
	}
	

	var collected_qnt = item_quantity;
	if (!item_iscollected)
		collected_qnt = 0;

	var rows = await connection.queryAsync('UPDATE inventory SET quantity = quantity+' + item_quantity + durability_query + ', collected = collected+' + collected_qnt + ' WHERE player_id = ' + player_id + ' AND item_id = ' + item_id);
	if (rows.affectedRows == 0)
		await connection.queryAsync('INSERT INTO inventory (player_id, item_id, quantity) VALUES (' + player_id + ',' + item_id + ', ' + item_quantity + ')');
}

*/