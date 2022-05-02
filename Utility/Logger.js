/**
 * File for logging utility functions.
 */

const config = require('../Config/config.js');
const winston = require('winston');

const winstonLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        //Store logs in 'log.txt'
        new winston.transports.File({ filename: 'logs.txt' }),
        new winston.transports.Console({ format: winston.format.simple() })
    ],
});

//Using the console.log version affects performance
function logAllDefault (logLevel, message, logCtx) {
    console.log(logLevel + logCtx.fileName + ':' + (logCtx.fn != '' ? logCtx.fn + ': ' : ' ' ) + message);
}

function logAll (logLevel, message, logCtx) {
    var today = new Date();
    today.setTime(today.getTime() - 14400000); //Subtract 4 hours (in ms) to account for UTC timezone [needed for production server in ECE]
    var timestamp = today.toISOString();
    winstonLogger.info(logLevel + logCtx.fileName + ':' + (logCtx.fn != '' ? logCtx.fn + ': ' : ' ' ) + message + ' timestamp: ' + timestamp);
}

function logAllError (logLevel, message, logCtx) {
    var today = new Date();
    today.setTime(today.getTime() - 14400000); //Subtract 4 hours (in ms) to account for UTC timezone [needed for production server in ECE]
    var timestamp = today.toISOString();
    winstonLogger.error(logLevel + logCtx.fileName + ':' + (logCtx.fn != '' ? logCtx.fn + ': ' : ' ' ) + message + ' timestamp: ' + timestamp);
}

function log (message, logCtx) {
    logAll(':', message, logCtx);
}

function logDebug (message, logCtx) {
    if (config.logDebug) logAll('DEBUG:', message, logCtx);
}

function logError (message, logCtx) {
    logAllError('ERROR:', message, logCtx);
}

function logTest (message, logCtx) {
    logAll('TEST:', message, logCtx);
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
    logTest: logTest, 
    log: log
}