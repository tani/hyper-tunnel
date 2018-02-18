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
let connection = makeWebSocketClient();
const messageHandler = (rawMessage) => {
    const message = circular_json_1.parse(rawMessage);
    if (message.type === "exit") {
        process.stdout.write(message.payload + "\n");
        process.exit();
    }
    else if (message.type === "request") {
        const options = {
            headers: message.payload.request.headers,
            host: Commander.localhost.split(":")[0],
            method: message.payload.request.method,
            path: message.payload.request.url,
            port: Commander.localhost.split(":")[1],
            protocol: `${Commander.protocol.split(":")[2]}:`,
        };
        const httpRequest = http_1.request(options, (response) => {
            let data = Buffer.alloc(0);
            const receiveData = (chunk) => {
                data = Buffer.concat([data, Buffer.from(chunk)]);
            };
            const sendResponse = () => {
                const responseMessage = {
                    identifier: message.identifier,
                    payload: {
                        data: data.toString("base64"),
                        response,
                    },
                    type: "response",
                };
                connection.send(circular_json_1.stringify(responseMessage));
            };
            response.on("data", receiveData);
            response.on("end", sendResponse);
        });
        if (Buffer.isBuffer(message.payload.data)) {
            httpRequest.write(Buffer.from(message.payload.data, "base64"));
        }
        httpRequest.end();
    }
};
const openHandler = () => {
    const registerMessage = { type: "register" };
    const rawMessage = circular_json_1.stringify(registerMessage);
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
