//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { asyncTimeout } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { onTestFinished, test } from 'vitest';
import { tagEnabled } from '@dxos/test/testutils';
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

  test.runIf(tagEnabled('flaky'))('joins swarm, sends messages, and cleanly exits', async () => {
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    const topic = PublicKey.random();
    const [swarm1, swarm2] = await joinSwarm([peer1, peer2], topic, () => new FullyConnectedTopology());
    await exchangeMessages(swarm1, swarm2);
    await leaveSwarm([peer1, peer2], topic);
  });

  // TODO(burdon): Test with more peers (configure and test messaging).
  test.runIf(tagEnabled('flaky'))('joins swarm with star topology', async () => {
    const peer1 = testBuilder.createPeer();
    onTestFinished(() => peer1.close());
    const peer2 = testBuilder.createPeer();
    onTestFinished(() => peer2.close());
    await openAndCloseAfterTest([peer1, peer2]);

    const topic = PublicKey.random();
    const [swarm1, swarm2] = await joinSwarm([peer1, peer2], topic, () => new StarTopology(peer1.peerId)); // NOTE: Same peer.
    await exchangeMessages(swarm1, swarm2);
    await leaveSwarm([peer1, peer2], topic);
  });

  // TODO(burdon): Fails when trying to reconnect to same topic.
  test.runIf(tagEnabled('flaky'))('joins swarm multiple times', async () => {
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    const topic1 = PublicKey.random();

    {
      const [swarm1, swarm2] = await joinSwarm([peer1, peer2], topic1);
      await exchangeMessages(swarm1, swarm2);
      await leaveSwarm([peer1, peer2], topic1);
    }

    // TODO(burdon): Add log marker like this to logging lib. Auto add between tests?
    // TODO(burdon): Enable new Error to take second context obj: new Error('msg', {}).
    log('————————————————————————————————————————');

    const topic2 = PublicKey.random();

    {
      const [swarm1, swarm2] = await joinSwarm([peer1, peer2], topic2);
      await exchangeMessages(swarm1, swarm2);
      await leaveSwarm([peer1, peer2], topic2);
    }
  });

  test.runIf(tagEnabled('flaky'))('joins multiple swarms', async () => {
    // TODO(burdon): N peers.
    // TODO(burdon): Merge with test below.
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    const numSwarms = 5;
    const topics = Array.from(Array(numSwarms)).map(() => PublicKey.random());
    expect(topics).to.have.length(numSwarms);
  });

  test.runIf(tagEnabled('flaky'))('joins multiple swarms concurrently', async () => {
    const createSwarm = async () => {
      const topicA = PublicKey.random();
      const peer1a = testBuilder.createPeer();
      const peer2a = testBuilder.createPeer();
      await openAndCloseAfterTest([peer1a, peer2a]);

      const swarm1a = await peer1a.createSwarm(topicA).join();
      const swarm2a = await peer2a.createSwarm(topicA).join();

      return { swarm1a, swarm2a, peer1a, peer2a };
    };

    const test1 = await createSwarm();
    const test2 = await createSwarm();

    await Promise.all([
      test1.swarm1a.protocol.testConnection(test1.peer2a.peerId),
      test2.swarm1a.protocol.testConnection(test2.peer2a.peerId),
    ]);
  });

  test.runIf(tagEnabled('flaky'))('peers reconnect after and error in connection', async () => {
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    const topic = PublicKey.random();
    const [swarm1, swarm2] = await joinSwarm([peer1, peer2], topic, () => new FullyConnectedTopology());
    await exchangeMessages(swarm1, swarm2);

    void swarm1.protocol.connections.get(swarm2.peer.peerId)!.closeConnection(new Error('test error'));

    // Wait until both peers are disconnected.
    await Promise.all([
      swarm1.protocol.disconnected.waitForCondition(() => swarm1.protocol.connections.size === 0),
      swarm2.protocol.disconnected.waitForCondition(() => swarm2.protocol.connections.size === 0),
    ]);

    await exchangeMessages(swarm1, swarm2);

    await leaveSwarm([peer1, peer2], topic);
  });

  test.runIf(tagEnabled('flaky'))(
    'going offline and back online',
    async () => {
      const peer1 = testBuilder.createPeer();
      const peer2 = testBuilder.createPeer();
      await openAndCloseAfterTest([peer1, peer2]);

      const topic = PublicKey.random();
      const [swarm1, swarm2] = await joinSwarm([peer1, peer2], topic);
      await exchangeMessages(swarm1, swarm2);

      //
      // Going offline and back online
      //
      const connectionDropped = peer2._networkManager
        .getSwarm(topic)
        ?.disconnected.waitFor((peerId) => peerId.equals(peer1.peerId));

      const peerLeft = peer2._signalManager.swarmEvent.waitFor(
        (event) => !!event.swarmEvent.peerLeft && peer1.peerId.equals(event.swarmEvent.peerLeft?.peer),
      );

      await peer1.goOffline();
      await connectionDropped;
      await peerLeft;

      // Wait for peer to be removed from the swarm.
      await waitForExpect(() => {
        expect(!!peer2._networkManager.getSwarm(topic)!._peers.get(peer1.peerId)?.advertizing).to.be.false;
      }, 1_000);

      await peer1.goOnline();

      await waitForExpect(() => {
        expect(peer1._networkManager.getSwarm(topic)?._peers.get(peer2.peerId)?.advertizing).to.be.true;
        expect(peer2._networkManager.getSwarm(topic)?._peers.get(peer1.peerId)?.advertizing).to.be.true;
      }, 2_000);

      await exchangeMessages(swarm1, swarm2);
      await leaveSwarm([peer1, peer2], topic);
    },
    { timeout: 2_000 },
  );

  // TODO(mykola): Fails with large amount of peers ~10.
  test.runIf(tagEnabled('stress'))('many peers and connections', async () => {
    const numTopics = 2;
    const peersPerTopic = 3;
    const swarmsAllPeersConnected: Promise<any>[] = [];

    await asyncTimeout(
      Promise.all(
        range(numTopics).map(async () => {
          const topic = PublicKey.random();

          return Promise.all(
            range(peersPerTopic).map(async () => {
              const peer = testBuilder.createPeer();
              await openAndCloseAfterTest([peer]);
              const swarm = peer.createSwarm(topic);

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
