/**
 * File to organize handler functions for the Authentication endpoints.
 */

function registerUser (req, res, next) {

}

function authenticate (req, res, next) {
    //res.cookie('access_token', token, {maxAge: 1200000});
    next();
}

module.exports = {
    registerUser: registerUser,
    authenticate: authenticate
}