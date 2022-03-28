/**
 * File to organize handler functions for the Video Streaming endpoints.
 */

const { logError, log } = require('../Utility/Logger.js');

let logCtx = {
    fileName: 'VideoStreamingHandlers',
    fn: ''
}

function createRoom (req, res, next) {
    logCtx.fn = "createRoom";
}

function joinRoom (req, res, next) {
    logCtx.fn = "joinRoom";
}

function endRoom (req, res, next) {
    logCtx.fn = "endRoom";
}


module.exports = {
    createRoom: createRoom,
    joinRoom: joinRoom,
    endRoom: endRoom
}