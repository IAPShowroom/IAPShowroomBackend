/**
 * Database proxy file, used to interface with the IAP's database.
 */

const { Pool } = require('pg');
const config = require('../Config/config');
const dbConfig = config.iapDBConfig;
const dbUtils = require('../Utility/DbUtils.js');
const showroomDB = require('./showroomProxy.js');
const async = require('async');
const { logError, log } = require('../Utility/Logger.js');

let logCtx = {
    fileName: 'iapProxy',
    fn: ''
}

const pool = new Pool({
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.database,
    password: dbConfig.password,
    port: dbConfig.port,
});

//TODO: original --v, using one below temporarily
// function fetchProjects(sessionID, callback) {
//     logCtx.fn = 'fetchProjects';
//     dbUtils.makeQueryWithParams(pool, "select project_id, session_id, title, abstract from projects where session_id = $1", [sessionID], callback, (error, res) => {
//         if (error) {
//             logError(error, logCtx);
//             callback(error, null);
//         } else {
//             log("Got response from DB - rowCount: " + res.rowCount, logCtx);
//             var result = res.rows; //returns array of json objects
//             callback(null, result);
//         }
//     });
// }

function fetchProjects(sessionID, callback) {
    logCtx.fn = 'fetchProjects';
    dbUtils.makeQueryWithParams(pool, "select project_id, session_id, title, abstract from projects where session_id = $1", [sessionID], callback, (error, res) => {
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = res.rows; //returns array of json objects
            async.forEachLimit(result, 1, (iapProject, cb) => {
                showroomDB.postToShowroomProjects(iapProject, (error) => {
                    if (error) {
                        logError(error.toString(), logCtx);
                    }
                    cb(error);
                });
            }, (error) => {
                callback(error); //null if no error
            });
        }
    });
}

function getSessions(latest, callback) {
    logCtx.fn = 'getSessions';
    var query = "select year_id as session_id, start_date, end_date from iap_session";
    if (latest) {
        query = "select year_id as session_id, start_date, end_date from iap_session where start_date = (select max(start_date) from iap_session)";
    }
    dbUtils.makeQuery(pool, query, callback, (error, res) => {
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = res.rows; //returns array of json objects with session_id, start_date and end_date
            callback(null, result);
        }
    });
}

function getSponsors(callback) {
    logCtx.fn = 'getSponsors';
    var query = "select * from sponsors";
    dbUtils.makeQuery(pool, query, callback, (error, res) => {
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = res.rows; //returns array of json objects with sponsor info
            callback(null, result);
        }
    });
}

function validateEmail (email, callback) { 
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
            // var isInIAP = false;
            // if (res.rows.length != 0 ) {
            //     isInIAP = true;
            // }
            // callback(null, isInIAP); //Making it not fail, but just give out warning
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
    validateEmail: validateEmail,
    getSessions: getSessions,
    getSponsors: getSponsors
}