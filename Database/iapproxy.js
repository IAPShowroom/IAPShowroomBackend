/**
 * Database proxy file, used to interface with the IAP's database.
 */

const { Pool } = require('pg');
const config = require('../Config/config');
const dbConfig = config.iapDBConfig;

const pool = new Pool({
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.database,
    password: dbConfig.password,
    port: dbConfig.port,
});

//TODO
function fetchProjects(session, callback) {
    pool.query('', (error, res) => {
        pool.end();
    });
}

module.exports = {
    fetchProjects: fetchProjects
}

/**
 * Development Notes:
 * 
 * - en el query podemos poner un sql to try to use the SP in the db
 */