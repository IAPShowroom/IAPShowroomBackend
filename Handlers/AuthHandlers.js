/**
 * File to organize handler functions for the Authentication endpoints.
 */

const iapDB = require('../Database/iapProxy.js');
const showroomDB = require('../Database/showroomProxy.js');
const { logError, log } = require('../Utility/Logger.js');
const { successResponse, errorResponse } = require('../Utility/DbUtils.js');
const validator = require('../Utility/SchemaValidator.js');
const async = require('async');

let logCtx = {
    fileName: 'AuthHandlers',
    fn: ''
}

function registerUser (req, res, next) {
    logCtx.fn = 'registerUser';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateRegisterUser(req, (error) => { //TODO: finish implementing
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Check email against IAP
            var userEmail = req.body.email;
            iapDB.validateEmail(userEmail, (error) => { //TODO: implement
                if (error) {
                    errorStatus = 400;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                }
                callback(error);
            });
        },
        function (callback) {
            //Check email is not already in use
            var userEmail = req.body.email;
            showroomDB.validateEmail(userEmail, (error) => { //TODO: implement
                if (error) {
                    errorStatus = 400;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                }
                callback(error);
            });
        },
        function (callback) {
            //Persist user data based on role
            showroomDB.registerUser(req, (error, result) => { //TODO: implement
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else {
                    req.session.key = result; //Store result object with user ID in session.key
                    log("Response data: " + JSON.stringify(result), logCtx);
                    callback(null, result);
                }
            });
        },
        function (result, callback) {
            //Send verification email //TODO: implement
            //maybe generate a unique string that is destroyed once its used? UUID.randomUUID().toString() or expires after some time (1hour?)
            //and send an email with a constructued url for them to click on (showroom host + auth prefix + path params with: user id + pre-filled unique string)?
            callback(null);
        }
    ], (error) => {
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 201, "User registered. Please check email for verification."); //TODO: llega el 201 Created pero no llega el mensaje? se queda tiempo loading it
        }
    });
}

function logIn (req, res, next) {
    //get plaintext password
    //get hash from db 
    //compare
    //get user id
    //insert user id into session key
}

function logOut (req, res, next) {
    if (req.session.key) {
        req.session.destroy(() => { //TODO: review functionality of destroy
            successResponse(res, 200, "Successfully logged user out.");
        }); 
    } else {
        errorResponse(res, 400, "No session found, cannot perform this action.");
    }
}

function authenticate (req, res, next) {
    logCtx.fn = 'authenticate';
    // console.log("before hang up"); //testing
    if (req.session.key) {
        // console.log("req.session: "); //testing
        // console.log(req.session); //testing
        next(); //Success
    } else {
        errorMsg = "User could not be authenticated. Please log in."
        logError(errorMsg, logCtx);
        errorResponse(res, 401, errorMsg);
    }
}

function authorizeAdmin (req, res, next) {
    logCtx.fn = 'authorizeAdmin';
    authenticate(req, res, () => {
        if (req.session.key["role"] == "admin") { //Check if user has admin role
            next(); //Success
        } else {
            errorMsg = "User does not have enough privileges."
            logError(errorMsg, logCtx);
            errorResponse(res, 403, errorMsg);
        }
    });
}

function checkSession (req, res, next) {
    logCtx.fn = 'checkSession';
    if (!req.session) {
        logError("Session is not connected.", logCtx);
    } else {
        log("Session is connected.", logCtx);
    }
    next();
}

module.exports = {
    registerUser: registerUser,
    authenticate: authenticate,
    authorizeAdmin: authorizeAdmin,
    logOut: logOut,
    checkSession: checkSession
}

/**
 * Developer Notes:
 * 
 * - Maybe implement retry mechanics to keep trying to connect session if it fails
 */