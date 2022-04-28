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
const WebSocket = require('ws');

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

const userIDtoWSMap = new Map();

//Log incoming requests
app.use(logRequest);

const sessionParser = session({ //TODO: review session config settings
  secret: config.session_secret,
  store: store,
  saveUninitialized: false,
  resave: false,
  cookie: {maxAge: config.SESSION_MAX_AGE, secure: config.prod ? true : false, httpOnly: config.prod ? true : false} //TODO: make sure cookies are being set in prod
});

//Middleware
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());
app.use(cors(config.corsOptions));
app.use(sessionParser);
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

const wss = new WebSocket.Server({ clientTracking: true, noServer: true });

var server = app.listen(port, () => {
  log('IAP Showroom API listening on port ' + port, logCtx);
});

server.on('upgrade', function (request, socket, head) {
  console.log('Parsing session from request...');
  // sessionParser(request, {}, () => {
  //   });
  // console.log(request);
    // if (!request.session.data.userID) {
    //   socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    //   socket.destroy();
    //   return;
    // }

    // console.log('Session is parsed!');

    wss.handleUpgrade(request, socket, head, function (ws) {
      wss.emit('connection', ws, request);
    });
});

wss.on('connection', function (ws, request) {
  // const userId = request.session.data.userID;

  // userIDtoWSMap.set(userId, ws);

  ws.on('message', function (message) {
    //
    // Here we can now use session parameters.
    //
    console.log(`Received message ${message}`);// from user ${userId}`);


    //test code to see if updates correctly
    if(message === config.ws_annoucement)
      wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_annoucement })));
    
    else if(message === config.ws_progressbar)
      wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_progressbar })));
    
    else if(message === config.ws_upcomingevents)
      wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_upcomingevents })));
    
    else console.log("message was sent but event was not recognized");
    
    console.log("updated!")

  });

  ws.on('close', function () {
    // userIDtoWSMap.delete(userId);
  });
});

//Properly close the server 
process.on('SIGINT', () => { handleKillServer() }); //Ctr+c
process.on('SIGTSP', () => { handleKillServer() }); //Ctr+z
process.on('SIGTERM', () => { handleKillServer() }); 

function handleKillServer() {
  logCtx.fn = 'handleKillServer';
  log("Gracefully shutting server down.", logCtx);
  showroomHandlers.closeSSEConnections(); //TODO: maybe update to make it async? remove maybe
  wss.clients.forEach((socket) => {
    socket.close();
  
    process.nextTick(() => {
      if ([socket.OPEN, socket.CLOSING].includes(socket.readyState)) {
        // Socket still hangs, hard close
        socket.terminate();
      }
    });
  });
  log("Removed all WebSocket Clients", logCtx);

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

module.export = {wss: wss}