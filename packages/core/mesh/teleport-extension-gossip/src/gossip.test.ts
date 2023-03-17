//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { latch } from '@dxos/async';
import { TestBuilder } from '@dxos/teleport/testing';
import { afterTest, describe, test } from '@dxos/test';

import { TestAgent } from './testing';

describe('Gossip', () => {
  test('Two peers exchange messages', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const [agent1, agent2] = builder.createPeers({ factory: () => new TestAgent() });

    await builder.connect(agent1, agent2);

    const [messageReceived, inc] = latch({ count: 1 });
    agent2.gossip.listen('test_channel', (message) => {
      expect(message.peerId.equals(agent1.peerId)).to.be.true;
      expect(message.channelId).to.equal('test_channel');
      inc();
    });

    await agent1.gossip.postMessage('test_channel', { '@type': 'google.protobuf.Any' });
    await messageReceived();
  });

  test('Gets indirect messages', async () => {
    // first peer  <->  second peer  <->  third  peer

    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const [agent1, agent2, agent3] = builder.createPeers({ factory: () => new TestAgent() });

    await builder.connect(agent1, agent2);

    await builder.connect(agent2, agent3);

    // Check if first and third peers "see" each other.
    const [messageReceived, inc] = latch({ count: 1 });
    agent3.gossip.listen('test_channel', (message) => {
      expect(message.peerId.equals(agent1.peerId)).to.be.true;
      expect(message.channelId).to.equal('test_channel');
      inc();
    });

    await agent1.gossip.postMessage('test_channel', { '@type': 'google.protobuf.Any' });
    await messageReceived();
  });

  test('routing', async () => {
    // first peer  <->  second peer  <->  third  peer

    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const [agent1, agent2, agent3] = builder.createPeers({ factory: () => new TestAgent() });

    await builder.connect(agent1, agent2);

    await builder.connect(agent2, agent3);

    // Check if first and third peers "see" each other.
    const [messageReceived, inc] = latch({ count: 2 });
    agent3.gossip.listen('first', (message) => {
      expect(message.peerId.equals(agent1.peerId)).to.be.true;
      expect(message.channelId).to.equal('first');
      inc();
    });

    agent3.gossip.listen('second', (message) => {
      expect(message.peerId.equals(agent1.peerId)).to.be.true;
      expect(message.channelId).to.equal('second');
      inc();
    });

    await agent1.gossip.postMessage('first', { '@type': 'google.protobuf.Any' });
    await agent1.gossip.postMessage('second', { '@type': 'google.protobuf.Any' });
    await messageReceived();
  });
});
