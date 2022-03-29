/**
 * Database proxy file, used to interface with the Showroom's database.
 */

const { Pool } = require('pg');
const config = require('../Config/config');
const dbConfig = config.showroomDBConfig;
const { logError, log } = require('../Utility/Logger.js');
const dbUtils = require('../Utility/DbUtils');
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

function createEvents (eventList, callback) {
    logCtx.fn = 'createEvents';
    var result;
    var eventArrays = eventList.map(obj => Object.values(obj)); //get array of arrays
    //Insert each array into DB
    async.forEachLimit(eventArrays, MAX_ASYNC, (event, cb) => {
        if (event.length != EVENT_PROPERTIES) {
            let errorMsg = "Cannot persist event with invalid amount of properties.";
            logError(errorMsg, logCtx);
            cb(new Error(errorMsg));
        } else {
            dbUtils.makeQueryWithParams(pool,"insert into iap_events (adminid, startTime, duration, title, projectid, e_date) values ($1, $2, $3, $4, $5, $6)", event, cb, (error, res) => {
                if (error) {
                    logError(error, logCtx);
                } else {
                    log("Got response from DB - rowCount: " + res.rowCount, logCtx);
                    result = res.rows; //returns []
                }
                cb(error);
            });
        }
    }, (error) => {
        if (error) {
            callback(error, null);
        } else {
            callback(null, result);
        }
    });
}

function getEvents(upcoming, time, date, callback) {
    logCtx.fn = 'getEvents';
    var getAll = "select * from iap_events";
    var getUpcoming = "select * from iap_events where starttime > $1 and e_date = $2";
    var query = upcoming ? getUpcoming : getAll;
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = upcoming ? res.rows[0] : res.rows; //returns events
            callback(null, result);
        }
    };
    if (upcoming) {
        dbUtils.makeQueryWithParams(pool, query, [time, date], callback, queryCb);
    } else {
        dbUtils.makeQuery(pool, query, callback, queryCb);
    }
}

//TODO: should we add logic to roll over other events' startTimes if it changes?
function updateEvent (eventID, event, callback) {
    logCtx.fn = 'updateEvent';
    var query = "update iap_events set adminid=$1, starttime=$2, duration=$3, title=$4, projectid=$5, e_date=$6 where eventid = $7";
    var values = [event.adminid, event.starttime, event.duration, event.title, event.projectid, event.e_date, eventID];
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = res.rows; //returns []
            callback(null, result);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

//TODO: test w/ DB
function deleteEvent (eventID, callback) {
    logCtx.fn = 'deleteEvent';
    var query = "update iap_events set isdeleted=true where eventid = $1"; 
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
    return pool.end();
}

module.exports = {
    registerUser: registerUser,
    createEvents: createEvents,
    getEvents: getEvents,
    updateEvent: updateEvent,
    deleteEvent: deleteEvent,
    endPool: endPool
}