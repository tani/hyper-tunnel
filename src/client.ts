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

// import Axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { parse, stringify } from "circular-json";
import Commander = require("commander");
import { readFileSync } from "fs";
import { ClientRequest, ClientRequestArgs, ClientResponse, request, RequestOptions } from "http";
import { URL } from "url";
import WebSocket = require("ws");
import { IRegisterMessage, IRequestMessage, IResponseMessage, Message, RawMessage } from "./message";

const buffer = readFileSync(`${__dirname}/../package.json`);
const version = JSON.parse(buffer.toString()).version;

Commander
    .version(version, "-v, --version")
    .option("-a, --authorization <username:password>", "login noncloud server")
    .option("-r, --remotehost <remotehost:port>", "set noncloud server")
    .option("-l, --localhost <localhost:port>", "tunnel traffic to this host")
    .option("-p, --protocol <remotehost:websocket:localhost>", "use this protocols", "https:wss:http")
    .parse(process.argv);

const makeWebSocketClient = () => {
    return new WebSocket(`${Commander.protocol.split(":")[1]}://${Commander.authorization}@${Commander.remotehost}`, {
        perMessageDeflate: true,
    });
};

let connection = makeWebSocketClient();

const messageHandler = (rawMessage: RawMessage) => {
    const message: Message = parse(rawMessage);
    if (message.type === "exit") {
        process.stdout.write(message.payload + "\n");
        process.exit();
    } else if (message.type === "request") {
        const options: RequestOptions = {
            headers: message.payload.request.headers,
            host: Commander.localhost.split(":")[0],
            method: message.payload.request.method,
            path: message.payload.request.url,
            port: Commander.localhost.split(":")[1],
            protocol: `${Commander.protocol.split(":")[2]}:`,
        };
        const httpRequest = request(options, (response: ClientResponse) => {
            let data: Buffer = Buffer.alloc(0);
            const receiveData = (chunk: string | Buffer) => {
                data = Buffer.concat([data, Buffer.from(chunk as any)]);
            };
            const sendResponse = () => {
                const responseMessage: IResponseMessage = {
                    identifier: message.identifier,
                    payload: {
                        data: data.toString("base64"),
                        response,
                    },
                    type: "response",
                };
                connection.send(stringify(responseMessage));
            };
            response.on("data", receiveData);
            response.on("end", sendResponse);
        });
        httpRequest.write(Buffer.from(message.payload.data, "base64"));
        httpRequest.end();
    }
};

const openHandler = () => {
    const registerMessage: IRegisterMessage = { type: "register" };
    const rawMessage: RawMessage = stringify(registerMessage);
    connection.send(rawMessage);
    connection.on("message", messageHandler);
    process.stdout.write(`${Commander.protocol.split(":")[0]}://${Commander.remotehost}`);
    process.stdout.write(" <-- ");
    process.stdout.write(`${Commander.protocol.split(":")[1]}://${Commander.remotehost}`);
    process.stdout.write(" --> ");
    process.stdout.write(`${Commander.protocol.split(":")[2]}://${Commander.localhost}\n`);
};

const closeHandler = () => {
    connection = makeWebSocketClient();
    connection.on("open", openHandler);
    connection.on("close", closeHandler);
};

connection.on("open", openHandler);
connection.on("close", closeHandler);
