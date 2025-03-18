//
// Copyright 2020 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type SwarmController, type Topology } from './topology';

export class StarTopology implements Topology {
  private _controller?: SwarmController;

  constructor(private readonly _centralPeer: string) {}

  toString() {
    return `StarTopology(${this._centralPeer})`;
  }

  init(controller: SwarmController): void {
    invariant(!this._controller, 'Already initialized.');
    this._controller = controller;
  }

  update(): void {
    invariant(this._controller, 'Not initialized.');
    const { candidates, connected, ownPeerId } = this._controller.getState();
    if (ownPeerId !== this._centralPeer) {
      log('leaf peer dropping all connections apart from central peer.');

      // Drop all connections other than central peer.
      for (const peer of connected) {
        if (peer !== this._centralPeer) {
          log('dropping connection', { peer });
          this._controller.disconnect(peer);
        }
      }
    }

    for (const peer of candidates) {
      // Connect to central peer.
      if (peer === this._centralPeer || ownPeerId === this._centralPeer) {
        log('connecting to peer', { peer });
        this._controller.connect(peer);
      }
    }
  }

  async onOffer(peer: string): Promise<boolean> {
    invariant(this._controller, 'Not initialized.');
    const { ownPeerId } = this._controller.getState();
    log('offer', {
      peer,
      isCentral: peer === this._centralPeer,
      isSelfCentral: ownPeerId === this._centralPeer,
    });
    return ownPeerId === this._centralPeer || peer === this._centralPeer;
  }

  async destroy(): Promise<void> {
    // Nothing to do.
  }
}
