/**
 * Test file for BBB operations.
 */

 const testData = require('./TestData.js');
 const streaming = require('../Handlers/VideoStreamingHandlers.js');
 const { logError, logDebug, logTest } = require('../Utility/Logger.js');
 
 let logCtx = {
     fileName: 'BBBTesting',
     fs: ''
 }
 
 
 //run test:

 testChecksum();
 
 
 //test functions:
 
function testChecksum () {
    logCtx.fn = 'testChecksum';
    logTest("Start test", logCtx);
    var callName = 'create';
    var meetingName = 'RUM Solar 2022';
    var meetingID = '1';
    var moderatorPW = 'testmodpass';
    var queryString = "name=" + meetingName + "&meetingID=" + meetingID + "&moderatorPW=" + moderatorPW;
    var checksum = streaming.generateChecksum(callName, queryString);
    logTest("checksum: " + checksum, logCtx);
    logTest("End test", logCtx);
}
 
