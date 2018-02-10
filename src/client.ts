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

import * as Axios from "axios";
import * as CircularJSON from "circular-json";
import Commander = require("commander");
import Express = require("express");
import * as Fs from "fs";
import { URL } from "url";
import WebSocket = require("ws");
import { IErrorMessage, IRegisterMessage, IResponseMessage, Message, MessageHandler, RawMessage } from "./message";

const buffer = Fs.readFileSync(`${__dirname}/../package.json`);
const version = JSON.parse(buffer.toString()).version;

Commander
    .version(version, "-v, --version")
    .option("-n, --name <name>", "set application name")
    .option("-a, --authorization <username:password>", "login noncloud server")
    .option("-r, --remotehost <remotehost:port>", "set noncloud server")
    .option("-l, --localhost <localhost:port>", "tunnel traffic to this host")
    .option("-p, --protocol <remotehost:websocket:localhost>", "use this protocols", "https:wss:http")
    .parse(process.argv);

const webSocketClient = (() => {
    const protocol = Commander.protocol.split(":")[1];
    return new WebSocket(`${protocol}://${Commander.authorization}@${Commander.remotehost}`);
})();

const successResponse = (response: Axios.AxiosResponse) => {
    const responseMessage: IResponseMessage = { type: "response", payload: response };
    const rawMessage = CircularJSON.stringify(responseMessage);
    webSocketClient.send(rawMessage);
};

const errorResponse = (error: any) => {
    const errorMessage: IErrorMessage = { type: "error" };
    const rawMessage = CircularJSON.stringify(errorMessage);
    webSocketClient.send(rawMessage);
};

const remotehost = (() => {
    const protocol = Commander.protocol.split(":")[0];
    return `${protocol}://${Commander.remotehost}/${Commander.name}`;
})();
const localhost = (() => {
    const protocol = Commander.protocol.split(":")[2];
    return `${protocol}://${Commander.localhost}`;
})();
const websocket = (() => {
    const protocol = Commander.protocol.split(":")[1];
    return `${protocol}://${Commander.remotehost}`;
})();

const messageHandler: MessageHandler = (rawMessage: RawMessage) => {
    const message: Message = CircularJSON.parse(rawMessage);
    if (message.type === "request") {
        message.payload.headers.host = new URL(localhost).host;
        Axios.default.request({
            baseURL: localhost,
            data: message.payload.body && Buffer.from(message.payload.body.data),
            headers: message.payload.headers,
            method: message.payload.method,
            params: message.payload.query,
            url: message.payload.params[0] || "/",
        }).then(successResponse).catch(errorResponse);
    } else {
        errorResponse(null);
    }
};

webSocketClient.once("open", () => {
    const registerMessage: IRegisterMessage = { type: "register", payload: Commander.name.toString() };
    const rawMessage: RawMessage = CircularJSON.stringify(registerMessage);
    webSocketClient.send(rawMessage);
    webSocketClient.on("message", messageHandler);
});

process.stdout.write(`${remotehost} <-- ${websocket} --> ${localhost}\n`);
