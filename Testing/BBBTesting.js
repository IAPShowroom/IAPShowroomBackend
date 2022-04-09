/**
 * Test file for BBB operations.
 */

 const testData = require('./TestData.js');
 const streaming = require('../Handlers/VideoStreamingHandlers.js');
 const { logError, logDebug, logTest } = require('../Utility/Logger.js');
 const { XMLParser } = require('fast-xml-parser');

 const parser = new XMLParser({ ignoreAttributes: false });
 
 let logCtx = {
     fileName: 'BBBTesting',
     fs: ''
 }
 
 
 //run test:

//  testChecksum();
testReadXML();
 
 
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

function testReadXML() {
    logCtx.fn = 'testReadXML';
    logTest("Start test", logCtx);
    var jsonResp = parser.parse(testData.getMeetingInfoXMLSuccessResponse);
    logTest("jsonResp: ", logCtx);
    console.log(jsonResp);
    logTest("End test", logCtx);
}
