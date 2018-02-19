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
export interface IHeaderMessage<T> { identifier: string; type: "header"; payload: T; }
export interface IDataMessage { identifier: string; type: "data"; payload: string; }
export interface IEndMessage  { identifier: string; type: "end"; }

export type Message<T> = IHeaderMessage<T> | IDataMessage | IEndMessage;
export type RawMessage = string;
