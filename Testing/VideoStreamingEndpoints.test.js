/**
 * Test file for jest test cases for the Video Streaming Endpoints.
 */

const axios = require('axios').default;
const testData = require('./JestTestData.js');
const { logTest } = require('../Utility/Logger.js');
const { XMLParser } = require('fast-xml-parser');
const xmlParser = new XMLParser({ ignoreAttributes: false });

let logCtx = {
    fileName: 'VideoStreamingEndpoints.test',
    fn: ''
}

var loginURL = "http://localhost:8080/api/auth/login";
var createMeeting01URL = "https://iapstream.ece.uprm.edu/bigbluebutton/api/create?name=Test+Meeting+1&meetingID=01&moderatorPW=c9733426-feb8-4645-a407-790edd64ddc1&attendeePW=8b47ce91-832a-43ef-9e49-28a03220434c&checksum=b6f8b60b0f35ad0349be229974581cc3162ef10c";
var endMeetingURL = "http://localhost:8080/api/meet/end";

//Global variables for testing
var env = process.env;
var adminEmail = env.TEST_ADMIN_EMAIL;
var adminPassword = env.TEST_ADMIN_PASSWORD;
var genUserEmail = env.TEST_GENERAL_USER_EMAIL;
var genUserPassword = env.TEST_GENERAL_USER_PASSWORD;

var authHeadersAdmin = { headers: { "Cookie": '' }, withCredentials: true };
var authHeadersGenUser = { headers: { "Cookie": '' }, withCredentials: true };

//Get login credentials
beforeAll( async () => {
    logCtx.fn = 'beforeAll';
    
    //Log in as Admin
    await axios.post(loginURL, {email: adminEmail, password: adminPassword}).then((res) => {
        var fullCookie = res.headers["set-cookie"][0];
        var parsedCookie = fullCookie.split(';')[0];
        authHeadersAdmin.headers["Cookie"] = parsedCookie;
    }).catch((error) => {
        logTest("Error logging admin in.", logCtx);
        logTest(error, logCtx);
    });

    //Log in as General User
    await axios.post(loginURL, {email: genUserEmail, password: genUserPassword}).then((res) => {
        var fullCookie = res.headers["set-cookie"][0];
        var parsedCookie = fullCookie.split(';')[0];
        authHeadersGenUser.headers["Cookie"] = parsedCookie;
    }).catch((error) => {
        logTest("Error logging general user in.", logCtx);
        logTest(error, logCtx);
    });
});

describe('Video Streaming Endpoints: POST /api/meet/end', () => {

    let adminOrNoAdminTestCases = [
        ['Successful Test: Admin', authHeadersAdmin, 200, 500],
        ['Fail Test: Not Admin', authHeadersGenUser, 200, 403]
    ];

    test.each(adminOrNoAdminTestCases)('%s', async (testTitle, authConfig, successCode, failCode) => {
        expect.assertions(3);
        //Create meeting for ID: 1
        await axios.post(createMeeting01URL).then((response) => {
            var jsonObj = xmlParser.parse(response.data);
            expect(jsonObj.response.returncode).toBe('SUCCESS');
        }).catch((error) => {
            expect(error).toBeUndefined();
        });
        //Make API call for end meeting
        await axios.post(endMeetingURL, { meeting_id: 1 }, authConfig).then((response) => {
            expect(response.status).toBe(successCode);
            expect(response.data.message).toBeDefined();
        }).catch((error) => {
            expect(error.response.status).toBe(failCode);
            expect(error.response.data.message).toBeDefined();
        });
    });

    let invalidRequestBodyTestCases = [
        ['Missing meeting_id in request body', {}],
        ['Incorrect properties in request body', { meting_id: 1 }],
        ['Invalid values in request body', { meeting_id: 'abc' }]
    ];

    test.each(invalidRequestBodyTestCases)('Fail Test: %s', async (testTitle, reqBody) => {
        expect.assertions(2);
        //Create meeting for ID: 1
        await axios.post(createMeeting01URL).then((response) => {
            var jsonObj = xmlParser.parse(response.data);
            expect(jsonObj.response.returncode).toBe('SUCCESS');
        }).catch((error) => {
            expect(error).toBeUndefined();
        });
        //Make API call for end meeting
        await axios.post(endMeetingURL, reqBody, authHeadersAdmin).then((response) => {
            expect(response.status).toBe(200);
            expect(response.data.message).toBeDefined();
        }).catch((error) => {
            expect(error.response.status).toBe(400);
        });
    });
});

//TODO: implement
// describe('Video Streaming Endpoints: POST /api/meet/join-stage', () => {
    
// });