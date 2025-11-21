//
// Copyright 2025 DXOS.org
//

import { type CleanupFn } from '@dxos/async';

import { type GossipMessage } from './proto/gen/dxos/mesh/teleport/gossip';

export interface Messenger {
  listen: (channel: string, callback: (message: GossipMessage) => void) => CleanupFn;
  postMessage: (channel: string, message: any) => Promise<void>;
}
