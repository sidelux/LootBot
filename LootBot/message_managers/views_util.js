module.exports = {
    menu_strings: { // Questo oggetto dovrebbe pian piano essere riempito con tutte le stringhe che possono essere scritte al bot
        back_to_menu: "Torna al menu",
        square: {
            main: "Piazza 💰",
            master_craftsman: "Mastro Artigiano ⚒"
        }
    },
    ita_gender_impl_singular: (string, gender) => `${string}${gender == "F" ? "a": "o"}`,
    ita_gender_impl_singular_all: (string, gender, symbol= "*") => `${string.split(symbol).join(gender=="F" ? "a": "o")}`
}