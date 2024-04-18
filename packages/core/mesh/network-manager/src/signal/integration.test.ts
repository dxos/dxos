//
// Copyright 2022 DXOS.org
//

// @dxos/test platform=nodejs

import { expect } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/keys';
import { Messenger, WebsocketSignalManager } from '@dxos/messaging';
import { runTestSignalServer, type SignalServerRunner } from '@dxos/signal';
import { afterAll, onTestFinished, beforeAll, describe, test } from 'vitest'

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

  const setupPeer = async ({ peerId, topic = PublicKey.random() }: { peerId: PublicKey; topic?: PublicKey }) => {
    const signalManager = new WebsocketSignalManager([{ server: broker.url() }]);
    await signalManager.open();
    onTestFinished(() => signalManager.close());

    const messenger = new Messenger({
      signalManager,
    });
    messenger.open();
    onTestFinished(() => messenger.close());
    await messenger.listen({
      peerId,
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
      signalManager,
      messenger,
      receivedSignals,
      messageRouter,
    };
  };

  test('two peers connecting', async () => {
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();
    const topic = PublicKey.random();

    const peerNetworking1 = await setupPeer({ peerId: peer1, topic });
    const peerNetworking2 = await setupPeer({ peerId: peer2, topic });
    const promise1 = peerNetworking1.signalManager.swarmEvent.waitFor(
      ({ swarmEvent }) => !!swarmEvent.peerAvailable && peer2.equals(swarmEvent.peerAvailable.peer),
    );
    const promise2 = peerNetworking1.signalManager.swarmEvent.waitFor(
      ({ swarmEvent }) => !!swarmEvent.peerAvailable && peer1.equals(swarmEvent.peerAvailable.peer),
    );

    await peerNetworking1.signalManager.join({ topic, peerId: peer1 });
    await peerNetworking2.signalManager.join({ topic, peerId: peer2 });

    await promise1;
    await promise2;

    expect(
      await peerNetworking1.messageRouter.offer({
        topic,
        author: peer1,
        recipient: peer2,
        sessionId: PublicKey.random(),
        data: {
          offer: {},
        },
      }),
    ).toBeAnObjectWith({ accept: true });

    expect(
      await peerNetworking2.messageRouter.offer({
        topic,
        author: peer2,
        recipient: peer1,
        sessionId: PublicKey.random(),
        data: {
          offer: {},
        },
      }),
    ).toBeAnObjectWith({ accept: true });

    {
      const message: SignalMessage = {
        topic,
        author: peer1,
        recipient: peer2,
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
        author: peer2,
        recipient: peer1,
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
