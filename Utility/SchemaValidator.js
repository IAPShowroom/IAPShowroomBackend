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
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9!@#$%^&*()]{3,30}$'))
});

//TODO: review and make more accurate
const userSchema = Joi.object({
    email: Joi.string().email({minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu']}}).required(),
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9!@#$%^&*()]{3,30}$')),
    first_name: Joi.string().alphanum().min(1).max(30).required(),
    last_name: Joi.string().alphanum().min(1).max(30).required(),
    gender: Joi.string().alphanum().min(1).max(10).required(),
    user_role: Joi.string().min(1).max(30).required()
});

//TODO: review and make more accurate?
const studentSchema = userSchema.append({
    projectids: Joi.array().items(Joi.number()).required(),
    department: Joi.string().alphanum().min(1).max(30).required(),
    grad_date: Joi.date().required(),
    ispm: Joi.boolean().required(),
    validatedmember: Joi.boolean().required()
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
    e_date: Joi.string().required()
});

const eventListSchema = Joi.array().items(eventSchema);

//TODO: test
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
        logError("Missing role in request body.", logCtx);
        callback(new Error("Missing role information in request body."));
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

//optionally implement this function to add additional sql injection defense
// function sanitizeInput(input, callback){ //callback: (error) => {}
// }

module.exports = {
    validateRegisterUser: validateRegisterUser,
    validateEventList: validateEventList,
    validateGetEvents: validateGetEvents,
    validateUpdateEvent: validateUpdateEvent,
    validateDeleteEvent: validateDeleteEvent,
    validateLogIn: validateLogIn
}