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

import WebSocket = require('ws');
import Express = require('express');
import Commander = require('commander');
import * as Axios from 'axios';
import * as CircularJSON from 'circular-json';
import { URL } from 'url';
import { Message, RawMessage, RegisterMessage, ResponseMessage, ErrorMessage, MessageHandler } from './lib/message';

Commander
    .version(require('./package.json').version, '-v, --version')
    .option('-n, --name <name>', 'set application name')
    .option('-a, --authorization <username:password>', 'login noncloud server')    
    .option('-r, --remotehost <remotehost:port>', 'set noncloud server')
    .option('-l, --localhost <localhost:port>', 'tunnel traffic to this host')
    .option('-s, --secure', 'use HTTPS between client and localhost')
    .parse(process.argv);

const webSocketClient = new WebSocket(`ws://${Commander.authorization}@${Commander.remotehost}`);
webSocketClient.once('open', () => {
    const registerMessage: RegisterMessage = { type: 'register', payload: Commander.name.toString() };
    const rawMessage: RawMessage = CircularJSON.stringify(registerMessage);
    const messageHandler: MessageHandler = (rawMessage: RawMessage) => {
        const message: Message = CircularJSON.parse(rawMessage);
        const successResponse = (response: Axios.AxiosResponse) => {
            const responseMessage: ResponseMessage = { type: 'response', payload: response }
            const rawMessage = CircularJSON.stringify(responseMessage);
            webSocketClient.send(rawMessage);
        }
        const errorResponse = (error: any) => {
            const errorMessage: ErrorMessage = { type: 'error' }
            const rawMessage = CircularJSON.stringify(errorMessage);
            webSocketClient.send(rawMessage);
        }
        if (message.type === 'request') {
            message.payload.headers.host = new URL(`http${Commander.secure ? 's' : ''}://${Commander.localhost}`).host;
            Axios.default.request({
                url: message.payload.params[0] || '/',
                baseURL: `http${Commander.secure ? 's' : ''}://${Commander.localhost}`,
                method: message.payload.method,
                headers: message.payload.headers,
                params: message.payload.query,
                data: message.payload.body && Buffer.from(message.payload.body.data)
            }).then(successResponse).catch(errorResponse)
        } else {
            errorResponse(null);
        }
    };
    webSocketClient.send(rawMessage);
    webSocketClient.on('message', messageHandler);
});
console.log(`https://${Commander.remotehost}/${Commander.name} --> http${Commander.secure ? 's' : ''}://${Commander.localhost}`);