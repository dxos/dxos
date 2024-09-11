//
// Copyright 2022 DXOS.org
//

import { asyncTimeout } from '@dxos/async';
import { EdgeClient } from '@dxos/edge-client';
import { type PublicKey } from '@dxos/keys';
import { runTestSignalServer, type SignalServerRunner } from '@dxos/signal';
import { afterAll, afterTest, beforeAll, openAndClose, test, describe } from '@dxos/test';

import { messengerTests } from './messenger.blueprint-test';
import { EdgeSignalManager, WebsocketSignalManager } from './signal-manager';
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

  test('Message with broken signal server', async () => {
    const builder = new TestBuilder({
      signalManagerFactory: async () =>
        new WebsocketSignalManager([{ server: 'ws://broken.kube.' }, { server: broker.url() }]),
    });
    afterTest(() => builder.close());
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
  }).timeout(1_000);
});

// TODO(mykola): Expects wrangler dev in edge repo to run. Skip to pass CI.
describe.skip('Messenger with EdgeSignalManager', () => {
  const edgeSignalFactory = async (identityKey: PublicKey, deviceKey: PublicKey) => {
    const client = new EdgeClient(identityKey.toHex(), deviceKey.toHex(), { socketEndpoint: 'ws://localhost:8787' });
    await openAndClose(client);

    return new EdgeSignalManager({ edgeConnection: client });
  };

  messengerTests(edgeSignalFactory);
});
