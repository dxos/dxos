//
// Copyright 2024 DXOS.org
//

// Implement WS header-based auth similar to https://github.com/kubernetes/kubernetes/commit/714f97d7baf4975ad3aa47735a868a81a984d1f0
// https://stackoverflow.com/questions/4361173/http-headers-in-websockets-client-api/77060459#77060459

import { type IncomingMessage } from 'http';
import WebSocket from 'isomorphic-ws';
import { type Socket } from 'node:net';

import { log } from '@dxos/log';

const PROTOCOL_TOKEN_PREFIX = 'base64url.bearer.authorization.dxos.org';

// TODO: implement middleware which removes the token from the request

export const authenticateRequestWithTokenAuth = (
  request: IncomingMessage,
  socket: Socket,
  upgradeHead: Buffer,
  token: string,
  cb: (request: IncomingMessage, socket: Socket, upgradeHead: Buffer) => void,
) => {
  const protocolHeader = request.headers['sec-websocket-protocol'];

  if (!protocolHeader) {
    log('upgrade unauthorized, header missing', { header: request.headers['sec-websocket-protocol'] });
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  const tokenHeader = protocolHeader.replace(new RegExp(`^${PROTOCOL_TOKEN_PREFIX}.`), '');

  // padding characters are not allowed as a websocket protocol.
  const encodedToken = Buffer.from(token).toString('base64').replace(/=*$/, '');

  if (tokenHeader !== encodedToken) {
    log('upgrade unauthorized', { token, foo: encodedToken });
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  cb(request, socket, upgradeHead);
};

export class WebSocketWithTokenAuth extends WebSocket {
  constructor(url: string, token: string) {
    const encodedToken = Buffer.from(token).toString('base64').replace(/=*$/, '');

    const wsProtocols = [`base64url.bearer.authorization.dxos.org.${encodedToken}`];
    super(url, wsProtocols);
    log('encodedToken', {
      encodedToken,
    });
  }
}
