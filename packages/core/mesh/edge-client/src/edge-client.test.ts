//
// Copyright 2024 DXOS.org
//

import { test, expect, describe, onTestFinished } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { openAndClose } from '@dxos/test-utils';

import { protocol } from './defs';
import { EdgeClient } from './edge-client';
import { createTestEdgeWsServer } from './testing';

describe('EdgeClient', () => {
  const textMessage = (message: string) => protocol.createMessage(TextMessageSchema, { payload: { message } });

  test('reconnects on error', async () => {
    const { closeConnection, endpoint, cleanup } = await createTestEdgeWsServer(8001);
    onTestFinished(cleanup);

    const id = PublicKey.random().toHex();
    const client = new EdgeClient(id, id, { socketEndpoint: endpoint });
    await openAndClose(client);
    await client.send(textMessage('Hello world 1'));
    expect(client.isOpen).is.true;

    const reconnected = client.reconnect.waitForCount(1);
    await closeConnection();
    await reconnected;
    await expect(client.send(textMessage('Hello world 2'))).resolves.not.toThrow();
  });

  test('set identity reconnects', async () => {
    const { endpoint, cleanup } = await createTestEdgeWsServer(8002);
    onTestFinished(cleanup);

    const id = PublicKey.random().toHex();
    const client = new EdgeClient(id, id, { socketEndpoint: endpoint });
    await openAndClose(client);
    await client.send(textMessage('Hello world 1'));
    expect(client.isOpen).is.true;

    const newId = PublicKey.random().toHex();
    const reconnected = client.reconnect.waitForCount(1);
    client.setIdentity({ peerKey: newId, identityKey: newId });
    await reconnected;
    await expect(client.send(textMessage('Hello world 2'))).resolves.not.toThrow();
  });
});
