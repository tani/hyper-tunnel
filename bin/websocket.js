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
const WebSocket = __importStar(require("ws"));
const application_1 = require("./application");
const connection_1 = require("./connection");
const server_1 = require("./server");
const webSocketServer = new WebSocket.Server({
    perMessageDeflate: true,
    server: server_1.server,
    verifyClient: ({ req, secure }) => {
        if (secure || process.env.ALLOW_UNENCRYPTED_CONNECTION) {
            const authorization = `${process.env.USERNAME}:${process.env.PASSWORD}`;
            return req.headers.authorization === `Basic ${Buffer.from(authorization).toString("base64")}`;
        }
    },
});
webSocketServer.on("connection", (socket) => {
    const messageHandler = (rawMessage) => {
        const message = circular_json_1.parse(rawMessage);
        if (message.type === "register") {
            connection_1.connection.socket = socket;
        }
        if (message.type === "response" || message.type === "error") {
            application_1.emitter.emit(message.identifier, rawMessage);
        }
    };
    socket.on("message", messageHandler);
});
