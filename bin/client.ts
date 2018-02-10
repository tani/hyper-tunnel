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
import { IErrorMessage, IRegisterMessage, IResponseMessage, Message, MessageHandler, RawMessage } from "../lib/message";

Commander
    .version(JSON.parse(Fs.readdirSync("./package.json")[0]).version, "-v, --version")
    .option("-n, --name <name>", "set application name")
    .option("-a, --authorization <username:password>", "login noncloud server")
    .option("-r, --remotehost <remotehost:port>", "set noncloud server")
    .option("-l, --localhost <localhost:port>", "tunnel traffic to this host")
    .option("-s, --secure", "use HTTPS between client and localhost")
    .parse(process.argv);

const webSocketClient = new WebSocket(`wss://${Commander.authorization}@${Commander.remotehost}`);

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

const messageHandler: MessageHandler = (rawMessage: RawMessage) => {
    const message: Message = CircularJSON.parse(rawMessage);
    if (message.type === "request") {
        message.payload.headers.host = new URL(`http${Commander.secure ? "s" : ""}://${Commander.localhost}`).host;
        Axios.default.request({
            baseURL: `http${Commander.secure ? "s" : ""}://${Commander.localhost}`,
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

const remotehost = `https://${Commander.remotehost}/${Commander.name}`;
const localhost = `http${Commander.secure ? "s" : ""}://${Commander.localhost}`;
process.stdout.write(`${remotehost} --> ${localhost}\n`);
