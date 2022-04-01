/**
 * Utility file containing helper functions to make BBB API calls.
 */

const { log, logError } = require('./Logger.js');

let logCtx = {
    fileName: 'BBButils',
    fn: ''
}

function makeBBBAPIcall(pathSuffix, checksum, params, callback) {
    //Use axios to make HTTP requests to BBB?
}

module.exports = {
    makeBBBAPIcall: makeBBBAPIcall
}