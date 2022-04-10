/**
 * File to organize handler functions for the Showroom endpoints.
 */

const iapDB = require('../Database/iapProxy.js');
const showroomDB = require('../Database/showroomProxy.js');
const { logError, log } = require('../Utility/Logger.js');
const { successResponse, errorResponse } = require('../Utility/DbUtils.js');
const validator = require('../Utility/SchemaValidator.js');
const meetingHandler = require('../Handlers/VideoStreamingHandlers.js');
const async = require('async');

let logCtx = {
    fileName: 'ShowroomHandlers',
    fn: ''
}

function getStats (req, res, next) {

}

function getRoomStatus (req, res, next) {
    logCtx.fn = 'getRoomStatus';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateGetRoomStatus(req, (error) => { //TODO: implement and test
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Fetch events from DB
            var currentDate = new Date().toISOString().slice(0,10);
            showroomDB.getEvents(true, false, null, currentDate, (error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else if (result == undefined || result == null) {
                    errorStatus = 404;
                    errorMsg = "No events found.";
                    logError(error, logCtx);
                    callback(new Error(errorMsg), null);
                } else {
                    log("Response data: " + JSON.stringify(result), logCtx);
                    callback(null, result);
                }
            });
        },
        function (events, callback) {
            getStatusForEvents(events, (error, result) => { //TODO: implement and test
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else {
                    callback(null, result);
                }
            });
        }
    ], (error, result) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 200, "Successfully retrieved project room status.", result);
        }
    });
}

function getStatusForEvents (allEvents, mainCallback) {
    logCtx.fn = 'getStatusForEvents';
    var result = [];
    //Traverse all event objects and get status for each one
    async.forEachLimit(allEvents, MAX_ASYNC, (event, cb) => {
        var eventObj = {};
        eventObj.title = event.title;
        async.waterfall([
            function (callback) {
               //Fetch user IDs and roles from meet history table
               showroomDB.fetchUserIDsAndRoles(event.projectid, (error, result) => {
                    if (error) {
                        errorStatus = 500;
                        errorMsg = error.toString();
                        logError(error, logCtx);
                        callback(error, null);
                    } else if (result == undefined || result == null) {
                        eventObj.company_representatives = 0;
                        eventObj.general_users = 0;
                        // eventObj.student_researcher = false; //TODO will we use it? is it a boolean?
                        callback(null, );
                    } else {
                        log("Response data: " + JSON.stringify(result), logCtx);
                        callback(null, result);
                    }
                });
            },
            function (hash, callback) {
               //Call getMeetingInfo to get a list of current users in meeting
               meetingHandler.getMeetingInfo("0" + event.projectid, (error, response) => {
                   var attendees = response.attendees
                // response.attendees <-- obj
// response.attendees.attendee <-- array of obj
// event in array: userID
               });
            },
            function (userID, callback) {
               //Filter users list and finish writing to eventObj
            }
        ], (error) => {
            //Add eventObj to result
            result.push(eventObj);
            cb(error); //Null if no error
        });
    }, (error) => {
        if (error) {
            mainCallback(error, null);
        } else {
            mainCallback(null, result);
        }
    });
}

function getQnARoomInfo (req, res, next) {
    
}

function getIAPSessions (req, res, next) {
    logCtx.fn = "getIAPSessions";
    iapDB.getSessions( (error, result) => {
        if (error) {
            logError(error, logCtx);
            errorResponse(res, 500, error.toString());
        }
        log("Response data: " + JSON.stringify(result), logCtx);
        successResponse(res, 200, "Successfully retrieved sessions", result);
    });
}

function postAnnouncements (req, res, next) {
    
}

function getScheduleEvents (req, res, next) {
    logCtx.fn = 'getScheduleEvents';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateGetEvents(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Fetch events from DB
            var upcoming = req.query.upcoming == 'true';
            var time, date;
            if (upcoming) {
                time = req.query.time;
                date = req.query.date;
            }
            showroomDB.getEvents(false, upcoming, time, date, (error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else if (result == undefined || result == null) {
                    errorStatus = 404;
                    errorMsg = "No events found.";
                    logError(error, logCtx);
                    callback(new Error(errorMsg), null);
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
            successResponse(res, 200, "Successfully retrieved events.", result);
        }
    });
}

function getScheduleEventByID (req, res, nect) {
    logCtx.fn = 'getScheduleEventByID';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateGetEventByID(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Fetch event from DB
            var eventID = req.params.eventID;
            showroomDB.getEventByID(eventID, (error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else if (result == undefined || result == null) {
                    errorStatus = 404;
                    errorMsg = "No event found.";
                    logError(error, logCtx);
                    callback(new Error(errorMsg), null);
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
            successResponse(res, 200, "Successfully retrieved event.", result);
        }
    });
}

function postScheduleEvents (req, res, next) {
    logCtx.fn = 'postScheduleEvents';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateEventList(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Persist event list to DB
            var eventList = req.body;
            showroomDB.createEvents(eventList, (error, result) => {
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
            successResponse(res, 201, "Successfully created events.", result && result.length > 0 ? result : null);
        }
    });
}

function updateScheduleEvent (req, res, next) {
    logCtx.fn = 'updateScheduleEvent';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateUpdateEvent(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Persist updated event to DB
            var event = req.body; //JSON object of event to be updated
            var eventID = req.params.eventID;
            showroomDB.updateEvent(eventID, event, (error, result) => {
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
            successResponse(res, 201, "Successfully updated event.", result && result.length > 0 ? result : null);
        }
    });
}

function deleteScheduleEvent (req, res, next) {
    logCtx.fn = 'deleteScheduleEvent';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateDeleteEvent(req, (error) => {
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
            var eventID = req.params.eventID;
            showroomDB.deleteEvent(eventID, (error, result) => {
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
            successResponse(res, 200, "Successfully deleted event.", result && result.length > 0 ? result : null);
        }
    });
}

function getProjects (req, res, next) { //TODO: finish
    logCtx.fn = "getProjects";
    var sessionID, errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateGetIAPProjects(req, (error) => { //TODO: implement
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Fetch projects from IAP
            sessionID = req.query.session_id;
            showroomDB.fetchProjects(sessionID, (error, iapProjects) => { //result is array of objs with project info
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else {
                    log("Response data: " + JSON.stringify(iapProjects), logCtx);
                    callback(null, iapProjects);
                }
            });
        }
    ], (error, result) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 200, "Successfully retrieved projects.", result && result.length > 0 ? result : null);
        }
    });
}

module.exports = {
    getProjects: getProjects,
    getStats: getStats,
    getRoomStatus: getRoomStatus,
    getQnARoomInfo: getQnARoomInfo,
    postAnnouncements: postAnnouncements,
    getScheduleEvents: getScheduleEvents,
    postScheduleEvents: postScheduleEvents,
    updateScheduleEvent: updateScheduleEvent,
    deleteScheduleEvent: deleteScheduleEvent,
    getIAPSessions: getIAPSessions,
    getScheduleEventByID: getScheduleEventByID
}