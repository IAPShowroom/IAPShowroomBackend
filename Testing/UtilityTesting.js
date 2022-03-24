/**
 * Test file for Utilities.
 */

var { logDebug, logError} = require('../Utility/Logger.js');
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
    logDebug("Hey what's up");
    logDebug("testing testing", logCtx);
}

function logErrorTest () {
    logCtx.fn = 'logErrorTest';
    logError("ahh! emergency!");
    logError("ahh! emergency!", logCtx);
}

