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
  const swarms = peers.map((peer) => peer.createSwarm(topic));
  await Promise.all(swarms.map((swarm) => swarm.join(topology?.())));
  await Promise.all(swarms.map((swarm) => swarm.protocol.connected.waitForCondition(() => swarm.protocol.connections.size >= 0)));
  return swarms;
};

/**
 * Cleanly leave swarm.
 */
export const leaveSwarm = async (peers: TestPeer[], topic: PublicKey) => {
  const swarms = peers.map((peer) => peer.getSwarm(topic));
  await Promise.all(swarms.map((swarm) => swarm.leave()));
  await Promise.all(swarms.map((swarm) => swarm.protocol.connected.waitForCondition(() => swarm.protocol.connections.size == 0)));
  return swarms;
};

/**
 * Exchange messages between peers.
 */
// TODO(burdon): Based on plugin instance.
// TODO(burdon): Configure to send more messages.
export const exchangeMessages = async (swarm1: TestSwarmConnection, swarm2: TestSwarmConnection) => {
  await swarm1.protocol.testConnection(swarm2.peer.peerId);
  await swarm2.protocol.testConnection(swarm1.peer.peerId);
};
