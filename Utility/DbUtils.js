/**
 * Utility file containing helper functions aiding database and request operations.
 */

const { log } = require('./Logger.js');
const iapDB = require('../Database/iapProxy.js');
const showroomDB = require('../Database/showroomProxy.js');

let logCtx = {
    fileName: 'DbUtils',
    fn: ''
}

function successResponse (res, status, msg, payload) {
    logCtx.fn = 'Response'
    var data = { message: msg }
    if (payload) data.payload = payload;
    log(msg + ' status: ' + status, logCtx);
    res.status(status).send(data);
}

function errorResponse (res, status, msg) {
    successResponse(res, status, 'Error: ' + msg);
}

function makeQuery(pool, query, callback, queryCb) {
    logCtx.fn = 'makeQuery';
    pool.connect((error, client, release) => {
        if (error) {
            //Could not acquire client
            logError(error, logCtx);
            callback(error, null);
        } else {
            client.query(query, (error, result) => {
                release(error);
                queryCb(error, result);
            });
        }
    });
}

function makeQueryWithParams(pool, query, values, callback, queryCb) {
    logCtx.fn = 'makeQueryWithParams';
    pool.connect((error, client, release) => {
        if (error) {
            //Could not acquire client
            logError(error, logCtx);
            callback(error, null);
        } else {
            client.query(query, values, (error, result) => {
                release(error); //Release client back to pool
                queryCb(error, result);
            });
        }
    });
}

function closeDbConnections() {
    logCtx.fn = 'closeDbConnections';
    log("Closing connection with IAP DB.", logCtx);
    iapDB.endPool(); //TODO: for some reason this isn't recognized as a function??
    log("Closing connection with Showroom DB.", logCtx);
    showroomDB.endPool();
}

module.exports = {
    successResponse: successResponse,
    errorResponse: errorResponse,
    makeQuery: makeQuery,
    makeQueryWithParams: makeQueryWithParams,
    closeDbConnections: closeDbConnections
}