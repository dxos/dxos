//
// Copyright 2024 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Keyring } from '@dxos/keyring';
import { TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import { openAndClose } from '@dxos/test-utils';

import { createEphemeralEdgeIdentity, createTestHaloEdgeIdentity } from './auth';
import { protocol } from './defs';
import { EdgeClient } from './edge-client';
import { type EdgeIdentity } from './edge-identity';
import { EdgeConnectionClosedError, EdgeIdentityChangedError } from './errors';
import { createTestEdgeWsServer } from './testing';

describe('EdgeClient', () => {
  let wsServerPort = 8001;

  test('reconnects on error', async () => {
    const { closeConnection, endpoint, cleanup } = await createTestEdgeWsServer(wsServerPort++);
    onTestFinished(cleanup);

    const { client, reconnectTrigger } = await openNewClient(endpoint);
    await client.send(textMessage('Hello world 1'));
    expect(client.isOpen).is.true;

    reconnectTrigger.reset();
    await closeConnection();
    await reconnectTrigger.wait();
    await expect(client.send(textMessage('Hello world 2'))).resolves.not.toThrow();
  });

  test('isConnected', async () => {
    const admitConnection = new Trigger();
    const { closeConnection, endpoint, cleanup } = await createTestEdgeWsServer(wsServerPort++, { admitConnection });
    onTestFinished(cleanup);

    const { client } = await openNewClient(endpoint);

    expect(client.status.state).toBe(EdgeStatus.ConnectionState.NOT_CONNECTED);
    admitConnection.wake();
    await expect.poll(() => client.status.state).toBe(EdgeStatus.ConnectionState.CONNECTED);

    admitConnection.reset();
    await closeConnection();
    expect(client.isOpen).is.true;
    await expect.poll(() => client.status.state).toBe(EdgeStatus.ConnectionState.NOT_CONNECTED);

    admitConnection.wake();
    await expect.poll(() => client.status.state).toBe(EdgeStatus.ConnectionState.CONNECTED);
  });

  test('set identity reconnects', async () => {
    const { endpoint, cleanup } = await createTestEdgeWsServer(wsServerPort++);
    onTestFinished(cleanup);

    const { client, reconnectTrigger } = await openNewClient(endpoint);
    await client.send(textMessage('Hello world 1'));
    expect(client.isOpen).is.true;

    reconnectTrigger.reset();
    client.setIdentity(await createEphemeralEdgeIdentity());
    await reconnectTrigger.wait();
    await expect(client.send(textMessage('Hello world 2'))).resolves.not.toThrow();
  });

  test('send blocks until connection becomes ready', async () => {
    const admitConnection = new Trigger();
    const { endpoint, messageSink, cleanup } = await createTestEdgeWsServer(wsServerPort++, { admitConnection });
    onTestFinished(cleanup);

    const { client } = await openNewClient(endpoint);
    setTimeout(() => admitConnection.wake(), 20);
    await client.send(textMessage('Hello world 1'));
    await expect.poll(() => messageSink.length).toBe(1);
  });

  test('send fails if identity changes before connection becomes ready', async () => {
    const admitConnection = new Trigger();
    const { endpoint, cleanup, messageSink } = await createTestEdgeWsServer(wsServerPort++, { admitConnection });
    onTestFinished(cleanup);

    const { client } = await openNewClient(endpoint);
    setTimeout(async () => client.setIdentity(await createEphemeralEdgeIdentity()));
    await expect(client.send(textMessage('Hello world 1'))).rejects.toThrow(EdgeIdentityChangedError);

    // Test recovers.
    setTimeout(() => admitConnection.wake(), 20);
    await client.send(textMessage('Hello world 1'));
    await expect.poll(() => messageSink.length).toBe(1);
  });

  test('send fails if client is closed before connection becomes ready', async () => {
    const admitConnection = new Trigger();
    const { endpoint, cleanup } = await createTestEdgeWsServer(wsServerPort++, { admitConnection });
    onTestFinished(cleanup);

    const { client } = await openNewClient(endpoint);
    setTimeout(() => client.close());
    await expect(client.send(textMessage('Hello world 1'))).rejects.toThrow(EdgeConnectionClosedError);
  });

  test('onReconnect trigger', async () => {
    const admitConnection = new Trigger();
    const { endpoint, cleanup, closeConnection } = await createTestEdgeWsServer(wsServerPort++, { admitConnection });
    onTestFinished(cleanup);

    const { client } = await openNewClient(endpoint);
    let callCount = 0;
    client.onReconnected(() => callCount++);
    admitConnection.wake();

    await expect.poll(() => callCount).toEqual(1);
    await closeConnection();
    await expect.poll(() => callCount).toEqual(2);

    const trigger = new Trigger();
    client.onReconnected(() => trigger.wake());
    await trigger.wait();
    expect(callCount).toEqual(2);
  });

  test('send message right after identity change is delivered successfully with the new identity', async () => {
    const { endpoint, cleanup, messageSourceLog } = await createTestEdgeWsServer(wsServerPort++);
    onTestFinished(cleanup);

    const { client, identity: oldIdentity } = await openNewClient(endpoint);
    await client.send(textMessage('Hello world 1', oldIdentity));
    expect(client.isOpen).is.true;

    const newIdentity = await createEphemeralEdgeIdentity();
    client.setIdentity(newIdentity);
    await client.send(textMessage('Hello world 2', newIdentity));
    await expect.poll(() => messageSourceLog.length).toBe(2);
    expect(messageSourceLog.map((m) => m.peerKey)).toStrictEqual([oldIdentity.peerKey, newIdentity.peerKey]);
  });

  test.skipIf(!process.env.EDGE_ENDPOINT)('connect to local edge server', async () => {
    // const identity = await createEphemeralEdgeIdentity();

    const keyring = new Keyring();
    const identity = await createTestHaloEdgeIdentity(keyring, await keyring.createKey(), await keyring.createKey());

    const client = new EdgeClient(identity, { socketEndpoint: process.env.EDGE_ENDPOINT! });
    await openAndClose(client);
    await client.send(textMessage('Hello world 1'));
    expect(client.isOpen).is.true;
  });

  const textMessage = (message: string, source?: EdgeIdentity) =>
    protocol.createMessage(TextMessageSchema, {
      source: source && { peerKey: source.peerKey, identityKey: source.identityKey },
      payload: { message },
    });

  const openNewClient = async (endpoint: string) => {
    const identity = await createEphemeralEdgeIdentity();
    const client = new EdgeClient(identity, { socketEndpoint: endpoint });
    await openAndClose(client);
    const reconnectTrigger = new Trigger();
    client.onReconnected(() => {
      reconnectTrigger.wake();
    });
    return { client, reconnectTrigger, identity };
  };
});
