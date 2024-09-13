//
// Copyright 2024 DXOS.org
//

import { test, expect, describe } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { TextMessageSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { openAndClose } from '@dxos/test-utils';

import { protocol } from './defs';
import { EdgeClient } from './edge-client';
import { createTestWsServer } from './test-utils';

describe('EdgeClient', () => {
  const textMessage = (message: string) => protocol.createMessage(TextMessageSchema, { payload: { message } });

  test('reconnects on error', async () => {
    const { error: serverError, endpoint } = await createTestWsServer();
    const id = PublicKey.random().toHex();
    const client = new EdgeClient(id, id, { socketEndpoint: endpoint });
    await openAndClose(client);
    await client.send(textMessage('Hello world 1'));
    expect(client.isOpen).is.true;

    const reconnected = client.reconnect.waitForCount(1);
    await serverError();
    await reconnected;
    await expect(client.send(textMessage('Hello world 2'))).resolves.not.toThrow();
  });

  test('set identity reconnects', async () => {
    const { endpoint } = await createTestWsServer();

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
