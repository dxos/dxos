//
// Copyright 2024 DXOS.org
//

import { type Heads } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';

import { type Context } from '@dxos/context';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { type AutomergeProtocolMessage, type SubductionProtocolMessage } from '@dxos/protocols';

/**
 * Union of every shape the read/write streams below can carry.
 *
 * @remarks
 * - {@link AutomergeProtocolMessage}: the classical automerge-repo sync frames
 *   (carried by `EchoEdgeReplicator`, mesh, in-memory `TestAdapter`).
 * - {@link SubductionProtocolMessage}: the in-process subduction shape
 *   (carried by `EchoEdgeSubductionReplicator` — envelopes are unwrapped to
 *   raw `SubductionConnectionMessage` before they reach the stream).
 *
 * The interface uses the union so a single `EchoNetworkAdapter` instance can
 * be wired behind either replicator without resorting to type casts at the
 * boundary.
 */
export type ReplicatorConnectionMessage = AutomergeProtocolMessage | SubductionProtocolMessage;

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

/**
 * Replicator with explicit per-space wiring (used by edge replicators that maintain one logical
 * connection per `SpaceId`). `DataSpaceManager` drives these lifecycle hooks on space open/close.
 */
export interface EdgeAutomergeReplicator extends AutomergeReplicator {
  connectToSpace(ctx: Context, spaceId: SpaceId): Promise<void>;
  disconnectFromSpace(spaceId: SpaceId): Promise<void>;
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

  /**
   * Returns false if collection sync hasn't happened yet.
   */
  isDocumentInRemoteCollection(params: RemoteDocumentExistenceCheckProps): Promise<boolean>;

  onConnectionOpen(connection: AutomergeReplicatorConnection): void;
  onConnectionClosed(connection: AutomergeReplicatorConnection): void;
  onConnectionAuthScopeChanged(connection: AutomergeReplicatorConnection): void;

  /**
   * Notify the host that the peer landscape may have changed (e.g. a
   * subduction reconnect handshake completed) so it can call
   * `repo.shareConfigChanged()`. Without this, entries that bulk-sync
   * marked `lastSyncResult = "no-peers"` during a transport-teardown
   * window stay terminal until `#connectionGeneration()` advances —
   * which only fires on transport-level transitions, not on per-peer
   * SUH bindings. Replicators that own their own reconnect loop call
   * this once the new session is bound; the host debounces and resets
   * stuck entries through `SubductionSource.shareConfigChanged`.
   */
  kickShareConfigChanged?(): void;
}

export interface AutomergeReplicatorConnection {
  /**
   * Remote peer id.
   */
  get peerId(): string;

  /**
   * Stream to read messages coming from the remote peer.
   */
  readable: ReadableStream<ReplicatorConnectionMessage>;

  /**
   * Stream to write messages to the remote peer.
   */
  writable: WritableStream<ReplicatorConnectionMessage>;

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
   * Batch syncing considered enabled if AutomergeReplicatorConnection implements `pushBatch` and `pullBatch` methods.
   * @returns true if the batch syncing is enabled.
   */
  get bundleSyncEnabled(): boolean;

  /**
   * Pushes the batch of documents to the remote peer.
   */
  pushBundle?(ctx: Context, bundle: { documentId: DocumentId; data: Uint8Array; heads: Heads }[]): Promise<void>;

  /**
   * Pulls the batch of documents from the remote peer.
   */
  // TODO(mykola): Use automerge-repo-bundles Bundle type here.
  pullBundle?(ctx: Context, docHeads: Record<DocumentId, Heads>): Promise<Record<DocumentId, Uint8Array>>;
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
