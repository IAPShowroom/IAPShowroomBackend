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
const WSS = require('../WebSocketServer.js');

const MAX_ASYNC = 1;

let logCtx = {
    fileName: 'ShowroomHandlers',
    fn: ''
}

function getStats (req, res, next) {
    logCtx.fn = 'getStats';
    var errorStatus, errorMsg;
    var finalResult = {
        maxParticipants: 0, generalParticipants: 0, researchStudParticipants: 0, 
        companyRepParticipants: 0, professorParticipants: 0, totalWomen: 0, 
        totalMen: 0, totalNotDisclosed: 0, resStudICOM: 0, 
        resStudINEL: 0, resStudINSO: 0, resStudCIIC: 0, 
        resStudINME: 0, resStudOther: 0, resStudGRAD: 0, 
        totalResStudWomen: 0, totalResStudMen: 0, totalResStudNotDisclosed: 0
    };
    async.waterfall([
        function (callback) {
            //Fetch stats from DB
            showroomDB.getLiveStats((error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else if (result == undefined || result == null) {
                    errorStatus = 404;
                    errorMsg = "No users found.";
                    logError(error, logCtx);
                    callback(new Error(errorMsg), null);
                } else {
                    log("Response data: " + JSON.stringify(result), logCtx);
                    callback(null, result);
                }
            });
        },
        function (liveResults, callback) {
            //Fetch records from in-person users table
            showroomDB.getInPersonStats((error, inPersonResults) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null, null);
                } else if (inPersonResults == undefined || inPersonResults == null) {
                    log("No in-person users found.", logCtx);
                    callback(null, liveResults, null);
                } else {
                    log("Response data: " + JSON.stringify(inPersonResults), logCtx);
                    callback(null, liveResults, inPersonResults);
                }
            });
        },
        function (liveResults, inPersonResults, callback) {
            var uniqueUserIDs = new Set();
            var date = req.query.date;
            var today = new Date();
            today.setTime(today.getTime() - config.DATE_TIMEZONE_OFFSET); //Subtract 4 hours (in ms) to account for UTC timezone [needed for production server in ECE]
            var currentDate = today.toISOString().slice(0,10);
            //Filter live conference records to derive statistics
            if(date !== undefined) currentDate = date;
            // console.log('LIVE STATS FOR DATE',currentDate);
            liveResults.forEach((obj) => {
                //Get date of meethistory record to compare with current date
                var joinDate = new Date(obj.jointime)
                correctedJoinDate = joinDate.toISOString().slice(0,10);
                //Only count unique userID entries
                if (!uniqueUserIDs.has(obj.userid) && currentDate === correctedJoinDate) {
                    filterStats(finalResult, obj);
                    uniqueUserIDs.add(obj.userid);
                }
            });
            //Filter in person records to derive statistics
            
            if (inPersonResults != null) {
                inPersonResults.forEach((obj) => {
                    let d = obj.live_date.toISOString().slice(0,10);
                    if(currentDate === d) filterStats(finalResult, obj);
                });
            }
            callback(null); 
        },
    ], (error) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 200, "Successfully retrieved statistics.", finalResult);
        }
    });
}

function filterStats (finalResult, obj) { //TODO: finish testing and get it working correctly
    var count = parseInt(obj.count, 10)
    //Count based on user role
    if (obj.user_role === config.userRoles.studentResearcher) {
        //Count student researcher
        finalResult.researchStudParticipants += count;
        //Count student researchers by department
        switch (obj.department) {
            case config.departments.ICOM:
                finalResult.resStudICOM += count;
                break;
            case config.departments.INEL:
                finalResult.resStudINEL += count;
                break;
            case config.departments.INSO:
                finalResult.resStudINSO += count;
                break;
            case config.departments.INME:
                finalResult.resStudINME += count;
                break;
            case config.departments.CIIC:
                finalResult.resStudCIIC += count;
                break;
            case config.departments.other:
                finalResult.resStudOther += count;
                break;
        }
        //Take into consideration the major (department) of in-person students
        if (obj.major != undefined) {
            switch (obj.major) {
                case config.departments.ICOM:
                    finalResult.resStudICOM += count;
                    break;
                case config.departments.INEL:
                    finalResult.resStudINEL += count;
                    break;
                case config.departments.INSO:
                    finalResult.resStudINSO += count;
                    break;
                case config.departments.INME:
                    finalResult.resStudINME += count;
                    break;
                case config.departments.CIIC:
                    finalResult.resStudCIIC += count;
                    break;
                case config.departments.other:
                    finalResult.resStudOther += count;
                    break;
            }
        }
        //Count student researchers by gender
        switch (obj.gender) {
            case config.userGenders.male:
                finalResult.totalResStudMen += count;
                break;
            case config.userGenders.female:
                finalResult.totalResStudWomen += count;
                break;
            case config.userGenders.other:
                finalResult.totalResStudNotDisclosed += count;
                break;
        }
        //Count student researchers soon to graduate
        if (new Date(obj.grad_date).getFullYear() == new Date(Date.now()).getFullYear()) {
            finalResult.resStudGRAD += count;
        }
    } else if (obj.user_role == config.userRoles.advisor) {
        finalResult.professorParticipants += count;
    } else if (obj.user_role == config.userRoles.companyRep) {
        finalResult.companyRepParticipants += count;
    } else {
        //Didn't match any of the other roles, count it as a general user
        finalResult.generalParticipants += count;
    }
    //Do counts general to every user
    finalResult.maxParticipants += count;
    switch (obj.gender) {
        case config.userGenders.male:
            finalResult.totalMen += count;
            break;
        case config.userGenders.female:
            finalResult.totalWomen += count;
            break;
        case config.userGenders.other:
            finalResult.totalNotDisclosed += count;
            break;
    }
}

function getRoomStatus (req, res, next) {
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
            showroomDB.getEvents(false, true, false, null, currentDate, (error, result) => {
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

function getStatusForEvents (allEvents, mainCallback) {
    logCtx.fn = 'getStatusForEvents';
    var result = []; //Final result array sent for response
    var userList;
    //Traverse all event objects and get status for each one
    async.forEachLimit(allEvents, MAX_ASYNC, (event, cb) => {
        //Object that gets added to final result array for response
        var eventObj = {company_representatives: 0, general_users: 0, student_researcher: false};
        eventObj.title = event.title;
        eventObj.project_id = event.projectid;
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
                                    if (obj != undefined) { //Let's prevent "can't read from undefined" errors
                                        if ((obj.isListeningOnly && obj.isListeningOnly == true )|| (obj.hasJoinedVoice && obj.hasJoinedVoice == true) || (obj.hasVideo && obj.hasVideo == true)){
                                            attendeeUserIDs.push(obj.userID);
                                        }
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
    var errorStatus, errorMsg, bbbRole, firstName, lastName, meetingName, projectID, performBBBOps;
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
            projectID = req.query.meeting_id;
            performBBBOps = req.query.bbb; //Indicate whether or not to only bring room info or also do BBB operations

            //Fetch IAP's project ID based on the given project ID from Showroom's table 
            showroomDB.getIAPPIDFromShowroomPID(projectID, (error, iapPID) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else if (iapPID == undefined || iapPID == null) {
                    errorStatus = 404;
                    errorMsg = "No IAP project id found for given ID.";
                    logError(errorMsg, logCtx);
                    callback(new Error(errorMsg), null);
                } else {
                    log("Response data: " + JSON.stringify(iapPID), logCtx);
                    callback(null, iapPID);
                }
            });
        },
        function (iapPID, callback) {
            //Fetch title, abstract, and users associated with project 
            iapDB.fetchQnARoomInfo(iapPID, (error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else if (result == undefined || result == null) {
                    errorStatus = 404;
                    errorMsg = "No project information records found.";
                    logError(errorMsg, logCtx);
                    callback(new Error(errorMsg), null);
                } else {
                    log("Response data: " + JSON.stringify(result), logCtx);
                    callback(null, result);
                }
            });
        },
        function (iapDBResult, callback) {
            //Clean IAP database data
            cleanIAPData(iapDBResult, (cleanResult) => {
                finalResult.project_members = cleanResult; //Add list of participating users to the final result
                meetingName = cleanResult[0].iapproject_title; //Save meeting name for create room call
                callback(null);
            });
        },
        function (callback) {
            if (performBBBOps && performBBBOps == 'true') {
                //Get name and role for BBB room
                var userData = req.session.data;
                meetingHandler.getBBBRoleAndName(userData, req.query.meeting_id, (error, role, first_name, last_name) => {
                    if (error) {
                        logError(error, logCtx);
                    } else {
                        bbbRole = role;
                        firstName = first_name;
                        lastName = last_name;
                    }
                    callback(error); //Null if no error
                });
            } else {
                callback(null);
            }
        },
        function (callback) {
            if (performBBBOps && performBBBOps == 'true') {
                //Commented this since, for now, we want anyone to be able to join the room. 
                // //Check role
                // switch (bbbRole) {
                //     case "moderator":
                //         //Create room before joining if they are moderators
                //         meetingHandler.createRoom(meetingName, projectID, callback);
                //         break;
                //     case "viewer":
                //         //Check if the meeting is running, fail the call if it's not
                //         meetingHandler.isMeetingRunning(projectID, (error, isRunning) => {
                //             if (error) {
                //                 logError(error, logCtx);
                //                 callback(error);
                //             } else {
                //                 if (!isRunning) {
                //                     errorStatus = 500;
                //                     errorMsg = "Meeting is not running.";
                //                     logError(errorMsg, logCtx);
                //                     callback(new Error(errorMsg));
                //                 } else {
                //                     callback(null); //All good, meeting is running, proceed
                //                 }
                //             }
                //         });
                //         break;
                // }

                //Create room before joining in case it's not already created
                meetingHandler.createRoom(meetingName, projectID, callback);
            } else {
                callback(null);
            }
        },
        function (callback) {
            if (performBBBOps && performBBBOps == 'true') {
                //Record join history
                showroomDB.postMeetHistory(userID, projectID, (error, result) => {
                    if (error) {
                        errorStatus = 500;
                        errorMsg = error.toString();
                        logError(error, logCtx);
                        callback(error, null);
                    } else {
                        log("Response data: " + JSON.stringify(result), logCtx);
                        callback(null);
                    }
                });
            } else {
                callback(null);
            }
        },
        function (callback) {
            if (performBBBOps && performBBBOps == 'true') {
                //Construct URL for BBB API call
                var queryParams = {
                    meetingID: "0" + projectID,
                    fullName: firstName + " " + lastName,
                    userID: userID,
                    role: bbbRole,
                    password: bbbRole == 'moderator' ? config.MOD_PASSWORD : config.ATTENDEE_PASSWORD
                }
                var queryString = (new URLSearchParams(queryParams)).toString();
                var checksum = meetingHandler.generateChecksum('join', queryString);
                var url = config.bbbUrlPrefix + "/join?" + queryString + "&checksum=" + checksum;
                finalResult.join_url = url;
                callback(null);
            } else {
                callback(null);
            }
        }
    ], (error) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            var successMessage = "Successfully retrieved room information."
            if (performBBBOps && performBBBOps == 'true') successMessage = successMessage + " And produced join URL.";
            successResponse(res, 200, successMessage, finalResult);
        }
    });
}

function validateIAPUser (req, res, next) {
    logCtx.fn = 'validateIAPUser';
    var isValid = true;
    var iDSet = new Set();
    var errorStatus, errorMsg, givenProjectIDs;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateValidateIAPUser(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            givenProjectIDs = req.body.meeting_ids;
            email = req.body.email;
            //Fetch project IDs for the given email 
            iapDB.fetchProjectsForEmail(email, (error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else if (result == undefined || result == null) {
                    errorStatus = 404;
                    errorMsg = "No IAP project IDs found associated with given email.";
                    logError(errorMsg, logCtx);
                    callback(new Error(errorMsg), null);
                } else {
                    log("Response data: " + JSON.stringify(result), logCtx);
                    callback(null, result);
                }
            });
        },
        function (iapProjectIDs, callback) {
            async.forEachLimit(iapProjectIDs, 1, (iapPID, cb) => {
                //Fetch Showroom's project ID based on the given project ID from IAP
                showroomDB.getShowroomPIDFromIAPPID(iapPID, (error, showroomID) => {
                    if (error) {
                        errorStatus = 500;
                        errorMsg = error.toString();
                        logError(error, logCtx);
                        cb(error);
                    } else if (showroomID != undefined && showroomID != null) {
                        log("Response data: " + JSON.stringify(showroomID), logCtx);
                        iDSet.add(showroomID);
                        cb(null);
                    } else {
                        log("No Showroom project ID found for given IAP project ID: " + iapPID, logCtx);
                        cb(null);
                    }
                });
            }, (error) => {
                callback(error); //null if no error
            });
        },
        function (callback) {
            //Check if IDs match
            if (iDSet.size == 0) {
                logError("ID set is empty, given user is not associated with any IAP Projects: " + email, logCtx);
                isValid = false;
            } else {
                givenProjectIDs.forEach((pid) => {
                    if (!iDSet.has(pid)) {
                        logError("Given user is not associated with any IAP Projects: " + email, logCtx);
                        isValid = false;
                    }
                });
            }
            callback(null);
        }
    ], (error) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            var successMessage = "Retrieved project information, user validation status: " + isValid;
            successResponse(res, 200, successMessage, { is_valid: isValid});
        }
    });
}

function cleanIAPData (iapDBData, callback) {
    var currentUser = 0;
    for (currentUser; currentUser < iapDBData.length; currentUser++) {
        //Update user roles
        if (iapDBData[currentUser].user_role == "professor") iapDBData[currentUser].user_role = "Advisor"
        if (iapDBData[currentUser].user_role == "student") iapDBData[currentUser].user_role = "Student Researcher"
        //Update name from email if it's null
        if (iapDBData[currentUser].first_name == null) {
            var splitEmail = iapDBData[currentUser].email.split('@');
            var firstAndLastName = splitEmail[0].split('.');
            var firstName = firstAndLastName[0];
            var lastName = firstAndLastName[1];
            //Switch the first letter of each name to upper case
            firstName = firstName.charAt(0).toUpperCase() + firstName.substring(1);
            lastName = lastName.charAt(0).toUpperCase() + lastName.substring(1);
            //Remove any numbers that might be at the end of last name
            var digitIndex = lastName.search(/\d/);
            if (digitIndex != -1) {
                lastName = lastName.substring(0, digitIndex);
            }
            //Set parsed names
            iapDBData[currentUser].first_name = firstName;
            iapDBData[currentUser].last_name = lastName;
        }
    }
    callback(iapDBData);
}

function getIAPSessions (req, res, next) {
    logCtx.fn = "getIAPSessions";
    var latest = false; //If false, get all sessions; if true, only retrieve info for latest session
    iapDB.getSessions(latest, (error, result) => {
        if (error) {
            logError(error, logCtx);
            errorResponse(res, 500, error.toString());
        } else {
            log("Response data: " + JSON.stringify(result), logCtx);
            successResponse(res, 200, "Successfully retrieved sessions", result);
        }
    });
}

function getSponsors (req, res, next) {
    logCtx.fn = "getSponsors";
    iapDB.getSponsors((error, result) => {
        if (error) {
            logError(error, logCtx);
            errorResponse(res, 500, error.toString());
        } else {
            log("Response data: " + JSON.stringify(result), logCtx);
            successResponse(res, 200, "Successfully retrieved sponsors", result);
        }
    });
}

function postAnnouncements (req, res, next) { //TODO: test
    logCtx.fn = 'postAnnouncements';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validatePostAnnouncement(req, (error) => { //TODO test
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
            var adminID = req.session.data.admin;
            var message = req.body.message;
            var date = req.body.date;
            showroomDB.postAnnouncements(adminID, message, date, (error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error);
                } else {
                    log("Response data: " + JSON.stringify(result), logCtx);
                    //Send trigger to frontend so it can fetch announcements again
                    WSS.wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_announcement })));
                }
            });
        }
    ], (error) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 200, "Successfully posted announcement.");
            
        }
    });
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
            var all = req.query.all;
            var time, date;
            if (upcoming) {
                time = req.query.time;
                date = req.query.date;
            }
            showroomDB.getEvents(all, false, upcoming, time, date, (error, result) => {
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
    //req.body['adminid'] = req.session.data.admin;
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
                    WSS.wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_upcomingevents })));
                    WSS.wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_progressbar })));
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
                    WSS.wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_progressbar })));
                    WSS.wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_upcomingevents })));
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


function updateBatchEvents (req, res, next) {
    logCtx.fn = 'updateBatchEvent';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //TODO: Validate request payload

            // validator.validateUpdateEvent(req, (error) => {
            //     if (error) {
            //         logError(error, logCtx);
            //         errorStatus = 400;
            //         errorMsg = error.message;
            //     }
                callback(null);
            // });
        },
        function (callback) {
            //Persist updated event to DB
            console.log("time: "+req.params.time);
            let time = new Date(parseInt(req.params.time));
            var upcoming = true;
            var all = false;
            var date = req.body.e_date;

            showroomDB.getEvents(all, false, upcoming, time, date, (error, result) => {
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
        function(result, callback){
            var event = req.body;
            let time = new Date(result[0].starttime);
            let duration = new Date(result[0].duration);
            var delta = +new Date(event.starttime) - +time + (+new Date(event.duration) - +duration) * 60000;
            var updatedEventList = [];

            updatedEventList.push(event);

            for(let i = 1; i < result.length; i++){
                event = result[i];
                let updatedEvent = {
                    ...event,
                    starttime : new Date(+new Date(event.starttime) + delta)
                };
                updatedEventList.push(updatedEvent);
            }

            showroomDB.updateBatchEvents(updatedEventList, (error, result) => {
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
                    WSS.wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_progressbar })));
                    WSS.wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_upcomingevents })));
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
                    WSS.wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_progressbar })));
                    WSS.wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_upcomingevents })));
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

function deleteAnnouncementByID (req, res, next) {
    logCtx.fn = 'deleteAnnouncementByID';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateDeleteAnnouncement(req, (error) => {
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
            var announcementID = req.params.announcementID;
            showroomDB.deleteAnnouncement(announcementID, (error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else {
                    log("Response data: " + JSON.stringify(result), logCtx);
                    //Send trigger to frontend so it can fetch announcements again
                    WSS.wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_announcement })));
                    callback(null, result);
                }
            });
        }
    ], (error, result) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 200, "Successfully deleted announcement.", result && result.length > 0 ? result : null);
        }
    });
}

function getProjects (req, res, next) {
    logCtx.fn = "getProjects";
    var sessionID, updateProjects, errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateGetIAPProjects(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            sessionID = req.query.session_id;
            updateProjects = req.query.update;
            if (sessionID == undefined) {
                //Fetch session being used in Showroom's projects table
                showroomDB.fetchShowroomSession((error, showroomSession) => {
                    if (error) {
                        logError(error, logCtx);
                        errorMsg = error.toString();
                        errorStatus = 500;
                        callback(error);
                    } else {
                        if (showroomSession == null) { //No projects were found
                            sessionID = 1; //Set as incorrect session on purpose to trigger update
                        } else {
                            log("Response data: " + JSON.stringify(showroomSession), logCtx);
                            sessionID = showroomSession;
                        }
                        callback(null);
                    }
                });
            } else {
                callback(null); //Session ID was provided, skip
            }
        },
        function (callback) {
            if (updateProjects != undefined && updateProjects == "true") {
                //Fetch the current session used in Showroom's projects
                //Update table with projects from given session if they don't match
                checkSessionAndUpdate(sessionID, (error, latestSession) => {
                    if (error) {
                        logError(error, logCtx);
                        errorMsg = error.toString();
                        errorStatus = 500;
                    }
                    callback(error, latestSession); //Null if no error
                });
            } else {
                callback(null, null); //Skip
            }
        },
        function (latestSession, callback) {
            logCtx.fn = "getProjects";
            var finalSessionID = updateProjects != undefined && updateProjects == "true" ? latestSession : sessionID;
            //Fetch projects from IAP
            showroomDB.fetchProjects(finalSessionID, (error, iapProjects) => { //result is array of objs with project info
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else {
                    if (iapProjects == null || iapProjects.length == 0) {
                        errorStatus = 404;
                        errorMsg = "No projects found.";
                        logError(errorMsg, logCtx);
                        callback(new Error(errorMsg));
                    } else {
                        log("Response data: " + JSON.stringify(iapProjects), logCtx);
                        callback(null, iapProjects);
                    }
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

function checkSessionAndUpdate (showroomSession, mainCallback) {
    logCtx.fn = 'checkSessionAndUpdate';
    var match = false;
    var iapSession;
    async.waterfall([
        function (callback) {
            var latest = true; //Retrieve latest session from IAP DB
            iapDB.getSessions(latest, (error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else {
                    iapSession = result[0].session_id;
                    if (iapSession == null) {
                        errorMsg = "No sessions found.";
                        logError(errorMsg, logCtx);
                    } else if (showroomSession == iapSession) {
                        log("Sessions matched: " + showroomSession, logCtx);
                        match = true;
                    } else {
                        log("Sessions did not match, fetching new projects.", logCtx);
                    }
                    callback(null, showroomSession);
                }
            });
        },
        function (showroomSession, callback) {
            if (match == false) {
                //Set isLatest to false for the projects of the session that does not match
                showroomDB.deleteAllShowroomProjects(showroomSession, (error) => {
                    if (error) {
                        errorStatus = 500;
                        errorMsg = error.toString();
                        logError(error, logCtx);
                    }
                    callback(error);
                }); 
            } else {
                callback(null); //Skip if sessions matched
            }
        },
        function (callback) {
            if (match == false) {
                //Fetch projects from IAP database with the given session ID
                //Post the results to Showroom projects table
                iapDB.fetchProjects(iapSession, (error) => {
                    if (error) {
                        errorStatus = 500;
                        errorMsg = error.toString();
                        logError(error, logCtx);
                    }
                    callback(error); //Null if no error
                }); 
            } else {
                callback(null); //Skip if sessions matched
            }
        }
    ], (error) => {
        mainCallback(error, iapSession); //Null if no error
    });
}

function getAllUsers (req, res, next) {
    logCtx.fn = "getAllUsers";
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            logCtx.fn = "getAllUsers";
            //Fetch projects from IAP
            showroomDB.fetchAllUsers((error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else {
                    if (result == null || result.length == 0) {
                        errorStatus = 404;
                        errorMsg = "No users found.";
                        logError(errorMsg, logCtx);
                        callback(new Error(errorMsg));
                    } else {
                        log("Response data: " + JSON.stringify(result), logCtx);
                        callback(null, result);
                    }
                }
            });
        }
    ], (error, result) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 200, "Successfully retrieved all users.", result && result.length > 0 ? result : null);
        }
    });
}

function getAnnouncements (req, res, next) {
    logCtx.fn = "getAnnouncements";
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            logCtx.fn = "getAnnouncements";
            //Fetch projects from IAP
            showroomDB.fetchAllAnnouncements((error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else {
                    if (result == null || result.length == 0) {
                        errorStatus = 404;
                        errorMsg = "No announcements found.";
                        logError(errorMsg, logCtx);
                        callback(new Error(errorMsg));
                    } else {
                        log("Response data: " + JSON.stringify(result), logCtx);
                        callback(null, result);
                    }
                }
            });
        }
    ], (error, result) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 200, "Successfully retrieved all announcements.", result && result.length > 0 ? result : null);
        }
    });
}

function getAllMembersFromAllProjects (req, res, next) {
    logCtx.fn = "getAllMembersFromAllProjects";
    showroomDB.getAllMembersFromAllProjects( (error, result) => {
        if (error) {
            logError(error, logCtx);
            errorResponse(res, 500, error.toString());
        } else{
        log("Response data: " + JSON.stringify(result), logCtx);
        successResponse(res, 200, "Successfully retrieved all participating members with projects", result);
        }
    });
}

function validateResearchMember(req, res, next){
    logCtx.fn = 'validateResearchMember';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateMembervalidation(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            var userID = req.body.userid;
            var user_role = req.body.user_role;
            showroomDB.validateResearchMember(userID, user_role, (error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else if (result == undefined || result == null) {
                    errorStatus = 404;
                    errorMsg = "User cannot be validated";
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
            successResponse(res, 200, "Successfully validated member.", result);
        }
    });
}

function postLiveAttendance(req, res, next){
    async.waterfall([
        function (callback) {
            // Post live attendance to db
            var payload = req.body;
            showroomDB.postLiveAttendance(payload, (error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error);
                } else {
                    log("Response data: " + JSON.stringify(result), logCtx);
                }
            });
        }
    ], (error) => {
        //Send responses
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 200, "Successfully posted live attendance.");
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
    getScheduleEventByID: getScheduleEventByID,
    filterStats: filterStats,
    updateBatchEvents: updateBatchEvents,
    getAllMembersFromAllProjects: getAllMembersFromAllProjects, 
    validateResearchMember: validateResearchMember,
    postLiveAttendance: postLiveAttendance,
    getAllUsers: getAllUsers,
    getAnnouncements: getAnnouncements,
    deleteAnnouncementByID: deleteAnnouncementByID,
    checkSessionAndUpdate, checkSessionAndUpdate,
    getSponsors: getSponsors,
    validateIAPUser: validateIAPUser
}