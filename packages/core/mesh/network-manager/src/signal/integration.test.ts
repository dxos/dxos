//
// Copyright 2022 DXOS.org
//

import { expect } from 'earljs';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/keys';
import { WebsocketSignalManager } from '@dxos/messaging';
import { createTestBroker, TestBroker } from '@dxos/signal';

import { MessageRouter } from './message-router';
import { SignalMessage } from './signal-messaging';

describe('Signal Integration Test', () => {
  let broker: TestBroker;

  before(async () => {
    broker = await createTestBroker();
  });

  after(() => {
    broker.stop();
  });

  const setup = () => {
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
      onOffer: async () => ({ accept: true })
    });

    return {
      signalManager,
      receivedSignals,
      messageRouter
    };
  };

  it('two peers connecting', async () => {
    const peerNetworking1 = setup();
    const peerNetworking2 = setup();

    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();
    const topic = PublicKey.random();

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
