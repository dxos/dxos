//
// Copyright 2022 DXOS.org
//

import { beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { MemorySignalManager, MemorySignalManagerContext, Messenger } from '@dxos/messaging';
import { type Answer } from '@dxos/protocols/proto/dxos/mesh/swarm';

import { type OfferMessage, type SignalMessage } from './signal-messenger';
import { SwarmMessenger } from './swarm-messenger';

describe('SwarmMessenger', { timeout: 7000 }, () => {
  let topic: PublicKey;
  let context: MemorySignalManagerContext;

  beforeEach(() => {
    context = new MemorySignalManagerContext();
    topic = PublicKey.random();
  });

  const createSignalClientAndMessageRouter = async ({
    onSignal = (async () => {}) as any,
    onOffer = async () => ({ accept: true }),
  }: {
    onSignal?: (msg: SignalMessage) => Promise<void>;
    onOffer?: (msg: OfferMessage) => Promise<Answer>;
  } = {}) => {
    const peer = { peerKey: PublicKey.random().toHex() };
    const signalManager = new MemorySignalManager(context);
    await signalManager.open();
    onTestFinished(async () => {
      await signalManager.close();
    });

    const messenger = new Messenger({ signalManager });
    await messenger.listen({
      peer,
      payloadType: 'dxos.mesh.swarm.SwarmMessage',
      onMessage: async (message) => await router.receiveMessage(message),
    });

    const router: SwarmMessenger = new SwarmMessenger({
      // todo(mykola): added catch to avoid not finished request.
      sendMessage: async (message) => await messenger.sendMessage(message),
      onSignal,
      onOffer,
      topic,
    });

    return {
      peer,
      signalManager,
      router,
    };
  };

  test('signaling between 2 clients', async () => {
    const received: SignalMessage[] = [];
    const signalMock1 = async (msg: SignalMessage) => {
      received.push(msg);
    };
    const { signalManager: signalManager1, peer: peer1 } = await createSignalClientAndMessageRouter({
      onSignal: signalMock1,
    });
    const { signalManager: signalManager2, router: router2, peer: peer2 } = await createSignalClientAndMessageRouter();

    await signalManager1.join({ topic, peer: peer1 });
    await signalManager2.join({ topic, peer: peer2 });

    const msg: SignalMessage = {
      author: peer2,
      recipient: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: {
        signal: { payload: { msg: 'Some info' } },
        signalBatch: undefined,
      },
    };
    await router2.signal(msg);

    await expect.poll(() => received[0]).toEqual(expect.objectContaining(msg));
  });

  test('offer/answer', async () => {
    const { signalManager: signalManager1, router: router1, peer: peer1 } = await createSignalClientAndMessageRouter();
    const { signalManager: signalManager2, peer: peer2 } = await createSignalClientAndMessageRouter();

    await signalManager1.join({ topic, peer: peer1 });
    await signalManager2.join({ topic, peer: peer2 });
    const answer = await router1.offer({
      author: peer1,
      recipient: peer2,
      sessionId: PublicKey.random(),
      topic,
      data: { offer: {} },
    });
    expect(answer.accept).toEqual(true);
  });

  test('signaling between 3 clients', async () => {
    const received1: SignalMessage[] = [];
    const signalMock1 = async (msg: SignalMessage) => {
      received1.push(msg);
    };
    const {
      signalManager: signalManager1,
      router: router1,
      peer: peer1,
    } = await createSignalClientAndMessageRouter({ onSignal: signalMock1 });
    const received2: SignalMessage[] = [];
    const signalMock2 = async (msg: SignalMessage) => {
      received2.push(msg);
    };
    const {
      signalManager: signalManager2,
      router: router2,
      peer: peer2,
    } = await createSignalClientAndMessageRouter({ onSignal: signalMock2 });
    const received3: SignalMessage[] = [];
    const signalMock3 = async (msg: SignalMessage) => {
      received3.push(msg);
    };
    const {
      signalManager: signalManager3,
      router: router3,
      peer: peer3,
    } = await createSignalClientAndMessageRouter({ onSignal: signalMock3 });

    await signalManager1.join({ topic, peer: peer1 });
    await signalManager2.join({ topic, peer: peer2 });
    await signalManager3.join({ topic, peer: peer3 });

    // sending signal from peer1 to peer3.
    const msg1to3: SignalMessage = {
      author: peer1,
      recipient: peer3,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { payload: { msg: '1to3' } }, signalBatch: undefined },
    };
    await router1.signal(msg1to3);
    await expect.poll(() => received3[0]).toEqual(expect.objectContaining(msg1to3));

    // sending signal from peer2 to peer3.
    const msg2to3: SignalMessage = {
      author: peer2,
      recipient: peer3,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { payload: { msg: '2to3' } }, signalBatch: undefined },
    };
    await router2.signal(msg2to3);
    await expect.poll(() => received3[1]).toEqual(expect.objectContaining(msg2to3));

    // sending signal from peer3 to peer1.
    const msg3to1: SignalMessage = {
      author: peer3,
      recipient: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { payload: { msg: '3to1' } }, signalBatch: undefined },
    };
    await router3.signal(msg3to1);
    await expect.poll(() => received1[0]).toEqual(expect.objectContaining(msg3to1));
  });

  test('two offers', async () => {
    const { signalManager: signalManager1, router: router1, peer: peer1 } = await createSignalClientAndMessageRouter();
    const { signalManager: signalManager2, router: router2, peer: peer2 } = await createSignalClientAndMessageRouter();

    await signalManager1.join({ topic, peer: peer1 });
    await signalManager2.join({ topic, peer: peer2 });

    // sending offer from peer1 to peer2.
    const answer1 = await router1.offer({
      author: peer1,
      recipient: peer2,
      sessionId: PublicKey.random(),
      topic,
      data: { offer: {} },
    });
    expect(answer1.accept).toEqual(true);

    // sending offer from peer2 to peer1.
    const answer2 = await router2.offer({
      author: peer2,
      recipient: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { offer: {} },
    });
    expect(answer2.accept).toEqual(true);
  });
});
