//
// Copyright 2020 DXOS.org
//

import { expect } from 'earljs';

import { Trigger, asyncTimeout, waitForCondition } from '@dxos/async';
import { type TaggedType } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type TYPES } from '@dxos/protocols';
import { runTestSignalServer, type SignalServerRunner } from '@dxos/signal';
import { afterAll, beforeAll, describe, test, afterTest } from '@dxos/test';
import { ComplexSet, range } from '@dxos/util';

import { SignalClient } from './signal-client';

const PAYLOAD: TaggedType<TYPES, 'google.protobuf.Any'> = {
  '@type': 'google.protobuf.Any',
  type_url: 'dxos.Example',
  value: Buffer.from('1'),
};

describe('SignalClient', () => {
  let broker1: SignalServerRunner;

  beforeAll(async () => {
    broker1 = await runTestSignalServer();
  });

  afterAll(async () => {
    await broker1.stop();
  });

  test('message between 2 clients', async () => {
    const [peer1, peer2] = setupPeers({ peerCount: 2 });

    await peer1.client.subscribeMessages(peer1.id);
    await waitForSubscription(peer1.client, peer1.id);

    const message = createMessage(peer2, peer1);
    await peer2.client.sendMessage(message);
    expect(await peer1.waitForNextMessage()).toEqual(message);
  })
    .timeout(500)
    .retries(2);

  test('join', async () => {
    const topic = PublicKey.random();
    const [peer1, peer2] = setupPeers({ peerCount: 2 });

    await peer1.client.join({ topic, peerId: peer1.id });
    await peer2.client.join({ topic, peerId: peer2.id });

    await peer1.waitForPeer(peer2.id);
    await peer2.waitForPeer(peer1.id);
  })
    .timeout(500)
    .retries(2);

  test('signal to self', async () => {
    const [peer1, peer2] = setupPeers({ peerCount: 2 });

    await peer1.client.subscribeMessages(peer1.id);
    await waitForSubscription(peer1.client, peer1.id);

    const message = createMessage(peer2, peer1);
    await peer1.client.sendMessage(message);
    expect(await peer1.waitForNextMessage()).toEqual(message);
  }).timeout(500);

  test('unsubscribe from messages', async () => {
    const [peer1, peer2] = setupPeers({ peerCount: 2 });

    await peer1.client.subscribeMessages(peer1.id);
    await peer2.client.subscribeMessages(peer2.id);
    await waitForSubscription(peer2.client, peer2.id);

    const message = createMessage(peer2, peer1);

    {
      await peer2.client.sendMessage(message);
      expect(await peer1.waitForNextMessage()).toEqual(message);
    }

    // unsubscribing.
    await peer1.client.unsubscribeMessages(peer1.id);

    {
      await peer2.client.sendMessage(message);
      await expect(peer1.waitForNextMessage({ timeout: 200 })).toBeRejected();
    }
  })
    .timeout(1_000)
    .retries(2);

  test('signal after re-entrance', async () => {
    const [peer1, peer2] = setupPeers({ peerCount: 2 });

    const message = createMessage(peer2, peer1);

    await peer1.client.subscribeMessages(peer1.id);
    await waitForSubscription(peer1.client, peer1.id);

    {
      await peer2.client.sendMessage(message);
      expect(await peer1.waitForNextMessage()).toEqual(message);
    }

    //
    // close and reopen first client
    //

    await peer1.client.close();
    void peer1.client.open();
    await waitForSubscription(peer1.client, peer1.id);

    {
      await peer2.client.sendMessage(message);
      expect(await peer1.waitForNextMessage()).toEqual(message);
    }
  })
    .timeout(1_000)
    .retries(2);

  const setupPeers = (options?: { broker?: SignalServerRunner; peerCount?: number }): TestPeer[] => {
    return range(options?.peerCount ?? 1, () => {
      const peers = new ComplexSet(PublicKey.hash);
      let nextMessage: any | null = null;
      const nextMessageTrigger = new Trigger();
      const id = PublicKey.random();
      const client = new SignalClient(
        (options?.broker ?? broker1).url(),
        async (msg) => {
          nextMessage = msg;
          log.info('here');
          nextMessageTrigger.wake();
        },
        async (event) => {
          if (event.swarmEvent.peerAvailable) {
            peers.add(PublicKey.from(event.swarmEvent.peerAvailable.peer));
          } else if (event.swarmEvent.peerLeft) {
            peers.delete(PublicKey.from(event.swarmEvent.peerLeft.peer));
          }
        },
      );
      void client.open();
      afterTest(() => client.close());
      return {
        id,
        client,
        waitForNextMessage: async (options?: { timeout?: number }) => {
          if (nextMessage == null) {
            await nextMessageTrigger.wait(options);
          }
          const result = nextMessage!;
          nextMessageTrigger.reset();
          nextMessage = null;
          return result;
        },
        waitForPeer: (peerId: PublicKey) => waitForCondition({ condition: () => peers.has(peerId) }),
      };
    });
  };

  const createMessage = (from: TestPeer, to: TestPeer, payload: any = PAYLOAD) => {
    return {
      author: from.id,
      recipient: to.id,
      payload: PAYLOAD,
    };
  };

  const waitForSubscription = async (signal: SignalClient, peerId: PublicKey) => {
    await asyncTimeout(
      signal.localState.reconciled.waitForCondition(() => signal.localState.messageStreams.has(peerId)),
      500,
    );
  };
});

interface TestPeer {
  id: PublicKey;
  client: SignalClient;
  waitForNextMessage: (options?: { timeout?: number }) => Promise<any>;
  waitForPeer: (peerId: PublicKey) => Promise<boolean>;
}
