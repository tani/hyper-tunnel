/* 
 * This file is part of the noncloud.
 * Copyright (c) 2018 TANIGUCHI Masaya.
 * 
 * This program is free software: you can redistribute it and/or modify  
 * it under the terms of the GNU General Public License as published by  
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but 
 * WITHOUT ANY WARRANTY; without even the implied warranty of 
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU 
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License 
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const WebSocket = require('ws');
const CircularJSON = require('circular-json');
const BodyParser = require('body-parser');
const express = require('express')();
const server = require('http').Server(express);
const websocketserver = new WebSocket.Server({ server });
const application = {};

websocketserver.on('connection', (socket)=>{   
    socket.once('message', (data)=>{
        const websocketregister = CircularJSON.parse(data);
        if(websocketregister.type === 'register'){
            if(!websocketregister.payload.match(/^[A-Za-z0-9][A-Za-z0-9\-]{2,30}[A-Za-z0-9]$/) || application[websocketregister.payload]){
                socket.close();            
            }else{
                application[websocketregister.payload] = socket;
                application[websocketregister.payload].on('close', ()=>{
                    delete application[websocketregister.payload]
                });
            }
        }
    });
});

express.all('/:name*', (request, response)=>{
    if(!application[request.params.name]){
        response.status(404).end();
    }else{
        application[request.params.name].send(CircularJSON.stringify({type: 'request', payload: request})); 
        application[request.params.name].once('message', (data)=>{
            const websocketresponse = CircularJSON.parse(data);
            if(websocketresponse.type === 'response'){
                response.set(websocketresponse.payload.headers);
                response.status(websocketresponse.payload.statusCode).send(websocketresponse.payload.body);
            } else {
                response.status(404).end();
            }
        });
    }
});

express.get('/', (request, response, next)=>{
    response.redirect('https://github.com/asciian/noncloud');
});

express.use(BodyParser.raw({ type: '*/*' }));

server.listen(process.env.PORT);