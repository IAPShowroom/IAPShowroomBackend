/**
 * File to organize handler functions for the Showroom endpoints.
 */

const iapDB = require('../Database/iapProxy.js');
const showroomDB = require('../Database/showroomProxy.js');
const { logError, log } = require('../Utility/Logger.js');
const { successResponse, errorResponse, serverSideResponse } = require('../Utility/DbUtils.js');
const validator = require('../Utility/SchemaValidator.js');
const async = require('async');

let sse_clients = [];

const sse_header = {
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
};

let logCtx = {
    fileName: 'ShowroomHandlers',
    fn: ''
}

function getStats (req, res, next) {

}

function getRoomStatus (req, res, next) {
    
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
            showroomDB.getEvents(upcoming, time, date, (error, result) => {
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

function getProjects (req, res, next) {
    logCtx.fn = "getProjects";
    var session_id = req.query.session_id;
    iapDB.fetchProjects(session_id, (error, result) => {
        if (error) {
            logError(error, logCtx);
            errorResponse(res, 500, error.toString());
        }
        log("Response data: " + JSON.stringify(result), logCtx);
        successResponse(res, 200, "Successfully retrieved projects", result);
    });
}

function getServerSideUpcomingEvents(req, res, next){
    logCtx.fn = "getServerSideUpcomingEvents";
    console.log('Client connected');

    const upcoming = true;
    var errorStatus, errorMsg;

    res.writeHead(200, sse_header);

    async.waterfall([
        
    //  Currently this is only meant to serve the get Current and Upcoming events component in the frontend
    
    function (callback) {
        //Validate request payload
        validator.validateServerSideEvent(req, (error) => {
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

        const date_obj = new Date();
        const day = date_obj.toLocaleDateString('en-US');
        const time = date_obj.toLocaleTimeString('en-US');

        showroomDB.getEvents(upcoming, time, day, (error, result) => {
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
        serverSideResponse("upcomingevents",res, 200, "Successfully sent server side event.", result && result.length > 0 ? result : null);
    }, 
    );
                
                
    

}

function getServerSideProgressBar(req, res, next){
    logCtx.fn = "getServerSideProgressBar";
    console.log('Client connected');

    const upcoming = true;
    var errorStatus, errorMsg;

    res.writeHead(200, sse_header);

    async.waterfall([
        
    //  this function is meant to serve the updates from the events to the frontend
    
    function (callback) {
        //Validate request payload
        validator.validateServerSideEvent(req, (error) => {
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

        const date_obj = new Date();
        const day = date_obj.toLocaleDateString('en-US');
        const time = date_obj.toLocaleTimeString('en-US');

        showroomDB.getEvents(upcoming, time, day, (error, result) => {
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
        serverSideResponse("progress", res, 200, "Successfully sent server side event.", result && result.length > 0 ? result : null);
    }, 
    );
}

module.exports = {
    getProjects: getProjects,
    getStats: getRoomStatus,
    getRoomStatus: getRoomStatus,
    getQnARoomInfo: getQnARoomInfo,
    postAnnouncements: postAnnouncements,
    getScheduleEvents: getScheduleEvents,
    postScheduleEvents: postScheduleEvents,
    updateScheduleEvent: updateScheduleEvent,
    deleteScheduleEvent: deleteScheduleEvent,
    getIAPSessions: getIAPSessions,
    getScheduleEventByID: getScheduleEventByID,
    getServerSideUpcomingEvents: getServerSideUpcomingEvents,
    getServerSideProgressBar: getServerSideProgressBar
}