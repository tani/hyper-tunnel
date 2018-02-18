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
const http_1 = require("http");
const application_1 = require("./application");
exports.server = http_1.createServer(application_1.application);
const Commander = require("commander");
const fs_1 = require("fs");
require("./websocket");
const buffer = fs_1.readFileSync(`${__dirname}/../package.json`);
const version = JSON.parse(buffer.toString()).version;
Commander
    .version(version, "-v, --version")
    .option("-a, --authorization <username:password>", "set hyper-tunnel account")
    .option("-e, --encryption", "use encryption")
    .option("-p, --port <port>", "use this protocols", "listen this port")
    .parse(process.argv);
exports.port = Commander.port;
exports.authorization = Commander.authorization;
exports.encryption = Commander.encryption;
exports.server.listen(exports.port);
