//
// Copyright 2024 DXOS.org
//

import WebSocket from 'isomorphic-ws';
import { onTestFinished } from 'vitest';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import { MessageSchema, TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { protocol } from './defs';
import { toUint8Array } from './protocol';

export const DEFAULT_PORT = 8080;

export const createTestWsServer = async (port = DEFAULT_PORT) => {
  const server = new WebSocket.Server({ port });
  let connection: WebSocket;
  const closeTrigger = new Trigger();
  server.on('connection', (ws) => {
    connection = ws;
    ws.on('error', (err) => log.catch(err));
    ws.on('message', async (data) => {
      if (String(data) === '__ping__') {
        ws.send('__pong__');
        return;
      }
      log('message', {
        payload: protocol.getPayload(buf.fromBinary(MessageSchema, await toUint8Array(data)), TextMessageSchema),
      });
    });
    ws.on('close', () => closeTrigger.wake());
  });

  onTestFinished(() => server.close());
  return {
    server,
    /**
     * Close the server connection.
     */
    error: async () => {
      connection.close(1011);
      await closeTrigger.wait();
    },
    endpoint: `ws://localhost:${port}`,
  };
};
