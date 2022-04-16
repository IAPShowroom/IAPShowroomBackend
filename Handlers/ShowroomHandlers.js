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
const config = require('../Config/config.js');

const MAX_ASYNC = 1;

let logCtx = {
    fileName: 'ShowroomHandlers',
    fn: ''
}

function getStats (req, res, next) {

}

function getRoomStatus (req, res, next) { //TODO: test with pid instead of eid
    logCtx.fn = 'getRoomStatus';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateGetRoomStatus(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //If no date query parameter, default to today's date
            var currentDate = req.query && req.query.date ? req.query.date : new Date().toISOString().slice(0,10);
            //Fetch events from DB
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
            getStatusForEvents(events, (error, result) => {
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

function getStatusForEvents (allEvents, mainCallback) { //TODO: test with pid instead of eid
    logCtx.fn = 'getStatusForEvents';
    var result = []; //Final result array sent for response
    var userList;
    //Traverse all event objects and get status for each one
    async.forEachLimit(allEvents, MAX_ASYNC, (event, cb) => {
        //Object that gets added to final result array for response
        var eventObj = {company_representatives: 0, general_users: 0, student_researcher: false};
        eventObj.title = event.title;
        var skip = false;
        async.waterfall([
            function (callback) {
               //Fetch user IDs and roles from meet history table
               showroomDB.fetchUserIDsAndRoles(event.projectid, (error, result) => {
                    if (error) {
                        errorStatus = 500;
                        errorMsg = error.toString();
                        logError(error, logCtx);
                    } else if (result == undefined || result == null || result.length == 0) { //No records for this project in meet history
                        skip = true; //Skip all further requests since no one has joined room
                    } else {
                        log("Response data: " + JSON.stringify(result), logCtx);
                        userList = result; //Array [{userid: #, user_role: 'abc'}, {userid: #, user_role: 'abc'}]
                    }
                    callback(error); //Null if no error 
                });
            },
            function (callback) {
                if (!skip){
                    //Call getMeetingInfo to get a list of current users in the meeting
                    meetingHandler.getMeetingInfo(event.projectid, (error, response) => { // response.attendees <-- obj // response.attendees.attendee <-- array of obj // event in array: userID
                        if (error) {
                            logError(error, logCtx);
                            callback(error, null);
                        } else {
                            if (response != undefined) {
                                //Array of attendee json objects
                                var attendeeObjs = Array.isArray(response.attendees.attendee) ? response.attendees.attendee : [response.attendees.attendee]; 
                                let attendeeUserIDs = [];
                                //Only add user if they are participating in some way
                                attendeeObjs.forEach((obj) => {
                                    if (obj.isListeningOnly == true || obj.hasJoinedVoice == true || obj.hasVideo == true){
                                        attendeeUserIDs.push(obj.userID);
                                    }
                                });
                                //Place into a Set for faster look up: O(1)
                                var attendeeUserIDSet = new Set(attendeeUserIDs);
                                callback(null, attendeeUserIDSet); //Set with user IDs of current participants in the room
                            } else {
                                //A meeting with that ID does not exist
                                log("A meeting with that ID does not exist.", logCtx);
                                skip = true;
                                callback(null, null);
                            }
                        }
                    });
                } else {
                    callback(null, null); //Skip, room is empty
                }
            },
            function (attendeeUserIDs, callback) {
                if (!skip) {
                    //Filter users list with list from BBB and finish writing participant counts to eventObj
                    async.forEachLimit(userList, MAX_ASYNC, (user, cb) => {
                        if (attendeeUserIDs.has(user.userid)) {
                            if (user.user_role == config.userRoles.companyRep) {
                                eventObj.company_representatives++; // Update Company Rep count
                                cb(null); //Go to next user
                            } else if (user.user_role == config.userRoles.studentResearcher) {
                                //Check if they are student researchers for current project
                                showroomDB.getStudentProject(user.userid, event.projectid, (error, isValidProject) => {
                                    if (error) {
                                        logError(error, logCtx);
                                    } else {
                                        eventObj.student_researcher = eventObj.student_researcher == true ? true : isValidProject ? true : false;
                                        //A student_researcher from another project has joined
                                        if (isValidProject == false) eventObj.general_users++; 
                                    }
                                    cb(error); //Null if no error, go to next user
                                });
                            } else { //It's a general user
                                eventObj.general_users++; //Update General Users count
                                cb(null); //Go to next user
                            }
                        } else {
                            cb(null); //Skip this user, they're not currently in the BBB room
                        }
                    }, (error) => {
                        //This is executed whenever there is an error in the forEachLimit or when it has iterated over all users
                        callback(error); //Null if no error
                    });
                } else {
                    callback(null); //Skip, room is empty
                }
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
    logCtx.fn = 'getQnARoomInfo';
    var finalResult = {};
    var errorStatus, errorMsg, bbbRole, firstName, lastName, meetingName, projectID;
    var userID = req.session.data["userID"];
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateQNARoomInfo(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Fetch title, abstract, and users associated with project (Student Researchers and Advisors in the participates table)
            projectID = req.body.meeting_id;
            showroomDB.getQnARoomInfo(projectID, (error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error);
                } else if (result == undefined || result == null) {
                    errorStatus = 404;
                    errorMsg = "No records found.";
                    logError(errorMsg, logCtx);
                    callback(new Error(errorMsg));
                } else {
                    log("Response data: " + JSON.stringify(result), logCtx);
                    finalResult.project_members = result; //Add list of participating users to the final result
                    meetingName = result[0].iapproject_title; //Save meeting name for create room call
                    callback(null);
                }
            });
        },
        function (callback) {
            //Get name and role for BBB room
            var userData = req.session.data;
            meetingHandler.getBBBRoleAndName(userData, req.body.meeting_id, (error, role, first_name, last_name) => {
                if (error) {
                    logError(error, logCtx);
                } else {
                    bbbRole = role;
                    firstName = first_name;
                    lastName = last_name;
                }
                callback(error); //Null if no error
            });
        },
        function (callback) {
            //Check role
            switch (bbbRole) {
                case "moderator":
                    //Create room before joining if they are moderators
                    meetingHandler.createRoom(meetingName, projectID, callback);
                    break;
                case "viewer":
                    //Check if the meeting is running, fail the call if it's not
                    meetingHandler.isMeetingRunning(projectID, (error, isRunning) => {
                        if (error) {
                            logError(error, logCtx);
                            callback(error);
                        } else {
                            if (!isRunning) {
                                errorStatus = 500;
                                errorMsg = "Meeting is not running.";
                                logError(errorMsg, logCtx);
                                callback(new Error(errorMsg));
                            } else {
                                callback(null); //All good, meeting is running, proceed
                            }
                        }
                    });
                    break;
            }
        },
        // function (callback) {
        //     //Record join history
        //     showroomDB.postMeetHistory(userID, projectID, (error, result) => { //TODO: check projectID vs eventID
        //         if (error) {
        //             errorStatus = 500;
        //             errorMsg = error.toString();
        //             logError(error, logCtx);
        //             callback(error, null);
        //         } else {
        //             log("Response data: " + JSON.stringify(result), logCtx);
        //             callback(null);
        //         }
        //     });
        // },
        function (callback) {
            //Construct URL for BBB API call
            var queryParams = {
                meetingID: "0" + req.body.meeting_id,
                fullName: firstName + " " + lastName,
                userID: userID,
                role: bbbRole
            }
            //Choose password property based on BBB role
            switch (bbbRole) {
                case 'moderator':
                    // queryParams.moderatorPW = config.MOD_PASSWORD;
                    queryParams.password = config.MOD_PASSWORD;
                    break;
                case 'viewer':                    
                    queryParams.password = config.ATTENDEE_PASSWORD;
                    break;
            }
            var queryString = (new URLSearchParams(queryParams)).toString();
            var checksum = meetingHandler.generateChecksum('join', queryString);
            var url = config.bbbUrlPrefix + "/join?" + queryString + "&checksum=" + checksum;
            finalResult.join_url = url;
            callback(null);
        }
    ], (error) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 200, "Successfully retrieved room information and produced join URL.", finalResult);
        }
    });
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