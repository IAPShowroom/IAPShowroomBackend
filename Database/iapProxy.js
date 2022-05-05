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
    var query = "select s.sponsor_id, s.company_name, u.upload_link as company_url from sponsors s left join uploads u on s.company_logo = u.upload_id left join session_sponsors ss on s.sponsor_id = ss.sponsor_id where ss.session_id = (select year_id as session_id from iap_session where start_date = (select max(start_date) from iap_session))";
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

function fetchQnARoomInfo (projectID, callback) { 
    //Fetch title, abstract, and users associated with project 
    logCtx.fn = 'fetchQnARoomInfo';
    var query = "select p.title as iapproject_title, p.abstract as iapproject_abstract, u.email, u.first_name as first_name, u.last_name as last_name, u.user_type as user_role from users u left join project_membership pm on u.user_id = pm.user_id left join projects p on pm.project_id = p.project_id where u.is_deleted = false and pm.project_id = $1 and pm.session_id = (select year_id as session_id from iap_session where start_date = (select max(start_date) from iap_session))";
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rowCount == 0) {
                callback(null, null); //No info found, send null result to provoke 404 error
            } else {
                var result = res.rows; //returns counts for users
                callback(null, result);
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [projectID], callback, queryCb);
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
    getSponsors: getSponsors,
    fetchQnARoomInfo: fetchQnARoomInfo
}
