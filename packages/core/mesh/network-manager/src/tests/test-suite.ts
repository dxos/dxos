//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { expect } from 'chai';

import { TestBuilder } from '../testing';
import { FullyConnectedTopology, StarTopology } from '../topology';
import { exchangeMessages, joinSwarm, leaveSwarm, openAndCloseAfterTest } from './utils';

/**
 * Common test suite for different transport and plugin configurations.
 */
// TODO(burdon): Check TestBuilder can be re-used across tests (otherwise factory).
export const testSuite = (testBuilder: TestBuilder, skip = false) => {
  if (skip) {
    return;
  }

  it('joins swarm, sends messages, and cleanly exits', async () => {
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    const topic = PublicKey.random();
    await joinSwarm(topic, [peer1, peer2], () => new FullyConnectedTopology());
    await exchangeMessages(peer1, peer2);
    await leaveSwarm(topic, [peer1, peer2]);
  });

  // TODO(burdon): Test with more peers.
  it('joins swarm with star topology', async () => {
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    const topic = PublicKey.random();
    await joinSwarm(topic, [peer1, peer2], () => new StarTopology(peer1.peerId)); // NOTE: Same peer.
    await exchangeMessages(peer1, peer2);
    await leaveSwarm(topic, [peer1, peer2]);
  });

  it.skip('joins swarm multiple times', async () => {
    const peer1 = testBuilder.createPeer();
    const peer2 = testBuilder.createPeer();
    await openAndCloseAfterTest([peer1, peer2]);

    const topic = PublicKey.random();

    {
      await joinSwarm(topic, [peer1, peer2]);
      await exchangeMessages(peer1, peer2);
      await leaveSwarm(topic, [peer1, peer2]);
    }

    // TODO(burdon): Add log marker like this to logging lib. Auto add between tests?
    // TODO(burdon): Enable new Error to take second context obj: new Error('msg', {}).
    log('————————————————————————————————————————');

    // TODO(burdon): Doesn't exit cleanly:
    //  Error: Can only pipe to one destination (memory-transport).
    //  Due to re-using the plugin instance?
    {
      await joinSwarm(topic, [peer1, peer2]);
      await exchangeMessages(peer1, peer2);
      await leaveSwarm(topic, [peer1, peer2]);
    }
  });

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

  //
  // TODO(burdon): Re-implement tests below.
  //

  /*
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

  it.skip('many peers and connections', async function () {
    const numTopics = 5;
    const peersPerTopic = 5;

    await Promise.all(
      range(numTopics).map(async () => {
        const topic = PublicKey.random();

        await Promise.all(
          range(peersPerTopic).map(async (_, index) => {
            const peerId = PublicKey.random();
            const { plugin } = await createPeer({
              topic,
              peerId,
              transportFactory: MemoryTransportFactory
            });

            const [done, pongReceived] = latch({ count: peersPerTopic - 1 });

            plugin.on('connect', async (protocol: Protocol) => {
              const { peerId } = protocol.getSession() ?? {};
              const remoteId = PublicKey.from(peerId);
              await plugin.send(remoteId.asBuffer(), 'ping');
            });

            plugin.on('receive', async (protocol: Protocol, data: any) => {
              const { peerId } = protocol.getSession() ?? {};
              const remoteId = PublicKey.from(peerId);

              if (data === 'ping') {
                await plugin.send(remoteId.asBuffer(), 'pong');
              } else if (data === 'pong') {
                pongReceived();
              } else {
                throw new Error(`Invalid message: ${data}`);
              }
            });

            await done();
          })
        );
      })
    );
  });
  */
};
