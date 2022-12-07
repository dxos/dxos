//
// Copyright 2022 DXOS.org
//

import { pipeline } from 'node:stream';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

import { Teleport } from './teleport';

export class TestBuilder {
  private readonly _agents = new ComplexMap<PublicKey, TestAgent>(PublicKey.hash);

  createAgent(peerId?: PublicKey): TestAgent {
    const agent = new TestAgent(peerId);
    this._agents.set(agent.peerId, agent);
    return agent;
  }

  async destroy() {
    await Promise.all([...this._agents.values()].map((agent) => agent.destroy()));
  }

  /**
   * Simulates two peers connected via P2P network.
   */
  async createPipedAgents({ peerId1, peerId2 }: { peerId1?: PublicKey; peerId2?: PublicKey } = {}) {
    const agent1 = this.createAgent(peerId1);
    const agent2 = this.createAgent(peerId2);

    agent1.initializeTeleport({ initiator: true, remotePeerId: agent2.peerId });
    agent2.initializeTeleport({ initiator: false, remotePeerId: agent1.peerId });

    agent1.pipeline(agent2);
    agent2.pipeline(agent1);

    await Promise.all([agent1.teleport!.open(), agent2.teleport!.open()]);

    return { agent1, agent2 };
  }
}

export class TestAgent {
  public teleport?: Teleport;

  constructor(public readonly peerId: PublicKey = PublicKey.random()) {}

  initializeTeleport({ initiator, remotePeerId }: { initiator: boolean; remotePeerId: PublicKey }) {
    if (this.teleport) {
      return this;
    }
    this.teleport = new Teleport({
      initiator,
      localPeerId: this.peerId,
      remotePeerId
    });
    return this;
  }

  pipeline(agent: TestAgent) {
    if (!this.teleport || !agent.teleport) {
      throw new Error('Teleport not initialized');
    }
    pipeline(this.teleport.stream, agent.teleport.stream, (err) => {
      if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
        log.catch(err);
      }
    });
  }

  async destroy() {
    await this.teleport?.destroy();
  }
}
