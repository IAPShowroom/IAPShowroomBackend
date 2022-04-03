/**
 * File to bind routes with their handler functions for the Video Streaming module.
 */

 const express = require('express');
 const streamingRouter = express.Router();
 const streamingHandler = require('../Handlers/VideoStreamingHandlers.js');
 const auth = require('../Handlers/AuthHandlers.js');
  
 //Routes
 var createRoom = '/create';
 var joinRoom = '/join';
 var endRoom = '/end';
//  var history = '/meet-history'; //TODO: check with team if we'll use this
 
 streamingRouter.post(createRoom, auth.authorizeAdmin, streamingHandler.createRoom);
 streamingRouter.post(joinRoom, auth.authenticate, streamingHandler.joinRoom);
 streamingRouter.post(endRoom, auth.authorizeAdmin, streamingHandler.endRoom);
//  streamingRouter.post(history, auth.authenticate, streamingHandler.postMeetHistory); //TODO: check with team if we'll use this
 
 module.exports = streamingRouter;