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
import { randomInt } from '@dxos/util';

import { Answer, Message } from '../proto/gen/dxos/mesh/signal';
import { MessageRouter } from './message-router';
import { SignalClient } from './signal-client';

describe('MessageRouter', () => {
  let topic: PublicKey;
  let peer1: PublicKey;
  let peer2: PublicKey;

  let broker1: Awaited<ReturnType<typeof createTestBroker>>;
  const signalApiPort1 = randomInt(10000, 50000);
  const signalApiUrl1 = 'http://0.0.0.0:' + signalApiPort1;

  before(async () => {
    broker1 = await createTestBroker(signalApiPort1);
  });

  beforeEach(() => {
    topic = PublicKey.random();
    peer1 = PublicKey.random();
    peer2 = PublicKey.random();
  });

  after(async function () {
    this.timeout(0);
    await broker1.stop();
  });

  const createSignalClientAndMessageRouter = async (
    signalApiUrl: string,
    onSignal: (msg: Message) => Promise<void> = (async () => {}) as any,
    onOffer: (msg: Message) => Promise<Answer> = async () => ({ accept: true })
  ) => {
    
    // eslint-disable-next-line prefer-const
    let api: SignalClient;
    const router: MessageRouter = new MessageRouter({
      // todo(mykola): added catch to avoid not finished request.
      sendMessage: (msg: Message) => api.signal(msg).catch((_) => { }),
      onSignal: onSignal,
      onOffer: onOffer
    });

    api = new SignalClient(
      signalApiUrl,
      (async () => {}) as any,
      async (msg: Message) => router.receiveMessage(msg)
    );

    afterTest(() => api.close());
    return {
      api,
      router
    };
  };

  test('signaling between 2 clients', async () => {
    const signalMock1 = mockFn<(msg: Message) => Promise<void>>().resolvesTo();
    const { api: api1 } = await createSignalClientAndMessageRouter(signalApiUrl1, signalMock1);
    const { api: api2, router: router2 } = await createSignalClientAndMessageRouter(signalApiUrl1);

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);

    const msg: Message = {
      id: peer2,
      remoteId: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: '{"asd": "asd"}' } }
    };
    await router2.signal(msg);

    await waitForExpect(() => {
      expect(signalMock1).toHaveBeenCalledWith([msg]);
    }, 4_000);
  }).timeout(5_000);

  test('offer/answer', async () => {
    const { api: api1, router: router1 } = await createSignalClientAndMessageRouter(
      signalApiUrl1,
      (async () => {}) as any,
      async () => ({ accept: true })
    );
    const { api: api2 } = await createSignalClientAndMessageRouter(
      signalApiUrl1,
      (async () => {}) as any,
      async () => ({ accept: true })
    );

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);

    const answer = await router1.offer({
      id: peer1,
      remoteId: peer2,
      sessionId: PublicKey.random(),
      topic,
      data: { offer: { } }
    });
    expect(answer).toEqual({ accept: true });
  }).timeout(5_000);

  test('signaling between 3 clients', async () => {
    const signalMock1 = mockFn<(msg: Message) => Promise<void>>().resolvesTo();
    const { api: api1, router: router1 } = await createSignalClientAndMessageRouter(
      signalApiUrl1,
      signalMock1,
      async () => ({ accept: true })
    );
    const signalMock2 = mockFn<(msg: Message) => Promise<void>>().resolvesTo();
    const { api: api2, router: router2 } = await createSignalClientAndMessageRouter(
      signalApiUrl1,
      signalMock2,
      async () => ({ accept: true })
    );
    const signalMock3 = mockFn<(msg: Message) => Promise<void>>().resolvesTo();
    const { api: api3, router: router3 } = await createSignalClientAndMessageRouter(
      signalApiUrl1,
      signalMock3,
      async () => ({ accept: true })
    );

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);
    const peer3 = PublicKey.random();
    await api3.join(topic, peer3);

    // sending signal from peer1 to peer3.
    const msg1to3: Message = {
      id: peer1,
      remoteId: peer3,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: '1to3' } }
    };
    await router1.signal(msg1to3);
    await waitForExpect(() => {
      expect(signalMock3).toHaveBeenCalledWith([msg1to3]);
    }, 4_000);

    // sending signal from peer2 to peer3.
    const msg2to3: Message = {
      id: peer2,
      remoteId: peer3,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: '2to3' } }
    };
    await router2.signal(msg2to3);
    await waitForExpect(() => {
      expect(signalMock3).toHaveBeenCalledWith([msg2to3]);
    }, 4_000);

    // sending signal from peer3 to peer1.
    const msg3to1: Message = {
      id: peer3,
      remoteId: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: '3to1' } }
    };
    await router3.signal(msg3to1);
    await waitForExpect(() => {
      expect(signalMock1).toHaveBeenCalledWith([msg3to1]);
    }, 4_000);
  }).timeout(5_000);

  test('two offers', async () => {
    const { api: api1, router: router1 } = await createSignalClientAndMessageRouter(
      signalApiUrl1,
      (async () => {}) as any,
      async () => ({ accept: true })
    );
    const { api: api2, router: router2 } = await createSignalClientAndMessageRouter(
      signalApiUrl1,
      (async () => {}) as any,
      async () => ({ accept: true })
    );

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
    expect(answer1).toEqual({ accept: true });

    // sending offer from peer2 to peer1.
    const answer2 = await router2.offer({
      id: peer2,
      remoteId: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { offer: {} }
    });
    expect(answer2).toEqual({ accept: true });
  }).timeout(5_000);
});
