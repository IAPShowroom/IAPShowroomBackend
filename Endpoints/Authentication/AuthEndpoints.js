/**
 * File to bind routes with their handler functions for the Authentication module.
 */

const authRouter = require('../../app.js').authRouter;
const authHandler = require('../../Handlers/AuthHandlers.js');

//Routes
var register = '/register/';

authRouter.post(register, authHandler.registerUser, /**middleware function 2, etc */);