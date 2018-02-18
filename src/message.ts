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
import { Request } from "express";
import { ClientResponse } from "http";

interface IResponse { headers: any; statusCode: number; data: string; }

export interface IRegisterMessage { type: "register"; }
export interface IRequestMessage  { identifier: string; type: "request"; payload: Request; }
export interface IResponseMessage { identifier: string; type: "response"; payload: IResponse; }
export interface IExitMessage { type: "exit"; payload: string; }

export type Message         = IRegisterMessage | IRequestMessage | IResponseMessage | IExitMessage;
export type RawMessage      = string;
export type MessageHandler  = (rawMessage: RawMessage) => void;
