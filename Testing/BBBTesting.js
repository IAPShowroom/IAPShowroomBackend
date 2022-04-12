/**
 * Test file for BBB operations.
 */

const testData = require('./TestData.js');
const streaming = require('../Handlers/VideoStreamingHandlers.js');
const config = require('../Config/config.js');
const { logError, logDebug, logTest, log } = require('../Utility/Logger.js');
 
//https://iapstream.ece.uprm.edu/bigbluebutton/api
var urlPrefix = "https://" + config.BBB_HOST + config.bbb_prefix;

let logCtx = {
    fileName: 'BBBTesting',
    fs: ''
}
 
 
 //run test:

//  testChecksum();
// testGetMeetingInfoURL();
testGetMeetingInfo();
 
 
 //test functions:
 
function testGetMeetingInfo () {
    logCtx.fn = 'testGetMeetingInfo';
    logTest("Start test", logCtx);
    var projectID = 1;
    streaming.getMeetingInfo(projectID, (error, result) => {
        if (error) logError(error, logCtx);
        logTest("result: ", logCtx);
        console.log(result);
        logTest("End test", logCtx);
    });
}

function testGetMeetingInfoURL () {
    logCtx.fn = 'testGetMeetingInfoURL';
    logTest("Start test", logCtx);
    //Construct URL for BBB API call
    var queryParams = {
        meetingID: "01",
    }
    var queryString = (new URLSearchParams(queryParams)).toString();
    var checksum = streaming.generateChecksum('getMeetingInfo', queryString);
    var url = urlPrefix + "/getMeetingInfo?" + queryString + "&checksum=" + checksum;
    // var checksum = streaming.getMeetingInfo(callName, queryString); //Not yet
    logTest("url: " + url, logCtx);
    logTest("End test", logCtx);
}

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
 
