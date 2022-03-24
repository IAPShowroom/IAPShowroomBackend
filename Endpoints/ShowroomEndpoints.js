/**
 * File to bind routes with their handler functions for the Showroom module.
 */

const express = require('express');
const showroomRouter = express.Router();
const showroomHandler = require('../Handlers/ShowroomHandlers.js');
const auth = require('../Handlers/AuthHandlers.js');
const logger = require('../Utility/Logger.js');

let logCtx = {
    fileName: 'ShowroomEndpoints',
    fn: ''
}

//Routes
var getStats = '/stats';
var getRoomStatus = '/rooms/status';
var getQnARoomInfo = '/qna/info/:projectID';
var announcements = '/announcement'; //used for GET, POST

//Schedule Routes
var getProjects = '/schedule/projects';
var scheduleEvents = '/schedule/events'; //used for GET, POST
var scheduleEventsID = scheduleEvents + '/:eventID'; //used for PUT, DELETE


showroomRouter.get(getProjects, auth.authenticate, showroomHandler.getProjects);

module.exports = showroomRouter;