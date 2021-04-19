//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { PublicKey } from '@dxos/crypto';

import { SwarmController, Topology } from './topology';

const log = debug('dxos:network-manager:topology:star');

export class StarTopology implements Topology {
  private _controller?: SwarmController;

  private _intervalId?: NodeJS.Timeout;

  constructor (
    private readonly _centralPeer: PublicKey
  ) {}

  init (controller: SwarmController): void {
    assert(!this._controller, 'Already initialized');
    this._controller = controller;

    this._intervalId = setInterval(() => {
      controller.lookup();
    }, 10_000);
  }

  update (): void {
    assert(this._controller, 'Not initialized');
    const { candidates, connected, ownPeerId } = this._controller.getState();
    if (!ownPeerId.equals(this._centralPeer)) {
      log('As leaf peer dropping all connections apart from central peer.');
      // Drop all connections other than central peer.
      for (const peer of connected) {
        log(`Dropping extra connection ${peer}`);
        if (!peer.equals(this._centralPeer)) {
          this._controller.disconnect(peer);
        }
      }
    }
    for (const peer of candidates) {
      // Connect to central peer.
      if (peer.equals(this._centralPeer) || ownPeerId.equals(this._centralPeer)) {
        log(`Connecting to central peer ${peer}`);
        this._controller.connect(peer);
      }
    }
  }

  async onOffer (peer: PublicKey): Promise<boolean> {
    assert(this._controller, 'Not initialized');
    const { ownPeerId } = this._controller.getState();
    log(`Offer from ${peer} isCentral=${peer.equals(this._centralPeer)} isSelfCentral=${ownPeerId.equals(this._centralPeer)}`);
    return ownPeerId.equals(this._centralPeer) || peer.equals(this._centralPeer);
  }

  async destroy (): Promise<void> {
    if (this._intervalId !== undefined) {
      clearInterval(this._intervalId);
    }
  }

  toString () {
    return `StarTopology(${this._centralPeer})`;
  }
}
