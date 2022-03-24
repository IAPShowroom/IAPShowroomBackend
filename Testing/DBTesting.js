/**
 * Test file for Databse operations.
 */

const iapDB = require('../Database/iapProxy.js');
const { logError, logDebug } = require('../Utility/Logger.js');
let logCtx = {
    fileName: 'DBTesting',
    fs: ''
}


//test
iapProjectsTest()

//test functions
function iapProjectsTest () {
    logCtx.fn = 'iapProjectsTest';
    logDebug("Test started", logCtx);

    // var session_date = '2022-01-01';
    var session_id = '14';
    iapDB.fetchProjects(session_id, (error, data) => {
        if (error) {
            logError(error, logCtx);
        }
        logDebug("Returned data: " + data, logCtx);
        logDebug("Test ended", logCtx);
    });
}