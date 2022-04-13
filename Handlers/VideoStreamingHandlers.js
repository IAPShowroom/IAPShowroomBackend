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
const axios = require('axios').default;
const { XMLParser } = require('fast-xml-parser');
const xmlParser = new XMLParser({ ignoreAttributes: false });

//https://iapstream.ece.uprm.edu/bigbluebutton/api
var urlPrefix = "https://" + config.BBB_HOST + config.bbb_prefix;

let logCtx = {
    fileName: 'VideoStreamingHandlers',
    fn: ''
}

function createRoom (meetingName, projectID, callback) {
    logCtx.fn = "createRoom";
    async.waterfall([
        function (callback) {
            //Construct URL for BBB API call
            var queryParams = {
                name: meetingName,
                meetingID: "0" + projectID,
                moderatorPW: config.MOD_PASSWORD,
                attendeePW: config.ATTENDEE_PASSWORD
                // ,
                // isBreakout: true //For some reason BBB doesn't accept the url if it has isBreakout query param
            }
            var queryString = (new URLSearchParams(queryParams)).toString();
            var checksum = generateChecksum('create', queryString);
            var url = urlPrefix + "/create?" + queryString + "&checksum=" + checksum;
            callback(null, url);
        },
        function (url, callback) {
            //Make BBB API call
            axios.post(url).then((response) => {
                log("Successful response for BBB create call.", logCtx);
                callback(null, response);
            }).catch((error) => {
                logError(error, logCtx);
                callback(error, null);
            });
        }
    ], (error) => {
        callback(error); //Null if no error
    });
}

//Leaving endpoint exposed just in case it's useful
function joinRoom (req, res, next) {
    logCtx.fn = "joinRoom";
    var errorStatus, errorMsg, bbbRole, firstName, lastName;
    var userID = req.session.data.userID;
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
            getBBBRoleAndName(userData, req.body.meeting_id, (error, role, first_name, last_name) => {
                if (error) {
                    logError(error, logCtx);
                    callback(error, null, null, null);
                } else {
                    bbbRole = role;
                    firstName = first_name;
                    lastName = last_name;
                    callback(null);
                }
            });
        },
        function (callback) {
            //Construct URL for BBB API call
            var queryParams = {
                meetingID: req.body.meeting_id,
                fullName: firstName + " " + lastName,
                userID: userID,
                role: bbbRole,
                password: config.ATTENDEE_PASSWORD
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

function endRoom (req, res, next) {
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
                meetingID: "0" + req.body.meeting_id,
                password: config.MOD_PASSWORD
            }
            var queryString = (new URLSearchParams(queryParams)).toString();
            var checksum = generateChecksum('end', queryString);
            var url = urlPrefix + "/end?" + queryString + "&checksum=" + checksum;
            callback(null, url);
        },
        function (url, callback) {
            //Make BBB API call
            axios.post(url).then((response) => {
                log("Successful response for BBB end call.", logCtx);
                callback(null, response);
            }).catch((error) => {
                logError(error, logCtx);
                callback(error, null);
            });
        }
    ], (error, result) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 200, "Successfully ended room.", result.data.response); //send the response object only
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
    var userID = data.userID;
    var isAdmin = data.admin;
    var isPM = data.isPM;
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
            if (isAdmin) { //Auto mod if admin
                role = 'moderator';
            } else {
                if (result.projectIDs) { //List of project IDs is not null, they are advisor or student researcher
                    //Check if this is room is of one of their projects
                    result.projectIDs.forEach( id => {
                        if (id == projectID && isPM) role = 'moderator';
                    });
                }
            }
            log("Set role as " + role + " for user " + result.first_name + " " + result.last_name, logCtx);
            callback(null, role, result.first_name, result.last_name);
        }
    });
}

function getMeetingInfo (meetingID, callback) {
    logCtx.fn = "getMeetingInfo";
    async.waterfall([
        function (callback) {
            //Construct URL for BBB API call
            var queryParams = {
                meetingID: "0" + meetingID,
            }
            var queryString = (new URLSearchParams(queryParams)).toString();
            var checksum = generateChecksum('getMeetingInfo', queryString);
            var url = urlPrefix + "/getMeetingInfo?" + queryString + "&checksum=" + checksum;
            callback(null, url);
        },
        function (url, callback) {
            logCtx.fn = "getMeetingInfo";
            //Make BBB API call
            axios.post(url).then((response) => {
                log("Successful response for BBB end call.", logCtx);
                callback(null, response);
            }).catch((error) => {
                logError(error, logCtx);
                callback(error, null);
            });
        }
    ], (error, result) => {
        //Send responses
        if (error) {
            callback(error, null);
        } else {
            var jsonObj = xmlParser.parse(result.data);
            callback(null, jsonObj.response);
        }
    });
}

function isMeetingRunning (meetingID, callback) {
    logCtx.fn = "isMeetingRunning";
    async.waterfall([
        function (callback) {
            //Construct URL for BBB API call
            var queryParams = {
                meetingID: "0" + meetingID,
            }
            var queryString = (new URLSearchParams(queryParams)).toString();
            var checksum = generateChecksum('isMeetingRunning', queryString);
            var url = urlPrefix + "/isMeetingRunning?" + queryString + "&checksum=" + checksum;
            callback(null, url);
        },
        function (url, callback) {
            logCtx.fn = "isMeetingRunning";
            //Make BBB API call
            axios.post(url).then((response) => {
                log("Successful response for BBB isMeetingRunning call.", logCtx);
                callback(null, response);
            }).catch((error) => {
                logError(error, logCtx);
                callback(error, null);
            });
        }
    ], (error, result) => {
        //Send responses
        if (error) {
            callback(error, null);
        } else {
            var jsonObj = xmlParser.parse(result.data);
            callback(null, jsonObj.response.running);
        }
    });
}

module.exports = {
    createRoom: createRoom,
    joinRoom: joinRoom,
    endRoom: endRoom,
    generateChecksum: generateChecksum,
    getMeetingInfo: getMeetingInfo,
    isMeetingRunning: isMeetingRunning,
    getBBBRoleAndName: getBBBRoleAndName
}