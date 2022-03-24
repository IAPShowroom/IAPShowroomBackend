/**
 * File to bind routes with their handler functions for the Authentication module.
 */

const express = require('express');
const authRouter = express.Router();
const authHandler = require('../Handlers/AuthHandlers.js');

//Routes
var register = '/register';
var logIn = '/login';
var logOut = '/logout';
var inPersonTracking = '/inperson';
var verifyUser = '/verify';

authRouter.post(register, authHandler.registerUser);
// authRouter.post(logIn, authHandler.logUserIn);
// authRouter.post(logOut, authHandler.logOut);
// authRouter.post(inPersonTracking, authHandler.trackInPerson);
// authRouter.post(verifyUser, authHandler.verifyUserFromEmail);

module.exports = authRouter;

/**
 * Developer Notes:
 * 
 * - Not sure if we should add an endpoint to change password
 * - add endpoint for isVerified?
 * - maybe implement something para que cuando se vaya a cerrar express clearee los sessions? or maybe on start up?
 */