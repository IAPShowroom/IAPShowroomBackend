/**
 * File to organize handler functions for the Video Streaming endpoints.
 */

const { logError, log } = require('../Utility/Logger.js');
const config = require('../Config/config.js');
const async = require('async');
const showroomDB = require('../Database/showroomProxy.js');
const BBBUtils = require('../Utility/BBBUtils.js');
const { XMLParser } = require('fast-xml-parser');

const xmlParser = new XMLParser();

let logCtx = {
    fileName: 'VideoStreamingHandlers',
    fn: ''
}

function createRoom (req, res, next) {
    logCtx.fn = "createRoom";
    //Generate checksum
    //Generate meeting ID
    //BBB API call
}

function joinRoom (req, res, next) {
    logCtx.fn = "joinRoom";
    //Generate checksum
    //Get name and role for BBB room (TODO: need to get project id from endpoint input as well)
    getBBBRoleAndName();
    //BBB API call
    //Post to meet history
}

function endRoom (req, res, next) {
    logCtx.fn = "endRoom";
    var moderatorPW = config.MOD_PASSWORD;
    //Generate checksum
    //BBB API call
}

function generateChecksum () {
    logCtx.fn = "generateChecksum";
}

function generateMeetingID () {
    logCtx.fn = "generateMeetingID";
}

function getBBBRoleAndName(userID, projectID, callback) {
    logCtx.fn = "getBBBRole";
    var role = 'viewer';
    var firstName, lastName;
    //Check req.session.data["admin"] -> set role = 'moderator'
    //Check if user id has student researcher role and is associated with given project id through 'participates' table --> return 'moderator'
    callback(role, firstName, lastName);
}


module.exports = {
    createRoom: createRoom,
    joinRoom: joinRoom,
    endRoom: endRoom
}