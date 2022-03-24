/**
 * File to organize handler functions for the Authentication endpoints.
 */

const iapDB = require('../Database/iapProxy.js');
const showroomDB = require('../Database/showroomProxy.js');
const { logError, log } = require('../Utility/Logger.js');
const validator = require('../Utility/SchemaValidator.js');
const async = require('async');

let logCtx = {
    fileName: 'AuthHandlers',
    fn: ''
}

function registerUser (req, res, next) { //Nota: don't focus on implementing first, primero trata sessions
    logCtx.fn = 'registerUser';
    var errorStatus, errorMsg;
    async.waterfall([
        // function (callback) {
        //     //Validate request payload
        //     validator.validateRegisterUser(req, (error) => {
        //         if (error) {
        //             logError(error, logCtx);
        //             errorStatus = 400;
        //             errorMsg = error.message;
        //         }
        //         callback(error);
        //     });
        // },
        // function (callback) {
        //     //Check email against IAP
        //     var userEmail = req.body.email;
        //     iapDB.validateEmail(userEmail, (error) => { //TODO: implement
        //         if (error) {
        //             errorStatus = 400;
        //             errorMsg = error.toString();
        //             logError(error, logCtx);
        //         }
        //         callback(error);
        //     });
        // },
        function (callback) {
            //Persist user data based on role
            showroomDB.registerUser(req, (error, result) => { //TODO: implement
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString;
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
            callback(null);
        }
    ], (error) => {
        if (error) {
            res.status(errorStatus).send("Error: " + errorMsg);
        } else {
            res.status(201).send("User registered. Please check email for verification."); //TODO: llega el 201 Created pero no llega el mensaje? se queda tiempo loading it
        }
    });
}

function logOut (req, res, next) {
    if (req.session.key) {
        req.session.destroy(() => { //TODO: review functionality of destroy
            res.status(200).send("Successfully logged user out.");
        }); 
    } else {
        res.status(400).send("No session found, cannot perform this action.");
    }
}

function authenticate (req, res, next) {
    logCtx.fn = 'authenticate';
    if (req.session.key) {
        next(); //Success
    } else {
        errorMsg = "User could not be authenticated. Please log in."
        logError(errorMsg, logCtx);
        res.status(401).send(errorMsg);
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
            res.status(403).send(errorMsg);
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