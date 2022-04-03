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
            var role = req.body.user_role;
            switch (role) {
                case config.userRoles.studentResearcher:
                    registerStudent(userID, req.body, callback);
                    break;
                case config.userRoles.advisor:
                    registerAdvisor(userID, req.body, callback);
                    break;
                case config.userRoles.companyRep:
                    registerCompanyRep(userID, req.body, callback);
                    break;
                default:
                    callback(null);
            }
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

function registerGeneralUser (hash, body, callback) {
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
            //Retrieve user ID
            dbUtils.makeQueryWithParams(pool, "select userid from users where email = $1", [email], callback, (error, res) => {
                if (error) {
                    logError(error, logCtx);
                    callback(error, null);
                } else {
                    var userID = res.rows[0].userid;
                    log("Retrieved user ID.", logCtx);
                    callback(null, userID);
                }
            }); 
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function registerStudent (userID, body, callback) {
    logCtx.fn = 'registerStudent';
    var projectIDList = body.projectids; //array of project ids for this student
    var department = body.department;
    var gradDate = body.grad_date;
    var isPM = body.ispm;
    var validatedmember = body.validatedmember;
    var query = "insert into student_researchers (userid, department, grad_date, ispm, validatedmember) values ($1, $2, $3, $4, $5)";
    var values = [userID, department, gradDate, isPM, validatedmember];
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            associateProjectsWithUser(userID, projectIDList, callback);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function registerAdvisor (userID, body, callback) {
    logCtx.fn = 'registerAdvisor';
    var projectIDList = body.projectids;
    var query = "insert into advisors (userid) values ($1)";
    var values = [userID];
    var queryCb = (error, res) => {
        if (error) {
            logError(error, logCtx);
            callback(error);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            associateProjectsWithUser(userID, projectIDList, callback);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function registerCompanyRep (userID, body, callback) {
    logCtx.fn = 'registerCompanyRep';
    var companyName = body.company_name;
    var query = "insert into company_representatives (userid, company_name) values ($1, $2)";
    var values = [userID, companyName];
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            callback(null);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function associateProjectsWithUser (userID, projectIDList, callback) {
    logCtx.fn = 'associateProjectsWithUser';
    if (projectIDList.length == 0) {
        let errorMsg = "Empty project list.";
        logError(errorMsg, logCtx);
        callback(new Error(errorMsg));
    } else {
        //Insert each project ID into DB
        async.forEachLimit(projectIDList, MAX_ASYNC, (projectID, cb) => {
            var values = [userID, projectID];
            dbUtils.makeQueryWithParams(pool,"insert into participates (userid, projectid) values ($1, $2)", values, cb, (error, res) => {
                if (error) {
                    logError(error, logCtx);
                } else {
                    log("Got response from DB - rowCount: " + res.rowCount, logCtx);
                }
                cb(error);
            });
        }, (error) => {
            callback(error); //null if no error
        });
    }
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

//TODO: test with delete update
function getEvents(upcoming, time, date, callback) {
    logCtx.fn = 'getEvents';
    var getAll = "select * from iap_events";
    var getUpcoming = "select * from iap_events where starttime > $1 and e_date = $2";
    var query = (upcoming ? getUpcoming : getAll) + " and isdeleted = false"; //TODO: test
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

function getRoleAndName (userID, callback) {
    logCtx.fn = 'getRoleAndName';
    var query = "select users.user_role, users.first_name, users.last_name, p.projectid from users left join participates as p on users.userid = p.userid where users.userid = $1"; 
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = {};
            var onlyOne = res.rows.length == 1;
            result.role = res.rows[0].user_role;
            result.first_name = res.rows[0].first_name;
            result.last_name = res.rows[0].last_name;
            if (onlyOne) {
                //If single project ID, place inside array, else keep as null
                result.projectIDs = (res.rows[0].projectid != null) ? [res.rows[0].projectid] : null;        
            } else {
                //Flatten array of objects to array of project ids
                result.projectIDs = res.rows.map( row => row.projectid );
            }
            callback(null, result);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [userID], callback, queryCb);
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
    comparePasswords: comparePasswords,
    registerGeneralUser: registerGeneralUser,
    associateProjectsWithUser: associateProjectsWithUser,
    getRoleAndName: getRoleAndName
}