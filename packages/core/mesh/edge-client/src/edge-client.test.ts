//
// Copyright 2024 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { openAndClose } from '@dxos/test-utils';

import { createEphemeralEdgeIdentity, createTestHaloEdgeIdentity } from './auth';
import { protocol } from './defs';
import { EdgeClient } from './edge-client';
import { createTestEdgeWsServer } from './testing';
import { Keyring } from '@dxos/keyring';

describe('EdgeClient', () => {
  const textMessage = (message: string) => protocol.createMessage(TextMessageSchema, { payload: { message } });

  test('reconnects on error', async () => {
    const { closeConnection, endpoint, cleanup } = await createTestEdgeWsServer(8001);
    onTestFinished(cleanup);

    const client = new EdgeClient(await createEphemeralEdgeIdentity(), { socketEndpoint: endpoint });
    await openAndClose(client);
    await client.send(textMessage('Hello world 1'));
    expect(client.isOpen).is.true;

    const reconnected = client.reconnect.waitForCount(1);
    await closeConnection();
    await reconnected;
    await expect(client.send(textMessage('Hello world 2'))).resolves.not.toThrow();
  });

  test('isConnected', async () => {
    const admitConnection = new Trigger();
    const { closeConnection, endpoint, cleanup } = await createTestEdgeWsServer(8001, { admitConnection });
    onTestFinished(cleanup);

    const client = new EdgeClient(await createEphemeralEdgeIdentity(), { socketEndpoint: endpoint });
    await openAndClose(client);

    expect(client.isConnected).toBeFalsy();
    admitConnection.wake();
    await expect.poll(() => client.isConnected).toBeTruthy();

    admitConnection.reset();
    await closeConnection();
    expect(client.isOpen).is.true;
    await expect.poll(() => client.isConnected).toBeFalsy();

    admitConnection.wake();
    await expect.poll(() => client.isConnected).toBeTruthy();
  });

  test('set identity reconnects', async () => {
    const { endpoint, cleanup } = await createTestEdgeWsServer(8002);
    onTestFinished(cleanup);

    const client = new EdgeClient(await createEphemeralEdgeIdentity(), { socketEndpoint: endpoint });
    await openAndClose(client);
    await client.send(textMessage('Hello world 1'));
    expect(client.isOpen).is.true;

    const reconnected = client.reconnect.waitForCount(1);
    client.setIdentity(await createEphemeralEdgeIdentity());
    await reconnected;
    await expect(client.send(textMessage('Hello world 2'))).resolves.not.toThrow();
  });

  test('connect to local edge server', async (t) => {
    if (!process.env.EDGE_ENDPOINT) {
      t.skip();
    }
    // const identity = await createEphemeralEdgeIdentity();

    const keyring = new Keyring();
    const identity = await createTestHaloEdgeIdentity(keyring, await keyring.createKey(), await keyring.createKey());

    const client = new EdgeClient(identity, { socketEndpoint: process.env.EDGE_ENDPOINT! });
    await openAndClose(client);
    await client.send(textMessage('Hello world 1'));
    expect(client.isOpen).is.true;
  });
});
