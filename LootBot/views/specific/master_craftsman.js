const query_util = require("../../utility/utils").query_structure
const sub_tree = query_util.query_tree.master_craftsman;

module.exports = {
    title: "Maestro Artigiano",
    keyboard_buttons: {
        back_to_menu: { text: "↵", callback_data: query_util.generate_callback_rute(sub_tree.menu.stmp, sub_tree) },
        master_craftsman_guide: { text: "ⓘ", callback_data: query_util.generate_callback_rute(sub_tree.guide.stmp, sub_tree) },
        list_view_main: { text: "📝", callback_data: query_util.generate_callback_rute(sub_tree.list.main_view.stmp, sub_tree) },// "Compila la lista",
        delete_list: { text: "🗑", callback_data: query_util.generate_callback_rute(sub_tree.list.clear_list.confirm.stmp, sub_tree) }, // "Cancella la lista",
        add_to_list: { text: "", callback_data: query_util.generate_callback_rute(sub_tree.list.add_to_list.stmp, sub_tree) }, // "Cancella la lista",
        show_items_list: { text: "📋", callback_data: query_util.generate_callback_rute(sub_tree.list.show_list.stmp, sub_tree) }, // "Cancella la lista",
        validate_list: { text: "Consegna la Lista", callback_data: query_util.generate_callback_rute(sub_tree.validate.stmp, sub_tree) }, // "Cancella la lista",
        set_rarity: { text: "⭑", callback_data: query_util.generate_callback_rute(sub_tree.list.set_rarity.stmp, sub_tree) }, // "Cancella la lista",
        preserve_remove: { text: "🎒", callback_data: query_util.generate_callback_rute(sub_tree.list.set_preserve_bool.change.stmp, sub_tree) }, // "Cancella la lista",
        preserve_confirm: { text: "🙅‍♂️", callback_data: query_util.generate_callback_rute(sub_tree.list.set_preserve_bool.change.stmp, sub_tree) }, // "Cancella la lista",
        index_button: { text: "¶", callback_data: query_util.generate_callback_rute(sub_tree.list.set_prefix.stmp, sub_tree) }, // "Cancella la lista",
        items_page_button_forward: { text: "→", callback_data: query_util.generate_callback_rute(sub_tree.list.items_page.stmp, sub_tree) }, // "Cancella la lista",
        items_page_button_backward: { text: "←", callback_data: query_util.generate_callback_rute(sub_tree.list.items_page.stmp, sub_tree) }, // "Cancella la lista",
        censure_view_remove: { text: "◎", callback_data: query_util.generate_callback_rute(sub_tree.list.censure.remove.stmp, sub_tree) }, // "Cancella la lista",
        censure_view_set: { text: "◉", callback_data: query_util.generate_callback_rute(sub_tree.list.censure.set_censure.stmp, sub_tree) }, // "Cancella la lista",

        show_craft_missing: { text: "Mancanti", callback_data: query_util.generate_callback_rute(sub_tree.validate.show_missing.stmp, sub_tree) }, // "Cancella la lista",
        show_craft_used: { text: "Usati", callback_data: query_util.generate_callback_rute(sub_tree.validate.show_used.stmp, sub_tree) }, // "Cancella la lista",
        show_craft_used_base: { text: "Base", callback_data: query_util.generate_callback_rute(sub_tree.validate.show_used.used_base.stmp, sub_tree) }, // "Cancella la lista",
        show_craft_used_base: { text: "Creati", callback_data: query_util.generate_callback_rute(sub_tree.validate.show_used.used_crafted.stmp, sub_tree) }, // "Cancella la lista",
        show_craft_used_base: { text: "Raccogli lista", callback_data: query_util.generate_callback_rute(sub_tree.validate.show_used.all_used.stmp, sub_tree) }, // "Cancella la lista",
        commit_craft: { text: "Commissiona il craft", callback_data: query_util.generate_callback_rute(sub_tree.validate.craft_line_commit.stmp, sub_tree) }, // "Cancella la lista",


    },
    beta_tester: {
        user_message: "La fucina dell'Artigiano è in fase di allestimento…\n",
        insert_success: " account abilitato a: `Mastro Artigiano`",
        empty_list: "Nessun betatester per questa sessione",
        show_list: "*Lista dei betatester*\n_per questa sessione_\n\n",
        query_user_not_listed: "La tua sessione di testing è terminata…",
    },
    menu: {
        introduction: "...tra il fragore di incudini e martelli una figura emerge dalle ombre.\nCon sguardo penetrante il Mastro Artigiano ti fissa...\n",
        is_banned: "...sembra deluso e dispiaciuto…",
        not_allowed: "Abbassa infine gli occhi, si gira e senza voltarsi torna al suo battere e forgiare…",
        wellcome: "Benvenut*",
        wellcome_new: "Viandante",
        wellcome_back: "Bentornat*",
        waiting_phrases: [
            "Hai bisogno d'aiuto? … Hai letto il cartello?",
            "Compila la tua lista, viandante",
            "Sto aspettando…",
            "Avrei da lavorare…",
            "Se hai qualche cosa da creare, aggiungilo alla lista…",
            "Ancora qui?",
            "...Ohibo!\npensavo non ci fosse piu nessuno…"
        ],
        long_list_phrases: [
            "Ci vorrà un eternità a creare quella roba li…",
            "Urca!",
            "Che lista!\nE tu ha tutto il necessario?",
            "Spero tu non abbia altro da aggiungere…",
            "Prima iniziamo, prima finiamo…",
            "La tua lista sembra impegnativa, viandante…",

        ],
        short_list_phrases: [
            "Se quello è quello che hai da creare, ci vorrà meno che un batter d'occhi",
            "Tutta qui la tua lista?",
            "Tutta qui, la tua lista?",
            "Poche cose ma buone…",
            "Sarà un lavoretto da nulla…",
            "Tutto qui!?",
            "Quindi è questa la tua lista?",
            "Queste cose le può creare anche un nano!"

        ],
        failed_validation_phrases: [
            "Ancora qui?",
            "Vuoi riporovare?",
            "Finito di farmi perdere tempo?",
        ]
    },
    guide: {
        title: "Liste craft 📋",
        text: "Aggiungi oggetti alla lista e consegnala al Mastro Artigiano che analizzerà la richiesta e ne valuterà il costo…",
        navigation_title: "Scorrimento della lista creati",
        navigation_rarity: "Seleziona una rarità: ⭑",
        navigation_prefix: "Seleziona un sottoelenco: ¶",

        commit_text: "Ed anche tu valuta attentamente costo e oggetti utilizzati…\nSe sei soddisfatt* 'Commissiona' il craft, riceverai immediatamente gli oggetti richiesti.",

        settings_title: "Attualmente:",
        censure_is_set: "• Scorrerai tra tutti i creabili: ◉",
        censure_unset: "• Scorrerai solo tra gli oggetti che puoi creare: ◎",
        preserve_is_set: "• Consegnerai al Mastro solo oggetti base",
        preserve_unset: "• Se serviranno, il Mastro potrà consumare creati dal tuo zaino",




    },
    list: {
        title: "Oggetti da creare",
        empty_list: "• Ancora nessun oggetto in elenco",
        list_length: "• Oggetti nell'elenco:",
        list_total_quantity: "• Quantità totale:",
        is_preserving: "Solo oggetti base",
        is_not_preserving: "Userai anche i creati nello zaino",
        selected_rarity: "• Rarità:",
        selected_prefix: "• Prefisso:",
        show_list_length: "oggetti",
        craftables_in_list: "oggetti creabili",

        list_clear: "Hai stralciato l'elenco craft…",
        censure_set: "Ti saranno mostrati solo i creati compatibili con la tua rinascita",
        censure_remove: "Puoi scorrere liberamente tra tutti i creabili",

        rarity_select: "• Seleziona una rarità",
        prefix_select: "• Seleziona un prefisso indice",

    },
    validate: {
        unable: {
            unable_moji: "❌",
            first_line: "Il Mastro ti osserva, sembra schifato…",
            quote: "Non puoi permetterti questa roba!",
            conclusion: "Straccia la tua lista e si volta…",
            too_much: "Mi spiace,\nma è davvero troppo lavoro.…",
            too_much_conclusion: "L'Artigiano stringe la lista tra le mani accartocciandola"
        },
        introduction: "Il Mastro Artigiano prende la tua lista e gli getta una rapida occhiata...",
        loops: {
            just_one: "Un solo craft?\nAvresti potuto anche farlo tu…",
            not_much: "Fiuuu!",
            a_fiew: "Mmh… !",
            a_lot: "Urca!"
        },
        quote_on_items_quantity: "oggetti?\nVediamo un po…",
        inventory_lookup: "Ti si avvicina e comincia a rovistare nel tuo zaino. In breve è di nuovo in piedi davanti a te",
        inventory_no_missing: [
            "Si può fare!",
            "Andata!",
            "Non dovrei metterci poi molto…",
            "Va bene",
            "…\nE va bene!",
            "Mmh… !\n…Va bene!",
            "D'accordo!",
            "Si, si può fare.",
            "Si, si, si…\nSi può fare",
            "E sia!",
            "Possiamo anche inizaire subito…",
        ],
        inventory_is_missing: {
            not_much: "Peccato! Manca della roba qui…",
            a_fiew: "Servirà qualche altro base però!",
            a_lot: "La tua è una richiesta ambiziosa…\nTi ho scritto una lista di quello che ti manca",
        },
        inventory_is_using_base: {
            not_much: "Mi serviranno solamente",
            a_fiew: "Non userò molto",
            a_lot: "Ti ho scritto un elenco di quello che mi servirà…"
        },
        inventory_is_using_crafted: {
            not_much: "...ed userò anche",
            a_fiew: "...oltre a",
        },
        craft_commission: {
            introduction: "Creando questa roba da sol* spenderesti",
            commission: "§ ma...",
            commission_excuses: [
                "La Fenice",
                "gli gnomi",
                "ho famiglia",
                "sai, il mio gatto",
                "sai, quello gnomo è incinto!",
                "il costo delle materie prime",
                "il costo delle materie prime…\n…e l'assicurazione per i nani…\n Mi spiace",
                "portare avanti questo posto è un impresa!\n",
                "tutto ha un costo",
                "cioè, vorrei… ma… ",
                "ci sono le tasse alla Fenice e…\n",
                "hai visto che Fucina che abbiamo?",
                "Il contrabbando va forte, e noi restiamo senza fornitori… cioè… insomma… ",
                "c'è il nostro lavoro, e il mana…\ne le tasse",
                "c'è il nostro lavoro, e il pozzo…\ne gli gnomi",
                "c'è il nostro lavoro, e la Fenice…\ne la fenice… La Fenice!\n",


            ],
            commission_end: "…devo chiederti altri "
        },
        craft_total_cost: "Il costo totale sarà",

        craft_pc: "Guadagnerai",
        too_expensive_craft_cost: "Dovresti spendere",
        too_expensive_craft_pc: "Guadagneresti",
        show_used: {
            quote: "Sono troppi oggetti quelli che consumeresti…\nTieni, ecco un riepilogo",
            not_much: "Non consumerai granche!",
            base: {
                none: "Nemmeno un oggetto base",
                just_one: "Un solo oggetto base",
                default: "oggetti base"
            },
            crafted: {
                none: "nemmeno un creato",
                just_one: "un solo creato",
                default: "oggetti creati"
            },
        }

    },
    list_print: {
        file_name: "Riepilogo.txt",
        target_items: "Obbiettivo craft",
        missing: "Mancanti",
        used_items: "\tconsumati",
        base: "Oggetti Base",
        crafted: "Oggetti Creati",
        list_tab: "\t\t",
        line: "-",
        all_used_items: "Oggetti consumati",
        craft_cost: "Edollari spesi",
        craft_commission: "Costi di commissione",
        craft_gained_pc: "Punti craft ottenuti"

    },
    commit: {
        money_controll: "Il Mastro Artigiano ti squadra da capo a piedi\n\n«Torna quando avrai recuperato gli edollari necessari…»",
        load_controll: "Il Mastro Artigiano resta a bocca aperta...\n\n«Sembra abbia problemi nel controllare il tuo zaino…»",
        used_items_controll: "Il Mastro Artigiano ti squadra da capo a piedi, contrariato.\n\n«Stai cercando di fregarmi?\nTorna quando avrai recuperato gli oggetti necessari…»",
        target_items_controll: "Il Mastro Artigiano sembra confuso…\n\n«Mi spiace, ma a pensarci bene non posso accettare la commissione\nFiniresti con l'avere troppi oggetti nello zaino…»",

        report_title: "Craft Report",
        file_name: "CraftReport.txt",

        text: "_…osservi il Mastro Artigiano raccogliere dal tuo zaino quello che gli serve.\nLo butta in una sacca…\n" +
            "…resti in silenzio mentre svuota il contenuto di quella sacca nel grande pozzo davanti alla sua fucina\n" +
            "…resti fermo.\nResti a guardare…_",
        bizzarre_events: [ // (questo quando erano 22...) Se ho fatto bene i conti sono 2024 combinazioni se ne mostro 3, 12.650 mostrandone 4. Non sono sicuro di quanto sia la somma…
            "…ci sono gnomi, sono gnomi quelli?",
            "…ci sono gnomi che sbattono.",
            "…ci sono gnomi che sbattono.",
            "…ci sono gnomi che squotono.",
            "…ci sono gnomi che corrono.",
            "…ci sono gnomi che urlano.",
            "…ci sono nani che battono.",
            "…ci sono nani che zampettano.",
            "…due nani si azzuffano…",
            "…quei nani stanno, stanno...",
            "…c'è un nano che sembra essersi ferito…\nSanguina?\n....aiutatelo!",
            "…senti l'odore del ferro riscaldato",
            "…senti il fetore del mana fuso",
            "…senti il calore del plasma incandescente",
            "…senti il calore degli ioni",
            "i tuoi occhi provano a seguire la scena…",
            "le tue orecchie iniziano a fischiare…",
            "lapilli di materiale fuso zampettano nell'aria…",
            "c'è un pony?",
            "senti freddo…",
            "fa freddo…",
            "buio!",
            "luce!",
            "qualche cosa di celeste?!\nMETALLO!",
            "qualche cosa di diabolico e galattico...",
            "qualche cosa di acciaio...",
            "scalpello, avorio",
            "Scalpello, laccio antico, scalpello...\nSCALPELLO!",
            "un Rubino Primordiale!",
            "Martello Acciaio.\nÈ il suo nome...\nMartello Acciaio\n",
            "Sbang, Crack, Sdong!",
            "Sbang, Sdong!",
            "Crack, Sbang, Sdong!",
            "Zunk, Crack, Yonk, fiiix!",
            "Aaaaaaaa!"
        ],

        ending_text: "_E in un attimo è tutto finito\n" +
            "non riesci a vedere l'artigiano, ti sei distratto e l'hai perso…\n" +
            "Ai tuoi piedi c'è uno gnomo\n" +
            "Lo guardi, ti guarda, ti butta addosso una cartaccia…_\n" +
            "«È il report», _dice…_\n" +
            "«La tua roba è gia nello zaino!»\n_Sparisce…_"


    }
}