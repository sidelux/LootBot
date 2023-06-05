const ex_config = require ("../../config.js");

module.exports = {
    // Questi dati sono pubblici e possono rimanere esposti
    phenix_id:  20471035,
    devs: {
        phenix_id:  20471035,
        nrc_id:     16964514,
    },
    isDev: (id) => Object.values(this.devs).includes(id),

    database: {
        host: ex_config.dbhost,
        main_database: ex_config.dbdatabase,
        main_user: ex_config.dbuser,
        main_user_password: ex_config.dbpassword,
    },

    beta_test: {
        master_craftsman: true,
    }
}
