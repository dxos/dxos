//
// Copyright 2026 DXOS.org
//

import { scheduleTaskInterval } from '@dxos/async';
import { Resource } from '@dxos/context';
import { log } from '@dxos/log';

import { type BeaconMessage, type BeaconPeer, type BeaconState, type BeaconTransport } from '#types';

const BEACON_INTERVAL = 2_000;
const OFFLINE_TIMEOUT = 6_000;
const EXPIRE_CHECK_INTERVAL = 1_000;

export type BeaconServiceParams = {
  transport: BeaconTransport;
  peerId: string;
  identityKey: string;
  displayName?: string;
};

/**
 * Manages beacon broadcast/receive lifecycle and maintains reactive peer state.
 */
export class BeaconService extends Resource {
  readonly #transport: BeaconTransport;
  readonly #peerId: string;
  readonly #identityKey: string;
  readonly #displayName?: string;
  #counter = 0;
  #peers = new Map<string, BeaconPeer>();
  #listener: (() => void) | undefined;
  #onStateChange: (() => void) | undefined;

  constructor(params: BeaconServiceParams) {
    super();
    this.#transport = params.transport;
    this.#peerId = params.peerId;
    this.#identityKey = params.identityKey;
    this.#displayName = params.displayName;
  }

  /** Register a callback for state changes. */
  setOnStateChange(callback: () => void): void {
    this.#onStateChange = callback;
  }

  getState(): BeaconState {
    const peers = Array.from(this.#peers.values()).sort((first, second) => {
      if (first.online !== second.online) {
        return first.online ? -1 : 1;
      }
      return (first.displayName ?? first.peerId).localeCompare(second.displayName ?? second.peerId);
    });

    const onlineCount = peers.filter((peer) => peer.online).length;

    return {
      transport: 'gossip',
      peers,
      localPeerId: this.#peerId,
      localCounter: this.#counter,
      status: onlineCount > 0 ? 'connected' : this.#counter > 0 ? 'connected' : 'connecting',
    };
  }

  protected override async _open(): Promise<void> {
    await this.#transport.open();

    // Listen for incoming beacons.
    this.#listener = this.#transport.onMessage.on(this._ctx, (message) => {
      this.#handleMessage(message);
    });

    // Broadcast own beacon periodically.
    scheduleTaskInterval(
      this._ctx,
      async () => {
        this.#broadcastBeacon();
      },
      BEACON_INTERVAL,
    );

    // Expire stale peers periodically.
    scheduleTaskInterval(
      this._ctx,
      async () => {
        this.#expirePeers();
      },
      EXPIRE_CHECK_INTERVAL,
    );

    log('beacon service opened', { peerId: this.#peerId });
  }

  protected override async _close(): Promise<void> {
    await this.#transport.close();
    this.#peers.clear();
    log('beacon service closed');
  }

  protected override async _catch(err: Error): Promise<void> {
    log.catch(err);
  }

  #broadcastBeacon(): void {
    this.#counter++;
    const message: BeaconMessage = {
      type: 'beacon',
      peerId: this.#peerId,
      identityKey: this.#identityKey,
      displayName: this.#displayName,
      counter: this.#counter,
      timestamp: Date.now(),
      transport: 'gossip',
    };
    this.#transport.broadcast(message);
    this.#onStateChange?.();
  }

  #handleMessage(message: BeaconMessage): void {
    // Ignore own beacons.
    if (message.peerId === this.#peerId) {
      return;
    }

    const now = Date.now();
    const latency = Math.max(0, now - message.timestamp);

    this.#peers.set(message.peerId, {
      peerId: message.peerId,
      identityKey: message.identityKey,
      displayName: message.displayName,
      counter: message.counter,
      lastSeen: now,
      latency,
      transport: message.transport,
      online: true,
    });

    this.#onStateChange?.();
  }

  #expirePeers(): void {
    const now = Date.now();
    let changed = false;

    for (const peer of this.#peers.values()) {
      const shouldBeOnline = now - peer.lastSeen < OFFLINE_TIMEOUT;
      if (peer.online !== shouldBeOnline) {
        peer.online = shouldBeOnline;
        changed = true;
      }
    }

    // Remove peers that have been offline for a long time.
    for (const [peerId, peer] of this.#peers) {
      if (now - peer.lastSeen > OFFLINE_TIMEOUT * 5) {
        this.#peers.delete(peerId);
        changed = true;
      }
    }

    if (changed) {
      this.#onStateChange?.();
    }
  }
}
