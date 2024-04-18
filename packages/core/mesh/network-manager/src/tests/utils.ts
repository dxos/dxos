//
// Copyright 2022 DXOS.org
//

import { asyncTimeout } from '@dxos/async';
import { type PublicKey } from '@dxos/keys';
import { onTestFinished } from 'vitest'
import { type Provider } from '@dxos/util';

import { type TestPeer, type TestSwarmConnection } from '../testing';
import { type Topology } from '../topology';

//
// NOTE: Don't move to testing directory since not exportable outside of package.
//

/**
 * Open peers and close after tests complete.
 */
export const openAndCloseAfterTest = async (peers: TestPeer[]) => {
  await Promise.all(peers.map((peer) => peer.open()));
  onTestFinished(async () => {
    await asyncTimeout(Promise.all(peers.map((peer) => peer.close())), 1_000);
  });
};

/**
 * Join and cleanly leave swarm.
 */
export const joinSwarm = async (peers: TestPeer[], topic: PublicKey, topology?: Provider<Topology>) => {
  const swarms = peers.map((peer) => peer.createSwarm(topic));
  await Promise.all(swarms.map((swarm) => swarm.join(topology?.())));
  await Promise.all(
    swarms.map((swarm) => swarm.protocol.connected.waitForCondition(() => swarm.protocol.connections.size >= 0)),
  );
  return swarms;
};

/**
 * Cleanly leave swarm.
 */
export const leaveSwarm = async (peers: TestPeer[], topic: PublicKey) => {
  const swarms = peers.map((peer) => peer.getSwarm(topic));
  await Promise.all(swarms.map((swarm) => swarm.leave()));
  await Promise.all(
    swarms.map((swarm) => swarm.protocol.connected.waitForCondition(() => swarm.protocol.connections.size === 0)),
  );
  return swarms;
};

/**
 * Exchange messages between peers.
 */
// TODO(burdon): Based on plugin instance.
// TODO(burdon): Configure to send more messages.
export const exchangeMessages = async (swarm1: TestSwarmConnection, swarm2: TestSwarmConnection, message?: string) => {
  await swarm1.protocol.testConnection(swarm2.peer.peerId, message);
  await swarm2.protocol.testConnection(swarm1.peer.peerId, message);
};
