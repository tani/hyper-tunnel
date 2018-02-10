import * as Http from 'http';
import { application } from './application';
export const server = Http.createServer(application);
import './websocket';
server.listen(process.env.PORT);