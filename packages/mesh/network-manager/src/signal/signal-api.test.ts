//
// Copyright 2020 DXOS.org
//

import { expect, mockFn } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/util';
import { PublicKey } from '@dxos/crypto';

import { afterTest } from '../testutils';
import { SignalApi } from './signal-api';

describe('SignalApi', () => {
  let topic: PublicKey;
  let peer1: PublicKey;
  let peer2: PublicKey;
  let api: SignalApi;

  beforeEach(() => {
    topic = PublicKey.random();
    peer1 = PublicKey.random();
    peer2 = PublicKey.random();
  });

  afterEach(async () => {
    await api.close();
  });

  test('join', async () => {
    api = new SignalApi('wss://apollo1.kube.moon.dxos.network/dxos/signal', (async () => {}) as any, async () => {});

    const join = await api.join(topic, peer1);
    expect(join).toEqual([peer1]);

    const join2 = await api.join(topic, peer2);
    expect(join2).toEqual([peer1, peer2]);
  }, 10_000);

  test('offer', async () => {
    const offerMock = mockFn<(msg: SignalApi.SignalMessage) => Promise<SignalApi.Answer>>()
      .resolvesTo({ accept: true });
    api = new SignalApi('wss://apollo1.kube.moon.dxos.network/dxos/signal', offerMock, async () => {});

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
    api = new SignalApi('wss://apollo1.kube.moon.dxos.network/dxos/signal', (async () => {}) as any, signalMock);

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
    api = new SignalApi('wss://apollo1.kube.moon.dxos.network/dxos/signal', (async () => {}) as any, async () => {});
    const api2 = new SignalApi('wss://apollo2.kube.moon.dxos.network/dxos/signal', (async () => {}) as any, async () => {});
    afterTest(() => api.close());

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

  test.skip('newly joined peer can receive signals from other signal servers', async () => {
    const offerMock = mockFn<(msg: SignalApi.SignalMessage) => Promise<SignalApi.Answer>>()
      .resolvesTo({ accept: true });
    const signalMock = mockFn<(msg: SignalApi.SignalMessage) => Promise<void>>()
      .resolvesTo();
    api = new SignalApi('wss://apollo1.kube.moon.dxos.network/dxos/signal', offerMock, async () => {});
    const api2 = new SignalApi('wss://apollo2.kube.moon.dxos.network/dxos/signal', (async () => {}) as any, signalMock);
    afterTest(() => api.close());

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
  }, 50_000);
});
