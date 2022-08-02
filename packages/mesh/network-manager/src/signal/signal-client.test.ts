//
// Copyright 2020 DXOS.org
//

import { expect, mockFn } from 'earljs';
import { it as test, describe } from 'mocha';
import waitForExpect from 'wait-for-expect';

import { Awaited, sleep } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';
import { createTestBroker } from '@dxos/signal';

import { Answer, SignalMessage } from '../proto/gen/dxos/mesh/signalMessage';
import { NewSignalClient } from './new-client';

describe('SignalApi', () => {
  let topic: PublicKey;
  let peer1: PublicKey;
  let peer2: PublicKey;
  let api1: NewSignalClient;
  let api2: NewSignalClient;

  let broker1: Awaited<ReturnType<typeof createTestBroker>>;

  // code let broker2: ReturnType<typeof createBroker>;

  before(async () => {
    broker1 = await createTestBroker();
    // broker2 = await createTestBroker(signalApiPort2);
  });

  beforeEach(() => {
    topic = PublicKey.random();
    peer1 = PublicKey.random();
    peer2 = PublicKey.random();
  });

  after(async function () {
    this.timeout(0);
    await broker1.stop();
    await api1.close();
    // code await broker2.stop();
  });

  test('message between 2 clients', async () => {
    const signalMock1 = mockFn<(msg: SignalMessage) => Promise<void>>()
      .resolvesTo();
    api1 = new NewSignalClient(broker1.url(), signalMock1);
    api2 = new NewSignalClient(broker1.url(), (async () => {}) as any);

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);

    const msg: SignalMessage = {
      id: peer2,
      remoteId: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: "foo: 'bar'" } }
    };
    await api2.signal(msg);
    await waitForExpect(() => {
      expect(signalMock1).toHaveBeenCalledWith([msg]);
    }, 4_000);
  }).timeout(5_000);

  test('join', async () => {
    api1 = new NewSignalClient(broker1.url(), async () => {});

    const join = await api1.join(topic, peer1);
    expect(join).toEqual([peer1]);

    const join2 = await api1.join(topic, peer2);
    expect(join2).toEqual([peer1, peer2]);
  }).timeout(1_000);

  test('signal', async () => {
    const signalMock = mockFn<(msg: SignalMessage) => Promise<void>>()
      .resolvesTo();
    api1 = new NewSignalClient(broker1.url(), signalMock);

    await api1.join(topic, peer1);

    const msg: SignalMessage = {
      id: peer2,
      remoteId: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: 'bar' } }
    };
    await api1.signal(msg);

    await waitForExpect(() => {
      expect(signalMock).toHaveBeenCalledWith([msg]);
    }, 4_000);
  }).timeout(5_000);

  test.skip('join across multiple signal servers', async () => {
    // This feature is not implemented yet.
    api1 = new NewSignalClient(broker1.url(), async () => {});
    api2 = new NewSignalClient(broker2.url(), async () => {});

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);

    await waitForExpect(async () => {
      const peers = await api2.lookup(topic);
      expect(peers.length).toEqual(2);
    }, 4_000);

    await waitForExpect(async () => {
      const peers = await api1.lookup(topic);
      expect(peers.length).toEqual(2);
    }, 4_000);
  }).timeout(5_000);

  // Skip because communication between signal servers is not yet implemented.
  test.skip('newly joined peer can receive signals from other signal servers', async () => {
    const offerMock = mockFn<(msg: SignalMessage) => Promise<Answer>>()
      .resolvesTo({ accept: true });
    const signalMock = mockFn<(msg: SignalMessage) => Promise<void>>()
      .resolvesTo();

    api1 = new SignalClient(signalApiUrl1, offerMock, async () => {});
    api2 = new SignalClient(signalApiUrl2, (async () => {}) as any, signalMock);

    await api1.join(topic, peer1);
    await sleep(3000);
    await api2.join(topic, peer2);

    const sessionId = PublicKey.random();
    const answer = await api2.offer({
      remoteId: peer1,
      id: peer2,
      topic,
      sessionId,
      data: { offer: {} }
    });
    expect(answer).toEqual({ accept: true });

    const msg: SignalMessage = {
      id: peer2,
      remoteId: peer1,
      sessionId,
      topic,
      data: { offer: { json: 'bar' } }
    };
    await api1.signal(msg);

    await waitForExpect(() => {
      expect(signalMock).toHaveBeenCalledWith([msg]);
    }, 4_000);
  }).timeout(5_000);
}).timeout(10_000);
