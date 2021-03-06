/**
 * Database proxy file, used to interface with the Showroom's database.
 */

const pg = require('pg');
const Pool = pg.Pool;
var types = pg.types;
types.setTypeParser(1114, function(stringValue) {
    return stringValue;
});
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
    ssl: config.LOCAL_DB === 'true' ? false : {
        rejectUnauthorized: false
    },
});

function registerUser (req, callback) {
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
                    result.isPM = req.body.ispm; //Add isPM 
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
    var upperCaseGender = body.gender == 'Undisclosed' ? 'other' : body.gender;
    var gender = upperCaseGender.toLowerCase();
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
    // var validatedmember = body.validatedmember;
    var query = "insert into student_researchers (userid, department, grad_date, ispm) values ($1, $2, $3, $4)";
    var values = [userID, department, gradDate, isPM];
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

function changePassword (userEmail, hashedPW, callback) {
    logCtx.fn = 'changePassword';
    var query = "update users set password=$1 where email = $2";
    var values = [hashedPW, userEmail];
    var queryCb = (error, res) => {
        if (error) {
            logError(error, logCtx);
        } 
        callback(error); //Null if no error
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

function fetchUserEmail (userID, callback) {
    logCtx.fn = 'fetchUserEmail';
    var query = "select email from users where userid = $1";
    var values = [userID];
    var queryCb = (error, res) => {
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rows.length == 0 ) {
                var errorMsg = "Invalid user ID."; 
                logError(errorMsg, logCtx);
                callback(new Error(errorMsg), null);
            } else {
                callback(null, res.rows[0]); //Success
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function fetchEUUID (userID, type, callback) {
    logCtx.fn = 'fetchEUUID';
    var query = "select euuid, expiration from emailuuid where userid = $1 and type = $2";
    var values = [userID, type];
    var queryCb = (error, res) => {
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rows.length == 0 ) {
                var errorMsg = "Invalid email confirmation link."; 
                logError(errorMsg, logCtx);
                callback(new Error(errorMsg), null);
            } else {
                callback(null, res.rows[0]); //Success
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function fetchShowroomSession (callback) {
    logCtx.fn = 'fetchShowroomSession';
    var query = 'select iapsessionid from projects where islatest = true';
    var queryCb = (error, res) => {
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rows.length == 0 ) {
                var errorMsg = "No project records found, sending null to trigger update."; 
                logError(errorMsg, logCtx);
                callback(null, null); //Send null to indicate no projects in table
            } else {
                callback(null, res.rows[0].iapsessionid); //Success
            }
        }
    };
    dbUtils.makeQuery(pool, query, callback, queryCb);
}

function comparePasswords (email, plaintextPassword, callback) {
    logCtx.fn = 'comparePasswords';
    var result = {};
    async.waterfall([
        function (callback) {
            //Get hash from database (and retrieve user ID)
            fetchHashAndUserID(email, (error, hash, userID, user_role, isPM) => {
                if (error) {
                    logError(error, logCtx);
                    callback(error);
                } else {
                    //Add user information to result object, this is later on the session data
                    result.userID = userID;
                    result.user_role = user_role;
                    result.isPM = isPM;
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
                        var errorMsg = "Invalid email or password. You may also create a new account.";
                        logError(errorMsg, logCtx);
                        callback(new Error(errorMsg));
                    }
                }
            });
        },
        function (callback) {
            //Check if user is admin (and add to result along with user ID)
            //Login should also check for other roles 
            isUserAdmin(result.userID, (error, adminID) => { //TODO: test
                if (error) {
                    logError(error, logCtx);
                    callback(error);
                } else {
                    // result.admin = isAdmin; //set as either true or false //TODO delete
                    result.admin = adminID; //If it's null, not admin
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
    var query = "select u.userid, u.password, u.user_role, s.ispm from users u left join student_researchers s on u.userid = s.userid where email = $1";
    var values = [email];
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rows.length == 0 ) {
                var errorMsg = "Invalid email or password. You may also create a new account."; //mention password even though we're checking email only to confuse hackers
                logError(errorMsg, logCtx);
                callback(new Error(errorMsg), null, null);
            } else {
                let userID = res.rows[0].userid;
                let hash = res.rows[0].password;
                let role = res.rows[0].user_role;
                let ispm = res.rows[0].ispm;
                callback(null, hash, userID, role, ispm); //Success
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
                // callback(null, false); //TODO: delete
                callback(null, null);
            } else {
                // callback(null, true); //Success //TODO: delete
                callback(null, res.rows[0].adminid); //Success
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function fetchAllUsers (callback) {
    logCtx.fn = 'fetchAllUsers';
    var query = "select * from users";
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rows.length == 0 ) {
                callback(null, null); //Null to evoke 404
            } else {
                callback(null, res.rows); //Success
            }
        }
    };
    dbUtils.makeQuery(pool, query, callback, queryCb);
}

function fetchAllAnnouncements (callback) {
    logCtx.fn = 'fetchAllAnnouncements';
    var query = "select * from announcements order by announcementid desc";
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rows.length == 0 ) {
                callback(null, null); //Null to evoke 404
            } else {
                callback(null, res.rows); //Success
            }
        }
    };
    dbUtils.makeQuery(pool, query, callback, queryCb);
}

function validateEmail (email, callback) {
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
                var errorMsg = "This email is already registered.";
                logError(errorMsg, logCtx);
                callback(new Error(errorMsg));
            } else {
                callback(null); //Success
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function getUserIDFromEmail (email, callback) {
    //Verify that email is not already being used
    logCtx.fn = 'getUserIDFromEmail';
    var query = "select userid from users where email = $1";
    var values = [email];
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rows.length > 0 ) {
                var userID = res.rows[0].userid;
                log("Successfully got user ID: " + userID + " for email: " + email, logCtx);
                callback(null, userID);
            } else {
                var errorMsg = "This email is not registered.";
                logError(errorMsg, logCtx);
                callback(new Error(errorMsg), null);
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, values, callback, queryCb);
}

function validateEmailWithUserID (userID, userEmail, callback) {
    //Verify that email exists for the given user ID
    logCtx.fn = 'validateEmailWithUserID';
    var query = "select email from users where userid = $1";
    var values = [userID];
    var isValid = false;
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rows.length > 0 ) { //If no rows, leave isValid as false and carry on
                //There was an email associated with the user ID, now check if it's the same one given
                var resultEmail = res.rows[0].email;
                if (userEmail == resultEmail) {
                    isValid = true; //Emails matched
                }
            }
            callback(null, isValid);
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
            event.push("false"); //add value for isdeleted
            dbUtils.makeQueryWithParams(pool,"insert into iap_events (adminid, startTime, duration, title, projectid, e_date, isdeleted) values ($1, $2, $3, $4, $5, $6, $7)", event, cb, (error, res) => {
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

function updateBatchEvents (eventList, callback) {
    logCtx.fn = 'updateBatchEvents';
    var result;
    var eventArrays = eventList;
    //Insert each array into DB
    async.forEachLimit(eventArrays, MAX_ASYNC, (event, cb) => {
        let values = [event.adminid, event.starttime, event.duration, event.title, event.projectid, event.e_date, event.meetid];
        dbUtils.makeQueryWithParams(pool,"update iap_events set adminid=$1, starttime=$2, duration=$3, title=$4, projectid=$5, e_date=$6 where meetid = $7", values, cb, (error, res) => {
            if (error) {
                logError(error, logCtx);
            } else {
                log("Got response from DB - rowCount: " + res.rowCount, logCtx);
                result = res.rows; //returns []
            }
            cb(error);
        });
    }, (error) => {
        if (error) {
            callback(error, null);
        } else {
            callback(null, result);
        }
    });
}

function getEvents(all, allByDate, upcoming, time, date, callback) {
    logCtx.fn = 'getEvents';
    var getAll = "select * from iap_events where isdeleted = false order by starttime asc";
    var getAllByDate = "select * from iap_events where isdeleted = false and e_date = $1 order by starttime asc";
    var getAllByDateProjects = "select * from iap_events where e_date = $1 and isdeleted = false and projectid is not null order by starttime asc"; //project id not null to make sure we only select project events
    var getUpcoming = "select * from iap_events where starttime + duration * interval '1 minute' > $1 and e_date = $2 and isdeleted = false order by starttime asc";
    var query = upcoming ? getUpcoming : allByDate ? getAllByDateProjects : all ? getAll : getAllByDate;
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rowCount == 0) {
                callback(null, null); //No events found, send null result to provoke 404 error
            } else {
                //Send all events
                result = res.rows;
                callback(null, result);
            }
        }
    };
    if (upcoming) {
        dbUtils.makeQueryWithParams(pool, query, [time, date], callback, queryCb);
    } else if (allByDate) {
        dbUtils.makeQueryWithParams(pool, query, [date], callback, queryCb);
    } else if (all) {
        dbUtils.makeQuery(pool, query, callback, queryCb);
    } else {
        var today = new Date();
        today.setTime(today.getTime() - config.DATE_TIMEZONE_OFFSET);
        var currentDate = today.toISOString().slice(0,10);
        dbUtils.makeQueryWithParams(pool, query, [currentDate], callback, queryCb);
    }
}

function getEventByID (eventID, callback) {
    logCtx.fn = 'getEventByID';
    var query = "select * from iap_events where meetid = $1 and isdeleted = false"; 
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rowCount == 0) {
                callback(null, null); //No events found, send null result to provoke 404 error
            } else {
                var result = res.rows[0]; //returns event
                callback(null, result);
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [eventID], callback, queryCb);
}

function getQnARoomInfo (projectID, callback) {
    logCtx.fn = 'getQnARoomInfo';
    var query = "select proj.iapproject_title, proj.iapproject_abstract, u.first_name, u.last_name, u.user_role, sr.ispm, sr.grad_date from users u left join student_researchers sr on u.userid = sr.userid left join participates p on u.userid = p.userid left join projects proj on p.projectid = proj.projectid where proj.projectid = $1"; 
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rowCount == 0) {
                callback(null, null); //No info found, send null result to provoke 404 error
            } else {
                var result = res.rows; //returns counts for users
                callback(null, result);
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [projectID], callback, queryCb);
}

function getIAPPIDFromShowroomPID (projectID, callback) {
    logCtx.fn = 'getIAPPIDFromShowroomPID';
    var query = "select iapprojectid from projects where projectid = $1"; 
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rowCount == 0) {
                callback(null, null); //No info found, send null result to provoke 404 error
            } else {
                var result = res.rows[0].iapprojectid;
                callback(null, result);
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [projectID], callback, queryCb);
}

function getShowroomPIDFromIAPPID (projectID, callback) {
    logCtx.fn = 'getShowroomPIDFromIAPPID';
    var query = "select projectid from projects where iapprojectid = $1"; 
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rowCount == 0) {
                callback(null, null); //No info found, send null result to provoke 404 error
            } else {
                var result = res.rows[0].projectid;
                callback(null, result);
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [projectID], callback, queryCb);
}

function verifyEmail (userID, callback) {
    logCtx.fn = 'verifyEmail';
    var query = "update users set verifiedemail=true where userid = $1";
    var values = [userID];
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

function getLiveStats (callback) {
    logCtx.fn = 'getLiveStats';
    var query = "select u.userid, m.meethistoryid, m.jointime, u.user_role, sr.department, u.gender, sr.grad_date, count(u.userid) from users u left join student_researchers sr on u.userid = sr.userid left join company_representatives cr on u.userid = cr.userid left join advisors a on u.userid = a.userid left join meethistory m on u.userid = m.userid group by u.userid, user_role, department, gender, grad_date, meethistoryid, jointime having meethistoryid is not null;"; 
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rowCount == 0) {
                callback(null, null); //No info found, send null result to provoke 404 error
            } else {
                var result = res.rows; //returns counts for users
                callback(null, result);
            }
        }
    };
    dbUtils.makeQuery(pool, query, callback, queryCb);
}

function getInPersonStats (callback) {
    logCtx.fn = 'getInPersonStats';
    var query = "select user_role, major, department, gender, grad_date, live_date, count(uid) from inperson_users group by user_role, department, department, gender, grad_date, major, live_date;"; 
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rowCount == 0) {
                callback(null, null); //No users found! send null result to provoke 404 error
            } else {
                var result = res.rows; //returns counts for users
                callback(null, result);
            }
        }
    };
    dbUtils.makeQuery(pool, query, callback, queryCb);
}

function getUserInfo (userID, callback) {
    logCtx.fn = 'getUserInfo';
    var query = "select first_name, last_name, email, user_role, gender, verifiedemail, department, grad_date, ispm, company_name, adminid, projectid from users as u left join student_researchers as sr on u.userid = sr.userid left join advisors as a on u.userid = a.userid left join admins as adm on u.userid = adm.userid left join participates as p on u.userid = p.userid left join company_representatives as cr on u.userid = cr.userid where u.userid = $1";
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rowCount == 0) {
                callback(null, null); //No users found, send null result to provoke 404 error
            } else {
                var result = {};
                //Populate result object
                Object.keys(res.rows[0]).forEach( key => {
                    //Only fill result obj with necessary properties
                    if (res.rows[0][key] != null && key != 'projectid') result[`${key}`] = res.rows[0][key];
                });
                //Add project ID information
                if (res.rows.length > 1) { //More than one row means there is more than one project
                    result.project_ids = [];
                    res.rows.forEach((row) => {
                        result.project_ids.push(row.projectid);
                    });
                } else {
                    result.project_ids = res.rows[0].projectid == null ? null : [res.rows[0].projectid];
                }
                callback(null, result);
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [userID], callback, queryCb);
}

function updateEvent (eventID, event, callback) {
    logCtx.fn = 'updateEvent';
    var query = "update iap_events set adminid=$1, starttime=$2, duration=$3, title=$4, projectid=$5, e_date=$6 where meetid = $7";
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

function updateEUUID (userID, emailUUID, expireTime, type, callback) {
    logCtx.fn = 'updateEUUID';
    var query = "update emailuuid set euuid=$1, expiration=$2 where userid = $3 and type = $4";
    var values = [emailUUID, expireTime, userID, type];
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

function deleteEvent (eventID, callback) {
    logCtx.fn = 'deleteEvent';
    var query = "update iap_events set isdeleted=true where meetid = $1"; 
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rowCount > 0) {
                var result = res.rows;
                callback(null, result);
            } else {
                var errorMsg = "Could not delete event.";
                logError(errorMsg, logCtx);
                callback(new Error(errorMsg), null);
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [eventID], callback, queryCb);
}

function deleteAnnouncement (announcementID, callback) {
    logCtx.fn = 'deleteAnnouncement';
    var query = "delete from announcements where announcementid = $1"; 
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rowCount > 0) {
                var result = res.rows;
                callback(null, result);
            } else {
                var errorMsg = "Could not delete announcement.";
                logError(errorMsg, logCtx);
                callback(new Error(errorMsg), null);
            }
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [announcementID], callback, queryCb);
}

function deleteAllShowroomProjects (showroomSessionID, callback) {
    //Doesn't actually delete the projects, rather it sets the isLatest column as false
    logCtx.fn = 'deleteAllShowroomProjects';
    var query = 'update projects set islatest=false where iapsessionid = $1'; 
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rowCount > 0) {
                log("No rows were affected.", logCtx);
            }
            callback(null);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [showroomSessionID], callback, queryCb);
}

function postAnnouncements (adminID, message, date, callback) {
    logCtx.fn = 'postAnnouncements';
    var query = "insert into announcements (adminid, a_content, a_date) values ($1, $2, $3) returning announcementid, a_content, a_date"; 
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            callback(null, res.rows);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [adminID, message, date], callback, queryCb);
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

function getAllMembersFromAllProjects(callback){
    logCtx.fn = 'getAllMembersFromAllProjects';
    var query = "SELECT users.userid, users.user_role, users.first_name, users.last_name, r.projectid, r.iapproject_title, sr.validatedmember, a.validatedmember as validatedAdvisor from users inner join participates p on users.userid = p.userid inner join projects r on p.projectid = r.projectid left outer join student_researchers sr on p.userid = sr.userid left outer join advisors a on p.userid = a.userid group by r.projectid, users.userid, sr.validatedmember, a.validatedmember;";
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            if (res.rowCount == 0) {
                callback(null, null); //No users found, send null result to provoke 404 error
            } else {
                var result = res.rows; //returns array of json objects
                callback(null, result);
            }
        }
    };
    dbUtils.makeQuery(pool, query, callback, queryCb);
}

function validateResearchMember(userID, user_role, callback){
    logCtx.fn = 'validateResearchMember';
    if(user_role === config.userRoles.studentResearcher){
        var query = "update student_researchers set validatedmember=true where userid = $1";
    } 
    else if(user_role === config.userRoles.advisor){
        var query = "update advisors set validatedmember=true where userid = $1";
    } else{
        callback(null, null);
    }
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
    dbUtils.makeQueryWithParams(pool, query, [userID], callback, queryCb);
}



function getStudentProject (userID, projectID, callback) { //TODO: test
    logCtx.fn = 'getStudentProject';
    var query = "select userid, projectid from participates where userid = $1 and projectid = $2"; 
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = false;
            if (res.rows.length != 0) result = true; //Set as true since this student is linked with the project
            callback(null, result);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [userID, projectID], callback, queryCb);
}

function postMeetHistory (userID, meetingID, callback) {
    logCtx.fn = 'postMeetHistory';
    var query = "insert into meethistory (projectid, userid, jointime) values ($1, $2, $3)";
    var today = new Date();
    today.setTime(today.getTime() - config.DATE_TIMEZONE_OFFSET); //Subtract 4 hours (in ms) to account for UTC timezone [needed for production server in ECE]
    var values = [meetingID, userID, today.toISOString()];
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

function getName (userID, callback) {
    logCtx.fn = 'getName';
    var query = "select first_name, last_name from users where userid = $1"; 
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            callback(null, res.rows[0]);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [userID], callback, queryCb);
}

function postToShowroomProjects (iapProjects, callback) {
    logCtx.fn = 'postToShowroomProjects';
    var query = 'insert into projects (iapprojectid, iapsessionid, iapproject_title, iapproject_abstract, islatest) values ($1, $2, $3, $4, $5)';
    var values = [iapProjects.project_id, iapProjects.session_id, iapProjects.title, iapProjects.abstract, true];
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

function postToEUUID (userID, eeuuid, expires, type, callback) {
    logCtx.fn = 'postToEUUID';
    var query = "insert into emailuuid (userid, euuid, expiration, type) values ($1, $2, $3, $4)";
    var values = [userID, eeuuid, expires, type];
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

function fetchUserIDsAndRoles (projectID, callback) {
    logCtx.fn = 'fetchUserIDsAndRoles';
    var query = "select distinct (u.userid), u.user_role from users u left join meethistory m on u.userid = m.userid where m.projectid = $1";
    var queryCb = (error, res) => { 
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = res.rows; //returns [{userid: '#', user_role: 'abc'}, {userid: '#', user_role: 'abc'}]
            callback(null, result);
        }
    };
    dbUtils.makeQueryWithParams(pool, query, [projectID], callback, queryCb);
}

function fetchProjects(sessionID, callback) {
    logCtx.fn = 'fetchProjects';
    dbUtils.makeQueryWithParams(pool, 'select projectid as project_id, iapproject_title as title, iapproject_abstract as abstract from projects where iapsessionid = $1 and islatest = true', [sessionID], callback, (error, res) => {
        if (error) {
            logError(error, logCtx);
            callback(error, null);
        } else {
            log("Got response from DB - rowCount: " + res.rowCount, logCtx);
            var result = res.rows; //returns array of json objects
            callback(null, result);
        }
    });
}

function postLiveAttendance(payload,callback) {
    logCtx.fn = 'postInPersonAttendance';
    var query = "insert into inperson_users (first_name, last_name, email, gender, user_role, major, grad_date, department, company_name ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)";
    var values = [payload.first_name, payload.last_name, payload.email, payload.gender, payload.user_role, payload.major,
                  payload.grad_date, payload.department, payload.company_name];
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
    getRoleAndName: getRoleAndName,
    getEventByID: getEventByID,
    getUserInfo: getUserInfo,
    postAnnouncements: postAnnouncements,
    postMeetHistory: postMeetHistory,
    postToShowroomProjects: postToShowroomProjects,
    fetchProjects: fetchProjects,
    getStudentProject: getStudentProject,
    fetchUserIDsAndRoles: fetchUserIDsAndRoles,
    getAllMembersFromAllProjects: getAllMembersFromAllProjects,
    validateResearchMember: validateResearchMember,
    getQnARoomInfo: getQnARoomInfo,
    getName: getName,
    getLiveStats: getLiveStats,
    getInPersonStats: getInPersonStats,
    changePassword: changePassword,
    verifyEmail: verifyEmail,
    postToEUUID: postToEUUID,
    fetchEUUID: fetchEUUID,
    fetchUserEmail: fetchUserEmail,
    postLiveAttendance: postLiveAttendance,
    fetchAllUsers: fetchAllUsers,
    updateEUUID: updateEUUID,
    updateBatchEvents: updateBatchEvents,
    fetchAllAnnouncements: fetchAllAnnouncements,
    deleteAnnouncement: deleteAnnouncement,
    fetchShowroomSession: fetchShowroomSession,
    deleteAllShowroomProjects: deleteAllShowroomProjects,
    getIAPPIDFromShowroomPID: getIAPPIDFromShowroomPID,
    getShowroomPIDFromIAPPID: getShowroomPIDFromIAPPID,
    validateEmailWithUserID: validateEmailWithUserID,
    getUserIDFromEmail: getUserIDFromEmail
}