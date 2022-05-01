/**
 * File to define a WebSocket Server.
 */

const WebSocket = require('ws');
const wss = new WebSocket.Server({ clientTracking: true, port: 8081 });

wss.on('connection', function (ws, request) {
    // const userId = request.session.data.userID;

    ws.on('message', function (message) {
    //
    // Here we can now use session parameters.
    //
    console.log(`Received message ${message}`);// from user ${userId}`);


    //test code to see if updates correctly
    if(message === config.ws_annoucement)
        wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_annoucement })));
    
    else if(message === config.ws_progressbar)
        wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_progressbar })));
    
    else if(message === config.ws_upcomingevents)
        wss.clients.forEach(ws => ws.send(JSON.stringify({ type: config.ws_upcomingevents })));
    
    else console.log("message was sent but event was not recognized");
    
    console.log("updated!")

    });

    ws.on('close', function () {
    // userIDtoWSMap.delete(userId);
    });
});

module.exports = {
    wss: wss
}