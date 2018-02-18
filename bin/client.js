#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const circular_json_1 = require("circular-json");
const Commander = require("commander");
const fs_1 = require("fs");
const url_1 = require("url");
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
    const protocol = Commander.protocol.split(":")[1];
    return new WebSocket(`${protocol}://${Commander.authorization}@${Commander.remotehost}`, {
        perMessageDeflate: true,
    });
};
let webSocketClient = makeWebSocketClient();
const remotehost = (() => {
    const protocol = Commander.protocol.split(":")[0];
    return `${protocol}://${Commander.remotehost}`;
})();
const localhost = (() => {
    const protocol = Commander.protocol.split(":")[2];
    return `${protocol}://${Commander.localhost}`;
})();
const websocket = (() => {
    const protocol = Commander.protocol.split(":")[1];
    return `${protocol}://${Commander.remotehost}`;
})();
const messageHandler = (rawMessage) => {
    const message = circular_json_1.parse(rawMessage);
    if (message.type === "exit") {
        process.stdout.write(message.payload + "\n");
        process.exit();
    }
    else if (message.type === "request") {
        message.payload.headers.host = new url_1.URL(localhost).host;
        const config = {
            baseURL: localhost,
            data: message.payload.body,
            headers: message.payload.headers,
            method: message.payload.method,
            params: message.payload.query,
            responseType: "arraybuffer",
            url: message.payload.originalUrl,
        };
        axios_1.default.request(config).then((payload) => {
            const responseMessage = {
                identifier: message.identifier,
                payload: Object.assign({}, payload, { data: Buffer.from(payload.data).toString("base64") }),
                type: "response",
            };
            webSocketClient.send(circular_json_1.stringify(responseMessage));
        }).catch((payload) => {
            const errorMessage = {
                identifier: message.identifier,
                payload: Object.assign({}, payload.response, { data: Buffer.from(payload.response.data).toString("base64") }),
                type: "error",
            };
            webSocketClient.send(circular_json_1.stringify(errorMessage));
        });
    }
};
const openHandler = () => {
    const registerMessage = { type: "register" };
    const rawMessage = circular_json_1.stringify(registerMessage);
    webSocketClient.send(rawMessage);
    webSocketClient.on("message", messageHandler);
    process.stdout.write(`${remotehost} <-- ${websocket} --> ${localhost}\n`);
};
const closeHandler = () => {
    webSocketClient = makeWebSocketClient();
    webSocketClient.on("open", openHandler);
    webSocketClient.on("close", closeHandler);
};
webSocketClient.on("open", openHandler);
webSocketClient.on("close", closeHandler);
