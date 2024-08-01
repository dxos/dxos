//
// Copyright 2024 DXOS.org
//

import { type Message } from '@dxos/automerge/automerge-repo';
import { type PublicKey } from '@dxos/keys';

export interface EchoReplicator {
  /**
   * Called on when replicator is added to EchoHost.
   */
  connect(context: EchoReplicatorContext): Promise<void>;

  /**
   * Called on when replicator is removed from EchoHost.
   */
  disconnect(): Promise<void>;
}

export interface EchoReplicatorContext {
  /**
   * Our own peer id.
   */
  get peerId(): string;

  getContainingSpaceForDocument(documentId: string): Promise<PublicKey | null>;

  onConnectionOpen(connection: ReplicatorConnection): void;
  onConnectionClosed(connection: ReplicatorConnection): void;
  onConnectionAuthScopeChanged(connection: ReplicatorConnection): void;
}

export interface ReplicatorConnection {
  /**
   * Remove peer id.
   */
  get peerId(): string;

  /**
   * Stream to read messages coming from the remote peer.
   */
  readable: ReadableStream<Message>;

  /**
   * Stream to write messages to the remote peer.
   */
  writable: WritableStream<Message>;

  /**
   * @returns true if the document should be advertised to this peer.
   * The remote peer can still request the document by its id bypassing this check.
   */
  shouldAdvertise(params: ShouldAdvertiseParams): Promise<boolean>;

  /**
   * @returns true if the collection should be synced to this peer.
   */
  shouldSyncCollection(params: ShouldSyncCollectionParams): boolean;
}

export type ShouldAdvertiseParams = {
  documentId: string;
};

export type ShouldSyncCollectionParams = {
  collectionId: string;
};
