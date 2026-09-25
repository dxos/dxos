//
// Copyright 2025 DXOS.org
//

import { type JsonObject } from '@bufbuild/protobuf';

import { type CleanupFn } from '@dxos/async';

import { type GossipMessage } from './buf/proto/gen/dxos/mesh/teleport/gossip_pb.ts';

/**
 * Registered channel listener; calling it unsubscribes.
 */
export type ListenHandle = CleanupFn & {
  /**
   * Resolves once the listener is registered, since a message posted before then can be dropped.
   * Rejects if the subscription ends first.
   */
  readonly ready: Promise<void>;
};

/**
 * Message passing abstraction.
 */
export interface Messenger {
  /**
   * Register channel listener.
   */
  listen(channel: string, callback: (message: GossipMessage) => void): ListenHandle;

  /**
   * Send message to channel.
   *
   * The payload is opaque to the router, so a channel's own protocol is carried as JSON and packed
   * into the envelope's `Any` by `packJson`.
   */
  postMessage(channel: string, message: JsonObject): Promise<void>;
}
