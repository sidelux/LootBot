module.exports = {
    //L'albero query di master_craftsman
    query_tree: {
        stmp: "CRAFTSMAN",
        guide: {
            stmp: "GUIDE",

        },
        menu: {
            stmp: "MENU",

        },
        smuggler: {
            stmp: "SMUGGLER",
            add_smuggler_to_list: {
                stmp: "SMUG_ADD",
            }
        },
        assault: {
            stmp: "ASSAULT",
            missing: {
                stmp: "UP_MISSING",
                add_missing_to_list: {
                    stmp: "UP_ADDMISS",
                },
            },
            all: {
                stmp: "UP_ALL",
                add_all_to_list: {
                    stmp: "UP_ADDALL",
                }
            },
        },
        list: {
            stmp: "LIST",
            main_view: {
                stmp: "MAIN_VIEW",
            },
            set_prefix: {
                stmp: "PREFIX",
            },
            items_page: {
                stmp: "ITEMS_PAGE",
            },
            set_rarity: {
                stmp: "SET_RARITY",
            },
            show_list: {
                stmp: "SHOW_LIST",
            },
            clear_list: {
                stmp: "CLEAR",
                confirm: {
                    stmp: "CLEAR_CONFIRM",
                }
            },
            censure: {
                stmp: "CENSURE",
                remove: {
                    stmp: "REMOVE",
                },
                set_censure: {
                    stmp: "SET_CENSURE",
                }
            },
            add_to_list: {
                stmp: "ADD",
            },
            set_preserve_bool: {
                stmp: "PRESERVE_CRAFTED",
                change: {
                    stmp: "CHANGE",
                }
            }
        },
        validate: {
            stmp: "VALIDATE",
            show_missing: {
                stmp: "SHOW_MISSING",
            },
            show_used: {
                stmp: "SHOW_USED",
                used_crafted: {
                    stmp: "USED_CRAFTED",
                },
                used_base: {
                    stmp: "USED_BASE",
                },
                all_used: {
                    stmp: "ALL_USED",
                },
            },

            craft_line_commit: {
                stmp: "CRAFT_LINE_COMMIT",
            },
        }
    }
}