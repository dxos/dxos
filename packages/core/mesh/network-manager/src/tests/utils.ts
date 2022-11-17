//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { latch, Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { afterTest } from '@dxos/testutils';
import { Provider } from '@dxos/util';

import { TestPeer } from '../testing';
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
export const joinSwarm = async (topic: PublicKey, peers: TestPeer[], topology?: Provider<Topology>) => {
  const [connected, connect] = latch({ count: peers.length });
  peers.forEach((peer) => peer.plugin.once('connect', connect));
  await Promise.all(peers.map((peer) => peer.joinSwarm(topic, topology?.())));
  await connected();
};

/**
 * Cleanly leave swarm.
 */
export const leaveSwarm = async (topic: PublicKey, peers: TestPeer[]) => {
  const [disconnected, disconnect] = latch({ count: peers.length });
  peers.forEach((peer) => peer.plugin.once('disconnect', disconnect));
  await Promise.all(peers.map((peer) => peer.leaveSwarm(topic)));
  await disconnected();
};

/**
 * Exchange messages between peers.
 */
// TODO(burdon): Based on plugin instance.
// TODO(burdon): Configure to send more messages.
export const exchangeMessages = async (peer1: TestPeer, peer2: TestPeer) => {
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
