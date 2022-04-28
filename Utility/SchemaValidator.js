/**
 * File to define schema objects to validate request payloads. 
 * There is a schema object defined for each request payload that requires it.
 */

const Joi = require('joi');
const { logError, log } = require('./Logger');
const config = require('../Config/config');

let logCtx = {
    fileName: 'SchemaValidator',
    fn: ''
}

const logInSchema = Joi.object({
    email: Joi.string().email({minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu']}}).required(),
    password: Joi.string().required()
});

//TODO: review and make more accurate
const userSchema = Joi.object({
    email: Joi.string().email({minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu']}}).required(),
    password: Joi.string().required(),
    first_name: Joi.string().alphanum().min(1).max(30).required(),
    last_name: Joi.string().alphanum().min(1).max(30).required(),
    gender: Joi.string().alphanum().min(1).max(30).required(),
    user_role: Joi.string().min(1).max(30).required()
});

//TODO: review and make more accurate?
const studentSchema = userSchema.append({
    projectids: Joi.array().items(Joi.number()).required(), 
    department: Joi.string().required().max(30),
    grad_date: Joi.date().required(),
    ispm: Joi.boolean().required()
//    validatedmember: Joi.boolean().required() X
});

//TODO: review and make more accurate?
const advisorSchema = userSchema.append({
    projectids: Joi.array().items(Joi.number()).required()
});

//TODO: review and make more accurate?
const companyRepSchema = userSchema.append({
    company_name: Joi.string().min(1).max(30).required()
});

//TODO: review and make more accurate
const eventSchema = Joi.object({
    adminid: Joi.number().required().prefs({ convert: false }),
    starttime: Joi.string().required(),
    duration: Joi.number().prefs({ convert: false }).required(),
    title: Joi.string().required(),
    projectid: Joi.number().required().prefs({ convert: false }),
    e_date: Joi.date().required()
});

const postAnnouncementSchema = Joi.object({
    message: Joi.string().required(),
    date: Joi.date().required()
});

const createRoomSchema = Joi.object({
    meeting_name: Joi.string().required(),
    projectid: Joi.number().required()
});

const joinRoomSchema = Joi.object({
    meeting_id: Joi.number().required()
});

const forgotPasswordSchema = Joi.object({
    new_password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9!@#$%^&*()]{3,30}$'))
});

const verifyDeleteAnnouncementSchema = Joi.object({
    announcement_id: Joi.number().required()
});

const verifyEmailSchema = Joi.object({
    userID: Joi.number().required(),
    euuid: Joi.string().required()
});

const joinStageSchema = Joi.object({
    meeting_id: Joi.string().valid('stage').required()
});

const qnaInfoSchema = Joi.object({
    meeting_id: Joi.number().required(),
    bbb: Joi.boolean()
});

const getIAPProjectsSchema = Joi.object({
    session_id: Joi.number(),
    update: Joi.boolean
});

const roomStatusSchema = Joi.object({
    date: Joi.date().required()
});

const eventListSchema = Joi.array().items(eventSchema);

const validateResearchMemberSchema = Joi.object({
    userid: Joi.number().required(),
    user_role: Joi.string().min(1).max(30).required()
});

function validateRegisterUser (req, callback) {
    logCtx.fn = 'validateRegisterUser';
    if (req.body && req.body.user_role != undefined) {
        switch (req.body.user_role) {
            case config.userRoles.studentResearcher:
                validateRequest(req, studentSchema, callback);
                break;
            case config.userRoles.advisor:
                validateRequest(req, advisorSchema, callback);
                break;
            case config.userRoles.companyRep:
                validateRequest(req, companyRepSchema, callback);
                break;
            default: //general guest
                validateRequest(req, userSchema, callback);
        }
    } else {
        logError("Missing request body information.", logCtx);
        callback(new Error("Missing request body information."));
    }
}

function validateEventList (req, callback) {
    logCtx.fn = 'validateEventList';
    if (req.body != undefined && Object.keys(req.body).length != 0) {
        validateRequest(req, eventListSchema, callback);
    } else {
        logError("Missing request body.", logCtx);
        callback(new Error("Missing request body."));
    }
}

function validateUpdateEvent (req, callback) {
    logCtx.fn = 'validateUpdateEvent';
    validateEventWithID(req, callback, (req, callback) => {
        if (req.body != undefined && Object.keys(req.body).length != 0) {
            validateRequest(req, eventSchema, callback);
        } else {
            errorMsg = "Missing request body.";
            logError(errorMsg, logCtx);
            callback(new Error(errorMsg));
        }
    });
}

function validateDeleteEvent (req, callback) {
    validateEventWithID(req, callback, null);
}

function validateGetEventByID (req, callback) {
    validateEventWithID(req, callback, null);
}

function validateEventWithID (req, callback, bodyCB) {
    //middle callback is to send an error if there are any invalid parameters
    //bodyCB is to further keep checking the request body, optional since delete event doesn't receive a body
    logCtx.fn = 'validateEventWithID';
    var errorMsg;
    if (req.params) {
        var eventID = req.params.eventID;
        if (eventID) {
            //Check if it's a number
            if (!isNaN(parseInt(eventID, 10))) {
                if (bodyCB) { //if a callback to validate request body is provided
                    bodyCB(req, callback); //call it
                } else {
                    log("Request schema successfully validated.", logCtx);
                    callback(null);
                }
            } else {
                var errorMsg = "Invalid data type for path parameter.";
                logError(errorMsg, logCtx);
                callback(new Error(errorMsg));
            }
        } else {
            errorMsg = "Missing event ID path parameter."
            logError(errorMsg, logCtx);
            callback(new Error(errorMsg));
        }
    } else {
        errorMsg = "Missing path parameters."
        logError(errorMsg, logCtx);
        callback(new Error(errorMsg));
    }
}

function validateDeleteAnnouncement (req, callback) {
    logCtx.fn = 'validateDeleteAnnouncement';
    //Check path paramters
    if (req.params != undefined && Object.keys(req.params).length != 0) {
        validateRequest(req.params, verifyDeleteAnnouncementSchema, callback);
    } else {
        logError("Missing or invalid path parameters.", logCtx);
        callback(new Error("Missing or invalid path parameters."));
    }
}

function validateGetEvents (req, callback) {
    logCtx.fn = 'validateGetEvents';
    if (req.query) { 
        if (req.query.upcoming != undefined && req.query.upcoming != false) {
            if (req.query.time && req.query.date) {
                try {
                    Joi.assert(req.query.upcoming, Joi.boolean());
                    Joi.assert(req.query.time, Joi.string());
                    Joi.assert(req.query.date, Joi.date());
                    log("Request schema successfully validated.", logCtx);
                    callback(null);
                } catch {
                    var errorMsg = "Invalid data types for query parameters";
                    logError(errorMsg, logCtx);
                    callback(new Error(errorMsg));
                }
            } else {
                var errorMsg = "Missing query parameters.";
                logError(errorMsg, logCtx);
                callback(new Error(errorMsg));
            }
        } else {
            //if 'upcoming' query parameter is missing or false, no need to check for date
            log("Request schema successfully validated.", logCtx);
            callback(null);
        }
    } else {
        var errorMsg = "Missing query parameters.";
        logError(errorMsg, logCtx);
        callback(new Error(errorMsg));
    }
}

function validateLogIn (req, callback) {
    logCtx.fn = 'validateLogIn';
    if (req.body != undefined && Object.keys(req.body).length != 0) {
        validateRequest(req, logInSchema, callback);
    } else {
        logError("Missing or invalid login credentials.", logCtx);
        callback(new Error("Missing or invalid login credentials."));
    }
}

function validateCreateRoom (req, callback) {
    logCtx.fn = 'validateCreateRoom';
    if (req.body != undefined && Object.keys(req.body).length != 0) {
        validateRequest(req, createRoomSchema, callback);
    } else {
        logError("Missing request body.", logCtx);
        callback(new Error("Missing request body."));
    }
}

function validateJoinRoom (req, callback) {
    logCtx.fn = 'validateJoinRoom';
    if (req.body != undefined && Object.keys(req.body).length != 0) {
        validateRequest(req, joinRoomSchema, callback);
    } else {
        logError("Missing request body.", logCtx);
        callback(new Error("Missing request body."));
    }
}

function validateJoinStage (req, callback) { //TODO: test
    logCtx.fn = 'validateJoinStage';
    if (req.body != undefined && Object.keys(req.body).length != 0) {
        validateRequest(req, joinStageSchema, callback);
    } else {
        logError("Missing request body.", logCtx);
        callback(new Error("Missing request body."));
    }
}

function validateEndRoom (req, callback) {
    logCtx.fn = 'validateEndRoom';
    if (req.body != undefined && Object.keys(req.body).length != 0) {
        validateRequest(req, joinRoomSchema, callback); //re-use schema for join room request, same parameters for now
    } else {
        logError("Missing request body.", logCtx);
        callback(new Error("Missing request body."));
    }
}

function validatePostAnnouncement (req, callback) {
    logCtx.fn = 'validatePostAnnouncement';
    if (req.body != undefined && Object.keys(req.body).length != 0) {
        validateRequest(req, postAnnouncementSchema, callback);
    } else {
        logError("Missing request body.", logCtx);
        callback(new Error("Missing request body."));
    }
}

function validatePostMeetHistory (req, callback) {
    logCtx.fn = 'validatePostMeetHistory';
    if (req.body != undefined && Object.keys(req.body).length != 0) {
        validateRequest(req, joinRoomSchema, callback); //re-use schema for join room request, same parameters for now
    } else {
        logError("Missing request body.", logCtx);
        callback(new Error("Missing request body."));
    }
}

function validateChangePassword (req, callback) {
    logCtx.fn = 'validateChangePassword';
    if (req.body != undefined && Object.keys(req.body).length != 0) {
        validateRequest(req, forgotPasswordSchema, callback);
    } else {
        logError("Missing or invalid request body.", logCtx);
        callback(new Error("Missing or invalid request body."));
    }
}

//I know it's a bit ugly and it duplicates code, it's okay, maybe we can make it prettier later
function validateVerifyEmail (req, callback) {
    logCtx.fn = 'validateVerifyEmail';
    //Check query parameters if included - must be boolean
    if (req.query != undefined && Object.keys(req.query).length != 0) {
        if (req.query.resend) {
            try {
                var resendJSON = JSON.parse(req.query.resend);
                if (typeof resendJSON != "boolean") { 
                    logError("Invalid query parameter.", logCtx);
                    callback(new Error("Invalid query parameter."));
                } else {
                    //Successful boolean
                    if (resendJSON == true) {
                        //Now check if there is a running session if resend=true
                        if (req.session.data == undefined) {
                            logError("Missing session data, please log in.", logCtx);
                            callback(new Error("Missing session data, please log in."));
                        } else if (req.params != undefined && Object.keys(req.params).length != 0) { //Check path paramters
                            validateRequest(req.params, verifyEmailSchema, callback);
                        } else {
                            logError("Missing or invalid path parameters.", logCtx);
                            callback(new Error("Missing or invalid path parameters."));
                        }
                    } else if (req.params != undefined && Object.keys(req.params).length != 0) { //Check path paramters
                        validateRequest(req.params, verifyEmailSchema, callback);
                    } else {
                        logError("Missing or invalid path parameters.", logCtx);
                        callback(new Error("Missing or invalid path parameters."));
                    }
                }
            } catch(exception) {
                logError("Invalid path parameters.", logCtx);
                callback(new Error("Invalid path parameters."));
            }
        } else {
            logError("Invalid path parameters.", logCtx);
            callback(new Error("Invalid path parameters."));
        }
    } else {
        //Check path paramters
        if (req.params != undefined && Object.keys(req.params).length != 0) {
            validateRequest(req.params, verifyEmailSchema, callback);
        } else {
            logError("Missing or invalid path parameters.", logCtx);
            callback(new Error("Missing or invalid path parameters."));
        }
    }
}

function validateGetIAPProjects (req, callback) {
    logCtx.fn = 'validateGetIAPProjects';
    const { error, value } = getIAPProjectsSchema.validate(req.query);
    if (error) { //return comma separated errors
        logError("Schema validation error for request payload.", logCtx);
        callback(new Error("Request payload validation error: " + error.details.map(x => x.message).join(', ')));
    } else {
        log("Request schema successfully validated.", logCtx);
        callback(null);
    }
}

function validateQNARoomInfo (req, callback) { //TODO: test
    logCtx.fn = 'validateQNARoomInfo';
    if (req.params != undefined && Object.keys(req.params).length != 0) {
        if (!isNaN(parseInt(req.params.projectID, 10))) {
            if (req.query != undefined && Object.keys(req.query).length != 0) {
                var obj = {body: req.query}; //Bypass validateRequest's req.body call
                validateRequest(obj, qnaInfoSchema, callback);
            } else {
                logError("Missing request query parameters.", logCtx);
                callback(new Error("Missing request query parameters."));
            }
        } else {
            var errorMsg = "Invalid data type for path parameter.";
            logError(errorMsg, logCtx);
            callback(new Error(errorMsg));
        }
    } else {
        var errorMsg = "Missing request path parameters.";
        logError(errorMsg, logCtx);
        callback(new Error(errorMsg));
    }
}

function validateGetRoomStatus (req, callback) {
    logCtx.fn = 'validateGetRoomStatus';
    if (req.query && Object.keys(req.query).length != 0) {
        const { error, value } = roomStatusSchema.validate(req.query);
        if (error) { //return comma separated errors
            logError("Schema validation error for request payload.", logCtx);
            callback(new Error("Request payload validation error: " + error.details.map(x => x.message).join(', ')));
        } else {
            log("Request schema successfully validated.", logCtx);
            callback(null);
        }
    } else {
        log("Request schema successfully validated, no query parameter found.", logCtx);
        callback(null);
    }
}

function validateMembervalidation(req, callback){
    logCtx.fn = 'validateMembervalidation';
    if (req.body != undefined && Object.keys(req.body).length != 0) {
        validateRequest(req, validateResearchMemberSchema, callback); //re-use schema for join room request, same parameters for now
    } else {
        logError("Missing request body.", logCtx);
        callback(new Error("Missing request body."));
    }
}

function validateRequest (req, schema, callback) {
    logCtx.fn = 'validateRequest';
    const { error, value } = schema.validate(req.body);
    if (error) { //return comma separated errors
        logError("Schema validation error for request payload.", logCtx);
        callback(new Error("Request payload validation error: " + error.details.map(x => x.message).join(', ')));
    } else {
        log("Request schema successfully validated.", logCtx);
        callback(null);
    }
}

function validateServerSideEvent(req, callback){
    logCtx.fn = 'validateServerSideEvent';
    log("Request schema successfully validated.", logCtx);
    callback(null);
}


//optionally implement this function to add additional sql injection defense
// function sanitizeInput(input, callback){ //callback: (error) => {}
// }

module.exports = {
    validateRegisterUser: validateRegisterUser,
    validateEventList: validateEventList,
    validateGetEvents: validateGetEvents,
    validateUpdateEvent: validateUpdateEvent,
    validateDeleteEvent: validateDeleteEvent,
    validateLogIn: validateLogIn,
    validateCreateRoom: validateCreateRoom,
    validateJoinRoom: validateJoinRoom,
    validateEndRoom: validateEndRoom,
    validateGetEventByID: validateGetEventByID,
    validatePostAnnouncement: validatePostAnnouncement,
    validatePostMeetHistory: validatePostMeetHistory,
    validateGetIAPProjects: validateGetIAPProjects,
    validateGetRoomStatus: validateGetRoomStatus,
    validateServerSideEvent: validateServerSideEvent, 
    validateMembervalidation: validateMembervalidation,
    validateQNARoomInfo: validateQNARoomInfo,
    validateJoinStage: validateJoinStage,
    validateServerSideEvent: validateServerSideEvent,
    validateChangePassword: validateChangePassword,
    validateVerifyEmail: validateVerifyEmail,
    validateDeleteAnnouncement: validateDeleteAnnouncement
}