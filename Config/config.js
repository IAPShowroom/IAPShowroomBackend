/**
 * Configuration file that loads and stores variables used throughout the project.
 */

//General variables
const env = process.env;
const PORT = env.PORT || 8080;
const ENVIRONMENT = env.ENVIRONMENT || 'dev'; //set NODE_ENV to 'production' with the OS's init system for better performance 
const prod = ENVIRONMENT == 'prod';
const logDebug = env.LOG_DEBUG == 'true';
const SESSION_MAX_AGE = 43200000 //12 hours in ms
const DATE_TIMEZONE_OFFSET = 14400000; //4 hours in ms to account for UTC offset
const EMAIL_VERIFY_MAX_AGE = 1; //1 day 

const showroomEmail = {
    name: 'IAP Showroom',
    email: env.SHOWROOM_MAIL_EMAIL,
    password: env.SHOWROOM_MAIL_PASSWORD
}

const iapEmail = {
    name: 'IAP Team',
    email: env.IAP_MAIL_EMAIL,
    password: env.IAP_MAIL_PASSWORD
}

const userRoles = {
    studentResearcher: 'Student Researcher',
    companyRep: 'Company Representative',
    advisor: 'Advisor'
}

const departments = {
    ICOM: 'Computer Engineering',
    INSO: 'Software Engineering',
    CIIC: 'Computer Science',
    INEL: 'Electrical Engineering',
    INME: 'Mechanical Engineering',
    other: 'Other'
}

const userGenders = {
    male: 'male',
    female: 'female',
    other: 'other'
}

//BigBlueButton API variables
const BBB_SECRET = env.BBB_SECRET || 'testbbbsecret';
const MOD_PASSWORD = env.MOD_PASSWORD || 'modpw';
const ATTENDEE_PASSWORD = env.ATTENDEE_PASSWORD || 'attpw';

//Endpoint parts
const BBB_HOST = 'iapstream.ece.uprm.edu';
const SHOWROOM_HOST = 'iapshowroom.ece.uprm.edu';

const showroom_prefix = '/api/showroom';
const stream_prefix = '/api/meet';
const auth_prefix = '/api/auth';
const bbb_prefix = '/bigbluebutton/api';

//Web Socket Server event variables
const ws_announcement = "announcement";
const ws_progressbar = "progressbar";
const ws_upcomingevents = "upcomingevents";
const ws_die = "die";
const ws_stageUpdate = "stageupdate";
const ws_getStageLive = "stagelive";
const ws_port = env.WS_PORT || 8081;
const ssl_cert_path = env.SSL_CERT_PATH || 'testcertpath';
const ssl_key_path = env.SSL_KEY_PATH || 'testkeypath';

//https://iapstream.ece.uprm.edu/bigbluebutton/api
var bbbUrlPrefix = "https://" + BBB_HOST + bbb_prefix;

//CORS configuration options
const corsOptions = {
    origin: prod ? ['https://' + BBB_HOST, 'https://' + SHOWROOM_HOST] : ['http://localhost:3000','http://localhost:3001'],
    optionsSuccessStatus: 200,
    credentials: true
}

//Database variables
const showroomDBConfig = {
    host: env.SHOWROOM_DB_HOST || 'test_db_host',
    port: env.SHOWROOM_DB_PORT || '5432',
    user: env.SHOWROOM_DB_USER || 'test_db_user',
    password: env.SHOWROOM_DB_PASSWORD || 'test_db_password',
    database: env.SHOWROOM_DB_NAME || 'test_db_name'
}

const iapDBConfig = {
    host: env.IAP_DB_HOST || 'test_db_host',
    port: env.IAP_DB_PORT || '5432',
    user: env.IAP_DB_USER || 'test_db_user',
    password: env.IAP_DB_PASSWORD || 'test_db_password',
    database: env.IAP_DB_NAME || 'test_db_name'
}

const LOCAL_DB = env.LOCAL_DB || false;

const session_secret = env.SESSION_SECRET || 'testsessionsecret';

module.exports = {
    PORT: PORT,
    BBB_HOST: BBB_HOST,
    SHOWROOM_HOST: SHOWROOM_HOST,
    ENVIRONMENT: ENVIRONMENT,
    showroom_prefix: showroom_prefix,
    stream_prefix: stream_prefix,
    bbb_prefix: bbb_prefix, 
    auth_prefix: auth_prefix,
    showroomDBConfig: showroomDBConfig,
    iapDBConfig: iapDBConfig,
    session_secret: session_secret,
    BBB_SECRET: BBB_SECRET,
    MOD_PASSWORD: MOD_PASSWORD,
    ATTENDEE_PASSWORD: ATTENDEE_PASSWORD,
    ws_announcement: ws_announcement,
    ws_progressbar: ws_progressbar,
    ws_upcomingevents: ws_upcomingevents,
    ws_die: ws_die,
    prod: prod,
    logDebug: logDebug,
    corsOptions: corsOptions,
    SESSION_MAX_AGE: SESSION_MAX_AGE,
    EMAIL_VERIFY_MAX_AGE: EMAIL_VERIFY_MAX_AGE,
    userRoles: userRoles,
    bbbUrlPrefix: bbbUrlPrefix,
    departments: departments,
    userGenders: userGenders,
    showroomEmail: showroomEmail,
    iapEmail: iapEmail,
    LOCAL_DB: LOCAL_DB,
    ws_port: ws_port,
    ssl_cert_path: ssl_cert_path,
    ssl_key_path: ssl_key_path,
    ws_stageUpdate: ws_stageUpdate,
    ws_getStageLive: ws_getStageLive,
    DATE_TIMEZONE_OFFSET: DATE_TIMEZONE_OFFSET
};