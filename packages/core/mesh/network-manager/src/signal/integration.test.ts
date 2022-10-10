//
// Copyright 2022 DXOS.org
//

// @dxos/mocha platform=nodejs

import { expect } from 'earljs';
import { default as waitForExpect } from 'wait-for-expect';

import { PublicKey } from '@dxos/keys';
import { WebsocketSignalManager } from '@dxos/messaging';
import { createTestBroker, TestBroker } from '@dxos/signal';

import { MessageRouter } from './message-router.js';
import { SignalMessage } from './signal-messaging.js';

describe('Signal Integration Test', function () {
  let broker: TestBroker;

  before(async function () {
    broker = await createTestBroker();
  });

  after(function () {
    broker.stop();
  });

  const setupPeer = ({ topic = PublicKey.random() }: { topic?: PublicKey } = {}) => {
    const signalManager = new WebsocketSignalManager([broker.url()]);
    signalManager.onMessage.on((message) =>
      messageRouter.receiveMessage(message)
    );

    const receivedSignals: SignalMessage[] = [];
    const signalMock = async (msg: SignalMessage) => {
      receivedSignals.push(msg);
    };
    const messageRouter = new MessageRouter({
      sendMessage: signalManager.sendMessage.bind(signalManager),
      onSignal: signalMock,
      onOffer: async () => ({ accept: true }),
      topic
    });

    return {
      signalManager,
      receivedSignals,
      messageRouter
    };
  };

  it('two peers connecting', async function () {
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();
    const topic = PublicKey.random();

    const peerNetworking1 = setupPeer({ topic });
    const peerNetworking2 = setupPeer({ topic });

    const promise1 = peerNetworking1.signalManager.swarmEvent.waitFor(
      ({ swarmEvent }) =>
        !!swarmEvent.peerAvailable &&
        peer2.equals(swarmEvent.peerAvailable.peer)
    );
    const promise2 = peerNetworking1.signalManager.swarmEvent.waitFor(
      ({ swarmEvent }) =>
        !!swarmEvent.peerAvailable &&
        peer1.equals(swarmEvent.peerAvailable.peer)
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
          offer: {}
        }
      })
    ).toBeAnObjectWith({ accept: true });

    expect(
      await peerNetworking2.messageRouter.offer({
        topic,
        author: peer2,
        recipient: peer1,
        sessionId: PublicKey.random(),
        data: {
          offer: {}
        }
      })
    ).toBeAnObjectWith({ accept: true });

    {
      const message: SignalMessage = {
        topic,
        author: peer1,
        recipient: peer2,
        sessionId: PublicKey.random(),
        data: {
          signal: { json: JSON.stringify({ foo: 'bar' }) }
        }
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
          signal: { json: JSON.stringify({ foo: 'bar' }) }
        }
      };
      await peerNetworking2.messageRouter.signal(message);

      await waitForExpect(() => {
        expect(peerNetworking1.receivedSignals[0]).toBeAnObjectWith(message);
      });
    }
  });
});
