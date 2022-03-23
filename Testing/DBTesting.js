/**
 * Test file for Databse operations.
 */

const iapDB = require('../Database/iapProxy.js');
const logger = require('../Utility/Logger.js');
let logCtx = {
    fileName: 'DBTesting',
    fs: ''
}


//test
iapProjectsTest()

//test functions
function iapProjectsTest () {
    logCtx.fn = 'iapProjectsTest';
    logger.logDebug("Test started", logCtx);

    // var session_date = '2022-01-01';
    var session_id = '14';
    iapDB.fetchProjects(session_id, (error, data) => {
        if (error) {
            logger.logError(error, logCtx);
        }
        logger.logDebug("Returned data: " + data, logCtx);
        logger.logDebug("Test ended", logCtx);
    });
}