/**
 * Test file for Databse operations.
 */

const iapDB = require('../Database/iapProxy.js');
const showroomDB = require('../Database/showroomProxy.js');
const authHandler = require('../Handlers/AuthHandlers.js');
const showroomHandler = require('../Handlers/ShowroomHandlers.js');
const testData = require('./TestData.js');
const config = require('../Config/config.js');
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
// testUpdateEvent();
// testRegisterUser();
// testComparePassword();
// testIAPValidateEmail();
// testShowroomValidateEmail();
// testRegisterGeneralUser();
// testGetRoleAndName();
// testPostMeetHistory();
// testGetRolesAndNameFromMeetHistory();
// testGetStudentProject();
// testGetQnARoomInfo();
// testGetSessions();
// testSendEmail();
// testGenerateEUUID();
// testFetchShowroomSession();
// testCheckSessionAndUpdate();
// testGetIAPPIDFromShowroomPID();
// testFetchProjectsForEmail();
// testGetShowroomPIDFromIAPPID();
// testValidateEmailWithUserID();
// testFetchEUUID();
// testFetchProjectIDsFromParticipates();
// testSetPlay();
// testDeleteFromParticipates();
testUpdateParticipatesTable();


//test functions:

function testSetPlay() {
    logCtx.fn = 'testSetPlay';
    //test cases:
    //a = [], b = [1,2,3]
    //a = [1,2,3], b = []
    //a = [1,2,3], b = [1,2,3]
    //a = [1,2,3], b = [1,2,4]
    //a = [1,2,4], b = [1,2,3]
    var projectsMatch = true;
    var projectsFromIAP = [0];
    var projectsFromParticipates = [0];
    var iapSet = new Set(projectsFromIAP);
    console.log("iapSet");
    console.log(iapSet);
    console.log("projectsFromParticipates");
    console.log(projectsFromParticipates);
    projectsFromParticipates.forEach((participatesPID) => {
        if (!iapSet.has(participatesPID)) {
            projectsMatch = false; //There was an inconsistency between the two lists
            logTest("Projects from IAP and participates did not match.", logCtx);
        }
    });
    logTest("projectsMatch: " + projectsMatch, logCtx);
}

function testUpdateParticipatesTable() {
    logCtx.fn = 'testUpdateParticipatesTable';
    logTest("Test started", logCtx);
    var finalResult = {
        userID: 20
    }
    // var email = 'gerson.beauchamp@upr.edu'; // --> [114, 115]
    var email = 'jorge.vega6@upr.edu'; // --> []
    // var email = 'kevin.bonet@upr.edu'; // --> [108]
    authHandler.updateParticipatesTable(email, finalResult, (error, info) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Returned info: ", logCtx);
        console.log(info);
        showroomDB.endPool();
        iapDB.endPool();
        logTest("Test ended", logCtx);
    });
}

function testDeleteFromParticipates() {
    logCtx.fn = 'testDeleteFromParticipates';
    logTest("Test started", logCtx);
    var userID = 20;
    showroomDB.deleteFromParticipates(userID, (error, info) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Returned info: ", logCtx);
        console.log(info);
        showroomDB.endPool();
        logTest("Test ended", logCtx);
    });
}

function testFetchProjectIDsFromParticipates() {
    logCtx.fn = 'testFetchProjectIDsFromParticipates';
    logTest("Test started", logCtx);
    var userID = 134;
    showroomDB.fetchProjectIDsFromParticipates(userID, (error, info) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Returned info: ", logCtx);
        console.log(info);
        showroomDB.endPool();
        logTest("Test ended", logCtx);
    });
}

function testFetchEUUID() {
    logCtx.fn = 'testFetchEUUID';
    logTest("Test started", logCtx);
    var userID = 71;
    var type = config.euuidTypes.verify;
    showroomDB.fetchEUUID(userID, type, (error, info) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Returned info: ", logCtx);
        console.log(info);
        showroomDB.endPool();
        logTest("Test ended", logCtx);
    });
}

function testGetUserIDFromEmail() {
    logCtx.fn = 'testGetUserIDFromEmail';
    logTest("Test started", logCtx);
    var email = 'jorge.e.vega6@gmail.com';
    showroomDB.getUserIDFromEmail(email, (error, info) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Returned info: ", logCtx);
        console.log(info);
        showroomDB.endPool();
        logTest("Test ended", logCtx);
    });
}

function testValidateEmailWithUserID() {
    logCtx.fn = 'testValidateEmailWithUserID';
    logTest("Test started", logCtx);
    var email = 'jorge.e.vega6@gmail.com';
    var userID = 70;
    showroomDB.validateEmailWithUserID(userID, email, (error, info) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Returned info: ", logCtx);
        console.log(info);
        showroomDB.endPool();
        logTest("Test ended", logCtx);
    });
}

function testFetchProjectsForEmail() {
    logCtx.fn = 'testFetchProjectsForEmail';
    logTest("Test started", logCtx);
    // var email = 'gerson.beauchamp@upr.edu';
    var email = 'kevin.bonet@upr.edu';
    iapDB.fetchProjectsForEmail(email, (error, info) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Returned info: ", logCtx);
        console.log(info);
        iapDB.endPool();
        logTest("Test ended", logCtx);
    });
}

function testGenerateEUUID() {
    logCtx.fn = 'testGenerateEUUID';
    logTest("Test started", logCtx);
    var userID = 3;
    authHandler.generateEUUID(userID, (error, info) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Returned info: ", logCtx);
        console.log(info);
        showroomDB.endPool();
        logTest("Test ended", logCtx);
    });
}

function testGetShowroomPIDFromIAPPID() {
    logCtx.fn = 'testGetShowroomPIDFromIAPPID';
    logTest("Test started", logCtx);
    var iapPID = 111;
    showroomDB.getShowroomPIDFromIAPPID(iapPID, (error, info) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Returned info: ", logCtx);
        console.log(info);
        showroomDB.endPool();
        logTest("Test ended", logCtx);
    });
}

function testGetIAPPIDFromShowroomPID() {
    logCtx.fn = 'testGetIAPPIDFromShowroomPID';
    logTest("Test started", logCtx);
    var showroomPID = 5;
    showroomDB.getIAPPIDFromShowroomPID(showroomPID, (error, info) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Returned info: ", logCtx);
        console.log(info);
        showroomDB.endPool();
        logTest("Test ended", logCtx);
    });
}

function testCheckSessionAndUpdate() {
    logCtx.fn = 'testCheckSessionAndUpdate';
    logTest("Test started", logCtx);
    var iapSessionID = 14;
    showroomHandler.checkSessionAndUpdate(iapSessionID, (error, info) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Returned info: ", logCtx);
        console.log(info);
        showroomDB.endPool();
        logTest("Test ended", logCtx);
    });
}

function testFetchShowroomSession() {
    logCtx.fn = 'testFetchShowroomSession';
    logTest("Test started", logCtx);
    showroomDB.fetchShowroomSession((error, info) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Returned info: ", logCtx);
        console.log(info);
        showroomDB.endPool();
        logTest("Test ended", logCtx);
    });
}

function testSendEmail() {
    logCtx.fn = 'testSendEmail';
    logTest("Test started", logCtx);
    var email = "jorge.e.vega6@gmail.com";
    var subject = "test subject";
    var message = "Hello world, 1 2 3";
    authHandler.sendEmail(email, subject, message, (error, info) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Returned info: ", logCtx);
        console.log(info);
        logTest("Test ended", logCtx);
    });
}

function testGetSessions() {
    logCtx.fn = 'testGetSessions';
    logTest("Test started", logCtx);
    var latest = true;
    iapDB.getSessions(latest, (error, data) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Returned data: ", logCtx);
        console.log(data);
        iapDB.endPool();
        logTest("Test ended", logCtx);
    });
}

function testGetQnARoomInfo() {
    logCtx.fn = 'testGetQnARoomInfo';
    logTest("Start test", logCtx);
    var projectID = 1;
    showroomDB.getQnARoomInfo(projectID, (error, result) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest(" result: ", logCtx);
        console.log(result);
        showroomDB.endPool();
        logTest("End test", logCtx);
    });
}

function testGetStudentProject() {
    logCtx.fn = 'testGetStudentProject';
    logTest("Start test", logCtx);
    var projectID = 1;
    var userID = 20;
    showroomDB.getStudentProject(userID, projectID, (error, result) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest(" result: ", logCtx);
        console.log(result);
        showroomDB.endPool();
        logTest("End test", logCtx);
    });
}

function testGetRolesAndNameFromMeetHistory() {
    logCtx.fn = 'testGetRolesAndNameFromMeetHistory';
    logTest("Start test", logCtx);
    var projectID = 47;
    showroomDB.fetchUserIDsAndRoles(projectID, (error, result) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest(" result: ", logCtx);
        console.log(result);
        showroomDB.endPool();
        logTest("End test", logCtx);
    });
}

function testGetRoleAndName () {
    logCtx.fn = 'testGetRoleAndName';
    logTest("Start test", logCtx);
    // var userID = 1; //student researcher two projects
    // var userID = 19; //student researcher one project
    var userID = 13; //general user no projects
    showroomDB.getRoleAndName(userID, (error, result) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest(" result: ", logCtx);
        console.log(result);
        showroomDB.endPool();
        logTest("End test", logCtx);
    });
}

function testPostMeetHistory () {
    logCtx.fn = 'testPostMeetHistory';
    logTest("Start test", logCtx);
    var meetingID = '1';
    // var meetingID = '47';
    var userID = '1';
    showroomDB.postMeetHistory(userID, meetingID, (error, result) => {
        if (error) {
            logError(error, logCtx);
        } else {
            logTest("result", logCtx);
            console.log(result);
        }
        showroomDB.endPool();
        logTest("End test", logCtx);
    });
}

function testAssociateProjectsWithUser () {
    logCtx.fn = 'testAssociateProjectsWithUser';
    logTest("Start test", logCtx);
    var userID = 1;
    var projectIDList = [1, 2];
    var emptyList = [];
    showroomDB.associateProjectsWithUser(userID, projectIDList, (error) => {
        if (error) {
            logError(error, logCtx);
        } else {
            logTest("No errors, check DB :)", logCtx);
        }
        iapDB.endPool();
        logTest("End test", logCtx);
    });
}

function testShowroomValidateEmail() {
    logCtx.fn = 'testShowroomValidateEmail';
    logTest("Start test", logCtx);
    var email = "jorge.vega6@upr.edu"; //is in showroom
    // var email = "wiliel.florenciani@upr.edu"; //is not in showroom
    showroomDB.validateEmail(email, (error) => {
        if (error) {
            logError(error, logCtx);
            logTest("Email is already in use", logCtx);
        } else {
            logTest("Email can be used to register", logCtx);
        }
        iapDB.endPool();
        logTest("End test", logCtx);
    });
}

function testIAPValidateEmail() {
    logCtx.fn = 'testIAPValidateEmail';
    logTest("Start test", logCtx);
    // var email = "jorge.vega6@upr.edu"; //is in IAP
    var email = "wiliel.florenciani@upr.edu"; //is not in IAP
    iapDB.validateEmail(email, (error) => {
        if (error) {
            logError(error, logCtx);
            logTest("Email is not in IAP", logCtx);
        } else {
            logTest("Email is in IAP", logCtx);
        }
        iapDB.endPool();
        logTest("End test", logCtx);
    });
}

function testComparePassword() {
    logCtx.fn = 'testComparePassword';
    logTest("Start test", logCtx);
    var emailAdmin = testData.normalUser.email;
    var passAdmin = testData.notInDBUser.password;
    showroomDB.comparePasswords(emailAdmin, passAdmin, (error, result) => {
        if (error) logError(error, logCtx);
        if (result) {
            logTest("result: ", logCtx);
            console.log(result);
        }
        showroomDB.endPool();
        logTest("End test", logCtx);
    });
}

function testRegisterUser() { 
    logCtx.fn = 'testRegisterUser';
    logTest("Start test", logCtx);
    var req = { body: {} };

    req.body.first_name = testData.normalUser.first_name;
    req.body.last_name = testData.normalUser.last_name;
    req.body.email = testData.normalUser.email;
    req.body.password = testData.normalUser.password;
    req.body.gender = testData.normalUser.gender;
    req.body.user_role = testData.normalUser.user_role;

    showroomDB.registerUser(req, (error, result) => {
        if (error) logError(error, logCtx);
        if (result) {
            logTest("result: ", logCtx);
            console.log(result);
        }
        showroomDB.endPool();
        logTest("End test", logCtx);
    });
}

function testRegisterGeneralUser() { 
    logCtx.fn = 'testRegisterUser';
    logTest("Start test", logCtx);
    var body = {};
    var hash = "fakehash";

    body.first_name = testData.normalUser.first_name;
    body.last_name = testData.normalUser.last_name;
    body.email = testData.normalUser.email;
    body.password = testData.normalUser.password;
    body.gender = testData.normalUser.gender;
    body.user_role = testData.normalUser.user_role;

    showroomDB.registerGeneralUser(hash, body, (error, result) => {
        if (error) logError(error, logCtx);
        if (result) {
            logTest("result: ", logCtx);
            console.log(result);
        }
        showroomDB.endPool();
        logTest("End test", logCtx);
    });
}

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
            showroomDB.endPool();
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
    var upcoming = false;
    // var upcoming = true;
    var time = '7:30 AM';
    var date = '04-25-22';
    showroomDB.getEvents(false, true, upcoming, time, date, (error, result) => {
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
    iapDB.fetchProjects((error, result) => {
        if (error) {
            logError(error, logCtx);
        }
        logTest("Result:", logCtx);
        console.log(result);
        iapDB.endPool();
        logTest("Test ended", logCtx);
    });
}