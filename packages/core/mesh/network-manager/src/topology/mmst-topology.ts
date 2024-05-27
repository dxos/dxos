//
// Copyright 2020 DXOS.org
//

import distance from 'xor-distance';

import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type SwarmController, type Topology } from './topology';

const MIN_UPDATE_INTERVAL = 1000 * 10;
const MAX_CHANGES_PER_UPDATE = 1;

export interface MMSTTopologyOptions {
  /**
   * Number of connections the peer will originate by itself.
   */
  originateConnections?: number;

  /**
   * Maximum number of connections allowed, all other connections will be dropped.
   */
  maxPeers?: number;

  /**
   * Size of random sample from which peer candidates are selected.
   */
  sampleSize?: number;
}

export class MMSTTopology implements Topology {
  private readonly _originateConnections: number;
  private readonly _maxPeers: number;
  private readonly _sampleSize: number;

  private _controller?: SwarmController;

  private _sampleCollected = false;

  private _lastAction = new Date(0);

  constructor({ originateConnections = 2, maxPeers = 4, sampleSize = 10 }: MMSTTopologyOptions = {}) {
    this._originateConnections = originateConnections;
    this._maxPeers = maxPeers;
    this._sampleSize = sampleSize;
  }

  init(controller: SwarmController): void {
    invariant(!this._controller, 'Already initialized');
    this._controller = controller;
  }

  update(): void {
    invariant(this._controller, 'Not initialized');
    const { connected, candidates } = this._controller.getState();
    // Run the algorithms if we have first candidates, ran it before, or have more connections than needed.
    if (this._sampleCollected || connected.length > this._maxPeers || candidates.length > 0) {
      log('Running the algorithm.');
      this._sampleCollected = true;
      this._runAlgorithm();
    }
  }

  forceUpdate() {
    this._lastAction = new Date(0);
    this.update();
  }

  async onOffer(peer: PublicKey): Promise<boolean> {
    invariant(this._controller, 'Not initialized');
    const { connected } = this._controller.getState();
    const accept = connected.length < this._maxPeers;
    log(`Offer ${peer} accept=${accept}`);
    return accept;
  }

  async destroy(): Promise<void> {
    // Nothing to do.
  }

  private _runAlgorithm() {
    invariant(this._controller, 'Not initialized');
    const { connected, candidates, ownPeerId } = this._controller.getState();

    // TODO(nf): does this rate limiting/flap dampening logic belong here or in the SwarmController?
    if (connected.length > this._maxPeers) {
      // Disconnect extra peers.
      log(`disconnect ${connected.length - this._maxPeers} peers.`);
      const sorted = sortByXorDistance(connected, ownPeerId)
        .reverse()
        .slice(0, this._maxPeers - connected.length);
      invariant(sorted.length === 0);

      if (sorted.length > MAX_CHANGES_PER_UPDATE) {
        log(`want to disconnect ${sorted.length} peers but limited to ${MAX_CHANGES_PER_UPDATE}`);
      }

      if (Date.now() - this._lastAction.getTime() > MIN_UPDATE_INTERVAL) {
        for (const peer of sorted.slice(0, MAX_CHANGES_PER_UPDATE)) {
          log(`Disconnect ${peer}.`);
          this._controller.disconnect(peer);
        }
        this._lastAction = new Date();
      } else {
        log('rate limited disconnect');
      }
    } else if (connected.length < this._originateConnections) {
      // Connect new peers to reach desired quota.
      log(`connect ${this._originateConnections - connected.length} peers.`);
      const sample = candidates.sort(() => Math.random() - 0.5).slice(0, this._sampleSize);
      const sorted = sortByXorDistance(sample, ownPeerId).slice(0, this._originateConnections - connected.length);

      if (sorted.length > MAX_CHANGES_PER_UPDATE) {
        log(`want to connect ${sorted.length} peers but limited to ${MAX_CHANGES_PER_UPDATE}`);
      }
      if (Date.now() - this._lastAction.getTime() > MIN_UPDATE_INTERVAL) {
        for (const peer of sorted.slice(0, MAX_CHANGES_PER_UPDATE)) {
          log(`Connect ${peer}.`);
          this._controller.connect(peer);
        }
        this._lastAction = new Date();
      } else {
        log('rate limited connect');
      }
    }
  }

  toString() {
    return 'MMSTTopology';
  }
}

const sortByXorDistance = (keys: PublicKey[], reference: PublicKey): PublicKey[] =>
  keys.sort((a, b) =>
    distance.gt(distance(a.asBuffer(), reference.asBuffer()), distance(b.asBuffer(), reference.asBuffer())),
  );
