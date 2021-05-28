//
// Copyright 2021 DXOS.org
//

import { mockFn, expect } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { discoveryKey, PublicKey } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';
import { afterTest } from '@dxos/testutils';
import { range } from '@dxos/util';

import { TestProtocolPlugin, testProtocolProvider } from '../testing/test-protocol';
import { InMemoryTransport } from './in-memory-transport';

// TODO(burdon): Flaky test.
//     Cannot log after tests are done. Did you forget to wait for something async in your test?
//     Attempted to log "Ignoring unsupported ICE candidate.".

function createPair () {
  const topic = PublicKey.random();
  const peer1Id = PublicKey.random();
  const peer2Id = PublicKey.random();
  const sessionId = PublicKey.random();

  const plugin1 = new TestProtocolPlugin(peer1Id.asBuffer());
  const protocolProvider1 = testProtocolProvider(topic.asBuffer(), peer1Id.asBuffer(), plugin1);
  const connection1 = new InMemoryTransport(
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
  const connection2 = new InMemoryTransport(
    peer2Id,
    peer1Id,
    sessionId,
    topic,
    protocolProvider2({ channel: discoveryKey(topic) })
  );
  afterTest(() => connection2.close());
  afterTest(() => connection2.errors.assertNoUnhandledErrors());

  return { connection1, connection2, plugin1, plugin2, peer1Id, peer2Id, topic };
}

test('establish connection and send data through with protocol', async () => {
  const { plugin1, plugin2, peer1Id } = createPair();

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
    const { plugin1, plugin2, peer1Id } = createPair();

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
