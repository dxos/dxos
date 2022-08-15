//
// Copyright 2020 DXOS.org
//

import { expect, mockFn } from 'earljs';
import { it as test, describe } from 'mocha';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';
import { createTestBroker, TestBroker } from '@dxos/signal';
import { afterTest } from '@dxos/testutils';

import { SignalMessage } from '../proto/gen/dxos/mesh/signalMessage';
import { SignalClient } from './signal-client';

describe('SignalClient', () => {
  let broker1: TestBroker;

  let broker2: TestBroker;

  before(async () => {
    broker1 = await createTestBroker();
    // broker2 = await await createTestBroker(signalApiPort2);
  });

  after(() => {
    broker1.stop();
    // code await broker2.stop();
  });

  test('message between 2 clients', async () => {
    const topic = PublicKey.random();
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();
    const signalMock1 = mockFn<(msg: SignalMessage) => Promise<void>>()
      .resolvesTo();
    const api1 = new SignalClient(broker1.url(), signalMock1);
    afterTest(() => api1.close());
    const api2 = new SignalClient(broker1.url(), (async () => {}) as any);
    afterTest(() => api2.close());

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);

    const msg: SignalMessage = {
      id: peer2,
      remoteId: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: JSON.stringify({ 'asd': 'asd' }) } }
    };
    await api2.signal(msg);
    await waitForExpect(() => {
      expect(signalMock1).toHaveBeenCalledWith([msg]);
    }, 4_000);
  }).timeout(500);

  test('join', async () => {
    const topic = PublicKey.random();
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();
    const api1 = new SignalClient(broker1.url(), async () => {});
    afterTest(() => api1.close());
    const api2 = new SignalClient(broker1.url(), async () => {});
    afterTest(() => api2.close());

    const promise1 = api1.swarmEvent.waitFor(([, swarmEvent]) => !!swarmEvent.peerAvailable && peer2.equals(swarmEvent.peerAvailable.peer));
    const promise2 = api2.swarmEvent.waitFor(([, swarmEvent]) => !!swarmEvent.peerAvailable && peer1.equals(swarmEvent.peerAvailable.peer));

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);

    await promise1;
    await promise2;
  }).timeout(500);

  test('signal to self', async () => {
    const topic = PublicKey.random();
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();
    const signalMock = mockFn<(msg: SignalMessage) => Promise<void>>()
      .resolvesTo();
    const api1 = new SignalClient(broker1.url(), signalMock);
    afterTest(() => api1.close());

    await api1.join(topic, peer1);

    const msg: SignalMessage = {
      id: peer2,
      remoteId: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: JSON.stringify({ 'asd': 'asd' }) } }
    };
    await api1.signal(msg);

    await waitForExpect(() => {
      expect(signalMock).toHaveBeenCalledWith([msg]);
    }, 4_000);
  }).timeout(500);

  test.skip('join across multiple signal servers', async () => {
    const topic = PublicKey.random();
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();
    // This feature is not implemented yet.
    const api1 = new SignalClient(broker1.url(), async () => {});
    afterTest(() => api1.close());
    const api2 = new SignalClient(broker2.url(), async () => {});
    afterTest(() => api2.close());

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);

    // await waitForExpect(async () => {
    //   const peers = await api2.lookup(topic);
    //   expect(peers.length).toEqual(2);
    // }, 4_000);

    // await waitForExpect(async () => {
    //   const peers = await api1.lookup(topic);
    //   expect(peers.length).toEqual(2);
    // }, 4_000);
  }).timeout(5_000);

  // Skip because communication between signal servers is not yet implemented.
  test.skip('newly joined peer can receive signals from other signal servers', async () => {
    const topic = PublicKey.random();
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();
    const signalMock = mockFn<(msg: SignalMessage) => Promise<void>>()
      .resolvesTo();

    const api1 = new SignalClient(broker1.url(), async () => {});
    afterTest(() => api1.close());
    const api2 = new SignalClient(broker2.url(), signalMock);
    afterTest(() => api2.close());

    await api1.join(topic, peer1);
    await sleep(3000);
    await api2.join(topic, peer2);

    const sessionId = PublicKey.random();

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
});
