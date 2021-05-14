//
// Copyright 2020 DXOS.org
//

import { expect, mockFn } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { createBroker } from '@dxos/signal';

import { afterTest } from '../testutils';
import { SignalApi } from './signal-api';

describe('SignalApi', () => {
  let topic: PublicKey;
  let peer1: PublicKey;
  let peer2: PublicKey;
  let api: SignalApi;
  let api2: SignalApi;

  let broker: ReturnType<typeof createBroker>;
  const signalApiPort = 13542;
  const signalApiUrl = 'http://0.0.0.0:' + signalApiPort;

  let broker2: ReturnType<typeof createBroker>;
  const signalApiPort2 = 13543;
  const signalApiUrl2 = 'http://0.0.0.0:' + signalApiPort2;
  const getBroker2 = () => createBroker(topic.asBuffer(), { port: signalApiPort2, logger: false});

  beforeEach(async () => {
    topic = PublicKey.random();
    peer1 = PublicKey.random();
    peer2 = PublicKey.random();
    broker = createBroker(topic.asBuffer(), { port: signalApiPort, logger: false });
    await broker.start();
  });

  afterEach(async () => {
    await api.close();
    await broker.stop();
  });

  test('join', async () => {
    api = new SignalApi(signalApiUrl, (async () => {}) as any, async () => {});

    const join = await api.join(topic, peer1);
    expect(join).toEqual([peer1]);

    const join2 = await api.join(topic, peer2);
    expect(join2).toEqual([peer1, peer2]);
  }, 10_000);

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

  test('join across multiple signal servers', async () => {
    broker2 = getBroker2();
    await broker2.start();

    api = new SignalApi(signalApiUrl, (async () => {}) as any, async () => {});
    api2 = new SignalApi(signalApiUrl2, (async () => {}) as any, async () => {});
    afterTest(async () => {
      await api2.close();
      await broker2.stop();
    });

    await api.join(topic, peer1);
    await api2.join(topic, peer2);

    await waitForExpect(async () => {
      const peers = await api2.lookup(topic);
      expect(peers.length).toEqual(2);
    }, 40_000);

    await waitForExpect(async () => {
      const peers = await api.lookup(topic);
      expect(peers.length).toEqual(2);
    }, 40_000);
  }, 50_000);

  // skip because communication between signal servers is not yet implemented
  test.skip('newly joined peer can receive signals from other signal servers', async () => {
    broker2 = getBroker2();
    await broker2.start();

    const offerMock = mockFn<(msg: SignalApi.SignalMessage) => Promise<SignalApi.Answer>>()
      .resolvesTo({ accept: true });
    const signalMock = mockFn<(msg: SignalApi.SignalMessage) => Promise<void>>()
      .resolvesTo();

    api = new SignalApi(signalApiUrl, offerMock, async () => {});
    api2 = new SignalApi(signalApiUrl2, (async () => {}) as any, signalMock);

    afterTest(async () => {
      await api2.close();
      await broker2.stop();
    });

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
    }, 40_000);
  }, 50_000);
});
