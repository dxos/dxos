//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { TestBuilder as ConnectionFactory, TestPeer as Connection } from '@dxos/teleport/testing';

import { PresenceManager } from './presence-manager';

export class TestBuilder {
  private readonly _agents = new Array<TestAgent>();

  createAgent(peerId?: PublicKey): TestAgent {
    const agent = new TestAgent(peerId);
    this._agents.push(agent);
    return agent;
  }

  async connectAgents(agent1: TestAgent, agent2: TestAgent, connectionFactory: ConnectionFactory) {
    const { peer1: connection12, peer2: connection21 } = await connectionFactory.createPipedPeers({
      peerId1: agent1.peerId,
      peerId2: agent2.peerId
    });
    agent1.addConnection(connection12);
    agent2.addConnection(connection21);
  }

  async destroy() {
    await Promise.all(this._agents.map((agent) => agent.destroy()));
  }
}

export class TestAgent {
  private readonly _connections = new Array<Connection>();

  public readonly presenceManager = new PresenceManager({ resendAnnounce: 50, offlineTimeout: 200 });

  constructor(public readonly peerId: PublicKey = PublicKey.random()) {}

  addConnection(connection: Connection) {
    this._connections.push(connection);
    this.presenceManager.createExtension({ teleport: connection.teleport! });
  }

  async destroy() {
    await Promise.all(this._connections.map((connection) => connection.destroy()));
  }
}
