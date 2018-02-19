"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
Object.defineProperty(exports, "__esModule", { value: true });
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
const circular_json_1 = require("circular-json");
const events_1 = require("events");
const fs_1 = require("fs");
const http_1 = require("http");
const WebSocket = __importStar(require("ws"));
exports.default = (options) => {
    const emitter = new events_1.EventEmitter();
    let connection;
    const server = http_1.createServer((request, response) => {
        if (!connection || connection.readyState === connection.CLOSED) {
            response.writeHead(404);
            response.end(fs_1.readFileSync(`${__dirname}/404.html`));
        }
        else {
            const identifier = Math.random().toString(36).slice(-8);
            connection.send(circular_json_1.stringify({
                identifier,
                payload: request,
                type: "header",
            }));
            request.on("data", (data) => {
                const dataMessage = {
                    identifier,
                    payload: Buffer.from(data).toString("base64"),
                    type: "data",
                };
                connection.send(circular_json_1.stringify(dataMessage));
            });
            request.on("end", () => {
                const endMessage = {
                    identifier,
                    type: "end",
                };
                connection.send(circular_json_1.stringify(endMessage));
            });
            emitter.on(`header:${identifier}`, (headerMessage) => {
                response.writeHead(headerMessage.payload.statusCode || 404, headerMessage.payload.headers);
            });
            emitter.on(`data:${identifier}`, (dataMessage) => {
                response.write(Buffer.from(dataMessage.payload, "base64"));
            });
            emitter.on(`end:${identifier}`, (endMessage) => {
                response.end();
                emitter.removeAllListeners(`header:${identifier}`);
                emitter.removeAllListeners(`data:${identifier}`);
                emitter.removeAllListeners(`end:${identifier}`);
            });
        }
    });
    server.listen(options.port);
    const webSocketServer = new WebSocket.Server({
        perMessageDeflate: true,
        server,
        verifyClient: ({ req, secure }) => {
            if (secure || !options.encryption) {
                return req.headers.authorization === `Basic ${Buffer.from(options.authorization).toString("base64")}`;
            }
        },
    });
    webSocketServer.on("connection", (socket) => {
        if (connection) {
            connection.removeAllListeners("message");
            connection.removeAllListeners("ping");
            connection.close();
        }
        connection = socket;
        connection.on("message", (rawMessage) => {
            const message = circular_json_1.parse(rawMessage);
            if (message.type === "header" || message.type === "data" || message.type === "end") {
                emitter.emit(`${message.type}:${message.identifier}`, message);
            }
        });
        connection.on("ping", () => { connection.pong(); });
    });
};
