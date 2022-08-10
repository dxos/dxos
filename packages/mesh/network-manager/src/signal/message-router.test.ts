//
// Copyright 2022 DXOS.org
//

import { expect, mockFn } from 'earljs';
import { it as test, describe } from 'mocha';
import waitForExpect from 'wait-for-expect';

import { Awaited } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';
import { createTestBroker } from '@dxos/signal';
import { afterTest } from '@dxos/testutils';

import { Answer, SignalMessage } from '../proto/gen/dxos/mesh/signalMessage';
import { MessageRouter } from './message-router';
import { SignalClient } from './signal-client';

describe('MessageRouter', () => {
  let topic: PublicKey;
  let peer1: PublicKey;
  let peer2: PublicKey;

  let broker1: Awaited<ReturnType<typeof createTestBroker>>;

  before(async () => {
    broker1 = await createTestBroker();
  });

  beforeEach(() => {
    topic = PublicKey.random();
    peer1 = PublicKey.random();
    peer2 = PublicKey.random();
  });

  after(() => {
    broker1.stop();
  });

  const createSignalClientAndMessageRouter = async ({
    signalApiUrl,
    onSignal = (async () => { }) as any,
    onOffer = async () => ({ accept: true })
  }: {
    signalApiUrl: string;
    onSignal?: (msg: SignalMessage) => Promise<void>;
    onOffer?: (msg: SignalMessage) => Promise<Answer>;
  }) => {

    // eslint-disable-next-line prefer-const
    let api: SignalClient;
    const router: MessageRouter = new MessageRouter({
      // todo(mykola): added catch to avoid not finished request.
      sendMessage: (msg: SignalMessage) => api.signal(msg).catch((_) => { }),
      onMessage: onSignal,
      onOffer: onOffer
    });
    afterTest(() => router.destroy());

    api = new SignalClient(
      signalApiUrl,
      async (msg: SignalMessage) => router.receiveMessage(msg)
    );

    afterTest(() => api.close());
    return {
      api,
      router
    };
  };

  test('signaling between 2 clients', async () => {
    const signalMock1 = mockFn<(msg: SignalMessage) => Promise<void>>().resolvesTo();
    const { api: api1 } = await createSignalClientAndMessageRouter({ signalApiUrl: broker1.url(), onSignal: signalMock1 });
    const { api: api2, router: router2 } = await createSignalClientAndMessageRouter({ signalApiUrl: broker1.url() });

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);

    const msg: SignalMessage = {
      id: peer2,
      remoteId: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: JSON.stringify({ 'asd': 'asd' }) } }
    };
    await router2.message(msg);

    await waitForExpect(() => {
      expect(signalMock1).toHaveBeenCalledWith([msg]);
    }, 4_000);
  }).timeout(5_000);

  test('offer/answer', async () => {
    const { api: api1, router: router1 } = await createSignalClientAndMessageRouter(
      {
        signalApiUrl: broker1.url(),
        onSignal: (async () => { }) as any,
        onOffer:
          async () => ({ accept: true })
      });
    const { api: api2 } = await createSignalClientAndMessageRouter(
      {
        signalApiUrl: broker1.url(),
        onSignal: (async () => { }) as any,
        onOffer:
          async () => ({ accept: true })
      });

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);

    const answer = await router1.offer({
      id: peer1,
      remoteId: peer2,
      sessionId: PublicKey.random(),
      topic,
      data: { offer: { } }
    });
    expect(answer.accept).toEqual(true);
  }).timeout(5_000);

  test('signaling between 3 clients', async () => {
    const signalMock1 = mockFn<(msg: SignalMessage) => Promise<void>>().resolvesTo();
    const { api: api1, router: router1 } = await createSignalClientAndMessageRouter(
      {
        signalApiUrl: broker1.url(),
        onSignal: signalMock1,
        onOffer:
          async () => ({ accept: true })
      });
    const signalMock2 = mockFn<(msg: SignalMessage) => Promise<void>>().resolvesTo();
    const { api: api2, router: router2 } = await createSignalClientAndMessageRouter(
      {
        signalApiUrl: broker1.url(),
        onSignal: signalMock2,
        onOffer:
          async () => ({ accept: true })
      });
    const signalMock3 = mockFn<(msg: SignalMessage) => Promise<void>>().resolvesTo();
    const { api: api3, router: router3 } = await createSignalClientAndMessageRouter(
      {
        signalApiUrl: broker1.url(),
        onSignal: signalMock3,
        onOffer:
          async () => ({ accept: true })
      });

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);
    const peer3 = PublicKey.random();
    await api3.join(topic, peer3);

    // sending signal from peer1 to peer3.
    const msg1to3: SignalMessage = {
      id: peer1,
      remoteId: peer3,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: '1to3' } }
    };
    await router1.message(msg1to3);
    await waitForExpect(() => {
      expect(signalMock3).toHaveBeenCalledWith([msg1to3]);
    }, 4_000);

    // sending signal from peer2 to peer3.
    const msg2to3: SignalMessage = {
      id: peer2,
      remoteId: peer3,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: '2to3' } }
    };
    await router2.message(msg2to3);
    await waitForExpect(() => {
      expect(signalMock3).toHaveBeenCalledWith([msg2to3]);
    }, 4_000);

    // sending signal from peer3 to peer1.
    const msg3to1: SignalMessage = {
      id: peer3,
      remoteId: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: '3to1' } }
    };
    await router3.message(msg3to1);
    await waitForExpect(() => {
      expect(signalMock1).toHaveBeenCalledWith([msg3to1]);
    }, 4_000);
  }).timeout(5_000);

  test('two offers', async () => {
    const { api: api1, router: router1 } = await createSignalClientAndMessageRouter(
      {
        signalApiUrl: broker1.url(),
        onSignal: (async () => { }) as any,
        onOffer:
          async () => ({ accept: true })
      });
    const { api: api2, router: router2 } = await createSignalClientAndMessageRouter(
      {
        signalApiUrl: broker1.url(),
        onSignal: (async () => { }) as any,
        onOffer:
          async () => ({ accept: true })
      });

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);

    // sending offer from peer1 to peer2.
    const answer1 = await router1.offer({
      id: peer1,
      remoteId: peer2,
      sessionId: PublicKey.random(),
      topic,
      data: { offer: {} }
    });
    expect(answer1.accept).toEqual(true);

    // sending offer from peer2 to peer1.
    const answer2 = await router2.offer({
      id: peer2,
      remoteId: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { offer: {} }
    });
    expect(answer2.accept).toEqual(true);
  }).timeout(5_000);

  describe('Reliability', () => {
    const setup = ({
      onSignal1 = async () => { },
      onSignal2 = async () => { },
      // Imitates signal network disruptions (e. g. message doubling, ).
      messageDisruption = msg => [msg]
    }: {
      onSignal1?: (msg: SignalMessage) => Promise<void>;
      onSignal2?: (msg: SignalMessage) => Promise<void>;
      messageDisruption?: (msg: SignalMessage) => SignalMessage[];
    }): {mr1: MessageRouter; mr2: MessageRouter} => {

      const mr1: MessageRouter = new MessageRouter({
        sendMessage: async msg => messageDisruption(msg).forEach(msg => mr2.receiveMessage(msg)),
        onOffer: async () => ({ accept: true }),
        onMessage: onSignal1
      });
      afterTest(() => mr1.destroy());

      const mr2: MessageRouter = new MessageRouter({
        sendMessage: async msg => messageDisruption(msg).forEach(msg => mr1.receiveMessage(msg)),
        onOffer: async () => ({ accept: true }),
        onMessage: onSignal2
      });
      afterTest(() => mr1.destroy());

      return { mr1, mr2 };
    };

    test('signaling with non reliable connection', async () => {
      // Simulate unreliable connection.
      // Only each 3rd message is sent.
      let i = 0;
      const unreliableConnection = (msg: SignalMessage): SignalMessage[] => {
        i++;
        if (i % 3 !== 0) {
          return [msg];
        }
        return [];
      };

      const received: SignalMessage[] = [];
      const signalMock1 = async (msg: SignalMessage) => {
        received.push(msg);
      };

      const { mr2 } = await setup({
        onSignal1: signalMock1,
        messageDisruption: unreliableConnection
      });

      // Sending 3 messages.
      // Setup sends messages directly to between. So we don`t need to specify any ids.
      Array(3).fill(0).forEach(async () => {
        await mr2.message({
          id: PublicKey.random(),
          remoteId: PublicKey.random(),
          sessionId: PublicKey.random(),
          topic: PublicKey.random(),
          data: { signal: { json: JSON.stringify({ 'asd': 'asd' }) } }
        });
      });
      // expect to receive 3 messages.
      await waitForExpect(() => {
        expect(received.length).toEqual(3);
      }, 4_000);
    }).timeout(5_000);

    test('ignoring doubled messages', async () => {
      // Message got doubled going through signal network.
      const doublingMessage = (msg: SignalMessage) => [msg, msg];

      const received: SignalMessage[] = [];
      const signalMock1 = async (msg: SignalMessage) => {
        received.push(msg);
      };

      const { mr2 } = setup({
        onSignal1: signalMock1,
        messageDisruption: doublingMessage
      });

      // sending message.
      await mr2.message({
        id: PublicKey.random(),
        remoteId: PublicKey.random(),
        sessionId: PublicKey.random(),
        topic: PublicKey.random(),
        data: { signal: { json: 'asd' } }
      });
      // expect to receive 1 message.
      await waitForExpect(() => {
        expect(received.length).toEqual(1);
      }, 4_000);
    }).timeout(5_000);
  });
});
