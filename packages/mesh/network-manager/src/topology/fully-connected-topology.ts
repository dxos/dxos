//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { PublicKey } from '@dxos/protocols';

import { SwarmController, Topology } from './topology';

export class FullyConnectedTopology implements Topology {
  private _controller?: SwarmController;

  private _intervalId?: NodeJS.Timeout;

  init (controller: SwarmController): void {
    assert(!this._controller, 'Already initialized');
    this._controller = controller;

    this._intervalId = setInterval(() => {
      controller.lookup();
    }, 10_000);
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
    if (this._intervalId !== undefined) {
      clearInterval(this._intervalId);
    }
  }

  toString () {
    return 'FullyConnectedTopology';
  }
}
