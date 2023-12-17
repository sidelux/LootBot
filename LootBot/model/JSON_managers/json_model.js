const fs = require('fs');
const path = require('path');

const appMainPath = path.dirname(require.main.filename);

module.exports = {
    read: readJSONFile,
    readAndLockJSON: readAndLockJSON,
    write: writeJSONFile,
    check: fileExists
}

// Funzione per controllare se un file esiste
async function fileExists(directoryPath) {
    try {
        await fs.promises.access(directoryPath, fs.constants.F_OK);
        return true;
    } catch (error) {
        // console.error(error);
        return false;
    }
}

// Funzione ASINCRONA per leggere il contenuto di un file JSON
async function readJSONFile(filePath) {
    try { // Non faccio controlli sull'esistenza ne di directoryPath ne del file. Il caso è gestito individualmente dalle specifiche
        const data = await fs.promises.readFile(filePath);
        return JSON.parse(data);
    } catch (error) {
        // console.error(`Errore durante la lettura del file JSON "${filePath}": ${error}`);
        return false;
    }
}

// Funzione ASINCRONA per scrivere il contenuto in un file JSON
async function writeJSONFile(directoryPath, filePath, updated_data) {
    try {
        if (!(await fileExists(directoryPath))) { // Nel caso in cui la cartella utente non esista, la creo
            // console.log("creo "+directoryPath);
            await fs.promises.mkdir(directoryPath, { recursive: true });
        } else {
            // console.log("la directory esiste...");
        }

        const jsonData = JSON.stringify(updated_data, null, 2);
        await fs.promises.writeFile(filePath, jsonData, 'utf8');
        return updated_data;
    } catch (error) {
        //console.error(`Errore durante la scrittura del file JSON "${filePath}": ${error}`);
        return false;
    }
}


// Funzione per la lettura di un file condiviso
// Leggo (async) e controllo subito se jsonContent.locked_by
// Se è libero posso restituire il contenuto, altrimenti c'è bisogno che si aspetti.
// È una soluzione semplicissima. Ci sono arrivato solo dopo 64 minuti di deliri!
// Nota del giorno dopo: un implicazione è che la release del lock andrà fatta ad ogni chiamata (perche ad ogni chiamata viene letto il file)
async function readAndLockJSON(filePath, user_id) {
    try {
        console.log(filePath);
        const jsonContent = await readJSONFile(filePath);
        if (jsonContent == false) {
            return { esit: false, error: 0 }
        }

        if (!jsonContent.locked_by || (jsonContent.lock_date + 2000) <= Date.now()) {
            // Nessuno ha bloccato il file, procedi con il blocco e la lettura
            jsonContent.locked_by = user_id;
            jsonContent.lock_date = Date.now();

            // Scrivi il file con l'attributo locked_by
            fs.writeFileSync(filePath, JSON.stringify(jsonContent, null, 2), 'utf8');

            // Restituisci il contenuto del file e l'ID dell'utente che lo ha bloccato
            return { esit: true, content: jsonContent, locked_by: user_id };
        } else {
            // Il file è già bloccato da un altro utente
            return { esit: false, error: 2, locked_by: jsonContent.locked_by };
        }
    } catch (error) {
        console.error(`1B. Errore durante la scrittura del file JSON "${filePath}": ${error}`);
        return { esit: false, error: 1};;
    }

}