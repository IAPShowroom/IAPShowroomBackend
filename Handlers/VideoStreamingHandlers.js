/**
 * File to organize handler functions for the Video Streaming endpoints.
 */

const logger = require('../Utility/Logger.js');

const logCtx = {
    fileName: 'VideoStreamingHandlers',
    fn: ''
}

function createRoom (req, res, next) {
    const logFn = "createRoom";
}

function joinRoom (req, res, next) {
    const logFn = "joinRoom";
}

function endRoom (req, res, next) {
    const logFn = "endRoom";
}


module.exports = {
    createRoom: createRoom,
    joinRoom: joinRoom,
    endRoom: endRoom
}