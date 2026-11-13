//
// Copyright 2026 DXOS.org
//

import { FeedProtocol } from '@dxos/protocols';

/** The namespaces a space syncs: objects' Automerge documents, then queue items. */
export const SYNC_NAMESPACES: readonly string[] = [
  FeedProtocol.WellKnownNamespaces.automerge,
  FeedProtocol.WellKnownNamespaces.data,
];

/** The peer id a client addresses the space's authority by. */
export const AUTHORITY_PEER_ID = 'authority';

/**
 * A bidirectional channel to the other side of sync, carrying feed protocol messages.
 */
export type SyncTransport = {
  send(message: FeedProtocol.ProtocolMessage): void;
  onMessage(listener: (message: FeedProtocol.ProtocolMessage) => void): () => void;
  /** Reports the channel opening and closing, for a transport that can lose its connection. */
  onConnectionChange?(listener: (connected: boolean) => void): () => void;
};
