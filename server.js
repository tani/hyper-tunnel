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

websocketserver.on('connection', (socket)=>{
    express.use(BodyParser.raw({ type: '*/*' }));    
    socket.once('message', (applicationname)=>{
        const handler = (request, response)=>{
            socket.send(CircularJSON.stringify(request)); 
            socket.once('message', (data)=>{
                const websocketresponse = CircularJSON.parse(data);
                response.set(websocketresponse.headers);
                response.status(websocketresponse.statusCode).send(websocketresponse.body);
            });            
        };
        express.all(`/${applicationname}`, handler);
        express.all(`/${applicationname}/*`, handler);
    });
});

express.get('/', (request, response)=>{
    response.redirect('https://github.com/asciian/noncloud')
});

server.listen(process.env.PORT);