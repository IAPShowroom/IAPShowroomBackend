/**
 * Database proxy file, used to interface with the Showroom's database.
 */

const { Pool } = require('pg');
const config = require('../Config/config');
const dbConfig = config.showroomDBConfig;
const { logError, log } = require('../Utility/Logger.js');
const dbUtils = require('../Utility/DbUtils.js');
const async = require('async');

let logCtx = {
    fileName: 'showroomProxy.js',
    fn: ''
}

const EVENT_PROPERTIES = 6;
const MAX_ASYNC = 1;

const pool = new Pool({
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.database,
    password: dbConfig.password,
    port: dbConfig.port,
});

function registerUser (req, callback) { //TODO: check role and call respective function
    callback(null, { userID: 14 }); //testing sessions
}

//TODO: test with db
function createEvents (eventList, callback) {
    logCtx.fn = 'createEvents';
    var eventArrays = eventList.map(obj => Object.values(obj)); //get array of arrays

    //Insert each array into DB
    async.forEachLimit(eventArrays, MAX_ASYNC, (event, cb) => {
        if (event.length != EVENT_PROPERTIES) {
            let errorMsg = "Cannot persist event with invalid amount of properties.";
            logError(errorMsg, logCtx);
            cb(new Error(errorMsg));
        }
        dbUtils.makeQueryWithParams(pool,"insert into iap_events (adminid, startTime, duration, title, projectid, e_date) values ($1, $2, $3, $4, $5, $6)", event, cb, (error, res) => {
            if (error) {
                logError(error, logCtx);
                cb(error, null);
            } else {
                log("Got response from DB - rowCount: " + res.rowCount, logCtx);
                console.log("res: "); //testing
                console.log(res); //testing
                var result = res.rows; //returns <TODO>
                cb(null, result);
            }
        });
    }, (error) => {
        if (error) {
            callback(error, null);
        } else {
            callback(null, "Successfully created the events."); //TODO send something else back, depending on what db brings back as response
        }
    });
}

//TODO: test with db
function getEvents(upcoming, time, date, callback) {
    logCtx.fn = 'getEvents';
    var getAll = "select * from iap_events";
    var getUpcoming = "select * from iap_events where time > $1 and e_date = $2";
    var query = upcoming ? getUpcoming : getAll;
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = res.rows; //returns events
            callback(null, result);
        }
    };
    if (upcoming) {
        dbUtils.makeQueryWithParams(pool, query, [time, date], callback, queryCb);
    } else {
        dbUtils.makeQuery(pool, query, callback, queryCb);
    }
}

function updateEvent (eventID, event, callback) {
    logCtx.fn = 'updateEvent';
    var query = "insert into iap_events (adminid, startTime, duration, title, projectid, e_date) values ($1, $2, $3, $4, $5, $6) where event_id = $7";
    var values = [event.adminid, event.startTime, event.duration, event.title, event.projectid, event.e_date, eventID];
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = res.rows;
            callback(null, result);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function deleteEvent (eventID, callback) {
    logCtx.fn = 'deleteEvent';
    var query = "delete from iap_events where event_id = $1"; //TODO: maybe just add is_deleted column and set to true?
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = res.rows;
            callback(null, result);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [eventID], callback, queryCb);
}

function endPool() {
    logCtx.fn = 'endPool';
    //Close the connection pool when server closes
    log("Closing connection pool.", logCtx);
    pool.end();
}

module.exports = {
    registerUser: registerUser,
    createEvents: createEvents,
    getEvents: getEvents,
    updateEvent: updateEvent,
    deleteEvent: deleteEvent,
    endPool: endPool
}

/**
 * Development Notes:
 * 
 * - pool.end drains the pool of all active clients, disconnects then and shuts down any internal timers
 * --- should probably open the pool (call pool.connect i think) to serve actions that require many requests in bulk
 * --- then close it once all of those calls are done 
 */