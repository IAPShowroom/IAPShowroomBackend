/**
 * File to organize handler functions for the Showroom endpoints.
 */

const iapDB = require('../Database/iapProxy.js');
const logger = require('../Utility/Logger.js');

let logCtx = {
    fileName: 'ShowroomHandlers',
    fn: ''
}

function getProjects (req, res, next) {
    logCtx.fn = "getProjects";
//    var session_date = req.query.session_date;
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
    getProjects: getProjects
}