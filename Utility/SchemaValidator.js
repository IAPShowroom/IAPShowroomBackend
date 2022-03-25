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
    adminid: Joi.number().required(),
    startTime: Joi.string().required(),
    duration: Joi.string().required(),
    title: Joi.string().required(),
    projectid: Joi.number().required(),
    e_date: Joi.string().required()
});

const eventListSchema = Joi.array().items(eventSchema);

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
    if (req.body) {
        validateRequest(req, eventListSchema, callback);
    } else {
        logError("Missing request body.", logCtx);
        callback(new Error("Missing request body."));
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
                var errorMsg = "Missing time and date query parameters.";
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
    validateGetEvents: validateGetEvents
}