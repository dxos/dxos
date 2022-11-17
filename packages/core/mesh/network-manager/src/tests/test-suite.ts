//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { latch } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Protocol } from '@dxos/mesh-protocol';
import { range } from '@dxos/util';

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

  it.skip('joins multiple swarms concurrently', async () => {
    const receivedA: any[] = [];
    {
      const topicA = PublicKey.random();
      const peer1a = testBuilder.createPeer();
      const peer2a = testBuilder.createPeer();

      await peer1a.joinSwarm(topicA);
      await peer2a.joinSwarm(topicA);

      const mockReceiveA = (p: Protocol, s: string) => {
        receivedA.push(p, s);
        return undefined;
      };

      peer1a.plugin.on('receive', mockReceiveA);
      peer2a.plugin.on('connect', async () => {
        await peer2a.plugin.send(peer1a.peerId.asBuffer(), 'Test A');
      });
    }

    const receivedB: any[] = [];
    {
      const topicB = PublicKey.random();
      const peer1b = testBuilder.createPeer();
      const peer2b = testBuilder.createPeer();

      await peer1b.joinSwarm(topicB);
      await peer2b.joinSwarm(topicB);

      const mockReceiveB = (p: Protocol, s: string) => {
        receivedB.push(p, s);
        return undefined;
      };

      peer1b.plugin.on('receive', mockReceiveB);
      peer2b.plugin.on('connect', async () => {
        await peer2b.plugin.send(peer1b.peerId.asBuffer(), 'Test B');
      });
    }

    // TODO(burdon): Replace with triggers.
    await waitForExpect(() => {
      expect(receivedA.length).to.eq(2);
      expect(receivedA[0]).to.be.instanceof(Protocol);
      expect(receivedA[1]).to.eq('Test A');

      expect(receivedB.length).to.eq(2);
      expect(receivedB[0]).to.be.instanceof(Protocol);
      expect(receivedB[1]).to.eq('Test B');
    });
  });

  it.skip('many peers and connections', async () => {
    const numTopics = 5;
    const peersPerTopic = 5;

    await Promise.all(
      range(numTopics).map(async () => {
        const topic = PublicKey.random();

        await Promise.all(
          range(peersPerTopic).map(async () => {
            const peer = testBuilder.createPeer();
            await peer.joinSwarm(topic);

            const [done, pongReceived] = latch({ count: peersPerTopic - 1 });

            peer.plugin.on('connect', async (protocol: Protocol) => {
              const { peerId } = protocol.getSession() ?? {};
              const remoteId = PublicKey.from(peerId);
              await peer.plugin.send(remoteId.asBuffer(), 'ping');
            });

            peer.plugin.on('receive', async (protocol: Protocol, data: any) => {
              const { peerId } = protocol.getSession() ?? {};
              const remoteId = PublicKey.from(peerId);

              if (data === 'ping') {
                await peer.plugin.send(remoteId.asBuffer(), 'pong');
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
};
