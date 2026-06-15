//
// Copyright 2026 DXOS.org
//

import { type Event } from '@dxos/async';

/**
 * Message broadcast by each peer at regular intervals.
 */
export type BeaconMessage = {
  type: 'beacon';
  /** DXOS device key. */
  peerId: string;
  /** DXOS identity key. */
  identityKey: string;
  /** Human-readable display name. */
  displayName?: string;
  /** Monotonically increasing counter proving liveness. */
  counter: number;
  /** Unix ms timestamp for latency estimation. */
  timestamp: number;
  /** Which transport sent this beacon. */
  transport: 'gossip' | 'iroh';
};

/**
 * Derived state for a single peer.
 */
export type BeaconPeer = {
  peerId: string;
  identityKey: string;
  displayName?: string;
  counter: number;
  lastSeen: number;
  latency?: number;
  transport: 'gossip' | 'iroh';
  online: boolean;
};

/**
 * Reactive state exposed to the UI.
 */
export type BeaconState = {
  transport: 'gossip' | 'iroh';
  peers: BeaconPeer[];
  localPeerId?: string;
  localCounter: number;
  status: 'connecting' | 'connected' | 'offline';
};

/**
 * Pluggable transport interface for beacon messages.
 */
export interface BeaconTransport {
  open(): Promise<void>;
  close(): Promise<void>;
  broadcast(message: BeaconMessage): void;
  onMessage: Event<BeaconMessage>;
}
