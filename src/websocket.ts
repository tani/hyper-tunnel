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

import { parse, stringify } from "circular-json";
import * as WebSocket from "ws";
import { emitter } from "./application";
import { database } from "./database";
import { Message, MessageHandler, RawMessage } from "./message";
import { server } from "./server";

const webSocketServer = new WebSocket.Server({
    server,
    verifyClient: ({ req, secure }: { req: any, secure: boolean }) => {
        if (secure || process.env.ALLOW_UNENCRYPTED_CONNECTION) {
            const authorization = `${process.env.USERNAME}:${process.env.PASSWORD}`;
            return req.headers.authorization === `Basic ${Buffer.from(authorization).toString("base64")}`;
        }
    },
});

webSocketServer.on("connection", (socket: WebSocket) => {
    const messageHandler: MessageHandler = (rawMessage: RawMessage) => {
        const message: Message = parse(rawMessage);
        if (message.type === "register") {
            if (!message.payload.match(/^[A-Za-z0-9][A-Za-z0-9\-]{2,30}[A-Za-z0-9]$/)) {
                return socket.close();
            }
            if (database[message.payload]) {
                return socket.close();
            }
            database[message.payload] = socket;
            database[message.payload].on("close", () => {
                delete database[message.payload];
            });
        }
        if (message.type === "response" || message.type === "error") {
            const url = message.payload.config.url as string;
            const baseURL = message.payload.config.baseURL as string;
            emitter.emit(url.replace(baseURL, ""), rawMessage);
        }
    };
    socket.on("message", messageHandler);
});
