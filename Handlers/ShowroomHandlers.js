/**
 * File to organize handler functions for the Showroom endpoints.
 */

const iapDB = require('../Database/iapProxy.js');
const logger = require('../Utility/Logger.js');

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
            logger.logError(error, logCtx);
            res.status(500).send(error.toString());
        }
        logger.log("Response data: " + JSON.stringify(result), logCtx);
        res.status(200).send(result);
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