/**
 * File to define a WebSocket Server.
 */

const WebSocket = require('ws');
const HttpsServer = require('https').createServer;
const fs = require('fs');
const config = require('./Config/config.js');

const httpServer = HttpsServer({
    cert: fs.readFileSync(config.ssl_cert_path),
    key: fs.readFileSync(config.ssl_key_path)
});

const wss = new WebSocket.Server({ clientTracking: true, server: httpServer });

wss.on('connection', function (ws, request) {
    // const userId = request.session.data.userID;

    ws.on('message', function (message) {
        //We might need this
    });

    ws.on('close', function () {
    // userIDtoWSMap.delete(userId);
    });
});

httpServer.listen(config.ws_port);

module.exports = {
    wss: wss
}