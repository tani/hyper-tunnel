#!/usr/bin/env node
"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
Object.defineProperty(exports, "__esModule", { value: true });
const Axios = __importStar(require("axios"));
const CircularJSON = __importStar(require("circular-json"));
const Commander = require("commander");
const Fs = __importStar(require("fs"));
const url_1 = require("url");
const WebSocket = require("ws");
const buffer = Fs.readFileSync(`${__dirname}/../package.json`);
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
const successResponse = (response) => {
    const responseMessage = { type: "response", payload: response };
    const rawMessage = CircularJSON.stringify(responseMessage);
    webSocketClient.send(rawMessage);
};
const errorResponse = (error) => {
    const errorMessage = { type: "error" };
    const rawMessage = CircularJSON.stringify(errorMessage);
    webSocketClient.send(rawMessage);
};
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
const messageHandler = (rawMessage) => {
    const message = CircularJSON.parse(rawMessage);
    if (message.type === "request") {
        message.payload.headers.host = new url_1.URL(localhost).host;
        Axios.default.request({
            baseURL: localhost,
            data: message.payload.body && Buffer.from(message.payload.body.data),
            headers: message.payload.headers,
            method: message.payload.method,
            params: message.payload.query,
            url: message.payload.params[0] || "/",
        }).then(successResponse).catch(errorResponse);
    }
    else {
        errorResponse(null);
    }
};
webSocketClient.once("open", () => {
    const registerMessage = { type: "register", payload: Commander.name.toString() };
    const rawMessage = CircularJSON.stringify(registerMessage);
    webSocketClient.send(rawMessage);
    webSocketClient.on("message", messageHandler);
});
process.stdout.write(`${remotehost} <-- ${websocket} --> ${localhost}\n`);
