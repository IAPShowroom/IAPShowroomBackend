/**
 * Utility file containing helper functions aiding database and request operations.
 */

const { log } = require('./Logger.js');

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

module.exports = {
    successResponse: successResponse,
    errorResponse: errorResponse
}