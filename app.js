/**
 * Starting point for the IAP Showroom API server. 
 */

const config = require('./Config/config.js');
const auth = require('./Handlers/AuthHandlers.js');
const showroomRouter = require('./Endpoints/ShowroomEndpoints.js');
const streamingRouter = require('./Endpoints/VideoStreamingEndpoints.js');
const authRouter = require('./Endpoints/AuthEndpoints.js');
const { logError, log, logRequest } = require('./Utility/Logger.js');
const { successResponse, errorResponse } = require('./Utility/DbUtils.js');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const redis  = require('redis');
const redisStore = require('connect-redis')(session);

let logCtx = {
  fileName: 'app',
  fn: ''
}

const app = express();
const port = config.PORT;

//Set up Redis
const redisClient = redis.createClient();
redisClient.connect().catch(console.error);
redisClient.on("error", console.error);

//Log incoming requests
app.use(logRequest);

//Middleware
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());
app.use(cors(config.corsOptions));
app.use(session({ //TODO: review session config settings
  secret: config.session_secret,
  store: new redisStore({ host: '127.0.0.1', port: 6379, client: redisClient, ttl: 260 }),
  saveUninitialized: false,
  resave: false
}));
app.use(auth.checkSession);

//Bind the main module routes to their respective routers
app.use(config.auth_prefix, authRouter);
app.use(config.showroom_prefix, showroomRouter);
app.use(config.bbb_prefix, streamingRouter);

//Catch non-existant URLs -  TODO: implement better or remove
// app.get('*', function(req, res){
  // errorResponse(res, 400, "Invalid URL. Sorry for the inconvenience.");
// })

//health check for testing
app.get('/test', (req, res) => {
  logCtx.fn = '/test';
  log("Hello, server is running.", logCtx);
  successResponse(res, 200, "Hello.");
});

app.listen(port, () => {
  log('IAP Showroom API listening on port ' + port, logCtx);
});


/**
 * Developer Notes:
 * 
 * - 
 */
