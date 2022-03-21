/**
 * Starting point for the IAP Showroom API server. 
 */

var config = require('./Config/config.js');
var authEndpoints = require('./Endpoints/Authentication/AuthEndpoints.js');
var showroomEndpoints = require('./Endpoints/Showroom/ShowroomEndpoints.js');
var streamingEndpoints= require('./Endpoints/VideoStreaming/VideoStreamingEndpoints.js');

const express = require('express');
const app = express();
const port = config.PORT;

//use app.use function to attach auth middleware that parses through the headers of all incoming requests?

//get CORS middleware and attach with app.use?

//Bind the main module routes to their respective routers
app.use(config.auth_prefix, authEndpoints);
app.use(config.showroom_prefix, showroomEndpoints);
app.use(config.bbb_prefix, streamingEndpoints);

app.listen(port, () => {
  console.log(`IAP Showroom API listening on port ${port}`);
})

/**
 * Developer Notes:
 * 
 * - probably debamos usar Router objects 
 * --- combine router objects with imported routes (endpoints) from the Endpoints folder? is this the middleware?
 */