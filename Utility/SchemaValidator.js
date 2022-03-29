/**
 * File to define schema objects to validate request payloads. 
 * There is a schema object defined for each request payload that requires it.
 */

const Joi = require('joi');
const { logError, log } = require('./Logger');

let logCtx = {
    fileName: 'SchemaValidator',
    fn: ''
}

//TODO: review and make more accurate (missing properties in total: dept, grad date, project id, is pm, company name)
const userSchema = Joi.object({
    email: Joi.string().email({minDomainSegments: 2, tlds: { allow: ['com', 'net']}}).required(),
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')),
    firstName: Joi.string().alphanum().min(1).max(30).required(),
    lastName: Joi.ref('firstName'),
    gender: Joi.string().alphanum().min(1).max(10).required(),
    role: Joi.string().alphanum().min(1).max(30).required()
});

//TODO: review and add missing
const studentSchema = userSchema.append({
    //add student speciic properties
    graduation_date: Joi.date().required()
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

const eventListSchema = Joi.array().items(eventSchema); //TODO: test

//TODO: review role values and add more switch cases
function validateRegisterUser (req, callback) {
    logCtx.fn = 'validateRegisterUser';
    if (req.body && req.body.role != undefined) {
        switch (role) {
            case 'student_researcher':
                validateRequest(req, studentSchema, callback);
                break;
            default:
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
    validateDeleteEvent: validateDeleteEvent
}