"use strict";
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
const http_1 = require("http");
const WebSocket = require("ws");
exports.default = (options) => {
    const url = `${options.protocol.split(":")[1]}://${options.authorization}@${options.remotehost}`;
    const connection = new WebSocket(url, {
        perMessageDeflate: true,
    });
    connection.on("open", () => {
        const emitter = new events_1.EventEmitter();
        connection.on("message", (rawMessage) => {
            const message = circular_json_1.parse(rawMessage);
            if (message.type === "header") {
                const requestOptions = {
                    headers: message.payload.headers,
                    host: options.localhost.split(":")[0],
                    method: message.payload.method,
                    path: message.payload.url,
                    port: options.localhost.split(":")[1],
                    protocol: `${options.protocol.split(":")[2]}:`,
                };
                const clientRequest = http_1.request(requestOptions, (response) => {
                    connection.send(circular_json_1.stringify({
                        identifier: message.identifier,
                        payload: response,
                        type: "header",
                    }));
                    response.on("data", (data) => {
                        const dataMessage = {
                            identifier: message.identifier,
                            payload: Buffer.from(data).toString("base64"),
                            type: "data",
                        };
                        connection.send(circular_json_1.stringify(dataMessage));
                    });
                    response.on("end", () => {
                        const endMessage = {
                            identifier: message.identifier,
                            type: "end",
                        };
                        connection.send(circular_json_1.stringify(endMessage));
                    });
                });
                emitter.on(`data:${message.identifier}`, (dataMessage) => {
                    clientRequest.write(Buffer.from(dataMessage.payload, "base64"));
                });
                emitter.on(`end:${message.identifier}`, (endMessage) => {
                    clientRequest.end();
                    emitter.removeAllListeners(`data:${message.identifier}`);
                    emitter.removeAllListeners(`end:${message.identifier}`);
                });
            }
            if (message.type === "data" || message.type === "end") {
                emitter.emit(`${message.type}:${message.identifier}`, message);
            }
        });
        connection.on("close", () => { process.exit(); });
        process.stdout.write(`${options.protocol.split(":")[0]}://${options.remotehost}`);
        process.stdout.write(" <-- ");
        process.stdout.write(`${options.protocol.split(":")[1]}://${options.remotehost}`);
        process.stdout.write(" --> ");
        process.stdout.write(`${options.protocol.split(":")[2]}://${options.localhost}\n`);
    });
};
