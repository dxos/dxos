//
// Copyright 2024 DXOS.org
//

import { type Context } from '@dxos/context';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { type AutomergeProtocolMessage } from '@dxos/protocols';

// TODO(burdon): Rename AutomergeReplicator?
export interface AutomergeReplicator {
  /**
   * Called on when replicator is added to EchoHost.
   */
  connect(ctx: Context, context: AutomergeReplicatorContext): Promise<void>;

  /**
   * Called on when replicator is removed from EchoHost.
   */
  disconnect(): Promise<void>;
}

export interface AutomergeReplicatorContext {
  /**
   * Our own peer id.
   */
  get peerId(): string;

  /**
   * @deprecated Use `getContainingSpaceIdForDocument`.
   */
  getContainingSpaceForDocument(documentId: string): Promise<PublicKey | null>;
  getContainingSpaceIdForDocument(documentId: string): Promise<SpaceId | null>;

  onConnectionOpen(connection: AutomergeReplicatorConnection): void;
  onConnectionClosed(connection: AutomergeReplicatorConnection): void;
}

export interface AutomergeReplicatorConnection {
  /**
   * Remote peer id.
   */
  get peerId(): string;

  /**
   * Stream to read messages coming from the remote peer.
   *
   * Under Subduction transport, this stream carries only `subduction-connection` frames
   * (the subduction byte channel tunneled through the adapter).
   */
  readable: ReadableStream<AutomergeProtocolMessage>;

  /**
   * Stream to write messages to the remote peer.
   */
  writable: WritableStream<AutomergeProtocolMessage>;
}
