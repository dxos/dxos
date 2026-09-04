//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

import { serviceError } from './service-rpc.ts';
import { mutableArray, protoStruct } from './service-schemas.ts';

//
// RPC message schemas.
//

export const SubscribeRequest = Schema.Struct({
  subscriptionId: Schema.String,
  spaceId: Schema.String,
});
export interface SubscribeRequest extends Schema.Schema.Type<typeof SubscribeRequest> {}

export const UpdateSubscriptionRequest = Schema.Struct({
  /**
   * Id of the subscription to update.
   * Subscription id is returned by `Subscribe` rpc.
   */
  subscriptionId: Schema.String,
  /**
   * Automerge document ids to subscribe for updates.
   * Used for already existing documents.
   * To add new document use `write` rpc.
   */
  addIds: Schema.optional(mutableArray(Schema.String)),
  /**
   * Automerge document ids to unsubscribe from.
   */
  removeIds: Schema.optional(mutableArray(Schema.String)),
});
export interface UpdateSubscriptionRequest extends Schema.Schema.Type<typeof UpdateSubscriptionRequest> {}

export const CreateDocumentRequest = Schema.Struct({
  /**
   * Space id where the document will be created.
   */
  spaceId: Schema.String,
  /**
   * Automerge encoded initial document value.
   * Optional - if not provided, an empty document will be created.
   */
  initialValue: Schema.optional(protoStruct),
});
export interface CreateDocumentRequest extends Schema.Schema.Type<typeof CreateDocumentRequest> {}

export const CreateDocumentResponse = Schema.Struct({
  /**
   * The generated document id.
   */
  documentId: Schema.String,
});
export interface CreateDocumentResponse extends Schema.Schema.Type<typeof CreateDocumentResponse> {}

export const DocumentUpdate = Schema.Struct({
  /**
   * Automerge document id.
   */
  documentId: Schema.String,
  /**
   * Automerge document incremental update.
   * Value returned by `Automerge.saveSince()`.
   * Optional: if absent, the update only carries a transition signal (e.g.
   * `requesting`) and not new bytes.
   */
  mutation: Schema.optional(Schema.Uint8Array),
  /**
   * Set by the worker when the disk probe for this document completes
   * negative — i.e. the document is not on local storage, and the worker
   * has started a network fetch. The client moves the corresponding
   * `DocHandleProxy` from `'pending'` to `'requesting'`. Once the bytes
   * eventually arrive, a normal `mutation` update follows and the handle
   * transitions to `'ready'`. Used by query-driven (disk-only) callers to
   * give up on a load without waiting on the network.
   */
  requesting: Schema.optional(Schema.Boolean),
});
export interface DocumentUpdate extends Schema.Schema.Type<typeof DocumentUpdate> {}

export const UpdateRequest = Schema.Struct({
  subscriptionId: Schema.String,
  updates: Schema.optional(mutableArray(DocumentUpdate)),
});
export interface UpdateRequest extends Schema.Schema.Type<typeof UpdateRequest> {}

export const BatchedDocumentUpdates = Schema.Struct({
  updates: Schema.optional(mutableArray(DocumentUpdate)),
});
export interface BatchedDocumentUpdates extends Schema.Schema.Type<typeof BatchedDocumentUpdates> {}

export const FlushRequest = Schema.Struct({
  /**
   * Automerge specific document ids to wait to flush.
   */
  documentIds: Schema.optional(mutableArray(Schema.String)),
});
export interface FlushRequest extends Schema.Schema.Type<typeof FlushRequest> {}

export const GetDocumentHeadsRequest = Schema.Struct({
  documentIds: Schema.optional(mutableArray(Schema.String)),
});
export interface GetDocumentHeadsRequest extends Schema.Schema.Type<typeof GetDocumentHeadsRequest> {}

export const Entry = Schema.Struct({
  documentId: Schema.String,
  heads: Schema.optional(mutableArray(Schema.String)),
});
export interface Entry extends Schema.Schema.Type<typeof Entry> {}

export const DocHeadsList = Schema.Struct({
  entries: Schema.optional(mutableArray(Entry)),
});
export interface DocHeadsList extends Schema.Schema.Type<typeof DocHeadsList> {}

export const GetDocumentHeadsResponse = Schema.Struct({
  heads: DocHeadsList,
});
export interface GetDocumentHeadsResponse extends Schema.Schema.Type<typeof GetDocumentHeadsResponse> {}

export const WaitUntilHeadsReplicatedRequest = Schema.Struct({
  heads: DocHeadsList,
});
export interface WaitUntilHeadsReplicatedRequest extends Schema.Schema.Type<typeof WaitUntilHeadsReplicatedRequest> {}

export const ReIndexHeadsRequest = Schema.Struct({
  documentIds: Schema.optional(mutableArray(Schema.String)),
});
export interface ReIndexHeadsRequest extends Schema.Schema.Type<typeof ReIndexHeadsRequest> {}

export const GetSpaceSyncStateRequest = Schema.Struct({
  spaceId: Schema.String,
});
export interface GetSpaceSyncStateRequest extends Schema.Schema.Type<typeof GetSpaceSyncStateRequest> {}

const peerStateSchema = Schema.Struct({
  peerId: Schema.String,

  /**
   * Documents that are present locally but not on the remote peer.
   */
  missingOnRemote: Schema.Number,

  /**
   * Documents that are present on the remote peer but not locally.
   */
  missingOnLocal: Schema.Number,

  /**
   * Documents that are present on both peers but have different heads.
   */
  differentDocuments: Schema.Number,

  /**
   * Total number of documents locally.
   */
  localDocumentCount: Schema.Number,

  /**
   * Total number of documents on the remote peer.
   */
  remoteDocumentCount: Schema.Number,

  /**
   * Total number of documents across this peer and the remote peer.
   */
  totalDocumentCount: Schema.Number,

  /**
   * Total number of documents that are not synced.
   * Includes documents that are present only locally, only on the remote peer, or whether the peers have different versions.
   */
  unsyncedDocumentCount: Schema.Number,
});
type PeerStateType = Schema.Schema.Type<typeof peerStateSchema>;

export const SpaceSyncState = Schema.Struct({
  peers: Schema.optional(mutableArray(peerStateSchema)),
});
export interface SpaceSyncState extends Schema.Schema.Type<typeof SpaceSyncState> {}
export namespace SpaceSyncState {
  export type PeerState = PeerStateType;
}

export const DatabaseStatsRequest = Schema.Struct({
  spaceId: Schema.String,
});
export interface DatabaseStatsRequest extends Schema.Schema.Type<typeof DatabaseStatsRequest> {}

/**
 * What the host holds in memory, as opposed to the stored counts alongside it: a document present
 * on disk costs nothing until a handle for it is cached, and handles are never evicted on their own.
 */
export const HostLoadedStats = Schema.Struct({
  /** Automerge handles cached for this space. */
  documents: Schema.Number,
  /** Automerge handles cached across every space on this host. */
  documentsTotal: Schema.Number,
  /** Active reactive queries registered with the host, across every space. */
  queriesTotal: Schema.Number,
});
export interface HostLoadedStats extends Schema.Schema.Type<typeof HostLoadedStats> {}

/**
 * Per-space storage metrics. @see `docs/GARBAGE_COLLECTION.md` in `@dxos/echo-host`.
 */
export const DatabaseStats = Schema.Struct({
  objects: Schema.Struct({
    /** Live (non-deleted) objects across the root and all linked documents. */
    alive: Schema.Number,
    /** Soft-deleted objects not yet reclaimed. */
    deleted: Schema.Number,
  }),
  /** Automerge documents owned by the space (root + linked + branch documents). */
  documents: Schema.Number,
  /** Feeds registered for the space. */
  feeds: Schema.Number,
  /** Total feed blocks stored locally for the space. */
  feedBlocks: Schema.Number,
  /** Host-side residency. The client's own caches are added by the client, not carried on the wire. */
  loaded: HostLoadedStats,
});
export interface DatabaseStats extends Schema.Schema.Type<typeof DatabaseStats> {}

export const RunGarbageCollectionRequest = Schema.Struct({
  spaceId: Schema.String,
  /** Also delete stale index rows for reclaimed documents/objects. @default true */
  index: Schema.optional(Schema.Boolean),
  /** Reserved for feed-block purge. Not yet effective on the local host. @default true */
  feeds: Schema.optional(Schema.Boolean),
});
export interface RunGarbageCollectionRequest extends Schema.Schema.Type<typeof RunGarbageCollectionRequest> {}

/**
 * What a garbage-collection pass reclaimed. @see `docs/GARBAGE_COLLECTION.md` in `@dxos/echo-host`.
 */
export const GarbageCollectionReport = Schema.Struct({
  /** Soft-deleted objects unlinked from the space directory. */
  unlinkedObjects: Schema.Number,
  /** Automerge documents wiped from storage (chunks + heads). */
  removedDocuments: Schema.Number,
  /** Index rows deleted. */
  removedIndexEntries: Schema.Number,
  /** Feed blocks purged. */
  purgedFeedBlocks: Schema.Number,
});
export interface GarbageCollectionReport extends Schema.Schema.Type<typeof GarbageCollectionReport> {}

/**
 * Effect RPC definitions for `dxos.echo.service.DataService`.
 * Service-only payloads use Effect schemas; shared proto types remain protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  /**
   * Subscribe to incremental updates of multiple automerge socuments.
   * Which documents are subscribed to is defined in the `UpdateSubscription`.
   * Used to propagate changes from services to client.
   */
  Rpc.make('subscribe', {
    payload: SubscribeRequest,
    success: BatchedDocumentUpdates,
    error: serviceError,
    stream: true,
  }),
  /**
   * Change which documents are subscribed to for specific subscription.
   */
  Rpc.make('updateSubscription', {
    payload: UpdateSubscriptionRequest,
    error: serviceError,
  }),
  /**
   * Create a new automerge document.
   * Returns the generated document id which is controlled by the host.
   */
  Rpc.make('createDocument', {
    payload: CreateDocumentRequest,
    success: CreateDocumentResponse,
    error: serviceError,
  }),
  /**
   * Write incremental updates to multiple automerge documents.
   * Used to propagate changes from client to services.
   */
  Rpc.make('update', {
    payload: UpdateRequest,
    error: serviceError,
  }),
  Rpc.make('flush', {
    payload: FlushRequest,
    error: serviceError,
  }),
  Rpc.make('getDocumentHeads', {
    payload: GetDocumentHeadsRequest,
    success: GetDocumentHeadsResponse,
    error: serviceError,
  }),
  /**
   * Wait until the we have the specified changes on the worker locally. Does not take into account the index or client.
   */
  Rpc.make('waitUntilHeadsReplicated', {
    payload: WaitUntilHeadsReplicatedRequest,
    error: serviceError,
  }),
  /**
   * Update heads index for selected docuemnts.
   */
  Rpc.make('reIndexHeads', {
    payload: ReIndexHeadsRequest,
    error: serviceError,
  }),
  /**
   * Wait for any pending index updates.
   */
  Rpc.make('updateIndexes', {
    error: serviceError,
  }),
  // TODO(dmaretskyi): Stream subscription.
  Rpc.make('subscribeSpaceSyncState', {
    payload: GetSpaceSyncStateRequest,
    success: SpaceSyncState,
    error: serviceError,
    stream: true,
  }),
  /**
   * Per-space storage metrics (objects, automerge documents, feeds, feed blocks).
   */
  Rpc.make('stats', {
    payload: DatabaseStatsRequest,
    success: DatabaseStats,
    error: serviceError,
  }),
  /**
   * Reclaim storage held by soft-deleted objects and unreachable automerge documents (and their
   * index rows). Feed-block reclamation is deferred on the local host — `purgedFeedBlocks` is
   * currently always `0` and `feeds` is reserved.
   */
  Rpc.make('runGarbageCollection', {
    payload: RunGarbageCollectionRequest,
    success: GarbageCollectionReport,
    error: serviceError,
  }),
).prefix('DataService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}

/**
 * Effect service tag for the `DataService` RPC handlers.
 */
export class Tag extends Context.Service<Tag, Handlers>()('@dxos/protocols/rpc/DataService') {}
