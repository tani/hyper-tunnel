#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const circular_json_1 = require("circular-json");
const Commander = require("commander");
const fs_1 = require("fs");
const http_1 = require("http");
const WebSocket = require("ws");
const buffer = fs_1.readFileSync(`${__dirname}/../package.json`);
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
let webSocketClient = makeWebSocketClient();
const messageHandler = (rawMessage) => {
    const message = circular_json_1.parse(rawMessage);
    if (message.type === "exit") {
        process.stdout.write(message.payload + "\n");
        process.exit();
    }
    else if (message.type === "request") {
        const options = {
            headers: message.payload.headers,
            host: Commander.localhost.split(":")[0],
            method: message.payload.method,
            path: message.payload.originalUrl,
            port: Commander.localhost.split(":")[1],
            protocol: `${Commander.protocol.split(":")[2]}:`,
        };
        const httpRequest = http_1.request(options, (response) => {
            let data = Buffer.alloc(0);
            response.on("data", (chunk) => {
                data = Buffer.concat([data, new Buffer(chunk)]);
            });
            response.on("end", () => {
                const responseMessage = {
                    identifier: message.identifier,
                    payload: {
                        data: data.toString("base64"),
                        headers: response.headers,
                        statusCode: response.statusCode || 404,
                    },
                    type: "response",
                };
                webSocketClient.send(circular_json_1.stringify(responseMessage));
            });
        });
        if (Buffer.isBuffer(message.payload.body)) {
            httpRequest.write(message.payload.body);
        }
        httpRequest.end();
    }
};
const openHandler = () => {
    const registerMessage = { type: "register" };
    const rawMessage = circular_json_1.stringify(registerMessage);
    webSocketClient.send(rawMessage);
    webSocketClient.on("message", messageHandler);
    process.stdout.write(`${Commander.protocol.split(":")[0]}://${Commander.remotehost}`);
    process.stdout.write(" <-- ");
    process.stdout.write(`${Commander.protocol.split(":")[1]}://${Commander.remotehost}`);
    process.stdout.write(" --> ");
    process.stdout.write(`${Commander.protocol.split(":")[2]}://${Commander.localhost}\n`);
};
const closeHandler = () => {
    webSocketClient = makeWebSocketClient();
    webSocketClient.on("open", openHandler);
    webSocketClient.on("close", closeHandler);
};
webSocketClient.on("open", openHandler);
webSocketClient.on("close", closeHandler);
