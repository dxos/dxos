//
// Copyright 2022 DXOS.org
//

// @dxos/mocha platform=nodejs

import { expect } from 'earljs';
import { it, describe } from 'mocha';
import waitForExpect from 'wait-for-expect';

import { Awaited } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { Messenger, WebsocketSignalManager } from '@dxos/messaging';
import { Answer } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { createTestBroker } from '@dxos/signal';
import { afterTest } from '@dxos/testutils';

import { MessageRouter } from './message-router';
import { OfferMessage, SignalMessage } from './signal-messaging';

describe('MessageRouter', function () {
  let topic: PublicKey;

  let broker1: Awaited<ReturnType<typeof createTestBroker>>;

  before(async function () {
    broker1 = await createTestBroker();
  });

  beforeEach(function () {
    topic = PublicKey.random();
  });

  after(function () {
    broker1.stop();
  });

  const createSignalClientAndMessageRouter = async ({
    signalApiUrl,
    onSignal = (async () => {}) as any,
    onOffer = async () => ({ accept: true }),
    topic
  }: {
    signalApiUrl: string;
    onSignal?: (msg: SignalMessage) => Promise<void>;
    onOffer?: (msg: OfferMessage) => Promise<Answer>;
    topic: PublicKey;
  }) => {
    const peerId = PublicKey.random();
    const signalManager = new WebsocketSignalManager([signalApiUrl]);
    afterTest(() => signalManager.destroy());

    const messenger = new Messenger({ signalManager });
    await messenger.listen({
      peerId,
      payloadType: 'dxos.mesh.swarm.SwarmMessage',
      onMessage: async (message) => await router.receiveMessage(message)
    });

    const router: MessageRouter = new MessageRouter({
      // todo(mykola): added catch to avoid not finished request.
      sendMessage: async (message) => await messenger.sendMessage(message),
      onSignal,
      onOffer,
      topic
    });

    return {
      peerId,
      signalManager,
      router
    };
  };

  it('signaling between 2 clients', async () => {
    const received: SignalMessage[] = [];
    const signalMock1 = async (msg: SignalMessage) => {
      received.push(msg);
    };
    const { signalManager: signalManager1, peerId: peer1 } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: signalMock1,
      topic
    });
    const {
      signalManager: signalManager2,
      router: router2,
      peerId: peer2
    } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      topic
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

  it('offer/answer', async () => {
    const {
      signalManager: signalManager1,
      router: router1,
      peerId: peer1
    } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: (async () => {}) as any,
      onOffer: async () => ({ accept: true }),
      topic
    });
    const { signalManager: signalManager2, peerId: peer2 } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: (async () => {}) as any,
      onOffer: async () => ({ accept: true }),
      topic
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

  it('signaling between 3 clients', async () => {
    const received1: SignalMessage[] = [];
    const signalMock1 = async (msg: SignalMessage) => {
      received1.push(msg);
    };
    const {
      signalManager: signalManager1,
      router: router1,
      peerId: peer1
    } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: signalMock1,
      onOffer: async () => ({ accept: true }),
      topic
    });
    const received2: SignalMessage[] = [];
    const signalMock2 = async (msg: SignalMessage) => {
      received2.push(msg);
    };
    const {
      signalManager: signalManager2,
      router: router2,
      peerId: peer2
    } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: signalMock2,
      onOffer: async () => ({ accept: true }),
      topic
    });
    const received3: SignalMessage[] = [];
    const signalMock3 = async (msg: SignalMessage) => {
      received3.push(msg);
    };
    const {
      signalManager: signalManager3,
      router: router3,
      peerId: peer3
    } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: signalMock3,
      onOffer: async () => ({ accept: true }),
      topic
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

  it('two offers', async () => {
    const {
      signalManager: signalManager1,
      router: router1,
      peerId: peer1
    } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: (async () => {}) as any,
      onOffer: async () => ({ accept: true }),
      topic
    });
    const {
      signalManager: signalManager2,
      router: router2,
      peerId: peer2
    } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: (async () => {}) as any,
      onOffer: async () => ({ accept: true }),
      topic
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
