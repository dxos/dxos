//
// Copyright 2020 DXOS.org
//

import { expect, mockFn } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { createBroker } from '@dxos/signal';
import { randomInt } from '@dxos/util';

import { SignalApi } from './signal-api';

describe('SignalApi', () => {
  let topic: PublicKey;
  let peer1: PublicKey;
  let peer2: PublicKey;
  let api: SignalApi;
  let api2: SignalApi;

  let broker: ReturnType<typeof createBroker>;
  const signalApiPort = randomInt(10000, 50000);
  const signalApiUrl = 'http://0.0.0.0:' + signalApiPort;

  let broker2: ReturnType<typeof createBroker>;
  const signalApiPort2 = randomInt(10000, 50000);
  const signalApiUrl2 = 'http://0.0.0.0:' + signalApiPort2;

  beforeAll(async () => {
    const brokerTopic = PublicKey.random();
    broker = createBroker(brokerTopic.asBuffer(), { port: signalApiPort, logger: false });
    broker2 = createBroker(brokerTopic.asBuffer(), { port: signalApiPort2, logger: false });
    await broker.start();
    await broker2.start();
  });

  beforeEach(() => {
    topic = PublicKey.random();
    peer1 = PublicKey.random();
    peer2 = PublicKey.random();
  });

  afterAll(async () => {
    await api.close();
    await broker.stop();
    await broker2.stop();
  });

  test('join', async () => {
    api = new SignalApi(signalApiUrl, (async () => {}) as any, async () => {});

    const join = await api.join(topic, peer1);
    expect(join).toEqual([peer1]);

    const join2 = await api.join(topic, peer2);
    expect(join2).toEqual([peer1, peer2]);
  }, 1_000);

  test('offer', async () => {
    const offerMock = mockFn<(msg: SignalApi.SignalMessage) => Promise<SignalApi.Answer>>()
      .resolvesTo({ accept: true });
    api = new SignalApi(signalApiUrl, offerMock, async () => {});

    await api.join(topic, peer1);

    const offer: SignalApi.SignalMessage = {
      data: { foo: 'bar' } as any,
      id: peer2,
      remoteId: peer1,
      sessionId: PublicKey.random(),
      topic
    };
    const offerResult = await api.offer(offer);
    expect(offerResult).toEqual({ accept: true });
    expect(offerMock).toHaveBeenCalledWith([offer]);
  }, 5_000);

  test('signal', async () => {
    const signalMock = mockFn<(msg: SignalApi.SignalMessage) => Promise<void>>()
      .resolvesTo();
    api = new SignalApi(signalApiUrl, (async () => {}) as any, signalMock);

    await api.join(topic, peer1);

    const msg: SignalApi.SignalMessage = {
      id: peer2,
      remoteId: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { foo: 'bar' } as any
    };
    await api.signal(msg);

    await waitForExpect(() => {
      expect(signalMock).toHaveBeenCalledWith([msg]);
    }, 4_000);
  }, 5_000);

  test.skip('join across multiple signal servers', async () => {
    // This feature is not implemented yet.
    api = new SignalApi(signalApiUrl, (async () => {}) as any, async () => {});
    api2 = new SignalApi(signalApiUrl2, (async () => {}) as any, async () => {});

    await api.join(topic, peer1);
    await api2.join(topic, peer2);

    await waitForExpect(async () => {
      const peers = await api2.lookup(topic);
      expect(peers.length).toEqual(2);
    }, 4_000);

    await waitForExpect(async () => {
      const peers = await api.lookup(topic);
      expect(peers.length).toEqual(2);
    }, 4_000);
  }, 5_000);

  // skip because communication between signal servers is not yet implemented
  test.skip('newly joined peer can receive signals from other signal servers', async () => {
    const offerMock = mockFn<(msg: SignalApi.SignalMessage) => Promise<SignalApi.Answer>>()
      .resolvesTo({ accept: true });
    const signalMock = mockFn<(msg: SignalApi.SignalMessage) => Promise<void>>()
      .resolvesTo();

    api = new SignalApi(signalApiUrl, offerMock, async () => {});
    api2 = new SignalApi(signalApiUrl2, (async () => {}) as any, signalMock);

    await api.join(topic, peer1);
    await sleep(3000);
    await api2.join(topic, peer2);

    const sessionId = PublicKey.random();
    const answer = await api2.offer({
      remoteId: peer1,
      id: peer2,
      topic,
      sessionId,
      data: {}
    });
    expect(answer).toEqual({ accept: true });

    const msg: SignalApi.SignalMessage = {
      id: peer2,
      remoteId: peer1,
      sessionId,
      topic,
      data: { foo: 'bar' } as any
    };
    await api.signal(msg);

    await waitForExpect(() => {
      expect(signalMock).toHaveBeenCalledWith([msg]);
    }, 4_000);
  }, 5_000);
});
