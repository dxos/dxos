//
// Copyright 2020 DXOS.org
//

import { log } from '@dxos/log';
import assert from 'node:assert';
import distance from 'xor-distance';

import { PublicKey } from '@dxos/protocols';

import { SwarmController, Topology } from './topology';

export interface MMSTTopologyOptions {
  /**
   * Number of connections the peer will originate by itself.
   */
  originateConnections?: number

  /**
   * Maximum number of connections allowed, all other connections will be dropped.
   */
  maxPeers?: number

  /**
   * Size of random sample from which peer candidates are selected.
   */
  sampleSize?: number
}

export class MMSTTopology implements Topology {
  private readonly _originateConnections: number;
  private readonly _maxPeers: number;
  private readonly _sampleSize: number;

  private _controller?: SwarmController;

  private _sampleCollected = false;

  constructor ({
    originateConnections = 2,
    maxPeers = 4,
    sampleSize = 10
  }: MMSTTopologyOptions = {}) {
    this._originateConnections = originateConnections;
    this._maxPeers = maxPeers;
    this._sampleSize = sampleSize;
  }

  init (controller: SwarmController): void {
    assert(!this._controller, 'Already initialized');
    this._controller = controller;
  }

  update (): void {
    assert(this._controller, 'Not initialized');
    const { connected, candidates } = this._controller.getState();
    // Run the algorithms if we have first candidates, ran it before, or have more connections than needed.
    if (this._sampleCollected || connected.length > this._maxPeers || candidates.length > 0) {
      log('Running the algorithm.');
      this._sampleCollected = true;
      this._runAlgorithm();
    }
  }

  async onOffer (peer: PublicKey): Promise<boolean> {
    assert(this._controller, 'Not initialized');
    const { connected } = this._controller.getState();
    const accept = connected.length < this._maxPeers;
    log(`Offer ${peer} accept=${accept}`);
    return accept;
  }

  async destroy (): Promise<void> {
    // Nothing to do.
  }

  private _runAlgorithm () {
    assert(this._controller, 'Not initialized');
    const { connected, candidates, ownPeerId } = this._controller.getState();

    if (connected.length > this._maxPeers) {
      // Disconnect extra peers.
      const sorted = sortByXorDistance(connected, ownPeerId).reverse().slice(0, this._maxPeers - connected.length);
      for (const peer of sorted) {
        log(`Disconnect ${peer}.`);
        this._controller.disconnect(peer);
      }
    } else if (connected.length < this._originateConnections) {
      // Connect new peers to reach desired quota.
      const sample = candidates.sort(() => Math.random() - 0.5).slice(0, this._sampleSize);
      const sorted = sortByXorDistance(sample, ownPeerId).slice(0, this._originateConnections - connected.length);
      for (const peer of sorted) {
        log(`Connect ${peer}.`);
        this._controller.connect(peer);
      }
    }
  }

  toString () {
    return 'MMSTTopology';
  }
}

const sortByXorDistance = (keys: PublicKey[], reference: PublicKey): PublicKey[] => keys.sort((a, b) => distance.gt(distance(a.asBuffer(), reference.asBuffer()), distance(b.asBuffer(), reference.asBuffer())));
