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
var getQnARoomInfo = '/qna/info';
var announcements = '/announcement'; //used for GET, POST
var announcementsByID = '/announcement/:announcementID'; //used for DELETE
var researchers_advisors = '/researchers-advisors';
var validateResearchMember = '/validateResearchMember'
var getAllUsers = '/all-users';
var conference = '/conference'; //used for POST, GET
var conferenceByID = conference + '/:conferenceID'; //used for PUT, DELETE

var inPersonAttendance = '/live-attendance'

//Schedule Routes
var getIAPSessions = '/sessions';
var getIAPProjects = '/schedule/projects';
var getIAPSponsors = '/sponsors';
var scheduleEvents = '/schedule/events'; //used for GET, POST
var scheduleEventsID = scheduleEvents + '/:eventID'; //used for GET, PUT, DELETE
var updateBatchEvents = scheduleEvents + '/bulk/:time';
var getIAPValidation = '/validate-iap';

//Bind routes to their handlers:

//Showroom General
showroomRouter.get(getStats, auth.authenticate, showroomHandler.getStats);
showroomRouter.post(announcements, auth.authorizeAdmin, showroomHandler.postAnnouncements);
showroomRouter.get(announcements, auth.authenticate, showroomHandler.getAnnouncements);
showroomRouter.delete(announcementsByID, auth.authorizeAdmin, showroomHandler.deleteAnnouncementByID);
showroomRouter.get(researchers_advisors, auth.authenticate, showroomHandler.getAllMembersFromAllProjects);
showroomRouter.post(validateResearchMember, auth.authorizeAdmin, showroomHandler.validateResearchMember);
showroomRouter.get(getAllUsers, auth.authenticate, showroomHandler.getAllUsers);

//Events 
showroomRouter.get(getRoomStatus, auth.authenticate, showroomHandler.getRoomStatus);
showroomRouter.get(getQnARoomInfo, auth.authenticate, showroomHandler.getQnARoomInfo); 
showroomRouter.post(getIAPValidation, showroomHandler.validateIAPUser); 
showroomRouter.get(scheduleEvents, auth.authenticate, showroomHandler.getScheduleEvents); 
showroomRouter.post(scheduleEvents, auth.authorizeAdmin, showroomHandler.postScheduleEvents); 
showroomRouter.get(scheduleEventsID, auth.authorizeAdmin, showroomHandler.getScheduleEventByID);
showroomRouter.put(updateBatchEvents, auth.authorizeAdmin, showroomHandler.updateBatchEvents);
showroomRouter.put(scheduleEventsID, auth.authorizeAdmin, showroomHandler.updateScheduleEvent);
showroomRouter.delete(scheduleEventsID, auth.authorizeAdmin, showroomHandler.deleteScheduleEvent);

//IAP
showroomRouter.get(getIAPProjects, showroomHandler.getProjects);
showroomRouter.get(getIAPSponsors, showroomHandler.getSponsors);
showroomRouter.get(getIAPSessions, auth.authorizeAdmin, showroomHandler.getIAPSessions);

// Live Attendance
showroomRouter.post(inPersonAttendance, showroomHandler.postLiveAttendance);

// Conference
showroomRouter.post(conference, auth.authorizeAdmin, showroomHandler.postConference); 
showroomRouter.get(conference, auth.authorizeAdmin, showroomHandler.getConferences);
showroomRouter.put(conferenceByID, auth.authorizeAdmin, showroomHandler.updateConferenceByID);
showroomRouter.delete(conferenceByID, auth.authorizeAdmin, showroomHandler.deleteConferenceByID);

module.exports = showroomRouter;