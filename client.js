#!/usr/bin/env node
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
const Request = require('request');
const Commander = require('commander');
const URL = require('url').URL;
const version = require('./package.json').version;

Commander
    .version(version, '-v, --version')
    .option('-n, --name <name>',  'set application name')
    .option('-r, --remotehost <remotehost:port>', 'set noncloud server', 'noncloud.herokuapp.com')
    .option('-l, --localhost <localhost:port>',  'tunnel traffic to this host', 'localhost:80')
    .option('-s, --secure', 'use HTTPS between client and localhost')
    .parse(process.argv);

if (Commander.name && Commander.localhost) {
    const websocketclient = new WebSocket(`wss://${Commander.remotehost}`);
    websocketclient.once('open', ()=>{
        websocketclient.send(CircularJSON.stringify({type: 'register', payload: Commander.name}));
        websocketclient.on('message', (data)=>{
            const websocketrequest = CircularJSON.parse(data);
            if(websocketrequest.type === 'request'){
                websocketrequest.payload.headers.host = new URL(`http${Commander.secure?'s':''}://${Commander.localhost}`).host;
                Request({
                    url: websocketrequest.payload.params[0] || '/',
                    baseUrl: `http${Commander.secure?'s':''}://${Commander.localhost}`,
                    method: websocketrequest.payload.method,
                    headers: websocketrequest.payload.headers,
                    qs: websocketrequest.payload.query,
                    body: websocketrequest.payload.body && Buffer.from(websocketrequest.payload.body.data)
                }, (error, response, body)=>{
                    if(response){
                        websocketclient.send(CircularJSON.stringify({type: 'response', payload: response}));
                    } else {
                        websocketclient.send(CircularJSON.stringify({type: 'error'}));                }
                });
            }
        });
    });
    console.log(`https://${Commander.remotehost}/${Commander.name} --> http${Commander.secure?'s':''}://${Commander.localhost}`);        
}