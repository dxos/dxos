//
// Copyright 2020 DXOS.org
//

import { afterAll, beforeAll, describe, expect, onTestFinished, test } from 'vitest';

import { asyncTimeout, waitForCondition } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { bufWkt, create } from '@dxos/protocols/buf';
import { PeerSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { JoinRequestSchema, MessageSchema } from '@dxos/protocols/buf/dxos/edge/signal_pb';
import { PublicKeySchema } from '@dxos/protocols/buf/dxos/keys_pb';
import { type SignalServerRunner, runTestSignalServer } from '@dxos/signal';
import { ComplexSet, range } from '@dxos/util';

import { type Message, type PeerInfo } from '../signal-methods';

import { SignalClient } from './signal-client';

const PAYLOAD = create(bufWkt.AnySchema, {
  typeUrl: 'google.protobuf.Any',
  value: Buffer.from('1'),
});

describe('SignalClient', () => {
  let broker1: SignalServerRunner;

  beforeAll(async () => {
    broker1 = await runTestSignalServer();
  });

  afterAll(async () => {
    log.info('begin stop');
    await broker1.stop();
    log.info('end stop');
  });

  test('message between 2 clients', async () => {
    const [peer1, peer2] = setupPeers({ peerCount: 2 });

    await peer1.client.subscribeMessages(peer1.peerInfo);
    await waitForSubscription(peer1.client, peer1.peerKey);

    const message = createTestMessage(peer2, peer1);
    const receivedMessage = peer1.waitForNextMessage();
    await peer2.client.sendMessage(message);
    expect(await receivedMessage).toEqual(message);
  });

  test('join', async () => {
    const topic = PublicKey.random();
    const [peer1, peer2] = setupPeers({ peerCount: 2 });

    await peer1.client.join(
      create(JoinRequestSchema, { topic: create(PublicKeySchema, { data: topic.asUint8Array() }), peer: peer1.peerInfo }),
    );
    await peer2.client.join(
      create(JoinRequestSchema, { topic: create(PublicKeySchema, { data: topic.asUint8Array() }), peer: peer2.peerInfo }),
    );

    await peer1.waitForPeer(peer2.peerKey);
    await peer2.waitForPeer(peer1.peerKey);
  });

  test('signal to self', async () => {
    const [peer1, peer2] = setupPeers({ peerCount: 2 });

    await peer1.client.subscribeMessages(peer1.peerInfo);
    await waitForSubscription(peer1.client, peer1.peerKey);

    const message = createTestMessage(peer2, peer1);
    const receivedMessage = peer1.waitForNextMessage();

    await peer1.client.sendMessage(message);
    expect(await receivedMessage).toEqual(message);
  });

  test('unsubscribe from messages', async () => {
    const [peer1, peer2] = setupPeers({ peerCount: 2 });

    await peer1.client.subscribeMessages(peer1.peerInfo);
    await peer2.client.subscribeMessages(peer2.peerInfo);
    await waitForSubscription(peer1.client, peer1.peerKey);

    const message = createTestMessage(peer2, peer1);

    {
      const receivedMessage = peer1.waitForNextMessage({ timeout: 1_000 });
      await peer2.client.sendMessage(message);
      expect(await receivedMessage).toEqual(message);
    }

    // unsubscribing.
    await peer1.client.unsubscribeMessages(peer1.peerInfo);

    {
      const receivedMessage = peer1.waitForNextMessage({ timeout: 200 });
      await peer2.client.sendMessage(message);
      await expect(receivedMessage).rejects.toBeDefined();
    }
  });

  test('signal after re-entrance', async () => {
    const [peer1, peer2] = setupPeers({ peerCount: 2 });

    const message = createTestMessage(peer2, peer1);

    await peer1.client.subscribeMessages(peer1.peerInfo);
    await waitForSubscription(peer1.client, peer1.peerKey);

    {
      const waitMessage = peer1.waitForNextMessage();
      await peer2.client.sendMessage(message);
      expect(await waitMessage).toEqual(message);
    }

    //
    // close and reopen first client
    //

    await peer1.client.close();
    await peer1.client.open();
    await waitForSubscription(peer1.client, peer1.peerKey);

    {
      const waitMessage = peer1.waitForNextMessage();
      await peer2.client.sendMessage(message);
      expect(await waitMessage).toEqual(message);
    }
  });

  const setupPeers = (options?: { broker?: SignalServerRunner; peerCount?: number }): TestPeer[] => {
    return range(options?.peerCount ?? 1, () => {
      const peers = new ComplexSet(PublicKey.hash);
      const peerKey = PublicKey.random();
      const identityKey = PublicKey.random();
      const client = new SignalClient((options?.broker ?? broker1).url());
      client.swarmEvent.on(async (swarmEvent) => {
        if (swarmEvent.event.case === 'peerAvailable') {
          peers.add(PublicKey.from(swarmEvent.event.value.peer!.peerKey));
        } else if (swarmEvent.event.case === 'peerLeft') {
          peers.delete(PublicKey.from(swarmEvent.event.value.peer!.peerKey));
        }
      });

      void client.open();
      onTestFinished(async () => {
        await client.close();
      });
      return {
        peerKey,
        identityKey,
        client,
        peerInfo: create(PeerSchema, { peerKey: peerKey.toHex(), identityKey: identityKey.toHex() }),
        waitForNextMessage: async ({ timeout = 5_000 } = {}) => {
          return asyncTimeout(
            client.onMessage.waitFor(() => true),
            timeout,
          );
        },
        waitForPeer: (peerId: PublicKey) => waitForCondition({ condition: () => peers.has(peerId) }),
      };
    });
  };

  const createTestMessage = (from: TestPeer, to: TestPeer): Message => {
    return create(MessageSchema, {
      author: create(PeerSchema, { peerKey: from.peerKey.toHex() }),
      recipient: create(PeerSchema, { peerKey: to.peerKey.toHex() }),
      payload: PAYLOAD,
    });
  };

  const waitForSubscription = async (signal: SignalClient, peerId: PublicKey) => {
    await asyncTimeout(
      signal.localState.reconciled.waitForCondition(() => signal.localState.messageStreams.has(peerId)),
      500,
    );
  };
});

interface TestPeer {
  peerKey: PublicKey;
  identityKey: PublicKey;
  client: SignalClient;
  peerInfo: PeerInfo;
  waitForNextMessage: (options?: { timeout?: number }) => Promise<any>;
  waitForPeer: (peerId: PublicKey) => Promise<boolean>;
}
