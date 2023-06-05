const fs = require('fs');
const path = require('path');

const appMainPath = path.dirname(require.main.filename);
const players_dir = path.join(appMainPath, '/LootBot/sources/players/');




module.exports = {
    read: readJSONFile,
    write: writeJSONFile
}



// Funzione per controllare se un file esiste
async function fileExists(directoryPath) {
    try {
        await fs.promises.access(directoryPath, fs.constants.F_OK);
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

// Funzione per leggere il contenuto di un file JSON
async function readJSONFile(telegram_user_id, filename) {
    const directoryPath = path.join(players_dir, telegram_user_id);
    const filePath = path.join(directoryPath, filename);

    try { // Non faccio controlli sull'esistenza ne di directoryPath ne del file. Il caso è gestito individualmente dalle specifiche
        const data = await fs.promises.readFile(filePath);
        return JSON.parse(data);
    } catch (error) {
        console.error(`Errore durante la lettura del file JSON "${filePath}": ${error}`);
        return false;
    }
}

// Funzione per scrivere il contenuto in un file JSON
async function writeJSONFile(telegram_user_id, filename, new_craftsman_info) {
    const directoryPath = path.join(players_dir, telegram_user_id);
    const filePath = path.join(directoryPath, filename);

    try {

        if (!(await fileExists(directoryPath))) { // Nel caso in cui la cartella utente non esista, la creo
            console.log("creo "+directoryPath);
            await fs.promises.mkdir(directoryPath, { recursive: true });
        } else{
            console.log("la directory esiste...");
        }

        const jsonData = JSON.stringify(new_craftsman_info, null, 2);
        await fs.promises.writeFile(filePath, jsonData, 'utf8');
        return new_craftsman_info;
    } catch (error) {
        console.error(`Errore durante la scrittura del file JSON "${filePath}": ${error}`);
        return false;
    }
}