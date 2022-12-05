//
// Copyright 2022 DXOS.org
//

import { pipeline } from 'stream';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { PeerState } from '@dxos/protocols/proto/dxos/mesh/teleport/presence';
import { Teleport } from '@dxos/teleport';
import { afterTest } from '@dxos/test';

import { PresenceExtension } from './presence-extension';

export class TestBuilder {
  createAgent(): TestAgent {
    return new TestAgent();
  }

  async createPipedAgents() {
    const agent1 = this.createAgent();
    const agent2 = this.createAgent();

    agent1.initializeTeleport({ initiator: true, remotePeerId: agent2.peerId });
    agent2.initializeTeleport({ initiator: false, remotePeerId: agent1.peerId });

    agent1.pipeline(agent2);
    agent2.pipeline(agent1);

    await Promise.all([agent1.open(), agent2.open()]);

    return { agent1, agent2 };
  }
}

export class TestAgent {
  public readonly peerId = PublicKey.random();

  public teleport?: Teleport;
  public presence?: PresenceExtension;

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

  async open() {
    if (!this.teleport) {
      throw new Error('Teleport not initiated.');
    }
    await this.teleport.open();
    afterTest(() => this.teleport?.close());

    return this;
  }

  initializePresence({
    connections,
    onAnnounce,
    resendAnnounce
  }: {
    connections: PublicKey[];
    onAnnounce: (peerState: PeerState) => Promise<void>;
    resendAnnounce: number;
  }) {
    this.presence = new PresenceExtension({ connections, onAnnounce, resendAnnounce });
    if (!this.teleport) {
      throw new Error('Teleport not initiated.');
    }
    this.teleport.addExtension('dxos.mesh.teleport.replicator', this.presence);
    return this;
  }
}
