/**
 * Test file for jest test cases for the Showroom Endpoints.
 */


const axios = require('axios').default;
const testData = require('./JestTestData.js');
const { logTest } = require('../Utility/Logger.js');

let logCtx = {
    fileName: 'ShowroomEndpoints.test',
    fn: ''
}

//Global variables for testing
var env = process.env;
var adminEmail = env.TEST_ADMIN_EMAIL;
var adminPassword = env.TEST_ADMIN_PASSWORD;
var authHeadersAdmin = {
    headers: {
        "Cookie": ''
    },
    withCredentials: true
};

//Get login credentials
beforeAll( async () => {
    logCtx.fn = 'beforeAll';
    await axios.post('http://localhost:8080/api/auth/login', {email: adminEmail, password: adminPassword}).then((res) => {
        var fullCookie = res.headers["set-cookie"][0];
        var parsedCookie = fullCookie.split(';')[0];
        authHeadersAdmin.headers["Cookie"] = parsedCookie;
    }).catch((error) => {
        logTest("Error logging admin in.", logCtx);
        logTest(error, logCtx);
    });
});

describe('Test test endpoint.', () => {
    test('GET /test', () => {
        axios.get('http://localhost:8080/test').then((res) => {
            expect(res.response.status).toBe(200);
            expect(res.response.data.message).toBe('Hello.');
        }).catch((error) => {
            expect(error).toBeDefined();
        });
    });
});


describe('Showroom Endpoints: GET /api/showroom/stats', () => {
    test('Successful test', async () => {
        expect.assertions(1);
        await axios.get('http://localhost:8080/api/showroom/stats', authHeadersAdmin).then((response) => {
            expect(response.status).toBe(200);
            var result = response.data.payload;
            expect(typeof result.generalParticipants).toBe('number');
            expect(typeof result.researchStudParticipants).toBe('number');
            expect(typeof result.companyRepParticipants).toBe('number');
            expect(typeof result.professorParticipants).toBe('number');
            expect(typeof result.totalWomen).toBe('number');
            expect(typeof result.totalMen).toBe('number');
            expect(typeof result.totalNotDisclosed).toBe('number');
            expect(typeof result.resStudICOM).toBe('number');
            expect(typeof result.resStudINEL).toBe('number');
            expect(typeof result.resStudINSO).toBe('number');
            expect(typeof result.resStudCIIC).toBe('number');
            expect(typeof result.resStudINME).toBe('number');
            expect(typeof result.resStudOther).toBe('number');
            expect(typeof result.resStudGRAD).toBe('number');
            expect(typeof result.totalResStudWomen).toBe('number');
            expect(typeof result.totalResStudMen).toBe('number');
            expect(typeof result.totalResStudNotDisclosed).toBe('number');
        }).catch((error) => {
            expect(error).toBeUndefined();
        });
    });
    test('Failure test', async () => {
        expect.assertions(18);
        await axios.get('http://localhost:8080/api/showroom/stats', authHeadersAdmin).then((response) => {
            expect(response.status).toBe(200);
            var result = response.data.payload;
            expect(typeof result.generalParticipants).toBe('number');
            expect(typeof result.researchStudParticipants).toBe('number');
            expect(typeof result.companyRepParticipants).toBe('number');
            expect(typeof result.professorParticipants).toBe('number');
            expect(typeof result.totalWomen).toBe('number');
            expect(typeof result.totalMen).toBe('number');
            expect(typeof result.totalNotDisclosed).toBe('number');
            expect(typeof result.resStudICOM).toBe('number');
            expect(typeof result.resStudINEL).toBe('number');
            expect(typeof result.resStudINSO).toBe('number');
            expect(typeof result.resStudCIIC).toBe('number');
            expect(typeof result.resStudINME).toBe('number');
            expect(typeof result.resStudOther).toBe('number');
            expect(typeof result.resStudGRAD).toBe('number');
            expect(typeof result.totalResStudWomen).toBe('number');
            expect(typeof result.totalResStudMen).toBe('number');
            expect(typeof result.totalResStudNotDisclosed).toBe('number');
        }).catch((error) => {
            expect(error).toBeUndefined();
        });
    });
});