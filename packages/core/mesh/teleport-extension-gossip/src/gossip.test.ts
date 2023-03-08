//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { latch } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { TestBuilder, TestConnection, TestPeer as TestPeerBase } from '@dxos/teleport/testing';
import { afterTest, describe, test } from '@dxos/test';

import { Gossip } from './gossip';

export type TestAgentOptions = {
  peerId?: PublicKey;
};

export class TestAgent extends TestPeerBase {
  public readonly gossip: Gossip;

  constructor({ peerId = PublicKey.random() }: TestAgentOptions = {}) {
    super(peerId);
    this.gossip = new Gossip({
      localPeerId: peerId
    });
  }

  override async onOpen(connection: TestConnection) {
    const extension = this.gossip.createExtension({ remotePeerId: connection.teleport!.remotePeerId });
    connection.teleport.addExtension('dxos.mesh.teleport.presence', extension);
  }

  override async destroy() {
    await super.destroy();
    await this.gossip.destroy();
  }
}

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

    await agent1.gossip.sendMessage('test_channel', { '@type': 'google.protobuf.Any' });
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

    await agent1.gossip.sendMessage('test_channel', { '@type': 'google.protobuf.Any' });
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

    await agent1.gossip.sendMessage('first', { '@type': 'google.protobuf.Any' });
    await agent1.gossip.sendMessage('second', { '@type': 'google.protobuf.Any' });
    await messageReceived();
  });
});
