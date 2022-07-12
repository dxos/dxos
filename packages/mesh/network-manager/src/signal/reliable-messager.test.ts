//
// Copyright 2022 DXOS.org
//

import { expect, mockFn } from 'earljs';
import { it as test, describe } from 'mocha';
import waitForExpect from 'wait-for-expect';

import { Awaited, sleep } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { createTestBroker } from '@dxos/signal';
import { randomInt } from '@dxos/util';

import { SignalApi } from './signal-api';
import { SignalClient } from './signal-client';
import { ReliableMessager } from './reliable-messager';

describe('SignalMessager', () => {
  let topic: PublicKey;
  let peer1: PublicKey;
  let peer2: PublicKey;
  let api1: SignalClient;
  let api2: SignalClient;

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
    await api1.close();
    await broker1.stop();
  });

  test.only('message between 2 clients', async () => {

    const signalMock1 = mockFn<(msg: SignalApi.SignalMessage) => Promise<void>>()
    .resolvesTo();
    const messanger1 = new ReliableMessager(
      (payload: SignalApi.SignalMessage) => api1.signal(payload),
      signalMock1
    );
    api1 = new SignalClient(signalApiUrl1, (async () => {}) as any, (message: SignalApi.SignalMessage) => messanger1.reciveMessage(message));
    
    const messanger2 = new ReliableMessager(
      (payload: SignalApi.SignalMessage) => api2.signal(payload), 
      (() => {}) as any
      );
    api2 = new SignalClient(signalApiUrl1, (async () => {}) as any, (message: SignalApi.SignalMessage) => messanger2.reciveMessage(message));

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);

    const msg: SignalApi.SignalMessage = {
      id: peer2,
      remoteId: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { foo: 'bar' } as any
    };
    await messanger2.signal(msg);

    await waitForExpect(() => {
      expect(signalMock1).toHaveBeenCalledWith([msg]);
    }, 4_000);
  }).timeout(5_000);
});
