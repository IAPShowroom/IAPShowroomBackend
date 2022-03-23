/**
 * Test file for Utilities.
 */

var logger = require('../Utility/Logger.js');
let logCtx = {
    fileName: 'UtilityTesting',
    fn: ''
}


//test
logDebugTest();
logErrorTest();

//test functions
function logDebugTest () {
    logCtx.fn = 'logDebugTest';
    logger.logDebug("Hey what's up");
    logger.logDebug("testing testing", logCtx);
}

function logErrorTest () {
    logCtx.fn = 'logErrorTest';
    logger.logError("ahh! emergency!");
    logger.logError("ahh! emergency!", logCtx);
}

