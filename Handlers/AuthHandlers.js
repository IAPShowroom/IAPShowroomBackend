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
const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    auth: {
        user: config.showroomEmail.email,
        pass: config.showroomEmail.password
    }
});

let logCtx = {
    fileName: 'AuthHandlers',
    fn: ''
}

function registerUser (req, res, next) {
    logCtx.fn = 'registerUser';
    var errorStatus, errorMsg, userEmail;
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
        // function (callback) {
        //     //Check email against IAP if it's an advisor
        //     if (req.body.user_role == config.userRoles.advisor) {
        //         var userEmail = req.body.email;
        //         iapDB.validateEmail(userEmail, (error, isInIAP) => {
        //             if (error) {
        //                 errorStatus = 400;
        //                 errorMsg = error.toString();
        //                 logError(error, logCtx);
        //             } else {

        //             }
        //             callback(error);
        //         });
        //     } else {
        //         //Skip
        //         callback(null);
        //     }
        // },
        function (callback) {
            //Check email is not already in use
            userEmail = req.body.email;
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
        function (result, callback) {
            //Generate email unique ID for the verify email link
            generateEUUID(result.userID, (error, emailUUID) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                    callback(error, null, null);
                } else {
                    log("Successfully generated email UUID.", logCtx);
                    callback(null, result, emailUUID);
                }
            });
        },
        function (result, emailUUID, callback) {
            //Send verification email 
            var verifyURL = "https://" + config.SHOWROOM_HOST + "/api/auth/verify/" + result.userID + "/" + emailUUID
            var subject = "Confirm your email address"
            var message = "Thank you for registering with IAP Showroom. Please click the following link to verify your email address. " + verifyURL; 
            sendEmail(userEmail, subject, message, (error, info) => {
                if (error) {
                    logError(error, logCtx);
                } else {
                    log("Successfully sent verification email for user " + userEmail, logCtx);
                }
                callback(null);
            });
        }
    ], (error) => {
        if (error) {
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 201, "User registered. Please check email for verification.");
        }
    });
}

function generateEUUID (userID, callback) {
    logCtx.fn = 'generateEUUID';
    //Generate new email UUID and expire time
    var emailUUID = crypto.randomUUID();
    var expireInMiliseconds = new Date() + config.EMAIL_VERIFY_MAX_AGE;
    var expireTime = new Date(expireInMiliseconds).toISOString();

    //Post euuid to table
    showroomDB.postToEUUID(userID, emailUUID, expireTime, (error) => {
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            callback(null, emailUUID); //Pass the emailUUID to the next function
        }
    });
}

function sendEmail(destEmail, subject, message, callback) {
    logCtx.fn = 'sendEmail';
    const mail = {
        from: config.showroomEmail.email,
        to: destEmail, 
        subject: subject,
        text: message,
        // html: //TODO: add prettiness
      };

    transporter.sendMail(mail, function (error, info) {
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Email sent:" + info.response, logCtx);
            callback(null, info);
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
    var errorStatus, errorMsg, userID;
    async.waterfall([
        function (callback) {
            //Validate request payload
            validator.validateVerifyEmail(req, (error) => { //TODO: test the 'resend' query param
                if (error) {
                    logError(error, logCtx);
                    errorStatus = 400;
                    errorMsg = error.message;
                }
                callback(error);
            });
        },
        function (callback) {
            //Fetch user's email
            showroomDB.fetchUserEmail(userID, (error, result) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                } else {
                    log("Successfully retrieved user email", logCtx);
                    userEmail = result.email;
                }
                callback(error); //Null if no error
            });
        },
        function (callback) {
            //Check query parameter to see if regenerate a new link or evaluate the one given
            var resend = req.query.resend;
            userID = req.session.data.userID;
            if (resend == true) {
                resendVerify(userID, callback);
            } else {
                callback(null); //Keep going
            }
        },
        function (callback) {
            if (resend == false) {
                //Check if emailUUID isn't expired or invalid
                var emailUUID = req.params.euuid;
                showroomDB.fetchEUUID(userID, (error, result) => {
                    if (error) {
                        errorStatus = 500;
                        errorMsg = error.toString();
                        logError(error, logCtx);
                    } else {
                        //Check that euuid matches and it's not expired yet
                        if (result.euuid == emailUUID && new Date() < new Date(result.expiration)) {
                            log("Email confirmation is valid.", logCtx);
                            callback(null); //Continue to update the users table
                        } else {
                            errorStatus = 400;
                            errorMsg = "Invalid or expired confirmation link. Please ask to resend a new one."
                            logError(error, logCtx);
                            callback(new Error(errorMsg));
                        }
                    }
                });
            } else {
                callback(null); //Skip
            }
        },
        function (callback) {
            if (resend == false) {
                //Update users table to specify verified
                showroomDB.verifyEmail(userID, (error) => {
                    if (error) {
                        errorStatus = 500;
                        errorMsg = error.toString();
                        logError(error, logCtx);
                    }
                    callback(error); //Null if no error
                });
            } else {
                callback(null); //Skip
            }
        }
    ], (error) => {
        if (error) {
            //Catch errors that might occur within resendVerify()
            if (errorStatus == undefined) errorStatus = 500;
            if (errorMsg == undefined) errorMsg = error.toString();
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 201, "Email successfully verified.");
        }
    });
}


function resendVerify (userID, mainCallback) {
    logCtx.fn = 'resendVerify';
    var userEmail;
    async.waterfall([
        function (result, callback) {
            //Generate email unique ID for the verify email link
            generateEUUID(userID, (error, emailUUID) => {
                if (error) {
                    errorStatus = 500;
                    errorMsg = error.toString();
                    logError(error, logCtx);
                } else {
                    log("Successfully generated new email UUID.", logCtx);
                }
                callback(error, emailUUID); //Null if no error
            });
        },
        function (emailUUID, callback) {
            //Send verification email 
            var verifyURL = "https://" + config.SHOWROOM_HOST + "/api/auth/verify/" + userID + "/" + emailUUID
            var subject = "Confirm your email address"
            var message = "Thank you for registering with IAP Showroom. Please click the following link to verify your email address. " + verifyURL; 
            sendEmail(userEmail, subject, message, (error, info) => {
                if (error) {
                    logError(error, logCtx);
                } else {
                    log("Successfully sent verification email for user " + userEmail, logCtx);
                }
                callback(null);
            });
        }
    ], (error) => {
        mainCallback(error); //Null if no error
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
    verifyUserFromEmail: verifyUserFromEmail,
    sendEmail: sendEmail,
    generateEUUID: generateEUUID
}
