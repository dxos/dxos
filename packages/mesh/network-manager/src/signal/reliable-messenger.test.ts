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
import { afterTest } from '@dxos/testutils';

describe('SignalMessenger', () => {
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

  const createSignalClientAndReliableMessenger = async (
    signalApiUrl: string, 
    onSignal: (msg: Message) => Promise<void> = (async () => {}) as any,
    onOffer: (msg: Message) => Promise<Answer> = async () => ({ accept: true })
  ) => {
    let api: SignalClient;
    const messenger: ReliableMessenger = new ReliableMessenger(
      //todo(mykola): added catch to avoid not finished request.
      (msg: Message) => api.signal(msg as SignalApi.SignalMessage).catch((_) => {}), 
      onSignal, 
      onOffer
    );
    api = new SignalClient(
      signalApiUrl, 
      (async () => {}) as any, 
      async (msg: Message) => {messenger.receiveMessage(msg);}
    );
    afterTest (() => api.close());
    return {
      api,
      messenger,
    }
  };

  test.only('signaling between 2 clients', async () => {
    const signalMock1 = mockFn<(msg: Message) => Promise<void>>().resolvesTo();
    const { api: api1 } = await createSignalClientAndReliableMessenger(signalApiUrl1, signalMock1);
    const { api: api2, messenger: messenger2 } = await createSignalClientAndReliableMessenger(signalApiUrl1);

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

  test.only('offer/answer', async () => {
    const {api: api1, messenger: messenger1} = await createSignalClientAndReliableMessenger(
      signalApiUrl1, 
      (async () => {}) as any, 
      async () => ({ accept: true })
    );
    const {api: api2} = await createSignalClientAndReliableMessenger(
      signalApiUrl1, 
      (async () => {}) as any, 
      async () => ({ accept: true })
    );

    await api1.join(topic, peer1);
    await api2.join(topic, peer2);

    const answer = await messenger1.offer({
      id: peer1,
      remoteId: peer2,
      sessionId: PublicKey.random(),
      topic,
      data: { offer: { } }
    });
    expect(answer).toEqual({ accept: true });
  });
});
