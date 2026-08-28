//
// Copyright 2024 DXOS.org
//

import * as EffectContext from 'effect/Context';

import { type Context } from '@dxos/context';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { type AutomergeProtocolMessage, type SubductionProtocolMessage } from '@dxos/protocols';

/**
 * Union of every shape the read/write streams below can carry.
 *
 * @remarks
 * - {@link AutomergeProtocolMessage}: the classical automerge-repo sync frames
 *   (carried by mesh replication and the in-memory `TestAdapter`).
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
 * Effect service tag for {@link AutomergeReplicator}.
 */
export class AutomergeReplicatorService extends EffectContext.Service<
  AutomergeReplicatorService,
  AutomergeReplicator
>()('@dxos/echo-host/AutomergeReplicator') {}

/**
 * Replicator with explicit per-space wiring (used by edge replicators that maintain one logical
 * connection per `SpaceId`). `DataSpaceManager` drives these lifecycle hooks on space open/close.
 */
export interface EdgeAutomergeReplicator extends AutomergeReplicator {
  connectToSpace(ctx: Context, spaceId: SpaceId): Promise<void>;
  disconnectFromSpace(spaceId: SpaceId): Promise<void>;
}

/**
 * Effect service tag for {@link EdgeAutomergeReplicator}.
 */
export class EdgeAutomergeReplicatorService extends EffectContext.Service<
  EdgeAutomergeReplicatorService,
  EdgeAutomergeReplicator
>()('@dxos/echo-host/EdgeAutomergeReplicator') {}

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
