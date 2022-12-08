//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { PublicKey } from '@dxos/keys';
import { TestBuilder as ConnectionFactory, TestPeer as Connection } from '@dxos/teleport/testing';
import { ComplexMap } from '@dxos/util';

import { Presence } from './presence';

export class TestBuilder {
  private readonly _agents = new Array<TestAgent>();

  constructor(private readonly _connectionFactory: ConnectionFactory = new ConnectionFactory()) {}

  createAgent(peerId?: PublicKey): TestAgent {
    const agent = new TestAgent({ peerId });
    this._agents.push(agent);
    return agent;
  }

  async connectAgents(agent1: TestAgent, agent2: TestAgent) {
    const { peer1: connection12, peer2: connection21 } = await this._connectionFactory.createPipedPeers({
      peerId1: agent1.peerId,
      peerId2: agent2.peerId
    });
    agent1.addConnection(connection12);
    agent2.addConnection(connection21);
  }

  async disconnectAgents(agent1: TestAgent, agent2: TestAgent) {
    await agent1.deleteConnection(agent2.peerId);
    await agent2.deleteConnection(agent1.peerId);
  }

  async destroy() {
    await Promise.all(this._agents.map((agent) => agent.destroy()));
  }
}

export class TestAgent {
  private readonly _connections = new ComplexMap<PublicKey, Connection>(PublicKey.hash);

  public readonly presence: Presence;

  public readonly peerId: PublicKey;

  constructor({
    peerId = PublicKey.random(),
    announceInterval = 25,
    offlineTimeout = 50
  }: {
    peerId?: PublicKey;
    announceInterval?: number;
    offlineTimeout?: number;
  }) {
    this.peerId = peerId;
    this.presence = new Presence({ localPeerId: peerId, announceInterval, offlineTimeout });
  }

  addConnection(connection: Connection) {
    assert(connection.teleport);
    this._connections.set(connection.teleport!.remotePeerId, connection);
    this.presence.createExtension({ teleport: connection.teleport! });
  }

  async deleteConnection(remotePeerId: PublicKey) {
    const connection = this._connections.get(remotePeerId);
    if (connection) {
      await connection.destroy();
      this._connections.delete(remotePeerId);
    }
  }

  async destroy() {
    await Promise.all([...this._connections.values()].map((connection) => connection.destroy()));
  }
}
