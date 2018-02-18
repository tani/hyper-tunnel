"use strict";
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
Object.defineProperty(exports, "__esModule", { value: true });
const circular_json_1 = require("circular-json");
const Commander = require("commander");
const events_1 = require("events");
const fs_1 = require("fs");
const http_1 = require("http");
const UUID = require("uuid/v1");
const WebSocket = __importStar(require("ws"));
const buffer = fs_1.readFileSync(`${__dirname}/../package.json`);
const version = JSON.parse(buffer.toString()).version;
Commander
    .version(version, "-v, --version")
    .option("-a, --authorization <username:password>", "set hyper-tunnel account")
    .option("-e, --encryption", "use encryption")
    .option("-p, --port <port>", "use this protocols", "listen this port")
    .parse(process.argv);
const emitter = new events_1.EventEmitter();
let connection;
const application = (request, response) => {
    if (!connection || connection.readyState === connection.CLOSED) {
        response.writeHead(404);
        response.end(fs_1.readFileSync(`${__dirname}/404.html`));
    }
    else {
        const identifier = UUID();
        let data = Buffer.alloc(0);
        const receiveData = (chunk) => {
            data = Buffer.concat([data, Buffer.from(chunk)]);
        };
        const sendResponse = () => {
            const requestMessage = {
                identifier,
                payload: {
                    data: data.toString("base64"),
                    request,
                },
                type: "request",
            };
            connection.send(circular_json_1.stringify(requestMessage));
        };
        const eventHandler = (rawMessage) => {
            const message = circular_json_1.parse(rawMessage);
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
const server = http_1.createServer(application);
server.listen(Commander.port);
const webSocketServer = new WebSocket.Server({
    perMessageDeflate: true,
    server,
    verifyClient: ({ req, secure }) => {
        if (secure || !Commander.encryption) {
            return req.headers.authorization === `Basic ${Buffer.from(Commander.authorization).toString("base64")}`;
        }
    },
});
webSocketServer.on("connection", (socket) => {
    const messageHandler = (rawMessage) => {
        const message = circular_json_1.parse(rawMessage);
        if (message.type === "register") {
            connection = socket;
        }
        if (message.type === "response") {
            emitter.emit(message.identifier, rawMessage);
        }
    };
    socket.on("message", messageHandler);
});
