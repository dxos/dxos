//
// Copyright 2022 DXOS.org
//

// @dxos/test platform=nodejs

import { expect } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Messenger, type PeerInfo, WebsocketSignalManager } from '@dxos/messaging';
import { runTestSignalServer, type SignalServerRunner } from '@dxos/signal';
import { afterAll, afterTest, beforeAll, describe, test } from '@dxos/test';

import { type SignalMessage } from './signal-messenger';
import { SwarmMessenger } from './swarm-messenger';

describe('Signal Integration Test', () => {
  let broker: SignalServerRunner;

  beforeAll(async () => {
    broker = await runTestSignalServer();
  });

  afterAll(() => {
    void broker.stop();
  });

  const setupPeer = async ({
    peer = { peerKey: PublicKey.random().toHex() },
    topic = PublicKey.random(),
  }: {
    peer?: PeerInfo;
    topic?: PublicKey;
  }) => {
    const signalManager = new WebsocketSignalManager([{ server: broker.url() }]);
    await signalManager.open();
    afterTest(() => signalManager.close());

    const messenger = new Messenger({
      signalManager,
    });
    messenger.open();
    afterTest(() => messenger.close());
    await messenger.listen({
      peer,
      onMessage: async (message) => await messageRouter.receiveMessage(message),
    });

    const receivedSignals: SignalMessage[] = [];
    const signalMock = async (msg: SignalMessage) => {
      receivedSignals.push(msg);
    };
    const messageRouter = new SwarmMessenger({
      sendMessage: messenger.sendMessage.bind(messenger),
      onSignal: signalMock,
      onOffer: async () => ({ accept: true }),
      topic,
    });

    return {
      peer,
      topic,
      signalManager,
      messenger,
      receivedSignals,
      messageRouter,
    };
  };

  test('two peers connecting', async () => {
    const topic = PublicKey.random();

    const peerNetworking1 = await setupPeer({ topic });
    const peerNetworking2 = await setupPeer({ topic });
    const promise1 = peerNetworking1.signalManager.swarmEvent.waitFor(
      ({ peerAvailable }) => !!peerAvailable && peerNetworking2.peer.peerKey === peerAvailable.peer.peerKey,
    );
    const promise2 = peerNetworking1.signalManager.swarmEvent.waitFor(
      ({ peerAvailable }) => !!peerAvailable && peerNetworking1.peer.peerKey === peerAvailable.peer.peerKey,
    );

    await peerNetworking1.signalManager.join({ topic, peer: peerNetworking1.peer });
    await peerNetworking2.signalManager.join({ topic, peer: peerNetworking2.peer });

    await promise1;
    await promise2;

    expect(
      await peerNetworking1.messageRouter.offer({
        topic,
        author: peerNetworking1.peer,
        recipient: peerNetworking2.peer,
        sessionId: PublicKey.random(),
        data: {
          offer: {},
        },
      }),
    ).toBeAnObjectWith({ accept: true });

    expect(
      await peerNetworking2.messageRouter.offer({
        topic,
        author: peerNetworking2.peer,
        recipient: peerNetworking1.peer,
        sessionId: PublicKey.random(),
        data: {
          offer: {},
        },
      }),
    ).toBeAnObjectWith({ accept: true });

    {
      const message: SignalMessage = {
        topic,
        author: peerNetworking1.peer,
        recipient: peerNetworking2.peer,
        sessionId: PublicKey.random(),
        data: {
          signal: { payload: { message: 'Hello world!' } },
          signalBatch: undefined,
        },
      };
      await peerNetworking1.messageRouter.signal(message);

      await waitForExpect(() => {
        expect(peerNetworking2.receivedSignals[0]).toBeAnObjectWith(message);
      });
    }

    {
      const message: SignalMessage = {
        topic,
        author: peerNetworking2.peer,
        recipient: peerNetworking1.peer,
        sessionId: PublicKey.random(),
        data: {
          signal: { payload: { foo: 'bar' } },
          signalBatch: undefined,
        },
      };
      await peerNetworking2.messageRouter.signal(message);

      await waitForExpect(() => {
        expect(peerNetworking1.receivedSignals[0]).toBeAnObjectWith(message);
      });
    }
  });
});
