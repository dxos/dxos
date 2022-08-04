import { sleep } from "@dxos/async";
import { PublicKey } from "@dxos/protocols";
import { createTestBroker, TestBroker } from "@dxos/signal";
import { assert } from "console";
import { expect, mockFn } from "earljs";
import waitForExpect from "wait-for-expect";
import { SwarmEvent } from "../proto/gen/dxos/mesh/signal";
import { SignalMessage } from "../proto/gen/dxos/mesh/signalMessage";
import { Swarm } from "../swarm";
import { MessageRouter } from "./message-router";
import { SignalApi } from "./signal-api";
import { WebsocketSignalManager } from "./websocket-signal-manager";


describe('Signal Integration Test', () => {
  let broker: TestBroker;

  before(() => {
    broker = createTestBroker();
  });
  
  const setup = () => {
    const signalManager = new WebsocketSignalManager([broker.url()]);
    signalManager.onSignal.on(msg => messageRouter.receiveMessage(msg));

    const signalMock = mockFn<(msg: SignalMessage) => Promise<void>>().resolvesTo();
    const messageRouter = new MessageRouter({
      sendMessage: msg => signalManager.signal(msg),
      onSignal: signalMock,
      onOffer: async () => ({ accept: true })
    })

    return {
      signalManager,
      signalMock,
      messageRouter
    }
  }

  it('two peers connecting', async () => {
    const peerNetworking1 = setup();
    const peerNetworking2 = setup();
    
    const peer1 = PublicKey.random();
    const peer2 = PublicKey.random();
    const topic = PublicKey.random();

    const promise1 = peerNetworking1.signalManager.swarmEvent.waitFor(([, swarmEvent]) => !!swarmEvent.peerAvailable && peer2.equals(swarmEvent.peerAvailable.peer));
    const promise2 = peerNetworking1.signalManager.swarmEvent.waitFor(([, swarmEvent]) => !!swarmEvent.peerAvailable && peer1.equals(swarmEvent.peerAvailable.peer));

    peerNetworking1.signalManager.join(topic, peer1);
    peerNetworking2.signalManager.join(topic, peer2);

    await promise1;
    await promise2;

    expect(await peerNetworking1.messageRouter.offer({
      topic,
      id: peer1,
      remoteId: peer2,
      sessionId: PublicKey.random(),
      data: {
        offer: {}
      },
    })).toBeAnObjectWith({ accept: true });

    expect(await peerNetworking2.messageRouter.offer({
      topic,
      id: peer2,
      remoteId: peer1,
      sessionId: PublicKey.random(),
      data: {
        offer: {}
      },
    })).toBeAnObjectWith({ accept: true });

    {
      const message: SignalMessage = {
        topic,
        id: peer1,
        remoteId: peer2,
        sessionId: PublicKey.random(),
        data: {
          signal: {json: '{"foo": "bar"}'}
        }
      }
      await peerNetworking1.messageRouter.signal(message);

      await waitForExpect(() => {
        expect(peerNetworking2.signalMock).toHaveBeenCalledWith([message]);
      });
    }

    {  
      const message: SignalMessage = {
        topic,
        id: peer2,
        remoteId: peer1,
        sessionId: PublicKey.random(),
        data: {
          signal: {json: '{"foo": "bar"}'}
        }
      }
      await peerNetworking2.messageRouter.signal(message);

      await waitForExpect(() => {
        expect(peerNetworking1.signalMock).toHaveBeenCalledWith([message]);
      });
    }
  });
});