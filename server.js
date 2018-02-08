const WebSocket = require('ws');
const CircularJSON = require('circular-json');
const BodyParser = require('body-parser');
const express = require('express')();
const server = require('http').Server(express);
const websocketserver = new WebSocket.Server({
    server,
    verifyClient: (info) => {
        const authorization = 'username:password'
        return info.req.headers.authorization === `Basic ${Buffer.from(authorization).toString('base64')}`;
    }
});
websocketserver.on('connection', (socket)=>{
    express.use(BodyParser.raw({ type: '*/*' }));    
    socket.once('message', (name)=>{
        express.all(`/${name}/`, (request, response)=>{
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