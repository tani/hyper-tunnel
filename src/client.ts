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
import { EventEmitter } from "events";
import { ClientRequest, ClientResponse, request, RequestOptions, ServerRequest } from "http";
import WebSocket = require("ws");
import { IDataMessage, IEndMessage, IHeaderMessage, Message, RawMessage } from "./message";

export default (options: any) => {
    const url = `${options.protocol.split(":")[1]}://${options.authorization}@${options.remotehost}`;
    const connection = new WebSocket(url, {
        perMessageDeflate: true,
    });

    connection.on("open", () => {
        const emitter = new EventEmitter();
        connection.on("message", (rawMessage: RawMessage) => {
            const message: Message<ServerRequest> = parse(rawMessage);
            if (message.type === "header") {
                const requestOptions: RequestOptions = {
                    headers: message.payload.headers,
                    host: options.localhost.split(":")[0],
                    method: message.payload.method,
                    path: message.payload.url,
                    port: options.localhost.split(":")[1],
                    protocol: `${options.protocol.split(":")[2]}:`,
                };
                const clientRequest = request(requestOptions, (response: ClientResponse) => {
                    connection.send(stringify({
                        identifier: message.identifier,
                        payload: response,
                        type: "header",
                    } as IHeaderMessage<ClientResponse>));
                    response.on("data", (data: string | Buffer) => {
                        const dataMessage: IDataMessage = {
                            identifier: message.identifier,
                            payload: Buffer.from(data as any).toString("base64"),
                            type: "data",
                        };
                        connection.send(stringify(dataMessage));
                    });
                    response.on("end", () => {
                        const endMessage: IEndMessage = {
                            identifier: message.identifier,
                            type: "end",
                        };
                        connection.send(stringify(endMessage));
                    });
                });
                emitter.on(`data:${message.identifier}`, (dataMessage: IDataMessage) => {
                    clientRequest.write(Buffer.from(dataMessage.payload, "base64"));
                });
                emitter.on(`end:${message.identifier}`, (endMessage: IEndMessage) => {
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
        connection.on("close", () => { process.exit(); });
        connection.on("pong", () => { setTimeout(() => { connection.ping(); }, 30 * 1000); });
        connection.ping();
    });
};
