//
// Copyright 2022 DXOS.org
//

import { afterAll, beforeAll, describe, onTestFinished, test } from 'vitest';

import { asyncTimeout } from '@dxos/async';
import { type SignalServerRunner, runTestSignalServer } from '@dxos/signal';

import { messengerTests } from './messenger.blueprint-test';
import { WebsocketSignalManager } from './signal-manager';
import { type Message } from './signal-methods';
import { PAYLOAD_1, TestBuilder } from './testing';

describe('Messenger with WebsocketSignalManager', () => {
  let broker: SignalServerRunner;

  beforeAll(async () => {
    broker = await runTestSignalServer();
  });

  afterAll(() => {
    void broker.stop();
  });

  messengerTests(async () => new WebsocketSignalManager([{ server: broker.url() }]));

  test('Message with broken signal server', { timeout: 1000 }, async () => {
    const builder = new TestBuilder({
      signalManagerFactory: async () =>
        new WebsocketSignalManager([{ server: 'ws://broken.kube.' }, { server: broker.url() }]),
    });
    onTestFinished(() => builder.close());
    const peer1 = await builder.createPeer();
    const peer2 = await builder.createPeer();

    const message: Message = {
      author: peer1.peerInfo,
      recipient: peer2.peerInfo,
      payload: PAYLOAD_1,
    };

    {
      const receivePromise = peer2.waitTillReceive(message);
      await peer1.messenger.sendMessage(message);
      await asyncTimeout(receivePromise, 1_000);
    }
  });
});
