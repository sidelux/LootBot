module.exports = {
    //L'albero query di master_craftsman
    query_tree: {
        stmp: "NECRO_D",
        guide: {
            stmp: "GUIDE",
        },
        altar: {
            stmp: "ALTARE",
            descent: {
                stmp: "DESCENT",  
            },
            sacrifice: {
                stmp: "SACRIFICE_MENU",
                // qui i bottoni per il menu sacrificio  
            },
            
        },
        maze:{
            stmp: "MAZE",
            change_facing: {
                stmp: "CHANGE_FACING",
            },
            goto_gate: {
                stmp: "GOTO_GATE",
            }
        }
    }
}