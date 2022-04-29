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
// var userRole = '/user-role';
var verifyUser = '/verify/:userID/:euuid';
var forgotPassword = '/forgot-pass';

authRouter.post(register, authHandler.registerUser);
authRouter.post(logIn, authHandler.logIn);
authRouter.post(logOut, authHandler.logOut);
authRouter.get(userInfo, authHandler.authenticate, authHandler.getUserInfo); 
// authRouter.get(userRole, authHandler.authenticate, authHandler.getRoleAndName); 
authRouter.get(verifyUser, authHandler.verifyUserFromEmail); 
authRouter.post(forgotPassword, authHandler.forgotPassword); 

module.exports = authRouter;
