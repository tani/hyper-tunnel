import Express = require('express');
import * as BodyParser from 'body-parser';
import * as CircularJSON from 'circular-json';
import { database } from './database';
import { Message, RawMessage, RequestMessage, MessageHandler } from './message';

export const application = Express();

const notFoundHandler = (request: Express.Request, response: Express.Response) => {
    response.status(404).end();
};

const applicationHandler = (request: Express.Request, response: Express.Response) => {
    if (!database[request.params.name]) {
        notFoundHandler(request, response);
    } else {
        const requestMessage: RequestMessage = { type: 'request', payload: request }
        const rawMessage: RawMessage = CircularJSON.stringify(requestMessage);
        const messageHandler: MessageHandler = (data: RawMessage) => {
            const message: Message = CircularJSON.parse(data);
            if (message.type === 'response') {
                response.set(message.payload.headers);
                response.status(message.payload.status).send(message.payload.data);
            } else {
                notFoundHandler(request, response);
            }
        };
        database[request.params.name].send(rawMessage);
        database[request.params.name].once('message', messageHandler);
    }
};

application.all('/:name/*', applicationHandler);

application.all('/:name', (request: Express.Request, response: Express.Response) => {
    response.redirect(`/${request.params.name}/`);
});

application.get('/', (request: Express.Request, response: Express.Response) => {
    response.redirect('https://github.com/asciian/noncloud');
});

application.use(BodyParser.raw({ type: '*/*' }));