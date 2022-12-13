//
// Copyright 2022 DXOS.org
//

import { pipeline } from 'node:stream';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { Teleport } from '../teleport';

export class TestBuilder {
  private readonly _peers = new Array<TestPeer>();

  createPeer(peerId?: PublicKey): TestPeer {
    const peer = new TestPeer(peerId);
    this._peers.push(peer);
    return peer;
  }

  async destroy() {
    await Promise.all(this._peers.map((agent) => agent.destroy()));
  }

  /**
   * Simulates two peers connected via P2P network.
   */
  async createPipedPeers({ peerId1, peerId2 }: { peerId1?: PublicKey; peerId2?: PublicKey } = {}) {
    const peer1 = this.createPeer(peerId1);
    const peer2 = this.createPeer(peerId2);

    peer1.initializeTeleport({ initiator: true, remotePeerId: peer2.peerId });
    peer2.initializeTeleport({ initiator: false, remotePeerId: peer1.peerId });

    peer1.pipeline(peer2);
    peer2.pipeline(peer1);

    await Promise.all([peer1.teleport!.open(), peer2.teleport!.open()]);

    return { peer1, peer2 };
  }
}

export class TestPeer {
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

  pipeline(peer: TestPeer) {
    if (!this.teleport || !peer.teleport) {
      throw new Error('Teleport not initialized');
    }
    pipeline(this.teleport.stream, peer.teleport.stream, (err) => {
      if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
        log.catch(err);
      }
    });
  }

  async destroy() {
    await this.teleport?.destroy();
  }
}
