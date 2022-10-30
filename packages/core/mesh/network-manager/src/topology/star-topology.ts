//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { SwarmController, Topology } from './topology';

export class StarTopology implements Topology {
  private _controller?: SwarmController;

  // prettier-ignore
  constructor(
    private readonly _centralPeer: PublicKey
  ) {}

  toString() {
    return `StarTopology(${this._centralPeer.truncate()})`;
  }

  init(controller: SwarmController): void {
    assert(!this._controller, 'Already initialized.');
    this._controller = controller;
  }

  update(): void {
    assert(this._controller, 'Not initialized.');
    const { candidates, connected, ownPeerId } = this._controller.getState();
    if (!ownPeerId.equals(this._centralPeer)) {
      log('leaf peer dropping all connections apart from central peer.');

      // Drop all connections other than central peer.
      for (const peer of connected) {
        if (!peer.equals(this._centralPeer)) {
          log('dropping connection', { peer });
          this._controller.disconnect(peer);
        }
      }
    }

    for (const peer of candidates) {
      // Connect to central peer.
      if (peer.equals(this._centralPeer) || ownPeerId.equals(this._centralPeer)) {
        log('connecting to peer', { peer });
        this._controller.connect(peer);
      }
    }
  }

  async onOffer(peer: PublicKey): Promise<boolean> {
    assert(this._controller, 'Not initialized.');
    const { ownPeerId } = this._controller.getState();
    log('offer', { peer, isCentral: peer.equals(this._centralPeer), isSelfCentral: ownPeerId.equals(this._centralPeer) });
    return ownPeerId.equals(this._centralPeer) || peer.equals(this._centralPeer);
  }

  async destroy(): Promise<void> {
    // Nothing to do.
  }
}
