/**
 * Configuration file that loads and stores variables used throughout the project.
 */

//General variables
const env = process.env;
const PORT = env.PORT || 8080;
const ENVIRONMENT = env.ENVIRONMENT || 'dev'; //set NODE_ENV to 'production' with the OS's init system for better performance 
const prod = ENVIRONMENT == 'prod';
const logDebug = env.LOG_DEBUG == 'true';

//BigBlueButton API variables
const BBB_SECRET = env.BBB_SECRET || '';
const MOD_PASSWORD = env.MOD_PASSWORD || '';

//Endpoint parts
const BBB_HOST = 'iapstream.ece.uprm.edu';
const SHOWROOM_HOST = 'iapshowroon.ece.uprm.edu';

const showroom_prefix = '/api/showroom';
const stream_prefix = '/api/meet';
const auth_prefix = '/api/auth';
const bbb_prefix = '/bigbluebutton/api';

//Database variables
const showroomDBConfig = {
    db: {
        host: env.SHOWROOM_DB_HOST || 'test_db_host',
        port: env.SHOWROOM_DB_PORT || '5432',
        user: env.SHOWROOM_DB_USER || 'test_db_user',
        password: env.SHOWROOM_DB_PASSWORD || 'test_db_password',
        database: env.SHOWROOM_DB_NAME || 'test_db_name'
    }
}

const iapDBConfig = {
    db: {
        host: env.IAP_DB_HOST || 'test_db_host',
        port: env.IAP_DB_PORT || '5432',
        user: env.IAP_DB_USER || 'test_db_user',
        password: env.IAP_DB_PASSWORD || 'test_db_password',
        database: env.IAP_DB_NAME || 'test_db_name'
    }
}

const session_secret = env.SESSION_SECRET || '';

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
    prod: prod,
    logDebug: logDebug
};