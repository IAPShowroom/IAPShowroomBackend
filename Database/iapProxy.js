/**
 * Database proxy file, used to interface with the IAP's database.
 */

const { Pool } = require('pg');
const config = require('../Config/config');
const dbConfig = config.iapDBConfig;
const logger = require('../Utility/Logger.js');

let logCtx = {
    fileName: 'iapProxy',
    fn: ''
}

// console.log("dbconfig: ", dbConfig); //testing

const pool = new Pool({
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.database,
    password: dbConfig.password,
    port: dbConfig.port,
});

//TODO: change query call for stored procedure call
function fetchProjects(sessionID, callback) {
    logCtx.fn = 'fetchProjects';
    pool.query("select project_id, title from projects where session_id = $1", [sessionID], (error, res) => {
        if (error) {
            logger.logError(error, logCtx);
            callback(error, null);
        }
        logger.log("Got response from DB - rowCount: " + res.rowCount, logCtx);
        var result = res.rows; //returns array of json objects with project_id and title 
        pool.end();
        callback(null, result);
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