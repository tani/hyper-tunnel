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
    socket.once('message', (name)=>{
        if(!name.match(/^[A-Za-z0-9][A-Za-z0-9\-]{2,30}[A-Za-z0-9]$/)){
            return socket.close();            
        }
        if(application[name]){
            return socket.close();
        }
        application[name] = socket;
        application[name].on('close', ()=>{
            delete application[name]
        });
    });
});

express.all('/:name*', (request, response)=>{
    if(!application[request.params.name]){
        return response.status(404).end();
    }
    application[request.params.name].send(CircularJSON.stringify(request)); 
    application[request.params.name].once('message', (data)=>{
        const websocketresponse = CircularJSON.parse(data);
        response.set(websocketresponse.headers);
        response.status(websocketresponse.statusCode).send(websocketresponse.body);
    }); 
});

express.get('/', (request, response, next)=>{
    response.redirect('https://github.com/asciian/noncloud');
});

express.use(BodyParser.raw({ type: '*/*' }));

server.listen(process.env.PORT);