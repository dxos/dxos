//
// Copyright 2020 DXOS.org
//

import { expect, mockFn } from 'earljs';
import { it as test, describe } from 'mocha';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/protocols';
import { createTestBroker, TestBroker } from '@dxos/signal';

import { SignalMessage } from '../proto/gen/dxos/mesh/signalMessage';
import { SignalClient } from './signal-client';

describe('SignalClient', () => {
  let topic: PublicKey;
  let peer1: PublicKey;
  let peer2: PublicKey;
  let api1: SignalClient;
  let api2: SignalClient;

  let broker1: TestBroker;

  let broker2: TestBroker;

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
    await api2.close();
    // code await broker2.stop();
  });

  test('message between 2 clients', async () => {
    const signalMock1 = mockFn<(msg: SignalMessage) => Promise<void>>()
      .resolvesTo();
    api1 = new SignalClient(broker1.url(), signalMock1);
    api2 = new SignalClient(broker1.url(), (async () => {}) as any);

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
    api1 = new SignalClient(broker1.url(), async () => {});
    api2 = new SignalClient(broker1.url(), async () => {});

    const promise1 = api1.swarmEvent.waitFor(([, swarmEvent]) => !!swarmEvent.peerAvailable && peer2.equals(swarmEvent.peerAvailable.peer));
    const promise2 = api2.swarmEvent.waitFor(([, swarmEvent]) => !!swarmEvent.peerAvailable && peer1.equals(swarmEvent.peerAvailable.peer));

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);

    await promise1;
    await promise2;
  }).timeout(1_000);

  test('signal to self', async () => {
    const signalMock = mockFn<(msg: SignalMessage) => Promise<void>>()
      .resolvesTo();
    api1 = new SignalClient(broker1.url(), signalMock);

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
    api1 = new SignalClient(broker1.url(), async () => {});
    api2 = new SignalClient(broker2.url(), async () => {});

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
    const signalMock = mockFn<(msg: SignalMessage) => Promise<void>>()
      .resolvesTo();

    api1 = new SignalClient(broker1.url(), async () => {});
    api2 = new SignalClient(broker2.url(), signalMock);

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
}).timeout(10_000);
