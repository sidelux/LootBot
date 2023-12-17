// I giocatori in nd 


module.exports = {
    generate_card: generate_playercard,
    generate_mob: generate_mobcard
}


function pg_skeletron() {
    return {
        account_id: -1,
        current_room_id: -1,        // id della stanza nel labirinto
        current_facing: "",
        current_action_end_date: -1, // Orario fino al quale l'utente è forzato ad attendere (non può fare altro)
        hp: 20,                     // punti colpo
        stats: {
            deads: 0,               // contatore del numero di morti nel labirinto corrente
            attack: 2,              // Attacco semplice
            special_attack: 1,      // Attacco speciale
            defense: 5,             // difesa
            special_defense: 2,     // difesa speciale
            velocity: 3,            // velocità
            energy: 10,             // energia (consumata dalle azioni. Si può recuperare con riposo (+2 in 2 minuti) o tramite alleato)
            healing: 1,             // capacità curativa
            skills: [],             // abilità
        },
        states: [],                 // stati (di movimento, di combattimento, di morte…)
        last_dead_date: -1,         // Orario dell'ultima morte (per respawn)
        equip: {                    // equipaggiamento
            weapon_id: -1,
            shield_id: -1,
            armor_id: -1,
            talisman_id: -1
        },
        knapsack: []                // sacca 
    }
}

function pg_skills(skill_id) {  
    let skill_name = "";
    switch (skill_id) {
        case(1): {
            skill_name = "Guarigione" // 💚 // Aumenta istantaneamente gli hp del giocatore obbiettivo (in base al suo healing e a special_attack di chi invoca). Chi la usa attende in maniera proporzionata.
            break;
        }
        case(2): {
            skill_name = "Supporto" // 🔰 // Aumenta istantaneamente velocità e/o attacco del giocatore obbiettivo in base a special_attack. Chi la usa attende in maniera proporzionata.
            break;
        }
        case(3): {
            skill_name = "Impeto di Fiamme" // 🔥 // ATTACCO SPECIALE, possibilità di obbiettivo-"Bruciato" 
            break;
        }
        case(4): {
            skill_name = "Tempesta Folgorante" // ⚡️ ATTACCO SPECIALE, possibilità di obbiettivo-"Paralizzato" 
            break;
        }
        case(5): {
            skill_name = "Furia dei Mari" // 🌊 ATTACCO SPECIALE, possibilità di obbiettivo-"Rallentato"
            break;
        }
        case(6): {
            skill_name = "Apprendista" // ⭐️ possibilità di apprendere un altra abilità (al posto di questa)
            break;
        }
        default: break; // skill_id == 0 // 👋
    }

    return ({id: skill_id, name: skill_name});

}

function pg_types(vocazione){
    /*
    1 - Luce (che è particolarmente efficace su Ombra)
    2 - Ombra (che è particolarmente efficace su elettro)
    3 - elettro (che è particolarmente efficace su acqua)
    4 - acqua (che è particolarmente efficace su fuoco)
    5 - fuoco (che è particolarmente efficace su Luce)
    */
    switch (vocazione) {
        case (2): { // ("Sciamano Elementalista"): {
            return Math.floor(Math.random()*2)+3;
        }
        case (3): { //("Esploratore Druido"): {
            return 3;
        }
        case (4): { //("Incantaspade"): {
            return 5;
        }
        case (5): { //("Consacratore Divino"): {
            return 4;
        }
        case (6): { //("Spaccateste"): {
            return 2;
        }
        case (7): { //("Discepolo dei Draghi"): {
            return 1;
        }
        case (8): { //("Barbaro"): {
            return 2;
        }
        case (9): { // ("Predone"): {
            return 2;
        }
        default: { // Cittadino!
            return 1;
        }
    }
}



// La scheda del giocatore per nd.
function generate_playercard(player_info) { 
    // in ingresso credo 'reborn'  e 'class' di player 


    let player_basecard = pg_skeletron();

    // Punti colpo
    switch (player_info.reborn) {
        case (4): {
            player_basecard.hp *= 2;
            break;
        }
        case (5): {
            player_basecard.hp *= 5;
            break;
        }
        case (6): {
            player_basecard.hp *= 5;
            break;
        }
        default: {
            if (player_info.reborn > 6){
                player_basecard.hp *= 5;
                player_basecard.hp += 10*(player_info.reborn-6)
            } else {
                player_basecard.hp += 5;
            }
            break;
        }
    }

    // Statistiche
    switch (player_info.class) {
        case (2): { // ("Sciamano Elementalista"): {
            player_basecard.stats.attack += 1;
            player_basecard.stats.defense += 1;
            player_basecard.stats.special_attack += 3;
            player_basecard.stats.special_defense += 3;
            player_basecard.stats.skills.push(pg_skills(Math.floor(Math.random() * 7)))
            player_basecard.stats.skills.push(pg_skills(6))

            break;
        }
        case (3): { //("Esploratore Druido"): {
            player_basecard.stats.attack += 2;
            player_basecard.stats.defense += 1;
            player_basecard.stats.special_attack += 3;
            player_basecard.stats.special_defense += 2;
            player_basecard.stats.skills.push(pg_skills(4))
            player_basecard.stats.skills.push(pg_skills(6))
            break;
        }
        case (4): { //("Incantaspade"): {
            player_basecard.stats.attack += 2;
            player_basecard.stats.defense += 1;
            player_basecard.stats.special_attack += 3;
            player_basecard.stats.special_defense += 2;
            player_basecard.stats.skills.push(pg_skills(3))
            player_basecard.stats.skills.push(pg_skills(6))
            break;
        }
        case (5): { //("Consacratore Divino"): {
            player_basecard.stats.attack += 1;
            player_basecard.stats.defense += 1;
            player_basecard.stats.special_attack += 2;
            player_basecard.stats.special_defense += 4;
            player_basecard.stats.skills.push(pg_skills(5))
            player_basecard.stats.skills.push(pg_skills(6))
            break;
        }
        case (6): { //("Spaccateste"): {
            player_basecard.stats.attack += 6;
            player_basecard.stats.defense += 4;
            player_basecard.stats.velocity += 2;
            player_basecard.stats.skills.push(pg_skills(0))
            break;
        }
        case (7): { //("Discepolo dei Draghi"): {
            player_basecard.stats.attack += 3;
            player_basecard.stats.defense += 3;
            player_basecard.stats.special_attack += 1;
            player_basecard.stats.special_defense += 1;
            player_basecard.stats.velocity += 1;
            player_basecard.stats.skills.push(pg_skills(6))
            break;
        }
        case (8): { //("Barbaro"): {
            player_basecard.stats.attack += 4;
            player_basecard.stats.defense += 2;
            player_basecard.stats.special_attack += 1;
            player_basecard.stats.special_defense += 1;
            player_basecard.stats.velocity += 1;
            player_basecard.stats.skills.push(pg_skills(6))
            break;
        }
        case (9): { // ("Predone"): {
            player_basecard.stats.attack += 3;
            player_basecard.stats.defense += 1;
            player_basecard.stats.special_attack += 1;
            player_basecard.stats.special_defense += 1;
            player_basecard.stats.velocity += 3;
            player_basecard.stats.skills.push(pg_skills(6))
            player_basecard.stats.skills.push(pg_skills(6))

            break;
        }
        default: { // Cittadino!
            player_basecard.stats.attack += 1;
            player_basecard.stats.defense -= 2;
            player_basecard.stats.special_attack += 4;
            player_basecard.stats.special_defense -= 1;
            player_basecard.stats.skills.push(pg_skills(6))
            player_basecard.stats.skills.push(pg_skills(6))
            break;
        }
    }

    player_basecard.stats.nature = pg_types(player_info.class) // Attribuisco la natura 
    player_basecard.account_id = player_info.account_id;

    return player_basecard;
}

// I mob sono calcolati in relazione alla scheda del giocatore che (per primo) apre la porta
function generate_mobcard(player_card){
    let mob_basecard = pg_skeletron();

    // Abilità
    mob_basecard.stats.skills = player_card.stats.skills.slice();
    if (Math.floor(Math.random()*6) > 3){
        mob_basecard.stats.skills.push(pg_skills(Math.floor(Math.random() * 7)))
    }
    if (Math.floor(Math.random()*6) < 3){
        mob_basecard.stats.special_attack += Math.floor(Math.random()*6)
    }
    
    // Personalità
    switch(Math.floor(Math.random()*6)){
        case 0:{ // Furioso
            mob_basecard.stats.attack +=1;
            mob_basecard.stats.velocity +=3;
            mob_basecard.stats.defense -=2;
        }
        case 1:{ // Pazzoide
            mob_basecard.stats.attack -=1;
            mob_basecard.stats.velocity +=3;
            mob_basecard.stats.defense -=2;
            mob_basecard.stats.healing +=2;
        }
        case 2:{ // Suicida
            mob_basecard.stats.attack -=1;
            mob_basecard.stats.velocity -=1;
            mob_basecard.stats.defense -=2;
        }
        default:{
            mob_basecard.stats.attack -=1;
            mob_basecard.stats.velocity +=1;
        }
    }


}

// I boss devono essere definiti. L'idea iniziale ne voleva 9... Forse 3 sono sufficenti. O 5…