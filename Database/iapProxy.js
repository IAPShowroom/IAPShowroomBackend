/**
 * Database proxy file, used to interface with the IAP's database.
 */

const { Pool } = require('pg');
const config = require('../Config/config');
const dbConfig = config.iapDBConfig;
const dbUtils = require('../Utility/DbUtils.js');
const { logError, log } = require('../Utility/Logger.js');

let logCtx = {
    fileName: 'iapProxy',
    fn: ''
}

// console.log("dbconfig: ", dbConfig); //testing

//having problems connecting with environment variables
const pool = new Pool({
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.database,
    password: dbConfig.password,
    port: dbConfig.port,
});

function fetchProjects(sessionID, callback) {
    logCtx.fn = 'fetchProjects';
    dbUtils.makeQueryWithParams(pool, "select project_id, title from projects where session_id = $1", [sessionID], callback, (error, res) => {
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = res.rows; //returns array of json objects with project_id and title 
            callback(null, result);
        }
    });
}

function validateEmail (email, callback) { //TODO: test
    //Verify that email is registered in IAP 
    logCtx.fn = 'validateEmail';
    var query = "select user_id from users where email = $1";
    var values = [email];
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rows.length == 0 ) {
                var errorMsg = "Email is not registered in IAP's system.";
                logError(errorMsg, logCtx);
                callback(new Error(errorMsg));
            } else {
                callback(null); //Success
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function endPool() {
    logCtx.fn = 'endPool';
    //Close the connection pool when server closes
    log("Closing connection pool.", logCtx);
    return pool.end();
}

module.exports = {
    fetchProjects: fetchProjects,
    endPool: endPool,
    validateEmail: validateEmail
}

/**
 * Development Notes:
 * 
 * - en el query podemos poner un sql to try to use the SP in the db
 */