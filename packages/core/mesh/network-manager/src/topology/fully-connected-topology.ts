//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';

import { PublicKey } from '@dxos/keys';

import { SwarmController, Topology } from './topology';

export class FullyConnectedTopology implements Topology {
  private _controller?: SwarmController;

  init (controller: SwarmController): void {
    assert(!this._controller, 'Already initialized');
    this._controller = controller;
  }

  update (): void {
    assert(this._controller, 'Not initialized');
    const { candidates: discovered } = this._controller.getState();
    for (const peer of discovered) {
      this._controller.connect(peer);
    }
  }

  async onOffer (peer: PublicKey): Promise<boolean> {
    return true;
  }

  async destroy (): Promise<void> {
    // Nothing to do.
  }

  toString () {
    return 'FullyConnectedTopology';
  }
}
