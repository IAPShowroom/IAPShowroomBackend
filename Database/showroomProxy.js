/**
 * Database proxy file, used to interface with the Showroom's database.
 */

const { Pool } = require('pg');
const config = require('../Config/config');
const dbConfig = config.showroomDBConfig;
const { logError, log } = require('../Utility/Logger.js');
const dbUtils = require('../Utility/DbUtils');
const async = require('async');
const bcrypt = require('bcrypt');

let logCtx = {
    fileName: 'showroomProxy.js',
    fn: ''
}

const EVENT_PROPERTIES = 6;
const MAX_ASYNC = 1;

const pool = new Pool({
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.database,
    password: dbConfig.password,
    port: dbConfig.port,
    ssl: {
        rejectUnauthorized: false
    },
});

function registerUser (req, callback) { //TODO: test
    logCtx.fn = 'registerUser';
    var result = {};
    var saltRounds = 10;
    async.waterfall([
        function (callback) {
            //Hash password
            var plainText = req.body.password;
            bcrypt.hash(plainText, saltRounds, (error, hash) => {
                if (error) {
                    logError(error, logCtx);
                    callback(error, null);
                } else {
                    callback(null, hash);
                }
            });
        },
        function (hash, callback) {
            //Persist general user info and retrieve user ID
            registerGeneralUser(hash, req.body, callback);
        },
        function (userID, callback) {
            //Add user ID to result
            result.userID = userID;
            //Check role and persist role specific info
            var role = req.body.role;
            switch (role) {
                case 'student_researcher':
                    registerStudent(userID, req.body, callback);
                    break;
                case 'advisor':
                    registerAdvisor(userID, req.body, callback);
                    break;
                case 'company_representative':
                    registerCompanyRep(userID, req.body, callback);
                    break;
                default:
                    callback(null, null);
            }
        }
    ], (error, result) => {
        //Send responses
        if (error) {
            callback(error, null);
        } else {
            callback(null, result)
        }
    });
}

function registerGeneralUser (hash, body, callback) { //TODO: test
    logCtx.fn = 'registerGeneralUser';
    var firstName = body.first_name;
    var lastName = body.last_name;
    var email = body.email;
    var password = hash;
    var role = body.user_role;
    var gender = body.gender;
    var verified = false;
    let query = "insert into users (first_name, last_name, email, password, user_role, gender, verifiedemail) values ($1, $2, $3, $4, $5, $6, $7)";
    let values = [firstName, lastName, email, password, role, gender, verified];
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            let result = res.rows.length > 0 ? res.rows : null;
            
            //Retrieve user ID
            dbUtils.makeQueryWithParams(pool, "select userid from users where email = $1", [email], callback, (error, res) => {
                if (error) {
                    logError(error, logCtx);
                    callback(error, null);
                } else {
                    var userID = res.rows[0];
                    log("Retrieved user ID.", logCtx);
                    callback(null, userID);
                }
            }); 
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function registerStudent (userID, body, callback) { //TODO: test
    logCtx.fn = 'registerStudent';
    var projectIDs = body.projectids;
    var department = body.department;
    var gradDate = body.grad_date;
    var isPM = body.ispm;
    var validatedmember = body.validatedmember;
    var query = "insert into student_researchers (userid, team_project, department, grad_date, ispm, validatedmember) values ($1, $2, $3, $4, $5, $6)";
    var values = [userID, null, department, gradDate, isPM, validatedmember]; //team_project is not used
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = res.rows.length > 0 ? res.rows : null;
            callback(null, result);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function registerAdvisor (userID, body, callback) { //TODO: test
    logCtx.fn = 'registerAdvisor';
    var projectIDs = body.projectid; //is this a list of project ids? (and hence also text?)
    var query = "insert into advisors (userid, team_project) values ($1, $2)";
    var values = [userID, projectIDs];
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = res.rows.length > 0 ? res.rows : null;
            callback(null, result);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function registerCompanyRep (userID, body, callback) { //TODO: test
    logCtx.fn = 'registerCompanyRep';
    var companyName = body.company_name;
    var query = "insert into company_representatives (userid, company_name) values ($1, $2)";
    var values = [userID, companyName];
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = res.rows.length > 0 ? res.rows : null;
            callback(null, result);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function comparePasswords (email, plaintextPassword, callback) {
    logCtx.fn = 'comparePasswords';
    // var result = { userID: 14 admin: true}; //testing
    var result = {};
    async.waterfall([
        function (callback) {
            //Get hash from database (and retrieve user ID)
            fetchHashAndUserID(email, (error, hash, userID) => { //TODO: test
                if (error) {
                    logError(error, logCtx);
                    callback(error);
                } else {
                    result.userID = userID; //Add user iD to result object
                    callback(null, hash);
                }
            });
        },
        function (hash, callback) {
            //Compare passwords
            bcrypt.compare(plaintextPassword, hash, (error, valid) => {
                logCtx.fn = 'bcrypt.compare';
                if (error) {
                    logError(error, logCtx); 
                    callback(error);
                } else {
                    if (valid) {
                        log("Successfully validated user credentials.", logCtx);
                        callback(null);
                    } else {
                        var errorMsg = "Invalid email or password.";
                        logError(errorMsg, logCtx);
                        callback(new Error(errorMsg));
                    }
                }
            });
        },
        function (callback) {
            //Check if user is admin (and add to result along with user ID)
            isUserAdmin(result.userID, (error, isAdmin) => { //TODO: test
                if (error) {
                    logError(error, logCtx);
                    callback(error);
                } else {
                    result.admin = isAdmin; //set as either true or false
                    callback(null);
                }
            });
        }
    ], (error) => {
        //Send responses
        if (error) {
            callback(error, null);
        } else {
            callback(null, result)
        }
    });
}

function fetchHashAndUserID (email, callback) {
    logCtx.fn = 'fetchHashAndUserID';
    var query = "select userid, password from users where email = $1";
    var values = [email];
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rows.length == 0 ) {
                var errorMsg = "Invalid email or password."; //mention password even though we're checking email only to confuse hackers
                logError(errorMsg, logCtx);
                callback(new Error(errorMsg), null, null);
            } else {
                let userID = res.rows[0].userid;
                let hash = res.rows[0].password;
                callback(null, hash, userID); //Success
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function isUserAdmin (userID, callback) {
    logCtx.fn = 'isUserAdmin';
    var query = "select adminid from admins where userid = $1";
    var values = [userID];
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rows.length == 0 ) {
                callback(null, false);
            } else {
                callback(null, true); //Success
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function validateEmail (email, callback) { //TODO: test
    //Verify that email is not already being used
    logCtx.fn = 'validateEmail';
    var query = "select userid from users where email = $1";
    var values = [email];
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rows.length > 0 ) {
                var errorMsg = "Email is already in use.";
                logError(errorMsg, logCtx);
                callback(new Error(errorMsg));
            } else {
                callback(null); //Success
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function createEvents (eventList, callback) {
    logCtx.fn = 'createEvents';
    var result;
    var eventArrays = eventList.map(obj => Object.values(obj)); //get array of arrays
    //Insert each array into DB
    async.forEachLimit(eventArrays, MAX_ASYNC, (event, cb) => {
        if (event.length != EVENT_PROPERTIES) {
            let errorMsg = "Cannot persist event with invalid amount of properties.";
            logError(errorMsg, logCtx);
            cb(new Error(errorMsg));
        } else {
            dbUtils.makeQueryWithParams(pool,"insert into iap_events (adminid, startTime, duration, title, projectid, e_date) values ($1, $2, $3, $4, $5, $6)", event, cb, (error, res) => {
                if (error) {
                    logError(error, logCtx);
                } else {
                    log("Got response from DB - rowCount: " + res.rowCount, logCtx);
                    result = res.rows; //returns []
                }
                cb(error);
            });
        }
    }, (error) => {
        if (error) {
            callback(error, null);
        } else {
            callback(null, result);
        }
    });
}

function getEvents(upcoming, time, date, callback) {
    logCtx.fn = 'getEvents';
    var getAll = "select * from iap_events";
    var getUpcoming = "select * from iap_events where starttime > $1 and e_date = $2";
    var query = upcoming ? getUpcoming : getAll;
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rowCount == 0) {
                callback(null, null); //No events found, send null result to provoke 404 error
            } else {
                var result = upcoming ? res.rows[0] : res.rows; //returns events
                callback(null, result);
            }
        }
    };
    if (upcoming) {
        dbUtils.makeQueryWithParams(pool, query, [time, date], callback, queryCb);
    } else {
        dbUtils.makeQuery(pool, query, callback, queryCb);
    }
}

function updateEvent (eventID, event, callback) {
    logCtx.fn = 'updateEvent';
    var query = "update iap_events set adminid=$1, starttime=$2, duration=$3, title=$4, projectid=$5, e_date=$6 where eventid = $7";
    var values = [event.adminid, event.starttime, event.duration, event.title, event.projectid, event.e_date, eventID];
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = res.rows; //returns []
            callback(null, result);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

//TODO: test w/ DB
function deleteEvent (eventID, callback) {
    logCtx.fn = 'deleteEvent';
    var query = "update iap_events set isdeleted=true where eventid = $1"; 
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = res.rows;
            callback(null, result);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [eventID], callback, queryCb);
}

function endPool() {
    logCtx.fn = 'endPool';
    //Close the connection pool when server closes
    log("Closing connection pool.", logCtx);
    return pool.end();
}

module.exports = {
    registerUser: registerUser,
    createEvents: createEvents,
    getEvents: getEvents,
    updateEvent: updateEvent,
    deleteEvent: deleteEvent,
    endPool: endPool,
    validateEmail: validateEmail,
    comparePasswords: comparePasswords
}