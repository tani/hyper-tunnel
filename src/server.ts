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

import { createServer } from "http";
import { application } from "./application";
export const server = createServer(application);
import Commander = require("commander");
import { readFileSync } from "fs";
import "./websocket";

const buffer = readFileSync(`${__dirname}/../package.json`);
const version = JSON.parse(buffer.toString()).version;

Commander
    .version(version, "-v, --version")
    .option("-a, --authorization <username:password>", "set hyper-tunnel account")
    .option("-e, --encryption", "use encryption")
    .option("-p, --port <port>", "use this protocols", "listen this port")
    .parse(process.argv);

export const port = Commander.port;
export const authorization = Commander.authorization;
export const encryption = Commander.encryption;

server.listen(port);
