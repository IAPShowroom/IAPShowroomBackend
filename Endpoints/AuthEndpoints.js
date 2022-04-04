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
var userInfo = '/user-info';
var inPersonTracking = '/in-person';
var verifyUser = '/verify';
var changePassword = '/change-pass';

authRouter.post(register, authHandler.registerUser);
authRouter.post(logIn, authHandler.logIn);
authRouter.post(logOut, authHandler.logOut);
authRouter.get(userInfo, authHandler.authenticate, authHandler.getUserInfo); //TODO: implement and test
// authRouter.post(inPersonTracking, authHandler.trackInPerson); //TODO: implement and test
// authRouter.post(verifyUser, authHandler.verifyUserFromEmail); //TODO: implement and test
// authRouter.post(changePassword, authHandler.authenticate, authHandler.changePassword); //TODO: implement and test

module.exports = authRouter;

/**
 * Developer Notes:
 * 
 * - add an endpoint to change password
 * - add endpoint for isVerified?
 */