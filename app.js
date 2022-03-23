/**
 * Starting point for the IAP Showroom API server. 
 */

const config = require('./Config/config.js');
const authHandler = require('./Handlers/AuthHandlers.js');
const showroomRouter = require('./Endpoints/ShowroomEndpoints.js');
const streamingRouter = require('./Endpoints/VideoStreamingEndpoints.js');
const authRouter = require('./Endpoints/AuthEndpoints.js');
const logger = require('./Utility/Logger.js');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');

let logCtx = {
  fileName: 'app',
  fn: ''
}

const app = express();
const port = config.PORT;

//TODO: CORS middleware

//Log incoming requests
app.use(logger.logRequest);

//Bind the main module routes to their respective routers
app.use(config.auth_prefix, authRouter);
app.use(config.showroom_prefix, showroomRouter);
app.use(config.bbb_prefix, streamingRouter);

//Authenticate user
app.use(authHandler.authenticate);

//Middleware
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());
// app.use(session({ secret: config.session_secret }));

//Catch non-existant URLs
// app.get('*', function(req, res){
//   res.status(400).send('Invalid URL. Sorry for the inconvenience.');
// })

//health check for testing
app.get('/test', (req, res) => {
  res.status(200).send("Hello.");
});

app.listen(port, () => {
  logger.log('IAP Showroom API listening on port ' + port, logCtx);
});


/**
 * Developer Notes:
 * 
 * - 
 */
