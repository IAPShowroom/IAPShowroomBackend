/**
 * Test file for Databse operations.
 */

const iapDB = require('../Database/iapProxy.js');
const showroomDB = require('../Database/showroomProxy.js');
const testData = require('./TestData.js');
const { logError, logDebug, logTest } = require('../Utility/Logger.js');

let logCtx = {
    fileName: 'DBTesting',
    fs: ''
}


//run test:

// iapProjectsTest();
// testEventArrayMapping();
// testCreateEvent();
// testGetEvents();
testUpdateEvent();


//test functions:

function testCreateEvent() {
    logCtx.fn = 'testCreateEvent';
    var eventList = testData.exEventList;
    // var eventList = [testData.exEvent];
    
    logTest("Start Test", logCtx);
    showroomDB.createEvents(eventList, (error, result) => {
        if (error) logError(error, logCtx);
        if (result) {
            logTest("result: ", logCtx);
            console.log(result);
        }
        logTest("End test", logCtx);
    });
}

function testUpdateEvent() {
    logCtx.fn = 'testUpdateEvent';
    var event = testData.exEventUpdateDate;
    var eventID = 8;
    
    logTest("Start Test", logCtx);
    showroomDB.updateEvent(eventID, event, (error, result) => {
        if (error) logError(error, logCtx);
        if (result) {
            logTest("result: ", logCtx);
            console.log(result);
        }
        showroomDB.endPool();
        logTest("End test", logCtx);
    });
}

function testGetEvents() {
    logCtx.fn = 'testGetEvents';    
    logTest("Start Test", logCtx);
    // var upcoming = false;
    var upcoming = true;
    var time = '7:30 AM';
    var date = '04-25-22';
    showroomDB.getEvents( upcoming, time, date, (error, result) => {
        if (error) logError(error, logCtx);
        if (result) {
            logTest("result: ", logCtx);
            console.log(result);
        }
        logTest("End test", logCtx);
    });
}

function testEventArrayMapping() {
    logCtx.fn = 'testEventArrayMapping';
    var eventList = testData.exEventList;
    var eventArrays = eventList.map(obj => Object.values(obj)); //get array of arrays
    logTest("eventArrays: ", logCtx);
    console.log(eventArrays);
}

function iapProjectsTest () {
    logCtx.fn = 'iapProjectsTest';
    logTest("Test started", logCtx);
    var session_id = '14';
    iapDB.fetchProjects(session_id, (error, data) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Returned data: " + data, logCtx);
        logTest("Test ended", logCtx);
    });
}