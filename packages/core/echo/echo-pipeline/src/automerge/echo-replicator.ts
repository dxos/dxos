//
// Copyright 2024 DXOS.org
//

import { type Heads } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';

import { type PublicKey, type SpaceId } from '@dxos/keys';
import { type AutomergeProtocolMessage } from '@dxos/protocols';

// TODO(burdon): Rename AutomergeReplicator?
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

  /**
   * @deprecated Use `getContainingSpaceIdForDocument`.
   */
  getContainingSpaceForDocument(documentId: string): Promise<PublicKey | null>;
  getContainingSpaceIdForDocument(documentId: string): Promise<SpaceId | null>;

  /**
   * Returns false if collection sync hasn't happened yet.
   */
  isDocumentInRemoteCollection(params: RemoteDocumentExistenceCheckProps): Promise<boolean>;

  onConnectionOpen(connection: ReplicatorConnection): void;
  onConnectionClosed(connection: ReplicatorConnection): void;
  onConnectionAuthScopeChanged(connection: ReplicatorConnection): void;
}

export interface ReplicatorConnection {
  /**
   * Remote peer id.
   */
  get peerId(): string;

  /**
   * Stream to read messages coming from the remote peer.
   */
  readable: ReadableStream<AutomergeProtocolMessage>;

  /**
   * Stream to write messages to the remote peer.
   */
  writable: WritableStream<AutomergeProtocolMessage>;

  /**
   * @returns true if the document should be advertised to this peer.
   * The remote peer can still request the document by its id bypassing this check.
   */
  shouldAdvertise(params: ShouldAdvertiseProps): Promise<boolean>;

  /**
   * @returns true if the collection should be synced to this peer.
   */
  shouldSyncCollection(params: ShouldSyncCollectionProps): boolean;

  /**
   * Batch syncing considered enabled if ReplicatorConnection implements `pushBatch` and `pullBatch` methods.
   * @returns true if the batch syncing is enabled.
   */
  get bundleSyncEnabled(): boolean;

  /**
   * Pushes the batch of documents to the remote peer.
   */
  pushBundle?(bundle: { documentId: DocumentId; data: Uint8Array; heads: Heads }[]): Promise<void>;

  /**
   * Pulls the batch of documents from the remote peer.
   */
  // TODO(mykola): Use automerge-repo-bundles Bundle type here.
  pullBundle?(docHeads: Record<DocumentId, Heads>): Promise<Record<DocumentId, Uint8Array>>;
}

export type ShouldAdvertiseProps = {
  documentId: string;
};

export type ShouldSyncCollectionProps = {
  collectionId: string;
};

export type RemoteDocumentExistenceCheckProps = {
  peerId: string;
  documentId: string;
};
