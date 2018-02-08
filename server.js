const WebSocket = require('ws');
const CircularJSON = require('circular-json');
const BodyParser = require('body-parser');
const express = require('express')();
const server = require('http').Server(express);
const websocketserver = new WebSocket.Server({ server });
websocketserver.on('connection', (socket, { headers: { authorization } })=>{
    express.use(BodyParser.raw({ type: '*/*' }));    
    socket.once('message', (applicationname)=>{
        express.all(`/${applicationname}/`, (request, response)=>{
            socket.send(CircularJSON.stringify(request)); 
            socket.once('message', (data)=>{
                const websocketresponse = CircularJSON.parse(data);
                response.set(websocketresponse.headers);
                response.status(websocketresponse.statusCode).send(websocketresponse.body);
            });
        });
    });
});
server.listen(4000);