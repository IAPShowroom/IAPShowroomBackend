/**
 * File to bind routes with their handler functions for the Video Streaming module.
 */

 const express = require('express');
 const streamingRouter = express.Router();
 const streamingHandler = require('../Handlers/VideoStreamingHandlers.js');
  
 //Routes
 var createRoom = '/create';
 var joinRoom = '/join';
 var endRoom = '/end';
 
 streamingRouter.post(createRoom, streamingHandler.createRoom);
 streamingRouter.post(joinRoom, streamingHandler.joinRoom);
 streamingRouter.post(endRoom, streamingHandler.endRoom);
 
 module.exports = streamingRouter;