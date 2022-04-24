/**
 * File to organize handler functions for the Authentication endpoints.
 */

const iapDB = require('../Database/iapProxy.js');
const showroomDB = require('../Database/showroomProxy.js');
const { logError, log } = require('../Utility/Logger.js');
const { successResponse, errorResponse } = require('../Utility/DbUtils.js');
const validator = require('../Utility/SchemaValidator.js');
const async = require('async');
const config = require('../Config/config.js');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

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
            validator.validateRegisterUser(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Check email against IAP if it's an advisor
            if (req.body.user_role == config.userRoles.advisor) {
                var userEmail = req.body.email;
                iapDB.validateEmail(userEmail, (error) => {
                    if (error) {
                        errorStatus = 400;
                        errorMsg = error.toString();
                        logError(error, logCtx);
                    }
                    callback(error);
                });
            } else {
                //Skip
                callback(null);
            }
        },
        function (callback) {
            //Check email is not already in use
            var userEmail = req.body.email;
            showroomDB.validateEmail(userEmail, (error) => {
                if (error) {
                    errorStatus = 409; //Conflict
                    errorMsg = error.toString();
                    logError(error, logCtx);
                }
                callback(error);
            });
        },
        function (callback) {
            //Persist user data based on role
            showroomDB.registerUser(req, (error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else {
                    req.session.data = result; //Store result object with user ID in session.key
                    log("Response data: " + JSON.stringify(result), logCtx);
                    callback(null, result);
                }
            });
        },
        // function (result, callback) {
        //     //Send verification email //TODO: implement
        //     //maybe generate a unique string that is destroyed once its used? UUID.randomUUID().toString() or expires after some time (1hour?)
        //     var emailUUID = crypto.randomUUID();
        //     //and send an email with a constructued url for them to click on (showroom host + auth prefix + path params with: user id + pre-filled unique string)?
        //     var verifyURL = "https://" + config.SHOWROOM_HOST + "/api/auth/verify/" + result.userID + "/" + emailUUID
        //     callback(null);
        // }
    ], (error) => {
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 201, "User registered. Please check email for verification.");
        }
    });
}

function getUserInfo (req, res, next) {
    logCtx.fn = 'getUserInfo';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Get user info. from database
            var userID = req.session.data["userID"];
            showroomDB.getUserInfo(userID, (error, result) => {
                if (error) {
                    errorStatus = 400;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null);
                } else if (result == undefined || result == null) {
                    errorStatus = 404;
                    errorMsg = "No user found.";
                    logError(error, logCtx);
                    callback(new Error(errorMsg), null);
                } else {
                    log("Response data: " + JSON.stringify(result), logCtx);
                    callback(null, result);
                }
            });
        }
    ], (error, result) => {
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 200, "User successfully retrieved user information.", result);
        }
    });
}

// Use for student/advisor permisions for project rooms
// function getRoleAndName (req, res, next) {
//     logCtx.fn = 'getRoleAndName';
//     var errorStatus, errorMsg;
//     async.waterfall([
//         function (callback) {
//             //Get user info. from database
//             var userID = req.session.data["userID"];
//             showroomDB.getRoleAndName(userID, (error, result) => {
//                 if (error) {
//                     errorStatus = 400;
//                     errorMsg = error.toString();
//                     logError(error, logCtx);
//                     callback(error, null);
//                 } else if (result == undefined || result == null) {
//                     errorStatus = 404;
//                     errorMsg = "No user found.";
//                     logError(error, logCtx);
//                     callback(new Error(errorMsg), null);
//                 } else {
//                     log("Response data: " + JSON.stringify(result), logCtx);
//                     callback(null, result);
//                 }
//             });
//         }
//     ], (error, result) => {
//         if (error) {
//             errorResponse(res, errorStatus, errorMsg);
//         } else {
//             successResponse(res, 200, "User successfully retrieved user role and name.", result);
//         }
//     });
// }

function logIn (req, res, next) {
    logCtx.fn = 'logIn';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateLogIn(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Get hash from database and compare
            var userEmail = req.body.email;
            var userPassword = req.body.password;
            showroomDB.comparePasswords(userEmail, userPassword, (error, result) => {
                if (error) {
                    errorStatus = 401; //Invalid email or password
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error);
                } else {
                    //Insert session token with user ID in request objet
                    req.session.data = result; //JSON object with user ID and admin role if applicable
                    log("Response data: " + JSON.stringify(result), logCtx);
                    callback(null, result);
                }
            });
        }
    ], (error, result) => {
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            //Will test integration by passing userid and admin payload, but redis sessions should be included
            successResponse(res, 200, "User successfully logged in.", result);
        }
    });
}

function logOut (req, res, next) {
    if (req.session.data) {
        req.session.destroy(() => {
            successResponse(res, 200, "Successfully logged user out.");
        }); 
    } else {
        errorResponse(res, 400, "No session found, cannot perform this action.");
    }
}

function forgotPassword (req, res, next) {
    logCtx.fn = 'forgotPassword';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateChangePassword(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Get hash from database and compare
            var newPassword = req.body.new_password;
            var saltRounds = 10;
            bcrypt.hash(newPassword, saltRounds, (error, hash) => {
                if (error) {
                    logError(error, logCtx);
                    callback(error, null);
                } else {
                    callback(null, hash);
                }
            });
        },
        function (hashedPW, callback) {
            var userID = req.session.data.userID;
            //Update users table with new password
            showroomDB.changePassword(userID, hashedPW, (error) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    
                }
                callback(error); //Null if no error
            });
        }
    ], (error) => {
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 201, "Password successfully changed.");
        }
    });
}

function verifyUserFromEmail (req, res, next) {
    logCtx.fn = 'verifyUserFromEmail';
    var errorStatus, errorMsg;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateVerifyEmail(req, (error) => {
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Update users table to specify verified
            var userID = req.params.userID;
            var emailUUID = req.params.euuid; //TODO: go through emailuuid table and verify 
            showroomDB.verifyEmail(userID, (error) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                }
                callback(error); //Null if no error
            });
        }
    ], (error) => {
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 201, "Email successfully verified.");
        }
    });
}

function authenticate (req, res, next) {
    logCtx.fn = 'authenticate';
    if (req.session.data) {
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
        // if (req.session.data["admin"] == true) { //Check if user has admin role //changing boolean for id
        if (req.session.data["admin"] != null) { //Check if user has admin role
            next(); //Success
        } else {
            errorMsg = "User does not have enough privileges.";
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
    getUserInfo: getUserInfo,
    // getRoleAndName: getRoleAndName,
    authenticate: authenticate,
    authorizeAdmin: authorizeAdmin,
    logOut: logOut,
    logIn: logIn,
    checkSession: checkSession,
    forgotPassword: forgotPassword,
    verifyUserFromEmail: verifyUserFromEmail
}

/**
 * Developer Notes:
 * 
 * - Maybe implement retry mechanics to keep trying to connect session if it fails
 */