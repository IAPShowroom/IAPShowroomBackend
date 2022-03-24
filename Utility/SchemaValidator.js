/**
 * File to define schema objects to validate request payloads. 
 * There is a schema object defined for each request payload that requires it.
 */

const { func } = require('joi');
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

function validateRequest (req, schema, callback) {
    logCtx.fn = 'validateRequest';
    const { error, value } = schema.validate(req.body);
    if (error) { //return comma separated errors
        logError("Schema validation error for request payload.");
        callback(new Error("Request payload validation error: " + error.details.map(x => x.message).join(', ')));
    } else {
        log("Request schema successfully validated.");
        callback(null);
    }
}

//optionally implement this function to add additional sql injection defense
// function sanitizeInput(input, callback){ //callback: (error) => {}
// }

module.exports = {
    validateRegisterUser: validateRegisterUser
}