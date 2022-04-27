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
var researchers_advisors = '/researchers-advisors';
var validateResearchMember = '/validateResearchMember'
var sseConnect = '/sse-connect'; //used to establish server sent events connection
var getAllUsers = '/all-users';

var inPersonAttendance = '/live-attendance'

// Server Sent Event Endpoints
var serverSideSent = '/sse';

//Schedule Routes
var getIAPSessions = '/sessions';
var getIAPProjects = '/schedule/projects';
var scheduleEvents = '/schedule/events'; //used for GET, POST
var scheduleEventsID = scheduleEvents + '/:eventID'; //used for GET, PUT, DELETE

//Bind routes to their handlers:

//Showroom General
showroomRouter.get(getStats, auth.authenticate, showroomHandler.getStats);
showroomRouter.post(announcements, auth.authorizeAdmin, showroomHandler.postAnnouncements); //TODO: update
// //showroomRouter.get(announcements, auth.authenticate, showroomHandler.getAnnouncements); //TODO: implement - this might be replaced with event listener on client side
showroomRouter.get(researchers_advisors, auth.authenticate, showroomHandler.getAllMembersFromAllProjects);
showroomRouter.post(validateResearchMember, auth.authorizeAdmin, showroomHandler.validateResearchMember); //TODO: Validated advisors and PM's should be able to do this
showroomRouter.get(getAllUsers, auth.authenticate, showroomHandler.getAllUsers); //TODO: update

showroomRouter.get(sseConnect, auth.authenticate, showroomHandler.sseConnect); //TODO: update

//Events 
showroomRouter.get(getRoomStatus, auth.authenticate, showroomHandler.getRoomStatus); //TODO: update 
showroomRouter.get(getQnARoomInfo, auth.authenticate, showroomHandler.getQnARoomInfo); 
showroomRouter.get(scheduleEvents, auth.authenticate, showroomHandler.getScheduleEvents); 
showroomRouter.post(scheduleEvents, auth.authorizeAdmin, showroomHandler.postScheduleEvents); 
showroomRouter.get(scheduleEventsID, auth.authorizeAdmin, showroomHandler.getScheduleEventByID);
showroomRouter.put(scheduleEventsID, auth.authorizeAdmin, showroomHandler.updateScheduleEvent);
showroomRouter.delete(scheduleEventsID, auth.authorizeAdmin, showroomHandler.deleteScheduleEvent);

// Server Side Events
showroomRouter.get(serverSideSent, auth.authenticate, showroomHandler.getServerSideUpcomingEvents);
showroomRouter.get(serverSideSent, auth.authenticate, showroomHandler.getServerSideProgressBar);

//IAP
showroomRouter.get(getIAPProjects, showroomHandler.getProjects); //TODO - review
showroomRouter.get(getIAPSessions, auth.authorizeAdmin, showroomHandler.getIAPSessions); //TODO: implement

// Live Attendance
showroomRouter.post(inPersonAttendance, showroomHandler.postLiveAttendance);

module.exports = showroomRouter;