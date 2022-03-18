/**
 * Database proxy file, used to interface with the Showroom's database.
 */

const { Pool, Client } = require('pg');
const config = require('../Config/config');
const dbConfig = config.showroomDBConfig;

const pool = new Pool({
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.database,
    password: dbConfig.password,
    port: dbConfig.port,
});

module.exports = {
    
}

/**
 * Development Notes:
 * 
 * - pool.end drains the pool of all active clients, disconnects then and shuts down any internal timers
 * --- should probably open the pool (call pool.connect i think) to serve actions that require many requests in bulk
 * --- then close it once all of those calls are done 
 */