//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { discoveryKey } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { Protocol } from '@dxos/mesh-protocol';
import { afterTest } from '@dxos/testutils';
import { range } from '@dxos/util';

import { TestProtocolPlugin, testProtocolProvider } from '../testing';
import { MemoryTransport } from './memory-transport';

// TODO(burdon): Flaky test.
//  Cannot log after tests are done. Did you forget to wait for something async in your test?
//  Attempted to log "Ignoring unsupported ICE candidate.".

const createPair = () => {
  const topic = PublicKey.random();
  const peer1Id = PublicKey.random();
  const peer2Id = PublicKey.random();
  const sessionId = PublicKey.random();

  const plugin1 = new TestProtocolPlugin(peer1Id.asBuffer());
  const protocolProvider1 = testProtocolProvider(
    topic.asBuffer(),
    peer1Id.asBuffer(),
    plugin1
  );
  const connection1 = new MemoryTransport(
    peer1Id,
    peer2Id,
    sessionId,
    topic,
    protocolProvider1({ channel: discoveryKey(topic), initiator: true }).stream
  );

  afterTest(() => connection1.close());
  afterTest(() => connection1.errors.assertNoUnhandledErrors());

  const plugin2 = new TestProtocolPlugin(peer2Id.asBuffer());
  const protocolProvider2 = testProtocolProvider(
    topic.asBuffer(),
    peer2Id.asBuffer(),
    plugin2
  );
  const connection2 = new MemoryTransport(
    peer2Id,
    peer1Id,
    sessionId,
    topic,
    protocolProvider2({ channel: discoveryKey(topic), initiator: false }).stream
  );

  afterTest(() => connection2.close());
  afterTest(() => connection2.errors.assertNoUnhandledErrors());

  return {
    connection1,
    connection2,
    plugin1,
    plugin2,
    peer1Id,
    peer2Id,
    topic
  };
};

describe('MemoryTransport', function () {
  it('establish connection and send data through with protocol', async function () {
    const { plugin1, plugin2, peer1Id } = createPair();

    const received: any[] = [];
    const mockReceive = (p: Protocol, s: string) => {
      received.push(p, s);
      return undefined;
    };
    plugin1.on('receive', mockReceive);

    plugin2.on('connect', async (protocol) => {
      await plugin2.send(peer1Id.asBuffer(), '{"message": "Hello"}');
    });

    await waitForExpect(() => {
      expect(received.length).toBe(2);
      expect(received[0]).toBeInstanceOf(Protocol);
      expect(received[1]).toBe('{"message": "Hello"}');
    });
  });

  it('10 pairs of peers connecting at the same time', async function () {
    await Promise.all(
      range(10).map(async () => {
        const { plugin1, plugin2, peer1Id } = createPair();

        const received: any[] = [];
        const mockReceive = (p: Protocol, s: string) => {
          received.push(p, s);
          return undefined;
        };
        plugin1.on('receive', mockReceive);

        plugin2.on('connect', async (protocol) => {
          await plugin2.send(peer1Id.asBuffer(), '{"message": "Hello"}');
        });

        await waitForExpect(() => {
          expect(received.length).toBe(2);
          expect(received[0]).toBeInstanceOf(Protocol);
          expect(received[1]).toBe('{"message": "Hello"}');
        });
      })
    );
  });
});
