//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { latch, Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { afterTest } from '@dxos/test';
import { Provider } from '@dxos/util';

import { TestPeer, TestSwarmConnection } from '../testing';
import { Topology } from '../topology';

//
// NOTE: Don't move to testing directory since not exportable outside of package.
//

/**
 * Open peers and close after tests complete.
 */
export const openAndCloseAfterTest = async (peers: TestPeer[]) => {
  await Promise.all(peers.map((peer) => peer.open()));
  afterTest(async () => {
    await Promise.all(peers.map((peer) => peer.close()));
  });
};

/**
 * Join and cleanly leave swarm.
 */
export const joinSwarm = async (peers: TestPeer[], topic: PublicKey, topology?: Provider<Topology>) => {
  const [connected, connect] = latch({ count: peers.length });
  const swarms = peers.map((peer) => {
    const swarm = peer.createSwarm(topic);
    swarm.plugin.once('connect', connect);
    return swarm;
  });

  await Promise.all(swarms.map((swarm) => swarm.join(topology?.())));
  await connected();
  return swarms;
};

/**
 * Cleanly leave swarm.
 */
export const leaveSwarm = async (peers: TestPeer[], topic: PublicKey) => {
  const [disconnected, disconnect] = latch({ count: peers.length });
  const swarms = peers.map((peer) => {
    const swarm = peer.getSwarm(topic);
    swarm.plugin.once('disconnect', disconnect);
    return swarm;
  });

  await Promise.all(swarms.map((swarm) => swarm.leave()));
  await disconnected();
  return swarms;
};

/**
 * Exchange messages between peers.
 */
// TODO(burdon): Based on plugin instance.
// TODO(burdon): Configure to send more messages.
export const exchangeMessages = async (swarm1: TestSwarmConnection, swarm2: TestSwarmConnection) => {
  {
    const peer2Received = new Trigger<any>();
    swarm2.plugin.on('receive', (peer, message) => peer2Received.wake(message));

    // TODO(burdon): Message encoding?
    await swarm1.plugin.send(swarm2.peer.peerId.asBuffer(), JSON.stringify({ message: 'ping' }));
    const { message } = JSON.parse(await peer2Received.wait());
    expect(message).to.eq('ping');
  }

  {
    const peer1Received = new Trigger<any>();
    swarm1.plugin.on('receive', (peer, message) => peer1Received.wake(message));

    await swarm2.plugin.send(swarm1.peer.peerId.asBuffer(), JSON.stringify({ message: 'pong' }));
    const { message } = JSON.parse(await peer1Received.wait());
    expect(message).to.eq('pong');
  }
};
