//
// Copyright 2023 DXOS.org
//

import WebSocket from 'isomorphic-ws';
import { readFile } from 'node:fs/promises';
import type { IncomingMessage } from 'node:http';
import https from 'node:https';

import { log } from '@dxos/log';

log.config({ filter: 'warn' });

const main = async () => {
  const server = https.createServer({
    key: await readFile('../../../key.pem'),
    cert: await readFile('../../../cert.pem'),
  });
  const ws = new WebSocket.Server({ server });

  let host: WebSocket | undefined;
  let devtools: WebSocket | undefined;

  const handleHost = (socket: WebSocket, request: IncomingMessage) => {
    if (host) {
      host?.removeAllListeners('message');
    }

    host = socket;
    socket.on('message', (data: any) => {
      log('from host', { data });
      if (devtools) {
        devtools.send(data);
      }
    });
  };

  const handleDevtools = (socket: WebSocket, request: IncomingMessage) => {
    devtools = socket;
    socket.on('message', (data: any) => {
      log('from devtools', { data });
      if (host) {
        host.send(data);
      }
    });
  };

  ws.on('listening', () => {
    log('Listening...');
  });

  ws.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    log('connection', { url: request.url });

    switch (request.url) {
      case '/host':
        handleHost(socket, request);
        break;

      default:
        handleDevtools(socket, request);
    }
  });

  server.listen(parseInt(process.env.PORT ?? '8080'));
};

void main();
