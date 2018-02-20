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
import { readFileSync } from "fs";
import {
  ClientResponse,
  createServer,
  ServerRequest,
  ServerResponse
} from "http";
import * as WebSocket from "ws";
import {
  IDataMessage,
  IEndMessage,
  IHeaderMessage,
  Message,
  RawMessage
} from "./message";

export default (options: any) => {
  const emitter = new EventEmitter();
  let connection: WebSocket;

  const server = createServer(
    (request: ServerRequest, response: ServerResponse) => {
      if (!connection || connection.readyState === connection.CLOSED) {
        response.writeHead(404);
        response.end(readFileSync(`${__dirname}/404.html`));
      } else {
        const identifier: string = Math.random()
          .toString(36)
          .slice(-8);
        connection.send(
          stringify({
            identifier,
            payload: request,
            type: "header"
          } as IHeaderMessage<ServerRequest>)
        );
        request.on("data", (data: string | Buffer) => {
          const dataMessage: IDataMessage = {
            identifier,
            payload: Buffer.from(data as any).toString("base64"),
            type: "data"
          };
          connection.send(stringify(dataMessage));
        });
        request.on("end", () => {
          const endMessage: IEndMessage = {
            identifier,
            type: "end"
          };
          connection.send(stringify(endMessage));
        });
        emitter.on(
          `header:${identifier}`,
          (headerMessage: IHeaderMessage<ClientResponse>) => {
            response.writeHead(
              headerMessage.payload.statusCode || 404,
              headerMessage.payload.headers
            );
          }
        );
        emitter.on(`data:${identifier}`, (dataMessage: IDataMessage) => {
          response.write(Buffer.from(dataMessage.payload, "base64"));
        });
        emitter.on(`end:${identifier}`, (endMessage: IEndMessage) => {
          response.end();
          emitter.removeAllListeners(`header:${identifier}`);
          emitter.removeAllListeners(`data:${identifier}`);
          emitter.removeAllListeners(`end:${identifier}`);
        });
      }
    }
  );

  server.listen(options.port);

  const webSocketServer = new WebSocket.Server({
    perMessageDeflate: true,
    server,
    verifyClient: ({ req, secure }: { req: any; secure: boolean }) => {
      if (secure || !options.encryption) {
        return (
          req.headers.authorization ===
          `Basic ${Buffer.from(options.authorization).toString("base64")}`
        );
      }
    }
  });

  webSocketServer.on("connection", (socket: WebSocket) => {
    if (connection) {
      connection.removeAllListeners("message");
      connection.removeAllListeners("ping");
      connection.close();
    }
    connection = socket;
    connection.on("message", (rawMessage: RawMessage) => {
      const message: Message<ClientResponse> = parse(rawMessage);
      if (
        message.type === "header" ||
        message.type === "data" ||
        message.type === "end"
      ) {
        emitter.emit(`${message.type}:${message.identifier}`, message);
      }
    });
  });
};
