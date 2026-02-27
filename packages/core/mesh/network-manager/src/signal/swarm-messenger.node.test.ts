//
// Copyright 2022 DXOS.org
//

import { afterAll, beforeAll, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { type Awaited } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { Messenger, WebsocketSignalManager } from '@dxos/messaging';
import { create } from '@dxos/protocols/buf';
import { Runtime_Services_SignalSchema } from '@dxos/protocols/buf/dxos/config_pb';
import { PeerSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { JoinRequestSchema } from '@dxos/protocols/buf/dxos/edge/signal_pb';
import { PublicKeySchema } from '@dxos/protocols/buf/dxos/keys_pb';
import { type Answer, AnswerSchema, OfferSchema, SignalSchema } from '@dxos/protocols/buf/dxos/mesh/swarm_pb';
import { runTestSignalServer } from '@dxos/signal';

import { type OfferMessage, type SignalMessage } from './signal-messenger';
import { SwarmMessenger } from './swarm-messenger';
import { failedInvariant } from '@dxos/invariant';

const toBufKey = (key: PublicKey) => create(PublicKeySchema, { data: key.asUint8Array() });
const joinReq = (topic: PublicKey, peer: ReturnType<typeof create<typeof PeerSchema>>) =>
  create(JoinRequestSchema, { topic: toBufKey(topic), peer });

describe('SwarmMessenger', { timeout: 7000 }, () => {
  let topic: PublicKey;

  let broker1: Awaited<ReturnType<typeof runTestSignalServer>>;

  beforeAll(async () => {
    broker1 = await runTestSignalServer();
  });

  beforeEach(() => {
    topic = PublicKey.random();
  });

  afterAll(() => {
    void broker1.stop();
  });

  const createSignalClientAndMessageRouter = async ({
    signalApiUrl,
    onSignal = (async () => {}) as any,
    onOffer = async () => create(AnswerSchema, { accept: true }),
    topic,
  }: {
    signalApiUrl: string;
    onSignal?: (msg: SignalMessage) => Promise<void>;
    onOffer?: (msg: OfferMessage) => Promise<Answer>;
    topic: PublicKey;
  }) => {
    const peer = create(PeerSchema, { peerKey: PublicKey.random().toHex() });
    const signalManager = new WebsocketSignalManager([create(Runtime_Services_SignalSchema, { server: signalApiUrl })]);
    await signalManager.open();
    onTestFinished(async () => {
      await signalManager.close();
    });

    const messenger = new Messenger({ signalManager });
    await messenger.listen({
      peer,
      payloadType: 'dxos.mesh.swarm.SwarmMessage',
      onMessage: async (message) =>
        await router.receiveMessage({
          author: message.author!,
          recipient: message.recipient!,
          payload: message.payload ?? failedInvariant(),
        }),
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
      signalApiUrl: broker1.url(),
      onSignal: signalMock1,
      topic,
    });
    const {
      signalManager: signalManager2,
      router: router2,
      peer: peer2,
    } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      topic,
    });

    await signalManager1.join(joinReq(topic, peer1));
    await signalManager2.join(joinReq(topic, peer2));

    const msg: SignalMessage = {
      author: peer2,
      recipient: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: {
        signal: create(SignalSchema, { payload: { msg: 'Some info' } }),
        signalBatch: undefined,
      },
    };
    await router2.signal(msg);

    await expect.poll(() => received[0]).toEqual(expect.objectContaining(msg));
  });

  test('offer/answer', async () => {
    const {
      signalManager: signalManager1,
      router: router1,
      peer: peer1,
    } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: (async () => {}) as any,
      onOffer: async () => create(AnswerSchema, { accept: true }),
      topic,
    });
    const { signalManager: signalManager2, peer: peer2 } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: (async () => {}) as any,
      onOffer: async () => create(AnswerSchema, { accept: true }),
      topic,
    });

    await signalManager1.join(joinReq(topic, peer1));
    await signalManager2.join(joinReq(topic, peer2));
    const answer = await router1.offer({
      author: peer1,
      recipient: peer2,
      sessionId: PublicKey.random(),
      topic,
      data: { offer: create(OfferSchema) },
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
    } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: signalMock1,
      onOffer: async () => create(AnswerSchema, { accept: true }),
      topic,
    });
    const received2: SignalMessage[] = [];
    const signalMock2 = async (msg: SignalMessage) => {
      received2.push(msg);
    };
    const {
      signalManager: signalManager2,
      router: router2,
      peer: peer2,
    } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: signalMock2,
      onOffer: async () => create(AnswerSchema, { accept: true }),
      topic,
    });
    const received3: SignalMessage[] = [];
    const signalMock3 = async (msg: SignalMessage) => {
      received3.push(msg);
    };
    const {
      signalManager: signalManager3,
      router: router3,
      peer: peer3,
    } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: signalMock3,
      onOffer: async () => create(AnswerSchema, { accept: true }),
      topic,
    });

    await signalManager1.join(joinReq(topic, peer1));
    await signalManager2.join(joinReq(topic, peer2));
    await signalManager3.join(joinReq(topic, peer3));

    // sending signal from peer1 to peer3.
    const msg1to3: SignalMessage = {
      author: peer1,
      recipient: peer3,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: create(SignalSchema, { payload: { msg: '1to3' } }), signalBatch: undefined },
    };
    await router1.signal(msg1to3);
    await expect.poll(() => received3[0]).toEqual(expect.objectContaining(msg1to3));

    // sending signal from peer2 to peer3.
    const msg2to3: SignalMessage = {
      author: peer2,
      recipient: peer3,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: create(SignalSchema, { payload: { msg: '2to3' } }), signalBatch: undefined },
    };
    await router2.signal(msg2to3);
    await expect.poll(() => received3[1]).toEqual(expect.objectContaining(msg2to3));

    // sending signal from peer3 to peer1.
    const msg3to1: SignalMessage = {
      author: peer3,
      recipient: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: create(SignalSchema, { payload: { msg: '3to1' } }), signalBatch: undefined },
    };
    await router3.signal(msg3to1);
    await expect.poll(() => received1[0]).toEqual(expect.objectContaining(msg3to1));
  });

  test('two offers', async () => {
    const {
      signalManager: signalManager1,
      router: router1,
      peer: peer1,
    } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: (async () => {}) as any,
      onOffer: async () => create(AnswerSchema, { accept: true }),
      topic,
    });
    const {
      signalManager: signalManager2,
      router: router2,
      peer: peer2,
    } = await createSignalClientAndMessageRouter({
      signalApiUrl: broker1.url(),
      onSignal: (async () => {}) as any,
      onOffer: async () => create(AnswerSchema, { accept: true }),
      topic,
    });

    await signalManager1.join(joinReq(topic, peer1));
    await signalManager2.join(joinReq(topic, peer2));

    // sending offer from peer1 to peer2.
    const answer1 = await router1.offer({
      author: peer1,
      recipient: peer2,
      sessionId: PublicKey.random(),
      topic,
      data: { offer: create(OfferSchema) },
    });
    expect(answer1.accept).toEqual(true);

    // sending offer from peer2 to peer1.
    const answer2 = await router2.offer({
      author: peer2,
      recipient: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { offer: create(OfferSchema) },
    });
    expect(answer2.accept).toEqual(true);
  });
});
