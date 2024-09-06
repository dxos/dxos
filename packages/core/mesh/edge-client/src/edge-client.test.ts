//
// Copyright 2024 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import WebSocket from 'ws';

import { Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import { MessageSchema, TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { test, describe, openAndClose, afterTest } from '@dxos/test';

import { protocol } from './defs';
import { EdgeClient } from './edge-client';
import { toUint8Array } from './protocol';

chai.use(chaiAsPromised);

describe('EdgeClient', () => {
  const DEFAULT_PORT = 8080;

  const createServer = async (port = DEFAULT_PORT) => {
    const server = new WebSocket.Server({ port: DEFAULT_PORT });
    let connection: WebSocket;
    const closeTrigger = new Trigger();
    server.on('connection', (ws) => {
      connection = ws;
      ws.on('error', (err) => log.catch(err));
      ws.on('message', async (data) =>
        log('message', {
          payload: protocol.getPayload(buf.fromBinary(MessageSchema, await toUint8Array(data)), TextMessageSchema),
        }),
      );
      ws.on('close', () => closeTrigger.wake());
    });

    afterTest(() => server.close());
    return {
      server,
      /**
       * Close the server connection.
       */
      error: async () => {
        connection.close(1011);
        await closeTrigger.wait();
      },
    };
  };

  const textMessage = (message: string) => protocol.createMessage(TextMessageSchema, { payload: { message } });

  test('reconnects on error', async () => {
    const { error: serverError } = await createServer();
    const id = PublicKey.random().toHex();
    const client = new EdgeClient(id, id, { socketEndpoint: `ws://localhost:${DEFAULT_PORT}` });
    await openAndClose(client);
    await client.send(textMessage('Hello world 1'));
    expect(client.isOpen).is.true;

    const reconnected = client.reconnect.waitForCount(1);
    await serverError();
    await reconnected;
    await expect(client.send(textMessage('Hello world 2'))).to.be.fulfilled;
  });

  test('set identity reconnects', async () => {
    const _ = await createServer();

    const id = PublicKey.random().toHex();
    const client = new EdgeClient(id, id, { socketEndpoint: `ws://localhost:${DEFAULT_PORT}` });
    await openAndClose(client);
    await client.send(textMessage('Hello world 1'));
    expect(client.isOpen).is.true;

    const newId = PublicKey.random().toHex();
    const reconnected = client.reconnect.waitForCount(1);
    client.setIdentity({ peerKey: newId, identityKey: newId });
    await reconnected;
    await expect(client.send(textMessage('Hello world 2'))).to.be.fulfilled;
  });
});
