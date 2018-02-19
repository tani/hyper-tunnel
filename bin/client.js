#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
            if (message.type === "exit") {
                process.stdout.write(message.payload + "\n");
                process.exit();
            }
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
        process.stdout.write(`${options.protocol.split(":")[0]}://${options.remotehost}`);
        process.stdout.write(" <-- ");
        process.stdout.write(`${options.protocol.split(":")[1]}://${options.remotehost}`);
        process.stdout.write(" --> ");
        process.stdout.write(`${options.protocol.split(":")[2]}://${options.localhost}\n`);
        connection.on("pong", () => { setTimeout(() => { connection.ping(); }, 15 * 1000); });
        connection.ping();
    });
};
