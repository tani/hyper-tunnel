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

import { raw } from "body-parser";
import { parse, stringify } from "circular-json";
import compressoin = require("compression");
import { EventEmitter } from "events";
import Express = require("express");
import { database } from "./database";
import { IRequestMessage, IResponseMessage, Message, MessageHandler, RawMessage } from "./message";

export const emitter = new EventEmitter();
export const application = Express();

export const applicationHandler = (request: Express.Request, response: Express.Response) => {
    if (!database[request.params.name]) {
        response.status(404).sendFile(`${__dirname}/404.html`);
    } else {
        {
            const requestMessage: IRequestMessage = { type: "request", payload: request };
            const rawMessage: RawMessage = stringify(requestMessage);
            database[request.params.name].send(rawMessage);
        }
        const eventHandler: MessageHandler = (rawMessage: RawMessage) => {
            const message = parse(rawMessage);
            if (message.type === "response") {
                response
                    .set(message.payload.headers)
                    .status(message.payload.status)
                    .send(message.payload.data);
            } else if (message.type === "error") {
                response
                    .set(message.payload.response.headers)
                    .status(message.payload.response.status)
                    .send(message.payload.response.data);
            }
        };
        emitter.once(`/${request.params[0]}`, eventHandler);
    }
};

application.all("/:name/*", applicationHandler);

application.all("/:name", (request: Express.Request, response: Express.Response) => {
    response.redirect(`/${request.params.name}/`);
});

application.get("/", (request: Express.Request, response: Express.Response) => {
    response.redirect("https://github.com/asciian/noncloud");
});
application.use(compressoin());
application.use(raw({ type: "*/*" }));
