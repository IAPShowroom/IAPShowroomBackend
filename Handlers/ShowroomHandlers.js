/**
 * File to organize handler functions for the Showroom endpoints.
 */

const iapDB = require('../Database/iapProxy.js');
const { logError, log } = require('../Utility/Logger.js');
const { successResponse, errorResponse } = require('../Utility/DbUtils.js');
const validator = require('../Utility/SchemaValidator.js');
const async = require('async');

let logCtx = {
    fileName: 'ShowroomHandlers',
    fn: ''
}

function getStats (req, res, next) {

}

function getRoomStatus (req, res, next) {
    
}

function getQnARoomInfo (req, res, next) {
    
}

function postAnnouncements (req, res, next) {
    
}

function getScheduleEvents (req, res, next) {
    
}

function postScheduleEvents (req, res, next) {
    //IAP_Events(eventid serial primary key, adminid integer references Admin(adminid), startTime time, duration time, title text, projectid integer, e_date timestamp);
    logCtx.fn = 'postScheduleEvents';
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
            errorResponse(res, errorStatus, errorMsg);
        } else {
            successResponse(res, 201, "Successfully created events.", null); //TODO: add payload
        }
    });

}

function updateScheduleEvent (req, res, next) {
    
}

function deleteScheduleEvent (req, res, next) {
    
}

function getProjects (req, res, next) {
    logCtx.fn = "getProjects";
    var session_id = req.query.session_id;
    iapDB.fetchProjects(session_id, (error, result) => {
        if (error) {
            logError(error, logCtx);
            errorResponse(res, 500, error.toString());
        }
        log("Response data: " + JSON.stringify(result), logCtx);
        successResponse(res, 200, "Successfully retrieved projects", result);
    });
}



module.exports = {
    getProjects: getProjects,
    getStats: getRoomStatus,
    getRoomStatus: getRoomStatus,
    getQnARoomInfo: getQnARoomInfo,
    postAnnouncements: postAnnouncements,
    getScheduleEvents: getScheduleEvents,
    postScheduleEvents: postScheduleEvents,
    updateScheduleEvent: updateScheduleEvent,
    deleteScheduleEvent: deleteScheduleEvent
}