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

import Axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { parse, stringify } from "circular-json";
import Commander = require("commander");
import Express = require("express");
import { readFileSync } from "fs";
import { URL } from "url";
import WebSocket = require("ws");
import { IErrorMessage, IRegisterMessage, IRequestMessage, IResponseMessage, MessageHandler, RawMessage } from "./message";

const buffer = readFileSync(`${__dirname}/../package.json`);
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
    const requestMessage: IRequestMessage = parse(rawMessage);
    requestMessage.payload.headers.host = new URL(localhost).host;
    const config: AxiosRequestConfig = {
        baseURL: localhost,
        data: requestMessage.payload.body && Buffer.from(requestMessage.payload.body.data),
        headers: requestMessage.payload.headers,
        method: requestMessage.payload.method,
        params: requestMessage.payload.query,
        url: `/${requestMessage.payload.params[0]}`,
    };
    Axios.request(config).then((payload: AxiosResponse) => {
        const responseMessage: IResponseMessage = { type: "response", payload };
        webSocketClient.send(stringify(responseMessage));
    }).catch((payload: any) => {
        const errorMessage: IErrorMessage = { type: "error", payload };
        webSocketClient.send(stringify(errorMessage));
    });
};

webSocketClient.once("open", () => {
    const registerMessage: IRegisterMessage = { type: "register", payload: Commander.name.toString() };
    const rawMessage: RawMessage = stringify(registerMessage);
    webSocketClient.send(rawMessage);
    webSocketClient.on("message", messageHandler);
});

process.stdout.write(`${remotehost} <-- ${websocket} --> ${localhost}\n`);
