//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { latch, sleep, Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { Protocol } from '@dxos/mesh-protocol';
import { afterTest } from '@dxos/testutils';

import { createPeer, TestBuilder, TestPeer } from '../testing';
import { TransportFactory } from '../transport';

/**
 * Join and cleanly leave swarm.
 */
const joinSwarm = async (topic: PublicKey, peers: TestPeer[]) => {
  const [connected, connect] = latch({ count: peers.length });
  peers.forEach((peer) => peer.plugin.once('connect', connect));
  await Promise.all(peers.map((peer) => peer.joinSwarm(topic)));
  await connected();
};

/**
 * Cleanly leave swarm.
 */
const leaveSwarm = async (topic: PublicKey, peers: TestPeer[]) => {
  const [disconnected, disconnect] = latch({ count: peers.length });
  peers.forEach((peer) => peer.plugin.once('disconnect', disconnect));
  await Promise.all(peers.map((peer) => peer.leaveSwarm(topic)));
  await disconnected();
};

/**
 * Exchange messages between peers.
 */
// TODO(burdon): Make based on plugin instance.
const exchangeMessages = async (peer1: TestPeer, peer2: TestPeer) => {
  const peer1Received = new Trigger<any>();
  const peer2Received = new Trigger<any>();
  peer1.plugin.on('receive', (peer, message) => peer1Received.wake(message));
  peer2.plugin.on('receive', (peer, message) => peer2Received.wake(message));

  {
    void peer1.plugin.send(peer2.peerId.asBuffer(), JSON.stringify({ message: 'ping' }));
    const { message } = JSON.parse(await peer2Received.wait()); // TODO(burdon): Encoding?
    expect(message).to.eq('ping');
  }

  {
    void peer2.plugin.send(peer1.peerId.asBuffer(), JSON.stringify({ message: 'pong' }));
    const { message } = JSON.parse(await peer1Received.wait());
    expect(message).to.eq('pong');
  }
};

export const testSuite = ({
  signalUrl, // TODO(burdon): Pass in builder instead.
  getTransportFactory
}: {
  signalUrl?: string;
  getTransportFactory: () => Promise<TransportFactory>;
}) => {
  it.only('joins, sends messages, and cleanly exits swarm', async () => {
    const testBuilder = new TestBuilder({ signalUrl });

    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await Promise.all([peer1.open(), peer2.open()]);
    afterTest(async () => {
      await Promise.all([peer1.close(), peer2.close()]);
    });

    const topic = PublicKey.random();
    await joinSwarm(topic, [peer1, peer2]);
    await exchangeMessages(peer1, peer2);
    await leaveSwarm(topic, [peer1, peer2]);

    // TODO(burdon): Doesn't exit cleanly:
    //  If add sleep here, then last logged message is "connecting" in test plugin.
    //  Messages still being sent?
    await sleep(1000);
  });

  it('joins, sends messages, and cleanly exits swarm multiple times', async () => {
    const testBuilder = new TestBuilder({ signalUrl });

    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await Promise.all([peer1.open(), peer2.open()]);
    afterTest(async () => {
      await Promise.all([peer1.close(), peer2.close()]);
    });

    const topic = PublicKey.random();

    {
      await joinSwarm(topic, [peer1, peer2]);
      await exchangeMessages(peer1, peer2);
      await leaveSwarm(topic, [peer1, peer2]);
    }

    // TODO(burdon): Doesn't exit cleanly:
    //  Error: Can only pipe to one destination (memory-transport).
    //  Is this due to re-using the plugin instance?
    {
      // await joinSwarm(topic, [peer1, peer2]);
      // await exchangeMessages(peer1, peer2);
      // await leaveSwarm(topic, [peer1, peer2]);
    }
  });

  //
  // TODO(burdon): Reimplement.
  //

  it.skip('join multiple swarms', async () => {
    const testBuilder = new TestBuilder({ signalUrl });

    // TODO(burdon): N peers.
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await Promise.all([peer1.open(), peer2.open()]);
    afterTest(async () => {
      await Promise.all([peer1.close(), peer2.close()]);
    });

    // TODO(burdon): Plugin instance for each swarm?
    const numSwarms = 5;
    const topics = Array.from(Array(numSwarms)).map(() => PublicKey.random());
    expect(topics).to.have.length(numSwarms);
  });

  const inMemory = true;

  it('two swarms at the same time', async () => {
    const topicA = PublicKey.random();
    const topicB = PublicKey.random();
    const peerA1Id = PublicKey.random();
    const peerA2Id = PublicKey.random();
    const peerB1Id = PublicKey.random();
    const peerB2Id = PublicKey.random();

    const { plugin: pluginA1 } = await createPeer({
      topic: topicA,
      peerId: peerA1Id,
      transportFactory: await getTransportFactory()
    });
    const { plugin: pluginA2 } = await createPeer({
      topic: topicA,
      peerId: peerA2Id,
      transportFactory: await getTransportFactory()
    });
    const { plugin: pluginB1 } = await createPeer({
      topic: topicB,
      peerId: peerB1Id,
      transportFactory: await getTransportFactory()
    });
    const { plugin: pluginB2 } = await createPeer({
      topic: topicB,
      peerId: peerB2Id,
      transportFactory: await getTransportFactory()
    });

    const receivedA: any[] = [];
    const mockReceiveA = (p: Protocol, s: string) => {
      receivedA.push(p, s);
      return undefined;
    };
    pluginA1.on('receive', mockReceiveA);

    const receivedB: any[] = [];
    const mockReceiveB = (p: Protocol, s: string) => {
      receivedB.push(p, s);
      return undefined;
    };
    pluginB1.on('receive', mockReceiveB);

    pluginA2.on('connect', async () => {
      await pluginA2.send(peerA1Id.asBuffer(), 'Test A');
    });
    pluginB2.on('connect', async () => {
      await pluginB2.send(peerB1Id.asBuffer(), 'Test B');
    });

    await waitForExpect(() => {
      expect(receivedA.length).to.eq(2);
      expect(receivedA[0]).to.be.instanceof(Protocol);
      expect(receivedA[1]).to.eq('Test A');
      expect(receivedB.length).to.eq(2);
      expect(receivedB[0]).to.be.instanceof(Protocol);
      expect(receivedB[1]).to.eq('Test B');
    });
  });
};
