/**
 * Utility file containing helper functions aiding database and request operations.
 */

const { log, logError } = require('./Logger.js');
const path = require('path');

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

function sendHTMLResponse (res, htmlFile) {
    logCtx.fn = 'sendHTMLResponse';
    log("Sending HTML file: " + htmlFile, logCtx);
    res.sendFile(path.join(__dirname, "../Public/" + htmlFile));
}

function serverSideResponse (callerEvent, res, status, msg, payload) {
    logCtx.fn = "serverSideResponse"
    var data = { message: msg }
    if (payload) data.payload = payload;
    log(msg + ' status: ' + status, logCtx);
    log(JSON.stringify(data.payload),logCtx);
    res.write(`event: ${callerEvent}\ndata: ${JSON.stringify(data.payload)}\n\n`);
}

function errorResponse (res, status, msg) {
    // successResponse(res, status, 'Error: ' + msg); //Remove 'Error' injection
    successResponse(res, status, msg);
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

module.exports = {
    successResponse: successResponse,
    errorResponse: errorResponse,
    makeQuery: makeQuery,
    makeQueryWithParams: makeQueryWithParams,
    sendHTMLResponse: sendHTMLResponse 
}