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
 * Open peers and close after tests complete.
 */
const openAndCloseAfterTest = async (peers: TestPeer[]) => {
  await Promise.all(peers.map((peer) => peer.open()));
  afterTest(async () => {
    await Promise.all(peers.map((peer) => peer.close()));
  });
};

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
// TODO(burdon): Based on plugin instance.
const exchangeMessages = async (peer1: TestPeer, peer2: TestPeer) => {
  {
    const peer2Received = new Trigger<any>();
    peer2.plugin.on('receive', (peer, message) => peer2Received.wake(message));

    // TODO(burdon): Message encoding?
    await peer1.plugin.send(peer2.peerId.asBuffer(), JSON.stringify({ message: 'ping' }));
    const { message } = JSON.parse(await peer2Received.wait());
    expect(message).to.eq('ping');
  }

  {
    const peer1Received = new Trigger<any>();
    peer1.plugin.on('receive', (peer, message) => peer1Received.wake(message));

    await peer2.plugin.send(peer1.peerId.asBuffer(), JSON.stringify({ message: 'pong' }));
    const { message } = JSON.parse(await peer1Received.wait());
    expect(message).to.eq('pong');
  }
};

/**
 * Common test suite for different transport and plugin configurations.
 */
export const testSuite = ({
  testBuilder,
  getTransportFactory // TODO(burdon): Remove.
}: {
  testBuilder: TestBuilder;
  getTransportFactory: () => Promise<TransportFactory>;
}) => {
  it.only('joins, sends messages, and cleanly exits swarm', async () => {
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    const topic = PublicKey.random();
    await joinSwarm(topic, [peer1, peer2]);
    await exchangeMessages(peer1, peer2);
    await sleep(100); // NOTE: Works if add delay here.
    await leaveSwarm(topic, [peer1, peer2]);

    // TODO(burdon): Doesn't exit cleanly:
    //  If add sleep here, then last logged message is "connecting" in test plugin.
    //  Messages still being sent?
    await sleep(100);
  });

  it.only('joins, sends messages, and cleanly exits swarm multiple times', async () => {
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    const topic = PublicKey.random();

    {
      await joinSwarm(topic, [peer1, peer2]);
      await exchangeMessages(peer1, peer2);
      await leaveSwarm(topic, [peer1, peer2]);
    }

    // TODO(burdon): Doesn't exit cleanly:
    //  Error: Can only pipe to one destination (memory-transport).
    //  Due to re-using the plugin instance?
    {
      await joinSwarm(topic, [peer1, peer2]);
      // await exchangeMessages(peer1, peer2);
      // await leaveSwarm(topic, [peer1, peer2]);
    }
  });

  //
  // TODO(burdon): Reimplement tests below.
  //

  it.skip('joins multiple swarms', async () => {
    // TODO(burdon): N peers.
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    // TODO(burdon): Plugin instance required for each swarm?
    const numSwarms = 5;
    const topics = Array.from(Array(numSwarms)).map(() => PublicKey.random());
    expect(topics).to.have.length(numSwarms);
  });

  const inMemory = true;

  it('joins multiple swarms concurrently', async () => {
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
