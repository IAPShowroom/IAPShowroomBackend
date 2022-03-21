/**
 * File for logging utility functions.
 */

let logContext;

function log(logLevel, message, fn) {
    console.log(logLevel + logContext + ':' + (fn ? fn + ': ' : ' ' ) + message);
}

function logDebug (message) {
    log('DEBUG:', message, fn);
}

function logError (message, fn) {
    log('ERROR:', message, fn);
}

module.exports = (context) => {
    logContext = context;

    return {
        logDebug: logDebug,
        logError: logError
    }
}