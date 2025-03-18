//
// Copyright 2021 DXOS.org
//

import { onTestFinished, expect, test } from 'vitest';

import { asyncTimeout } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { range } from '@dxos/util';

import { exchangeMessages, joinSwarm, leaveSwarm, openAndCloseAfterTest } from './utils';
import { type TestBuilder } from '../testing';
import { FullyConnectedTopology, StarTopology } from '../topology';

// TODO(burdon): Use PublicKey throughout (remove conversion to strings, from buffers, etc.)

/**
 * Basic swarm tests.
 */
export const basicTestSuite = (testBuilder: TestBuilder, runTests = true) => {
  if (!runTests) {
    return;
  }

  test('joins swarm, sends messages, and cleanly exits', async () => {
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    const swarmKey = PublicKey.random().toHex();
    const [swarm1, swarm2] = await joinSwarm([peer1, peer2], swarmKey, () => new FullyConnectedTopology());
    await exchangeMessages(swarm1, swarm2);
    await leaveSwarm([peer1, peer2], swarmKey);
  });

  // TODO(burdon): Test with more peers (configure and test messaging).
  test('joins swarm with star topology', async () => {
    const peer1 = testBuilder.createPeer();
    onTestFinished(() => peer1.close());
    const peer2 = testBuilder.createPeer();
    onTestFinished(() => peer2.close());
    await openAndCloseAfterTest([peer1, peer2]);

    const swarmKey = PublicKey.random().toHex();
    const [swarm1, swarm2] = await joinSwarm([peer1, peer2], swarmKey, () => new StarTopology(peer1.peerId)); // NOTE: Same peer.
    await exchangeMessages(swarm1, swarm2);
    await leaveSwarm([peer1, peer2], swarmKey);
  });

  // TODO(burdon): Fails when trying to reconnect to same topic.
  test('joins swarm multiple times', async () => {
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    const swarmKey1 = PublicKey.random().toHex();

    {
      const [swarm1, swarm2] = await joinSwarm([peer1, peer2], swarmKey1);
      await exchangeMessages(swarm1, swarm2);
      await leaveSwarm([peer1, peer2], swarmKey1);
    }

    // TODO(burdon): Add log marker like this to logging lib. Auto add between tests?
    // TODO(burdon): Enable new Error to take second context obj: new Error('msg', {}).
    log('————————————————————————————————————————');

    const swarmKey2 = PublicKey.random().toHex();

    {
      const [swarm1, swarm2] = await joinSwarm([peer1, peer2], swarmKey2);
      await exchangeMessages(swarm1, swarm2);
      await leaveSwarm([peer1, peer2], swarmKey2);
    }
  });

  test('joins multiple swarms', async () => {
    // TODO(burdon): N peers.
    // TODO(burdon): Merge with test below.
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    const numSwarms = 5;
    const topics = Array.from(Array(numSwarms)).map(() => PublicKey.random());
    expect(topics).to.have.length(numSwarms);
  });

  test('joins multiple swarms concurrently', async () => {
    const createSwarm = async () => {
      const swarmKey = PublicKey.random().toHex();
      const peer1a = testBuilder.createPeer();
      const peer2a = testBuilder.createPeer();
      await openAndCloseAfterTest([peer1a, peer2a]);

      const swarm1a = await peer1a.createSwarm(swarmKey).join();
      const swarm2a = await peer2a.createSwarm(swarmKey).join();

      return { swarm1a, swarm2a, peer1a, peer2a };
    };

    const test1 = await createSwarm();
    const test2 = await createSwarm();

    await Promise.all([
      test1.swarm1a.protocol.testConnection(test1.peer2a.peerId),
      test2.swarm1a.protocol.testConnection(test2.peer2a.peerId),
    ]);
  });

  test('peers reconnect after and error in connection', async () => {
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    const swarmKey = PublicKey.random().toHex();
    const [swarm1, swarm2] = await joinSwarm([peer1, peer2], swarmKey, () => new FullyConnectedTopology());
    await exchangeMessages(swarm1, swarm2);

    const disconnectedKeys = new Set();
    swarm1.protocol.disconnected.on((peerInfo) => {
      disconnectedKeys.add(peerInfo);
    });
    swarm2.protocol.disconnected.on((peerInfo) => {
      disconnectedKeys.add(peerInfo);
    });

    void swarm1.protocol.connections.get(swarm2.peer.peerId)!.closeConnection(new Error('test error'));
    // Wait until both peers are disconnected.
    await expect.poll(() => disconnectedKeys.size).toEqual(2);

    await exchangeMessages(swarm1, swarm2);

    await leaveSwarm([peer1, peer2], swarmKey);
  });

  test('going offline and back online', { timeout: 2_000 }, async () => {
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    const swarmKey = PublicKey.random().toHex();
    const [swarm1, swarm2] = await joinSwarm([peer1, peer2], swarmKey);
    await exchangeMessages(swarm1, swarm2);

    //
    // Going offline and back online
    //
    const connectionDropped = peer2._networkManager
      .getSwarm(swarmKey)
      ?.disconnected.waitFor(({ peerKey }) => peer1.peerId === peerKey);

    const peerLeft = peer2._signalManager.swarmState.waitFor(
      ({ peers }) => !peers?.some(({ peerKey }) => peer1.peerId === peerKey),
    );

    await peer1.goOffline();
    await connectionDropped;
    await peerLeft;

    // Wait for peer to be removed from the swarm.
    await expect
      .poll(() => !!peer2._networkManager.getSwarm(swarmKey)!._peers.get({ peerKey: peer1.peerId })?.advertizing, {
        timeout: 1_000,
      })
      .toBe(false);

    await peer1.goOnline();

    await expect
      .poll(() => peer1._networkManager.getSwarm(swarmKey)!._peers.get({ peerKey: peer2.peerId })?.advertizing, {
        timeout: 2_000,
      })
      .toBe(true);
    await expect
      .poll(() => peer2._networkManager.getSwarm(swarmKey)!._peers.get({ peerKey: peer1.peerId })?.advertizing, {
        timeout: 2_000,
      })
      .toBe(true);

    await exchangeMessages(swarm1, swarm2);
    await leaveSwarm([peer1, peer2], swarmKey);
  });

  // TODO(mykola): Fails with large amount of peers ~10.
  test('many peers and connections', async () => {
    const numTopics = 2;
    const peersPerTopic = 3;
    const swarmsAllPeersConnected: Promise<any>[] = [];

    await asyncTimeout(
      Promise.all(
        range(numTopics).map(async () => {
          const swarmKey = PublicKey.random().toHex();

          return Promise.all(
            range(peersPerTopic).map(async () => {
              const peer = testBuilder.createPeer();
              await openAndCloseAfterTest([peer]);
              const swarm = peer.createSwarm(swarmKey);

              swarmsAllPeersConnected.push(
                swarm.protocol.connected.waitFor(() => swarm.protocol.connections.size === peersPerTopic - 1),
              );
              await swarm.join();
            }),
          );
        }),
      ),
      2_000,
    );

    await asyncTimeout(Promise.all(swarmsAllPeersConnected), 2_000);
  });
};
