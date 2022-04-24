/**
 * Starting point for the IAP Showroom API server. 
 */

const config = require('./Config/config.js');
const auth = require('./Handlers/AuthHandlers.js');
const showroomRouter = require('./Endpoints/ShowroomEndpoints.js');
const streamingRouter = require('./Endpoints/VideoStreamingEndpoints.js');
const authRouter = require('./Endpoints/AuthEndpoints.js');
const { logError, log, logRequest } = require('./Utility/Logger.js');
const iapDB = require('./Database/iapProxy.js');
const showroomDB = require('./Database/showroomProxy.js');
const { successResponse, errorResponse } = require('./Utility/DbUtils.js');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const redis  = require('redis');
const showroomHandlers = require('./Handlers/ShowroomHandlers.js');
const redisStore = require('connect-redis')(session);

let logCtx = {
  fileName: 'app',
  fn: ''
}

const app = express();
const port = config.PORT;

//Set up Redis
const redisClient = redis.createClient({ legacyMode: true });
redisClient.connect().catch(console.error);
redisClient.on("error", console.error);
const store = new redisStore({ host: '127.0.0.1', port: 6379, client: redisClient, ttl: 260 });

//Log incoming requests
app.use(logRequest);

//Middleware
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());
app.use(cors(config.corsOptions));
app.use(session({ //TODO: review session config settings
  secret: config.session_secret,
  store: store,
  saveUninitialized: false,
  resave: false,
  cookie: {maxAge: config.SESSION_MAX_AGE, secure: config.prod ? true : false, httpOnly: config.prod ? true : false} //TODO: make sure cookies are being set in prod
}));
app.use(auth.checkSession);

//Bind the main module routes to their respective routers
app.use(config.auth_prefix, authRouter); //add req.sessions here??
app.use(config.showroom_prefix, showroomRouter);
app.use(config.stream_prefix, streamingRouter);

//health check for testing
app.get('/test', (req, res) => {
  logCtx.fn = '/test';
  log("Hello, server is running.", logCtx);
  successResponse(res, 200, "Hello.");
});

//Catch non-existant URLs
app.all('*', function(req, res){
  logError("Invalid URL: " + req.method + " " + req.path, logCtx);
  errorResponse(res, 400, "Invalid URL. Sorry for the inconvenience.");
})

var server = app.listen(port, () => {
  log('IAP Showroom API listening on port ' + port, logCtx);
});

//Properly close the server 
process.on('SIGINT', () => { handleKillServer() }); //Ctr+c
process.on('SIGTSP', () => { handleKillServer() }); //Ctr+z
process.on('SIGTERM', () => { handleKillServer() }); 

function handleKillServer() {
  logCtx.fn = 'handleKillServer';
  log("Gracefully shutting server down.", logCtx);
  showroomHandlers.closeSSEConnections(); //TODO: maybe update to make it async?
  closeDbConnections(() => {
    logCtx.fn = '';
    store.clear(() => {  //Clear all sessions
      log("Cleared sessions.", logCtx);
      server.close(() => { //Stop listening
        log("Bye, bye.", logCtx);
        process.exit(1); //Exit the process
      });
    });
  });
}

function closeDbConnections(cb) {
  logCtx.fn = 'closeDbConnections';
  iapDB.endPool()
  .then(result => {
    log("Safely closed IAP DB connection pool.", logCtx);
    showroomDB.endPool();})
  .then(result => {
    log("Safely closed Showroom DB connection pool.", logCtx);
    cb();}) //call the callback to exit server
  .catch(reason => logError(reason, logCtx));
}
