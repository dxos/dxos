//
// Copyright 2022 DXOS.org
//

import { afterAll, beforeAll, describe, expect, onTestFinished, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { Messenger, type PeerInfo, WebsocketSignalManager } from '@dxos/messaging';
import { type SignalServerRunner, runTestSignalServer } from '@dxos/signal';

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
    onTestFinished(async () => {
      await signalManager.close();
    });

    const messenger = new Messenger({
      signalManager,
    });
    messenger.open();
    onTestFinished(() => messenger.close());
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
    ).toEqual(expect.objectContaining({ accept: true }));

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
    ).toEqual(expect.objectContaining({ accept: true }));

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

      await expect.poll(() => peerNetworking2.receivedSignals[0]).toEqual(expect.objectContaining(message));
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

      await expect.poll(() => peerNetworking1.receivedSignals[0]).toEqual(expect.objectContaining(message));
    }
  });
});
