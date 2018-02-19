#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const Commander = require("commander");
const fs_1 = require("fs");
const client_1 = __importDefault(require("./client"));
const server_1 = __importDefault(require("./server"));
const buffer = fs_1.readFileSync(`${__dirname}/../package.json`);
const version = JSON.parse(buffer.toString()).version;
Commander
    .command("server")
    .option("-a, --authorization <username:password>", "set hyper-tunnel account")
    .option("-e, --encryption", "use encryption")
    .option("-p, --port <port>", "listen this port")
    .action(server_1.default);
Commander
    .command("client")
    .option("-a, --authorization <username:password>", "login noncloud server")
    .option("-r, --remotehost <remotehost:port>", "set noncloud server")
    .option("-l, --localhost <localhost:port>", "tunnel traffic to this host")
    .option("-p, --protocol <remotehost:websocket:localhost>", "use this protocols", "https:wss:http")
    .action(client_1.default);
Commander
    .version(version, "-v, --version")
    .parse(process.argv);
