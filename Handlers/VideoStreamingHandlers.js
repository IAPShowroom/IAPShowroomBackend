/**
 * File to organize handler functions for the Video Streaming endpoints.
 */

const { logError, log } = require('../Utility/Logger.js');
const config = require('../Config/config.js');
const validator = require('../Utility/SchemaValidator.js');
const { successResponse, errorResponse } = require('../Utility/DbUtils.js');
const async = require('async');
const crypto = require('crypto');
const showroomDB = require('../Database/showroomProxy.js');
const BBBUtils = require('../Utility/BBBUtils.js');
// const { XMLParser } = require('fast-xml-parser');
// const xmlParser = new XMLParser();

//https://iapstream.ece.uprm.edu/bigbluebutton/api
var urlPrefix = "https://" + config.BBB_HOST + config.bbb_prefix;

let logCtx = {
    fileName: 'VideoStreamingHandlers',
    fn: ''
}

function createRoom (req, res, next) { //TODO: test produced url w/ BBB
    logCtx.fn = "createRoom";

    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateCreateRoom(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Construct URL for BBB API call
            
            // var isBreakout = "true"; //TODO: review - if this changes maybe it can be received as a query param
            // var muteOnStart = "true"; //TODO: review - do we want to mute everyone as they come in?
            // var meetingKeepEvents = "true"; //TODO: review -  if we want to use BBB logs
            
            var queryParams = {
                name: req.body.meeting_name,
                meetingID: req.body.projectid,
                moderatorPW: config.MOD_PASSWORD
            }
            var queryString = (new URLSearchParams(queryParams)).toString();
            var checksum = generateChecksum('create', queryString);
            var url = urlPrefix + "/create?" + queryString + "&checksum=" + checksum;
            callback(null, { url: url });
        }
    ], (error, result) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 200, "Successfully constructed URL.", result);
        }
    });
}

function joinRoom (req, res, next) { //TODO: test produced url w/ BBB
    //TODO: Add waterfall cb to post to meet history (?) not if we just return the URL and use another endpoint for meet history
    logCtx.fn = "joinRoom";
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateJoinRoom(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Get name and role for BBB room
            var userData = req.session.data;
            getBBBRoleAndName(userData, req.body.meeting_id, (error, role, firstName, lastName) => {
                if (error) {
                    logError(error, logCtx);
                    callback(error, null, null, null);
                } else {
                    callback(null, role, firstName, lastName);
                }
            });
        },
        function (bbbRole, firstName, lastName, callback) {
            //Construct URL for BBB API call
            var queryParams = {
                meetingID: req.body.meeting_id,
                fullName: firstName + " " + lastName,
                role: bbbRole
            }
            var queryString = (new URLSearchParams(queryParams)).toString();
            var checksum = generateChecksum('join', queryString);
            var url = urlPrefix + "/join?" + queryString + "&checksum=" + checksum;
            callback(null, { url: url });
        }
    ], (error, result) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 200, "Successfully constructed URL.", result);
        }
    });
}

function endRoom (req, res, next) { //TODO: test produced url w/ BBB
    logCtx.fn = "endRoom";
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateEndRoom(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Construct URL for BBB API call
            var queryParams = {
                meetingID: req.body.meeting_id,
                password: config.MOD_PASSWORD
            }
            var queryString = (new URLSearchParams(queryParams)).toString();
            var checksum = generateChecksum('end', queryString);
            var url = urlPrefix + "/end?" + queryString + "&checksum=" + checksum;
            callback(null, { url: url });
        }
    ], (error, result) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 200, "Successfully constructed URL.", result);
        }
    });
}

function postMeetHistory (req, res, next) { //TODO: test with new db updates
    logCtx.fn = 'postMeetHistory';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validatePostMeetHistory(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Take DB action
            var meetingID = req.body.meeting_id;
            var userID = req.session.data["userID"];
            showroomDB.postMeetHistory(userID, meetingID, (error, result) => { //TODO test w/ db updates
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else {
                    log("Response data: " + JSON.stringify(result), logCtx);
                    callback(null, result);
                }
            });
        }
    ], (error, result) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 200, "Successfully recorded meeting history.", result && result.length > 0 ? result : null);
        }
    });
}

function generateChecksum (callName, queryString) {
    logCtx.fn = "generateChecksum";
    var string = callName + queryString + config.BBB_SECRET;
    var checksum = crypto.createHash('sha1').update(string).digest('hex');
    return checksum;
}

function getBBBRoleAndName(data, projectID, callback) {
    logCtx.fn = "getBBBRoleAndName";
    var role = 'viewer';
    var firstName, lastName;
    var userID = data.userID;
    var isAdmin = data.admin;
    showroomDB.getRoleAndName(userID, (error, result) => {
        if (error) {
            errorStatus = 500;
            errorMsg = error.toString();
            logError(error, logCtx);
            callback(error, null, null, null);
        } else if (result == undefined || result == null) {
            errorStatus = 404;
            errorMsg = "No users found.";
            logError(error, logCtx);
            callback(new Error(errorMsg), null, null, null);
        } else {
            log("Response data: " + JSON.stringify(result), logCtx);
            //Check if role should be moderator
            if (isAdmin) { //Auto mod if admin //TODO: confirm with team
                role = 'moderator';
            } else {
                if (result.projectIDs) { //List of project IDs is not null, they are advisor or student researcher
                    //Check if this is room is of one of their projects
                    result.projectIDs.forEach( id => {
                        if (id == projectID) role = 'moderator';
                    });
                }
            }
            log("Set role as " + role + " for user " + result.first_name + " " + result.last_name, logCtx);
            callback(null, role, result.first_name, result.last_name);
        }
    });
}


module.exports = {
    createRoom: createRoom,
    joinRoom: joinRoom,
    endRoom: endRoom,
    postMeetHistory: postMeetHistory,
    generateChecksum: generateChecksum,
    postMeetHistory: postMeetHistory
}