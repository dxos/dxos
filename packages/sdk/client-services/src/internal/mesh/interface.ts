//
// Copyright 2025 DXOS.org
//

import * as EffectContext from 'effect/Context';

import { type SignalManager } from '@dxos/messaging';
import { type TransportFactory } from '@dxos/network-manager';

//
// The mesh subsystem's contract: the tag it owns, and the options its specs read. Stating the
// options here rather than taking the stack's whole bag is what keeps the subsystem from depending
// on the host that composes it.
//

/**
 * Effect service tag for the swarm {@link TransportFactory}.
 */
export class TransportFactoryService extends EffectContext.Service<TransportFactoryService, TransportFactory>()(
  '@dxos/client-services/TransportFactory',
) {}

/**
 * The options the mesh specs read.
 */
export type Options = {
  /**
   * Whether an edge endpoint is configured. An edge feature can be enabled in config without one,
   * so the feature flag alone does not say whether an edge-dependent spec can be built.
   */
  edgeAvailable?: boolean;
  /** Whether edge signaling is enabled; edge is the only real signaling transport. */
  edgeSignaling?: boolean;
  /** Overrides the config-derived signal manager; tests pass an in-memory one. */
  signalManager?: SignalManager;
  /** Overrides the WebRTC transport; tests pass the in-memory transport. */
  transportFactory?: TransportFactory;
  /** @default true */
  connectionLog?: boolean;
  /** Emit `NetworkingEnabled` as soon as the stack is open; otherwise the embedder emits it. */
  autoConnect?: boolean;
};
