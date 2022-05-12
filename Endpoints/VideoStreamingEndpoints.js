/**
 * File to bind routes with their handler functions for the Video Streaming module.
 */

 const express = require('express');
 const streamingRouter = express.Router();
 const streamingHandler = require('../Handlers/VideoStreamingHandlers.js');
 const auth = require('../Handlers/AuthHandlers.js');
  
 //Routes
 var joinRoom = '/join';
 var endRoom = '/end';
 var joinStage = '/join-stage';
 
 streamingRouter.post(joinRoom, auth.authenticate, streamingHandler.joinRoom);
 streamingRouter.get(joinStage, auth.authenticate, streamingHandler.joinStage);
 streamingRouter.post(endRoom, auth.authorizeAdmin, streamingHandler.endRoom);
 
 module.exports = streamingRouter;