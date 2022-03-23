/**
 * File for logging utility functions.
 */

const config = require('../Config/config.js');

function logAll (logLevel, message, logCtx) {
    console.log(logLevel + logCtx.fileName + ':' + (logCtx.fn != '' ? logCtx.fn + ': ' : ' ' ) + message);
}

function log (message, logCtx) {
    logAll(':', message, logCtx);
}

function logDebug (message, logCtx) {
    if (config.logDebug) logAll('DEBUG:', message, logCtx);
}

function logError (message, logCtx) {
    logAll('ERROR:', message, logCtx);
}

function logRequest (req, res, next) {
    logCtx = { fileName: 'app', fn: '' };
    log("Received " + req.method + " " + req.path + " request", logCtx);
    next();
}

module.exports = {
    logDebug: logDebug,
    logError: logError,
    logRequest: logRequest,
    log: log
}