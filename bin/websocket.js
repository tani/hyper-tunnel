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
const database_1 = require("./database");
const server_1 = require("./server");
const webSocketServer = new WebSocket.Server({
    server: server_1.server,
    verifyClient: ({ req, secure }) => {
        if (secure || process.env.ALLOW_UNENCRYPTED_CONNECTION) {
            const authorization = `${process.env.USERNAME}:${process.env.PASSWORD}`;
            return req.headers.authorization === `Basic ${Buffer.from(authorization).toString("base64")}`;
        }
    },
});
const messageHandler = (socket) => (rawMessage) => {
    const message = circular_json_1.parse(rawMessage);
    if (message.type === "register" && !message.payload.match(/^[A-Za-z0-9][A-Za-z0-9\-]{2,30}[A-Za-z0-9]$/)) {
        socket.close();
    }
    else if (message.type === "register" && database_1.database[message.payload]) {
        socket.close();
    }
    else if (message.type !== "register") {
        socket.close();
    }
    else {
        database_1.database[message.payload] = socket;
        database_1.database[message.payload].on("close", () => {
            delete database_1.database[message.payload];
        });
    }
};
webSocketServer.on("connection", (socket) => {
    socket.once("message", messageHandler(socket));
});
