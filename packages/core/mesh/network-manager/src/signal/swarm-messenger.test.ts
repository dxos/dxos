//
// Copyright 2022 DXOS.org
//

// @dxos/test platform=nodejs

import { expect } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { type Awaited } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { Messenger, WebsocketSignalManager } from '@dxos/messaging';
import { type Answer } from '@dxos/protocols/proto/dxos/mesh/swarm';
import { runTestSignalServer } from '@dxos/signal';
import { afterAll, beforeAll, describe, test, onTestFinished } from 'vitest';

import { type OfferMessage, type SignalMessage } from './signal-messenger';
import { SwarmMessenger } from './swarm-messenger';

describe('SwarmMessenger', () => {
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
    onOffer = async () => ({ accept: true }),
    topic,
  }: {
    signalApiUrl: string;
    onSignal?: (msg: SignalMessage) => Promise<void>;
    onOffer?: (msg: OfferMessage) => Promise<Answer>;
    topic: PublicKey;
  }) => {
    const peerId = PublicKey.random();
    const signalManager = new WebsocketSignalManager([{ server: signalApiUrl }]);
    await signalManager.open();
    onTestFinished(() => signalManager.close());

    const messenger = new Messenger({ signalManager });
    await messenger.listen({
      peerId,
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
      peerId,
      signalManager,
      router,
    };
  };

  test(
    'signaling between 2 clients',
    async () => {
      const received: SignalMessage[] = [];
      const signalMock1 = async (msg: SignalMessage) => {
        received.push(msg);
      };
      const { signalManager: signalManager1, peerId: peer1 } = await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        onSignal: signalMock1,
        topic,
      });
      const {
        signalManager: signalManager2,
        router: router2,
        peerId: peer2,
      } = await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        topic,
      });

      await signalManager1.join({ topic, peerId: peer1 });
      await signalManager2.join({ topic, peerId: peer2 });

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

      await waitForExpect(() => {
        expect(received[0]).toBeAnObjectWith(msg);
      }, 4_000);
    },
    { timeout: 5_000 },
  );

  test(
    'offer/answer',
    async () => {
      const {
        signalManager: signalManager1,
        router: router1,
        peerId: peer1,
      } = await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        onSignal: (async () => {}) as any,
        onOffer: async () => ({ accept: true }),
        topic,
      });
      const { signalManager: signalManager2, peerId: peer2 } = await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        onSignal: (async () => {}) as any,
        onOffer: async () => ({ accept: true }),
        topic,
      });

      await signalManager1.join({ topic, peerId: peer1 });
      await signalManager2.join({ topic, peerId: peer2 });
      const answer = await router1.offer({
        author: peer1,
        recipient: peer2,
        sessionId: PublicKey.random(),
        topic,
        data: { offer: {} },
      });
      expect(answer.accept).toEqual(true);
    },
    { timeout: 5_000 },
  );

  test(
    'signaling between 3 clients',
    async () => {
      const received1: SignalMessage[] = [];
      const signalMock1 = async (msg: SignalMessage) => {
        received1.push(msg);
      };
      const {
        signalManager: signalManager1,
        router: router1,
        peerId: peer1,
      } = await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        onSignal: signalMock1,
        onOffer: async () => ({ accept: true }),
        topic,
      });
      const received2: SignalMessage[] = [];
      const signalMock2 = async (msg: SignalMessage) => {
        received2.push(msg);
      };
      const {
        signalManager: signalManager2,
        router: router2,
        peerId: peer2,
      } = await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        onSignal: signalMock2,
        onOffer: async () => ({ accept: true }),
        topic,
      });
      const received3: SignalMessage[] = [];
      const signalMock3 = async (msg: SignalMessage) => {
        received3.push(msg);
      };
      const {
        signalManager: signalManager3,
        router: router3,
        peerId: peer3,
      } = await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        onSignal: signalMock3,
        onOffer: async () => ({ accept: true }),
        topic,
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
        data: { signal: { payload: { msg: '1to3' } }, signalBatch: undefined },
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
        data: { signal: { payload: { msg: '2to3' } }, signalBatch: undefined },
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
        data: { signal: { payload: { msg: '3to1' } }, signalBatch: undefined },
      };
      await router3.signal(msg3to1);
      await waitForExpect(() => {
        expect(received1[0]).toBeAnObjectWith(msg3to1);
      }, 4_000);
    },
    { timeout: 5_000 },
  );

  test(
    'two offers',
    async () => {
      const {
        signalManager: signalManager1,
        router: router1,
        peerId: peer1,
      } = await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        onSignal: (async () => {}) as any,
        onOffer: async () => ({ accept: true }),
        topic,
      });
      const {
        signalManager: signalManager2,
        router: router2,
        peerId: peer2,
      } = await createSignalClientAndMessageRouter({
        signalApiUrl: broker1.url(),
        onSignal: (async () => {}) as any,
        onOffer: async () => ({ accept: true }),
        topic,
      });

      await signalManager1.join({ topic, peerId: peer1 });
      await signalManager2.join({ topic, peerId: peer2 });

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
    },
    { timeout: 5_000 },
  );
});
