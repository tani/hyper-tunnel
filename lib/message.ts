import * as Express      from 'express';
import * as Axios      from 'axios';

export type RawMessage      = string;
export type RegisterMessage = { type: 'register', payload: string };
export type RequestMessage  = { type: 'request', payload: Express.Request };
export type ResponseMessage = { type: 'response', payload: Axios.AxiosResponse };
export type ErrorMessage    = { type: 'error' };
export type Message         = RegisterMessage | RequestMessage | ResponseMessage | ErrorMessage;
export type MessageHandler  = (msg: RawMessage)=>void