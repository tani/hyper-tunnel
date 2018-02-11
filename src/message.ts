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
import { AxiosResponse } from "axios";
import { Request } from "express";

export interface IRegisterMessage { type: "register"; payload: string; }
export interface IRequestMessage  { type: "request"; payload: Request; }
export interface IResponseMessage { type: "response"; payload: AxiosResponse; }
export interface IErrorMessage    { type: "error"; }
export type Message         = IRegisterMessage | IRequestMessage | IResponseMessage | IErrorMessage;
export type RawMessage      = string;
export type MessageHandler  = (rawMessage: RawMessage) => void;
