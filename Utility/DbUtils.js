/**
 * Utility file containing helper functions aiding database and request operations.
 */

function successResponse (res, status, msg, payload) {
    var data = { message: msg }
    if (payload) data.payload = payload;
    res.status(status).send(data);
}

function errorResponse (res, status, msg) {
    successResponse(res, status, 'Error: ' + msg);
}

module.exports = {
    successResponse: successResponse,
    errorResponse: errorResponse
}