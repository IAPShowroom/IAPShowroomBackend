/**
 * File to bind routes with their handler functions for the Showroom module.
 */

const express = require('express');
const showroomRouter = express.Router();
const showroomHandler = require('../Handlers/ShowroomHandlers.js');
const auth = require('../Handlers/AuthHandlers.js');
const { logError, log } = require('../Utility/Logger.js');

let logCtx = {
    fileName: 'ShowroomEndpoints',
    fn: ''
}

//Routes
var getStats = '/stats';
var getRoomStatus = '/rooms/status';
var getQnARoomInfo = '/qna/info/:projectID';
var announcements = '/announcement'; //used for GET, POST
var sseConnect = '/sse-connect'; //used to establish server sent events connection

//Schedule Routes
var getIAPSessions = '/sessions';
var getIAPProjects = '/schedule/projects';
var scheduleEvents = '/schedule/events'; //used for GET, POST
var scheduleEventsID = scheduleEvents + '/:eventID'; //used for GET, PUT, DELETE

//Bind routes to their handlers:

//Showroom General
showroomRouter.get(getStats, auth.authenticate, showroomHandler.getStats); //TODO: implement
showroomRouter.post(announcements, auth.authorizeAdmin, showroomHandler.postAnnouncements); //TODO: test
// //showroomRouter.get(announcements, auth.authenticate, showroomHandler.getAnnouncements); //TODO: implement - this might be replaced with event listener on client side
showroomRouter.post(sseConnect, auth.authenticate, showroomHandler.sseConnect); //TODO: implement and test

//Events 
showroomRouter.get(getRoomStatus, auth.authenticate, showroomHandler.getRoomStatus); //TODO: implement
showroomRouter.get(getQnARoomInfo, auth.authenticate, showroomHandler.getQnARoomInfo); //TODO: implement
showroomRouter.get(scheduleEvents, auth.authenticate, showroomHandler.getScheduleEvents); //TODO - test and review
showroomRouter.post(scheduleEvents, auth.authorizeAdmin, showroomHandler.postScheduleEvents); //TODO - test and review
showroomRouter.get(scheduleEventsID, auth.authorizeAdmin, showroomHandler.getScheduleEventByID); //TODO - test and review
showroomRouter.put(scheduleEventsID, auth.authorizeAdmin, showroomHandler.updateScheduleEvent); //TODO - test and review
showroomRouter.delete(scheduleEventsID, auth.authorizeAdmin, showroomHandler.deleteScheduleEvent); //TODO - test and review

//IAP
showroomRouter.get(getIAPProjects, showroomHandler.getProjects); //TODO - review
showroomRouter.get(getIAPSessions, auth.authorizeAdmin, showroomHandler.getIAPSessions); //TODO: implement

module.exports = showroomRouter;