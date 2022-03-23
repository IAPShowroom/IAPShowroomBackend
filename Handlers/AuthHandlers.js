/**
 * File to organize handler functions for the Authentication endpoints.
 */

const iapDB = require('../Database/iapProxy.js');
const logger = require('../Utility/Logger.js');
const validator = require('../Utility/SchemaValidator.js');

let logCtx = {
    fileName: 'AuthHandlers',
    fn: ''
}

function registerUser (req, res, next) {
    logCtx.fn = 'registerUser';

    //Validate request payload
    validator.validateRegisterUser(req, (error) => {
        if (error) {
            logger.logError(error, logCtx);
            res.status(400).send("Error: " + error.message);
        } 
        // else { //placeholder
        //     res.status(201).send("Registered user."); //placeholder
        // }
    });

    //Check email against IAP
    var userEmail = req.body.email;
    iapDB.validateEmail(userEmail, (error) => {

    });

    //Persist user data based on role

    //Send verification email
}

function authenticate (req, res, next) {
    //res.cookie('access_token', token, {maxAge: 1200000});
    next();
}

module.exports = {
    registerUser: registerUser,
    authenticate: authenticate
}