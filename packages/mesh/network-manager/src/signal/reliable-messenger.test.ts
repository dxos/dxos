//
// Copyright 2022 DXOS.org
//

import { expect, mockFn } from 'earljs';
import { it as test, describe } from 'mocha';
import waitForExpect from 'wait-for-expect';

import { Awaited } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';
import { createTestBroker } from '@dxos/signal';
import { randomInt } from '@dxos/util';

import { Answer, Message } from '../proto/gen/dxos/mesh/signal';
import { ReliableMessenger } from './reliable-messenger';
import { SignalApi } from './signal-api';
import { SignalClient } from './signal-client';

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

  test('signaling between 2 clients', async () => {
    const signalMock1 = mockFn<(msg: Message) => Promise<void>>().resolvesTo();
    const messenger1 = new ReliableMessenger(
      (message: Message) => api1.signal(message as SignalApi.SignalMessage),
      signalMock1,
      (() => {}) as any
    );
    api1 = new SignalClient(signalApiUrl1, (async () => {}) as any, (message: Message) => messenger1.receiveMessage(message));

    const messenger2 = new ReliableMessenger(
      (message: Message) => api2.signal(message as SignalApi.SignalMessage),
      (() => {}) as any,
      (() => {}) as any
    );
    api2 = new SignalClient(signalApiUrl1, (async () => {}) as any, (message: Message) => messenger2.receiveMessage(message));

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);

    const msg: Message = {
      id: peer2,
      remoteId: peer1,
      sessionId: PublicKey.random(),
      topic,
      data: { signal: { json: '{"asd": "asd"}' } }
    };
    await messenger2.signal(msg);

    await waitForExpect(() => {
      expect(signalMock1).toHaveBeenCalledWith([msg]);
    }, 4_000);
  }).timeout(5_000);

  test('offer/answer', async () => {
    // const signalMock1 = mockFn<(msg: Message) => Promise<void>>().resolvesTo();
    const messenger1 = new ReliableMessenger(
      (message: Message) => api1.signal(message as SignalApi.SignalMessage),
      (async () => {}) as any,
      async (message: Message) => new Promise<Answer>(
        (resolve, reject) => resolve({ accept: true })
      )
    );
    api1 = new SignalClient(
      signalApiUrl1,
      (async () => {}) as any,
      (message: Message) => {
        console.log('onSignal1', message);
        return messenger1.receiveMessage(message);
      });

    const messenger2 = new ReliableMessenger(
      (message: Message) => api2.signal(message as SignalApi.SignalMessage),
      (() => {}) as any,
      async (message: Message) => new Promise<Answer>(
        (resolve, reject) => resolve({ accept: true })
      )
    );
    api2 = new SignalClient(
      signalApiUrl1,
      (async () => {}) as any,
      (message: Message) => {
        console.log('onSignal2', message);
        return messenger2.receiveMessage(message);
      });

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);

    const sessionId = PublicKey.random();
    const msg: Message = {
      id: peer1,
      remoteId: peer2,
      sessionId: sessionId,
      topic,
      data: { offer: { } }
    };
    const answer = await messenger1.offer(msg);
    const expectedAns = { accept: true };
    expect(answer).toEqual(expectedAns);
  });
});
