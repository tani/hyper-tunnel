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
import { connection } from "./connection";
import { IExitMessage, Message, MessageHandler, RawMessage } from "./message";
import { authorization, encryption, server } from "./server";
const webSocketServer = new WebSocket.Server({
    perMessageDeflate: true,
    server,
    verifyClient: ({ req, secure }: { req: any, secure: boolean }) => {
        if (secure || !encryption) {
            return req.headers.authorization === `Basic ${Buffer.from(authorization).toString("base64")}`;
        }
    },
});

webSocketServer.on("connection", (socket: WebSocket) => {
    const messageHandler: MessageHandler = (rawMessage: RawMessage) => {
        const message: Message = parse(rawMessage);
        if (message.type === "register") {
            connection.socket = socket;
        }
        if (message.type === "response") {
            emitter.emit(message.identifier, rawMessage);
        }
    };
    socket.on("message", messageHandler);
});
