//
// Copyright 2022 DXOS.org
//

import { expect } from 'earljs';
import { it as test, describe } from 'mocha';
import waitForExpect from 'wait-for-expect';

import { Awaited } from '@dxos/async';
import { Messenger, WebsocketSignalManager } from '@dxos/messaging';
import { PublicKey } from '@dxos/protocols';
import { Answer } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { createTestBroker } from '@dxos/signal';
import { afterTest } from '@dxos/testutils';

import { MessageRouter } from './message-router';
import { OfferMessage, SignalMessage } from './signal-messaging';

describe('MessageRouter', () => {
  let topic: PublicKey;

  let broker1: Awaited<ReturnType<typeof createTestBroker>>;

  before(async () => {
    broker1 = await createTestBroker();
  });

  beforeEach(() => {
    topic = PublicKey.random();
  });

  after(() => {
    broker1.stop();
  });

  const createSignalClientAndMessageRouter = async ({
    signalApiUrl,
    onSignal = (async () => {}) as any,
    onOffer = async () => ({ accept: true })
  }: {
    signalApiUrl: string
    onSignal?: (msg: SignalMessage) => Promise<void>
    onOffer?: (msg: OfferMessage) => Promise<Answer>
  }) => {
    const peerId = PublicKey.random();
    const signalManager = new WebsocketSignalManager([signalApiUrl]);
    await signalManager.subscribeMessages(peerId);
    afterTest(() => signalManager.destroy());

    const messenger = new Messenger({ signalManager });
    messenger.listen({
      payloadType: 'dxos.mesh.swarm.SwarmMessage',
      onMessage: async (message) => await router.receiveMessage(message)
    });

    const router: MessageRouter = new MessageRouter({
      // todo(mykola): added catch to avoid not finished request.
      sendMessage: async (message) => await messenger.sendMessage(message),
      onSignal,
      onOffer
    });

    return {
      peerId,
      signalManager,
      router
    };
  };

  test('signaling between 2 clients', async () => {
    const received: SignalMessage[] = [];
    const signalMock1 = async (msg: SignalMessage) => {
      received.push(msg);
    };
    const { signalManager: signalManager1, peerId: peer1 } =
      await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        onSignal: signalMock1
      });
    const { signalManager: signalManager2, router: router2, peerId: peer2 } =
      await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url()
      });

    await signalManager1.join({ topic, peerId: peer1 });
    await signalManager2.join({ topic, peerId: peer2 });

    const msg: SignalMessage = {
      author: peer2,
      recipient: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: JSON.stringify({ asd: 'asd' }) } }
    };
    await router2.signal(msg);

    await waitForExpect(() => {
      expect(received[0]).toBeAnObjectWith(msg);
    }, 4_000);
  }).timeout(5_000);

  test('offer/answer', async () => {
    const { signalManager: signalManager1, router: router1, peerId: peer1 } =
      await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        onSignal: (async () => {}) as any,
        onOffer: async () => ({ accept: true })
      });
    const { signalManager: signalManager2, peerId: peer2 } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: (async () => {}) as any,
      onOffer: async () => ({ accept: true })
    });

    await signalManager1.join({ topic, peerId: peer1 });
    await signalManager2.join({ topic, peerId: peer2 });
    const answer = await router1.offer({
      author: peer1,
      recipient: peer2,
      sessionId: PublicKey.random(),
      topic,
      data: { offer: {} }
    });
    expect(answer.accept).toEqual(true);
  }).timeout(5_000);

  test('signaling between 3 clients', async () => {
    const received1: SignalMessage[] = [];
    const signalMock1 = async (msg: SignalMessage) => {
      received1.push(msg);
    };
    const { signalManager: signalManager1, router: router1, peerId: peer1 } =
      await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        onSignal: signalMock1,
        onOffer: async () => ({ accept: true })
      });
    const received2: SignalMessage[] = [];
    const signalMock2 = async (msg: SignalMessage) => {
      received2.push(msg);
    };
    const { signalManager: signalManager2, router: router2, peerId: peer2 } =
      await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        onSignal: signalMock2,
        onOffer: async () => ({ accept: true })
      });
    const received3: SignalMessage[] = [];
    const signalMock3 = async (msg: SignalMessage) => {
      received3.push(msg);
    };
    const { signalManager: signalManager3, router: router3, peerId: peer3 } =
      await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        onSignal: signalMock3,
        onOffer: async () => ({ accept: true })
      });

    await signalManager1.join({ topic, peerId: peer1 });
    await signalManager2.join({ topic, peerId: peer2 });
    await signalManager3.join({ topic, peerId: peer3 });

    // sending signal from peer1 to peer3.
    const msg1to3: SignalMessage = {
      author: peer1,
      recipient: peer3,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: '1to3' } }
    };
    await router1.signal(msg1to3);
    await waitForExpect(() => {
      expect(received3[0]).toBeAnObjectWith(msg1to3);
    }, 4_000);

    // sending signal from peer2 to peer3.
    const msg2to3: SignalMessage = {
      author: peer2,
      recipient: peer3,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: '2to3' } }
    };
    await router2.signal(msg2to3);
    await waitForExpect(() => {
      expect(received3[1]).toBeAnObjectWith(msg2to3);
    }, 4_000);

    // sending signal from peer3 to peer1.
    const msg3to1: SignalMessage = {
      author: peer3,
      recipient: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: '3to1' } }
    };
    await router3.signal(msg3to1);
    await waitForExpect(() => {
      expect(received1[0]).toBeAnObjectWith(msg3to1);
    }, 4_000);
  }).timeout(5_000);

  test('two offers', async () => {
    const { signalManager: signalManager1, router: router1, peerId: peer1 } =
      await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        onSignal: (async () => {}) as any,
        onOffer: async () => ({ accept: true })
      });
    const { signalManager: signalManager2, router: router2, peerId: peer2 } =
      await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        onSignal: (async () => {}) as any,
        onOffer: async () => ({ accept: true })
      });

    await signalManager1.join({ topic, peerId: peer1 });
    await signalManager2.join({ topic, peerId: peer2 });

    // sending offer from peer1 to peer2.
    const answer1 = await router1.offer({
      author: peer1,
      recipient: peer2,
      sessionId: PublicKey.random(),
      topic,
      data: { offer: {} }
    });
    expect(answer1.accept).toEqual(true);

    // sending offer from peer2 to peer1.
    const answer2 = await router2.offer({
      author: peer2,
      recipient: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { offer: {} }
    });
    expect(answer2.accept).toEqual(true);
  }).timeout(5_000);
});
