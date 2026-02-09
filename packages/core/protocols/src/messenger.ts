//
// Copyright 2025 DXOS.org
//

import { type CleanupFn } from '@dxos/async';

import { type GossipMessage } from './proto/gen/dxos/mesh/teleport/gossip';

/**
 * Message passing abstraction.
 */
export interface Messenger {
  /**
   * Register channel listener.
   */
  listen: (channel: string, callback: (message: GossipMessage) => void) => CleanupFn;

  /**
   * Send message to channel.
   */
  postMessage: (channel: string, message: any) => Promise<void>;
}
