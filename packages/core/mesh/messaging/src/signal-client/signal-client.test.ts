//
// Copyright 2020 DXOS.org
//

import { expect, mockFn } from 'earljs';

import { sleep, Event, Trigger, asyncTimeout } from '@dxos/async';
import { type Any, type TaggedType } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { type TYPES } from '@dxos/protocols';
import { runTestSignalServer, type SignalServerRunner } from '@dxos/signal';
import { afterAll, beforeAll, describe, test, afterTest } from '@dxos/test';

import { SignalClient } from './signal-client';

const PAYLOAD: TaggedType<TYPES, 'google.protobuf.Any'> = {
  '@type': 'google.protobuf.Any',
  type_url: 'dxos.Example',
  value: Buffer.from('1'),
};

describe('SignalClient', () => {
  let broker1: SignalServerRunner;

  let broker2: SignalServerRunner;

  beforeAll(async () => {
    broker1 = await runTestSignalServer();
    // broker2 = await await createTestBroker(signalApiPort2);
  });

  afterAll(() => {
    void broker1.stop();
    // code await broker2.stop();
  });

  const waitForSubscription = async (signal: SignalClient, peerId: PublicKey) => {
    await asyncTimeout(
      signal._reconciled.waitForCondition(() => signal._messageStreams.has(peerId)),
      500,
    );
  };

  test('message between 2 clients', async () => {
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();
    const received = new Trigger<any>();
    const api1 = new SignalClient(
      broker1.url(),
      async (msg) => {
        received.wake(msg);
      },
      async () => {},
    );
    void api1.open();
    afterTest(() => api1.close());
    const api2 = new SignalClient(broker1.url(), (async () => {}) as any, async () => {});
    void api2.open();
    afterTest(() => api2.close());

    await api1.subscribeMessages(peer1);
    await waitForSubscription(api1, peer1);

    const message = {
      author: peer2,
      recipient: peer1,
      payload: PAYLOAD,
    };
    await api2.sendMessage(message);
    expect(await received.wait()).toEqual(message);
  })
    .timeout(500)
    .retries(2);

  test('join', async () => {
    const topic = PublicKey.random();
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();

    const trigger1 = new Trigger();
    const api1 = new SignalClient(
      broker1.url(),
      async () => {},
      async ({ swarmEvent }) => {
        if (!!swarmEvent.peerAvailable && peer2.equals(swarmEvent.peerAvailable.peer)) {
          trigger1.wake();
        }
      },
    );
    void api1.open();
    afterTest(() => api1.close());

    const trigger2 = new Trigger();
    const api2 = new SignalClient(
      broker1.url(),
      async () => {},
      async ({ swarmEvent }) => {
        if (!!swarmEvent.peerAvailable && peer1.equals(swarmEvent.peerAvailable.peer)) {
          trigger2.wake();
        }
      },
    );
    void api2.open();
    afterTest(() => api2.close());
    await api1.join({ topic, peerId: peer1 });
    await api2.join({ topic, peerId: peer2 });

    await trigger1.wait();
    await trigger2.wait();
  })
    .timeout(500)
    .retries(2);

  test('signal to self', async () => {
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();
    const received = new Trigger<any>();
    const api1 = new SignalClient(
      broker1.url(),
      async (msg) => {
        received.wake(msg);
      },
      async () => {},
    );
    void api1.open();
    afterTest(() => api1.close());

    await api1.subscribeMessages(peer1);
    await waitForSubscription(api1, peer1);

    const message = {
      author: peer2,
      recipient: peer1,
      payload: PAYLOAD,
    };
    await api1.sendMessage(message);

    expect(await received.wait()).toEqual(message);
  }).timeout(500);

  test('unsubscribe from messages', async () => {
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();

    const received = new Event<any>();
    const client1 = new SignalClient(
      broker1.url(),
      async (msg) => {
        received.emit(msg);
      },
      async () => {},
    );
    void client1.open();
    afterTest(() => client1.close());

    const client2 = new SignalClient(broker1.url(), (async () => {}) as any, async () => {});
    void client2.open();
    afterTest(() => client2.close());

    await client1.subscribeMessages(peer1);
    await client2.subscribeMessages(peer2);
    await waitForSubscription(client2, peer2);

    const message = {
      author: peer2,
      recipient: peer1,
      payload: PAYLOAD,
    };

    {
      const promise = received.waitFor((msg) => {
        expect(msg).toEqual(message);
        return true;
      });
      await client2.sendMessage(message);
      await promise;
    }

    // unsubscribing.
    await client1.unsubscribeMessages(peer1);

    {
      const promise = received.waitFor((msg) => {
        expect(msg).toEqual(message);
        return true;
      });
      await client2.sendMessage(message);
      await expect(asyncTimeout(promise, 200)).toBeRejected();
    }
  })
    .timeout(1_000)
    .retries(2);

  test('signal after re-entrance', async () => {
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();

    const received = new Event<any>();
    const client1 = new SignalClient(
      broker1.url(),
      async (msg) => {
        received.emit(msg);
      },
      async () => {},
    );
    void client1.open();
    afterTest(() => client1.close());

    const client2 = new SignalClient(broker1.url(), (async () => {}) as any, async () => {});
    void client2.open();
    afterTest(() => client2.close());

    const message = {
      author: peer2,
      recipient: peer1,
      payload: PAYLOAD,
    };

    await client1.subscribeMessages(peer1);
    await waitForSubscription(client1, peer1);

    {
      const promise = received.waitFor((msg) => {
        expect(msg).toEqual(message);
        return true;
      });
      await client2.sendMessage(message);
      await promise;
    }

    //
    // close and reopen first client
    //

    await client1.close();
    void client1.open();
    await waitForSubscription(client1, peer1);

    {
      const promise = received.waitFor((msg) => {
        expect(msg).toEqual(message);
        return true;
      });
      await client2.sendMessage(message);
      await promise;
    }
  })
    .timeout(1_000)
    .retries(2);

  test
    .skip('join across multiple signal servers', async () => {
      const topic = PublicKey.random();
      const peer1 = PublicKey.random();
      const peer2 = PublicKey.random();
      // This feature is not implemented yet.
      const api1 = new SignalClient(
        broker1.url(),
        async () => {},
        async () => {},
      );
      void api1.open();
      afterTest(() => api1.close());
      const api2 = new SignalClient(
        broker2.url(),
        async () => {},
        async () => {},
      );
      void api2.open();
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

      const api1 = new SignalClient(
        broker1.url(),
        async () => {},
        async () => {},
      );
      void api1.open();
      afterTest(() => api1.close());
      const api2 = new SignalClient(broker2.url(), signalMock, async () => {});
      void api2.open();
      afterTest(() => api2.close());

      await api1.join({ topic, peerId: peer1 });
      await sleep(3000);
      await api2.join({ topic, peerId: peer2 });

      const message = {
        author: peer2,
        recipient: peer1,
        payload: {
          type_url: 'something',
          value: Buffer.from('0'),
        },
      };
      await api1.sendMessage(message);

      // await waitForExpect(() => {
      // expect(signalMock).toHaveBeenCalledWith([message]);
      // }, 4_000);
    })
    .timeout(5_000);
});
