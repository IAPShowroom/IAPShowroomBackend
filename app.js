/**
 * Starting point for the IAP Showroom API server. 
 */

const config = require('./Config/config.js');
const authHandler = require('./Handlers/AuthHandlers.js');
const logger = require('./Utility/Logger.js')('app');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const authRouter = express.Router();
const showroomRouter = express.Router();
const streamingRouter = express.Router();

const port = config.PORT;

//TODO: CORS middleware

//Bind the main module routes to their respective routers
app.use(config.auth_prefix, authRouter);
app.use(config.showroom_prefix, showroomRouter);
app.use(config.bbb_prefix, streamingRouter);

//Authenticate user
app.use(authHandler.authenticate);

//Middleware
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());
app.use(session({ secret: config.session_secret }));

//Catch non-existant URLs
app.get('*', function(req, res){
  res.status(400).send('Invalid URL. Sorry for the inconvenience.');
})

app.listen(port, () => {
  logger.logDebug('IAP Showroom API listening on port' + port);
});

module.exports = {
  authRouter: authRouter,
  showroomRouter: showroomRouter,
  streamingRouter: streamingRouter
}

/**
 * Developer Notes:
 * 
 * - 
 */
