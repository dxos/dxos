//
// Copyright 2020 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';

import { type SwarmController, type Topology } from './topology';

export class FullyConnectedTopology implements Topology {
  private _controller?: SwarmController;

  toString(): string {
    return 'FullyConnectedTopology';
  }

  init(controller: SwarmController): void {
    invariant(!this._controller, 'Already initialized');
    this._controller = controller;
  }

  update(): void {
    invariant(this._controller, 'Not initialized');
    const { candidates: discovered } = this._controller.getState();
    for (const peer of discovered) {
      // TODO(burdon): Back-off.
      this._controller.connect(peer);
    }
  }

  async onOffer(peer: PublicKey): Promise<boolean> {
    return true;
  }

  async destroy(): Promise<void> {
    // Nothing to do.
  }
}
