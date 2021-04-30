//
// Copyright 2021 DXOS.org
//

import { mockFn, expect } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { discoveryKey, PublicKey } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';
import { range } from '@dxos/util';

import { TestProtocolPlugin, testProtocolProvider } from '../testing/test-protocol';
import { afterTest } from '../testutils';
import { ConnectionState } from './connection';
import { InMemoryConnection } from './in-memory-connection';

function createPair () {
  const topic = PublicKey.random();
  const peer1Id = PublicKey.random();
  const peer2Id = PublicKey.random();
  const sessionId = PublicKey.random();

  const plugin1 = new TestProtocolPlugin(peer1Id.asBuffer());
  const protocolProvider1 = testProtocolProvider(topic.asBuffer(), peer1Id.asBuffer(), plugin1);
  const connection1 = new InMemoryConnection(
    peer1Id,
    peer2Id,
    sessionId,
    topic,
    protocolProvider1({ channel: discoveryKey(topic) })
  );
  afterTest(() => connection1.close());
  afterTest(() => connection1.errors.assertNoUnhandledErrors());

  const plugin2 = new TestProtocolPlugin(peer2Id.asBuffer());
  const protocolProvider2 = testProtocolProvider(topic.asBuffer(), peer2Id.asBuffer(), plugin2);
  const connection2 = new InMemoryConnection(
    peer2Id,
    peer1Id,
    sessionId,
    topic,
    protocolProvider2({ channel: discoveryKey(topic) })
  );
  afterTest(() => connection2.close());
  afterTest(() => connection2.errors.assertNoUnhandledErrors());

  connection1.connect();
  connection2.connect();
  return { connection1, connection2, plugin1, plugin2, peer1Id, peer2Id, topic };
}

test('establish connection and send data through with protocol', async () => {
  const { connection1, connection2, plugin1, plugin2, peer1Id } = createPair();

  expect(connection1.state).toEqual(ConnectionState.CONNECTED);
  expect(connection2.state).toEqual(ConnectionState.CONNECTED);

  const mockReceive = mockFn<[Protocol, string]>().returns(undefined);
  plugin1.on('receive', mockReceive);

  plugin2.on('connect', async (protocol) => {
    plugin2.send(peer1Id.asBuffer(), 'Foo');
  });

  await waitForExpect(() => {
    expect(mockReceive).toHaveBeenCalledWith([expect.a(Protocol), 'Foo']);
  });
}, 5_000);

test('10 pairs of peers connecting at the same time', async () => {
  await Promise.all(range(10).map(async () => {
    const { connection1, connection2, plugin1, plugin2, peer1Id } = createPair();

    expect(connection1.state).toEqual(ConnectionState.CONNECTED);
    expect(connection2.state).toEqual(ConnectionState.CONNECTED);

    const mockReceive = mockFn<[Protocol, string]>().returns(undefined);
    plugin1.on('receive', mockReceive);

    plugin2.on('connect', async (protocol) => {
      plugin2.send(peer1Id.asBuffer(), 'Foo');
    });

    await waitForExpect(() => {
      expect(mockReceive).toHaveBeenCalledWith([expect.a(Protocol), 'Foo']);
    });
  }));
}, 5_000);
