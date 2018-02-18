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

import { parse, stringify } from "circular-json";
import Commander = require("commander");
import { EventEmitter } from "events";
import { readFileSync } from "fs";
import { createServer } from "http";
import { ServerRequest, ServerResponse} from "http";
import UUID = require("uuid/v1");
import * as WebSocket from "ws";
import { IExitMessage, IRequestMessage, IResponseMessage, Message, RawMessage } from "./message";

const buffer = readFileSync(`${__dirname}/../package.json`);
const version = JSON.parse(buffer.toString()).version;

Commander
    .version(version, "-v, --version")
    .option("-a, --authorization <username:password>", "set hyper-tunnel account")
    .option("-e, --encryption", "use encryption")
    .option("-p, --port <port>", "use this protocols", "listen this port")
    .parse(process.argv);

const emitter = new EventEmitter();
let connection: WebSocket;

const application = (request: ServerRequest, response: ServerResponse) => {
    if (!connection || connection.readyState === connection.CLOSED) {
        response.writeHead(404);
        response.end(readFileSync(`${__dirname}/404.html`));
    } else {
        const identifier: string = UUID();
        let data: Buffer = Buffer.alloc(0);
        const receiveData = (chunk: string | Buffer) => {
            data = Buffer.concat([data, Buffer.from(chunk as any)]);
        };
        const sendResponse = () => {
            const requestMessage: IRequestMessage = {
                identifier,
                payload: {
                    data: data.toString("base64"),
                    request,
                },
                type: "request",
            };
            connection.send(stringify(requestMessage));
        };
        const eventHandler = (rawMessage: RawMessage) => {
            const message: Message = parse(rawMessage);
            if (message.type === "response") {
                response.writeHead(message.payload.response.statusCode || 404, message.payload.response.headers);
                response.end(Buffer.from(message.payload.data, "base64"));
            }
        };
        request.on("data", receiveData);
        request.on("end", sendResponse);
        emitter.once(identifier, eventHandler);
    }
};

const server = createServer(application);
server.listen(Commander.port);

const webSocketServer = new WebSocket.Server({
    perMessageDeflate: true,
    server,
    verifyClient: ({ req, secure }: { req: any, secure: boolean }) => {
        if (secure || !Commander.encryption) {
            return req.headers.authorization === `Basic ${Buffer.from( Commander.authorization).toString("base64")}`;
        }
    },
});

webSocketServer.on("connection", (socket: WebSocket) => {
    const messageHandler = (rawMessage: RawMessage) => {
        const message: Message = parse(rawMessage);
        if (message.type === "register") {
            connection = socket;
        }
        if (message.type === "response") {
            emitter.emit(message.identifier, rawMessage);
        }
    };
    socket.on("message", messageHandler);
});
