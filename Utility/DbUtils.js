/**
 * Utility file containing helper functions aiding database and request operations.
 */



/**
 * Developer Notes:
 * 
 * - create functions to encapsulate express/node's write response functions into:
 * --- writeSuccess(status.OK, message, payload)
 * --- writeError(status.BadRequest, message)
 * 
 * - import 'status' as an object from config file, mapping status codes, maybe messages? other relevant things?
 * --- maybe this can be part of a general response object with more standardized info for responses
 */