/**
 * File to define a WebSocket Server.
 */

const WebSocket = require('ws');
const HttpsServer = require('https').createServer;
const fs = require('fs');
const config = require('./Config/config.js');

var httpServer, wss;
if (config.prod == true) {
    httpServer = HttpsServer({
        cert: fs.readFileSync(config.ssl_cert_path),
        key: fs.readFileSync(config.ssl_key_path)
    });
    wss = new WebSocket.Server({ clientTracking: true, server: httpServer });
} else wss = new WebSocket.Server({ clientTracking: true, port: config.ws_port });

const { log } = require('./Utility/Logger.js');

let logCtx = {
    fileName: 'WebSocketServer',
    fn: ''
}

var isStagelive = false;

wss.on('connection', function (ws, request) {

    ws.on('message', function (message) {
        logCtx.fn = 'MessageHandler';
        console.log(`Received message ${message}`);

        try {
            var msgJson = JSON.parse(message);
            log("Received message type: " + msgJson.type ? msgJson.type : 'undefined', logCtx);

            if (msgJson.type === config.ws_stageUpdate) {
                isStagelive = msgJson.value;
                wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_getStageLive, value: isStagelive })));
            } else if(msgJson.type === config.ws_getStageLive) {
                ws.send(JSON.stringify({ type: config.ws_getStageLive, value: isStagelive }));
            } else {
                log("Message was received but event type was not recognized", logCtx);
            }            
        } catch (e) {
            logError("Something wrong happened: " + e, logCtx);
        }
    });

    ws.on('close', function () {

    });
});

if (config.prod == true) {
    httpServer.listen(config.ws_port);
}

module.exports = {
    wss: wss
}