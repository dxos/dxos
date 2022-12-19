//
// Copyright 2020 DXOS.org
//

import { expect, mockFn } from 'earljs';

import { sleep, Event } from '@dxos/async';
import { Any, TaggedType } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { TYPES } from '@dxos/protocols';
import { createTestBroker, TestBroker } from '@dxos/signal';
import { afterAll, beforeAll, describe, test, afterTest } from '@dxos/test';

import { SignalClient } from './signal-client';

const PAYLOAD: TaggedType<TYPES, 'google.protobuf.Any'> = {
  '@type': 'google.protobuf.Any',
  type_url: 'dxos.Example',
  value: Buffer.from('1')
};

describe.only('SignalClient', () => {
  let broker1: TestBroker;

  let broker2: TestBroker;

  beforeAll(async () => {
    broker1 = await createTestBroker();
    // broker2 = await await createTestBroker(signalApiPort2);
  });

  afterAll(() => {
    broker1.stop();
    // code await broker2.stop();
  });

  test('message between 2 clients', async () => {
    const topic = PublicKey.random();
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();
    const received = new Trigger<any>();
    const api1 = new SignalClient(broker1.url(), async (msg) => {
      received.wake(msg);
    });
    afterTest(() => api1.close());
    const api2 = new SignalClient(broker1.url(), (async () => {}) as any);
    afterTest(() => api2.close());

    await api1.join({ topic, peerId: peer1 });
    await api2.join({ topic, peerId: peer2 });

    const message = {
      author: peer2,
      recipient: peer1,
      payload: PAYLOAD
    };
    await api2.sendMessage(message);
    expect(await received.wait()).toEqual(message);
  }).timeout(500);

  test('join', async () => {
    const topic = PublicKey.random();
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();
    const api1 = new SignalClient(broker1.url(), async () => {});
    afterTest(() => api1.close());
    const api2 = new SignalClient(broker1.url(), async () => {});
    afterTest(() => api2.close());

    const promise1 = api1.swarmEvent.waitFor(
      ({ swarmEvent }) => !!swarmEvent.peerAvailable && peer2.equals(swarmEvent.peerAvailable.peer)
    );
    const promise2 = api2.swarmEvent.waitFor(
      ({ swarmEvent }) => !!swarmEvent.peerAvailable && peer1.equals(swarmEvent.peerAvailable.peer)
    );

    await api1.join({ topic, peerId: peer1 });
    await api2.join({ topic, peerId: peer2 });

    await promise1;
    await promise2;
  }).timeout(500);

  test('signal to self', async () => {
    const topic = PublicKey.random();
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();
    const received = new Trigger<any>();
    const api1 = new SignalClient(broker1.url(), async (msg) => {
      received.wake(msg);
    });
    afterTest(() => api1.close());

    await api1.join({ topic, peerId: peer1 });

    const message = {
      author: peer2,
      recipient: peer1,
      payload: PAYLOAD
    };
    await api1.sendMessage(message);

    expect(await received.wait()).toEqual(message);
  }).timeout(500);

  test('signal after re-entrance', async () => {
    const topic = PublicKey.random();
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();

    const received = new Event<any>();
    const client1 = new SignalClient(broker1.url(), async (msg) => {
      received.emit(msg);
    });
    afterTest(() => client1.close());

    const client2 = new SignalClient(broker1.url(), (async () => {}) as any);
    afterTest(() => client2.close());

    const message = {
      author: peer2,
      recipient: peer1,
      payload: PAYLOAD
    };

    await client1.join({ topic, peerId: peer1 });
    await client2.join({ topic, peerId: peer2 });

    await client2.sendMessage(message);
    await received.waitFor((msg) => {
      expect(msg).toEqual(message);
      return true;
    });

    //
    // close and reopen first client
    //

    client1.close();
    client1.open();
    await client1.join({ topic, peerId: peer1 });
    await client2.sendMessage(message);
    await received.waitFor((msg) => {
      expect(msg).toEqual(message);
      return true;
    });
  });

  test
    .skip('join across multiple signal servers', async () => {
      const topic = PublicKey.random();
      const peer1 = PublicKey.random();
      const peer2 = PublicKey.random();
      // This feature is not implemented yet.
      const api1 = new SignalClient(broker1.url(), async () => {});
      afterTest(() => api1.close());
      const api2 = new SignalClient(broker2.url(), async () => {});
      afterTest(() => api2.close());

      await api1.join({ topic, peerId: peer1 });
      await api2.join({ topic, peerId: peer2 });

      // await waitForExpect(async () => {
      //   const peers = await api2.lookup(topic);
      //   expect(peers.length).toEqual(2);
      // }, 4_000);

      // await waitForExpect(async () => {
      //   const peers = await api1.lookup(topic);
      //   expect(peers.length).toEqual(2);
      // }, 4_000);
    })
    .timeout(5_000);

  // Skip because communication between signal servers is not yet implemented.
  test
    .skip('newly joined peer can receive signals from other signal servers', async () => {
      const topic = PublicKey.random();
      const peer1 = PublicKey.random();
      const peer2 = PublicKey.random();
      const signalMock =
        mockFn<
          ({ author, recipient, payload }: { author: PublicKey; recipient: PublicKey; payload: Any }) => Promise<void>
        >().resolvesTo();

      const api1 = new SignalClient(broker1.url(), async () => {});
      afterTest(() => api1.close());
      const api2 = new SignalClient(broker2.url(), signalMock);
      afterTest(() => api2.close());

      await api1.join({ topic, peerId: peer1 });
      await sleep(3000);
      await api2.join({ topic, peerId: peer2 });

      const message = {
        author: peer2,
        recipient: peer1,
        payload: {
          type_url: 'something',
          value: Buffer.from('0')
        }
      };
      await api1.sendMessage(message);

      // await waitForExpect(() => {
      // expect(signalMock).toHaveBeenCalledWith([message]);
      // }, 4_000);
    })
    .timeout(5_000);
});
