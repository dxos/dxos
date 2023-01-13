//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { afterTest, test } from '@dxos/test';
import { range } from '@dxos/util';

import { TestBuilder } from '../testing';
import { FullyConnectedTopology, StarTopology } from '../topology';
import { exchangeMessages, joinSwarm, leaveSwarm, openAndCloseAfterTest } from './utils';

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

    const topic = PublicKey.random();
    const [swarm1, swarm2] = await joinSwarm([peer1, peer2], topic, () => new FullyConnectedTopology());
    await exchangeMessages(swarm1, swarm2);
    await leaveSwarm([peer1, peer2], topic);
  });

  // TODO(burdon): Test with more peers (configure and test messaging).
  test('joins swarm with star topology', async () => {
    const peer1 = testBuilder.createPeer();
    afterTest(() => peer1.close());
    const peer2 = testBuilder.createPeer();
    afterTest(() => peer2.close());
    await openAndCloseAfterTest([peer1, peer2]);

    const topic = PublicKey.random();
    const [swarm1, swarm2] = await joinSwarm([peer1, peer2], topic, () => new StarTopology(peer1.peerId)); // NOTE: Same peer.
    await exchangeMessages(swarm1, swarm2);
    await leaveSwarm([peer1, peer2], topic);
  });

  // TODO(burdon): Fails when trying to reconnect to same topic.
  test('joins swarm multiple times', async () => {
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

  test.skip('joins multiple swarms', async () => {
    // TODO(burdon): N peers.
    // TODO(burdon): Merge with test below.
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    const numSwarms = 5;
    const topics = Array.from(Array(numSwarms)).map(() => PublicKey.random());
    expect(topics).to.have.length(numSwarms);
  });

  test.skip('joins multiple swarms concurrently', async () => {
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
      test2.swarm1a.protocol.testConnection(test1.peer2a.peerId)
    ]);
  });

  test('going offline and back online', async () => {
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

    await peer1.goOffline();
    await connectionDropped;
    await peer1.goOnline();

    await waitForExpect(() => {
      expect(peer1._networkManager.getSwarm(topic)?._peers.get(peer2.peerId)?.advertizing).to.be.true;

      expect(peer2._networkManager.getSwarm(topic)?._peers.get(peer1.peerId)?.advertizing).to.be.true;
    }, 1_000);

    await exchangeMessages(swarm1, swarm2);
    await leaveSwarm([peer1, peer2], topic);
  }).timeout(2_000);

  // TODO(mykola): broken.
  test.skip('many peers and connections', async () => {
    const numTopics = 5;
    const peersPerTopic = 5;

    await Promise.all(
      range(numTopics).map(async () => {
        const topic = PublicKey.random();

        await Promise.all(
          range(peersPerTopic).map(async () => {
            const peer = testBuilder.createPeer();
            await openAndCloseAfterTest([peer]);
            const swarm = await peer.createSwarm(topic).join();
            await swarm.protocol.connected.waitForCondition(
              () => swarm.protocol.connections.size === peersPerTopic - 1
            );
          })
        );
      })
    );
  });
};
