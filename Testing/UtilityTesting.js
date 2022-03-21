/**
 * Test file for Utilities.
 */

var logger = require('../Utility/Logger.js')("UtiliityTesting");


//test
// logDebugTest();
logErrorTest();

//test functions
function logDebugTest () {
    logger.logDebug("Hey what's up");
}

function logErrorTest () {
    logger.logError("ahh! emergency!");
    logger.logError("ahh! emergency!", "logErrorTest");
}

