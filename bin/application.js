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
Object.defineProperty(exports, "__esModule", { value: true });
const body_parser_1 = require("body-parser");
const circular_json_1 = require("circular-json");
const compressoin = require("compression");
const events_1 = require("events");
const Express = require("express");
const UUID = require("uuid/v1");
const connection_1 = require("./connection");
exports.emitter = new events_1.EventEmitter();
exports.application = Express();
exports.applicationHandler = (request, response) => {
    if (!connection_1.connection.socket || connection_1.connection.socket.readyState === connection_1.connection.socket.CLOSED) {
        response.status(404).sendFile(`${__dirname}/404.html`);
    }
    else {
        const identifier = UUID();
        {
            const requestMessage = { identifier, type: "request", payload: request };
            const rawMessage = circular_json_1.stringify(requestMessage);
            connection_1.connection.socket.send(rawMessage);
        }
        const eventHandler = (rawMessage) => {
            const message = circular_json_1.parse(rawMessage);
            if (message.type === "response") {
                response
                    .set(message.payload.headers)
                    .status(message.payload.statusCode)
                    .send(Buffer.from(message.payload.data, "base64"));
            }
        };
        exports.emitter.once(identifier, eventHandler);
    }
};
exports.application.use(body_parser_1.raw({ type: "*/*" }));
exports.application.use(compressoin());
exports.application.use(exports.applicationHandler);
