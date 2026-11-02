//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Rpc from 'effect/rpc/Rpc';
import type * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import type { SpaceId } from '@dxos/keys';

import { serviceError } from './service-rpc.ts';
import { mutableArray, protoStruct } from './service-schemas.ts';

//
// RPC message schemas.
//

/** Automerge `DocumentId` (`@automerge/automerge-repo`): the base58check id, without the `automerge:` url prefix. */
const DocumentIdString = Schema.String;

/** Automerge `Heads` (`@automerge/automerge`): the hex hashes of a document's latest changes. */
const HeadsArray = mutableArray(Schema.String);

export const SubscribeRequest = Schema.Struct({
  /**
   * Opaque id the client chooses for the subscription, and passes again to `updateSubscription` and `update`
   * (`RepoProxy` uses a random hex key).
   */
  subscriptionId: Schema.String,
  /** {@link SpaceId} of the space whose documents the subscription carries. */
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
   * Automerge documents to subscribe for updates, with the heads the client already holds for any it
   * got stored changes for, so the host starts their sync there and sends only what came after.
   * `passive` asks for each update with the object's JSON (see {@link DocumentUpdate.passive}), for a
   * document the client holds unloaded. Adding a subscribed document again switches it to the given mode.
   * Used for already existing documents.
   * To add new document use `write` rpc.
   */
  add: Schema.optional(
    mutableArray(
      Schema.Struct({
        /** Automerge `DocumentId` (see {@link DocumentIdString}). */
        id: DocumentIdString,
        /** Automerge `Heads` the client already holds (see {@link HeadsArray}). */
        heads: Schema.optional(HeadsArray),
        passive: Schema.optional(Schema.Boolean),
      }),
    ),
  ),
  /**
   * Automerge `DocumentId`s to unsubscribe from (see {@link DocumentIdString}).
   */
  removeIds: Schema.optional(mutableArray(DocumentIdString)),
});
export interface UpdateSubscriptionRequest extends Schema.Schema.Type<typeof UpdateSubscriptionRequest> {}

export const CreateDocumentRequest = Schema.Struct({
  /**
   * {@link SpaceId} of the space where the document will be created.
   */
  spaceId: Schema.String,
  /**
   * Initial document state, as `Automerge.save()` bytes of a
   * [`DatabaseDirectory`](../../echo/echo-protocol/src/document-structure.ts) document.
   * Optional - if neither this nor `initialValue` is provided, an empty document will be created.
   */
  initialDocument: Schema.optional(Schema.Uint8Array),
  /**
   * Initial document value as a plain JSON
   * [`DatabaseDirectory`](../../echo/echo-protocol/src/document-structure.ts), which cannot carry Automerge values
   * such as `RawString` or bytes.
   * @deprecated Use `initialDocument`; kept so a client older than its services can still create documents.
   */
  initialValue: Schema.optional(protoStruct),
});
export interface CreateDocumentRequest extends Schema.Schema.Type<typeof CreateDocumentRequest> {}

export const CreateDocumentResponse = Schema.Struct({
  /**
   * The generated Automerge `DocumentId` (see {@link DocumentIdString}).
   */
  documentId: DocumentIdString,
});
export interface CreateDocumentResponse extends Schema.Schema.Type<typeof CreateDocumentResponse> {}

export const DocumentUpdate = Schema.Struct({
  /**
   * Automerge `DocumentId` (see {@link DocumentIdString}).
   */
  documentId: DocumentIdString,
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
  /**
   * Set by the host when it cannot produce this document at all — the data
   * plane it reads has no bytes for the id and no other source to fetch them
   * from. The client settles the corresponding `DocHandleProxy` as
   * `'unavailable'` and rejects its `whenReady()`, so a load fails at once
   * instead of waiting on bytes that are not coming. A host that is still
   * fetching sends `requesting` instead; a document whose bytes arrive later
   * (replication catching up) is delivered as a normal `mutation` update and
   * returns the handle to `'ready'`.
   */
  unavailable: Schema.optional(Schema.Boolean),
  /**
   * Sent for a document the client subscribed to as `passive`: the client keeps the mutation with the
   * stored changes it holds, unloaded, and shows the document from `json`, read at `heads`: its one object in the
   * ECHO JSON object format, or, for a space directory with no inline objects, the directory (see `directoryJson` in
   * `@dxos/echo-protocol`). Without `json` the document cannot be shown that way (it outgrew the size limit, or no
   * longer has either shape), and the client loads the document.
   */
  passive: Schema.optional(
    Schema.Struct({
      /** Automerge `Heads` that `json` was read at (see {@link HeadsArray}). */
      heads: HeadsArray,
      /**
       * `JSON.stringify` text of one of two shapes, told apart by a top-level `id`:
       * - With `id`: the document's one object, an
       *   [`ObjectJSON`](../../echo/echo/src/internal/Entity/model.ts) (`Obj.JSON` in `@dxos/echo`), built by
       *   `objectStructureToJson` and capped at `BACKED_OBJECT_LIMIT` by
       *   [`backingJson`](../../echo/echo-protocol/src/document-structure.ts).
       * - Without `id`: a space directory with no inline objects, a
       *   [`DirectoryJson`](../../echo/echo-protocol/src/document-structure.ts) (`DatabaseDirectory` minus
       *   `objects`, with each link an `AutomergeUrl` string), built by `directoryJson` and capped at
       *   `BACKED_DIRECTORY_LIMIT`. Sent on the first update of a subscription only.
       */
      json: Schema.optional(Schema.String),
      /** Time of the latest change at `heads`, in milliseconds since the Unix epoch. */
      updatedAt: Schema.optional(Schema.Number),
    }),
  ),
});
export interface DocumentUpdate extends Schema.Schema.Type<typeof DocumentUpdate> {}

export const UpdateRequest = Schema.Struct({
  /** Id the client passed to `subscribe`. */
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
   * Automerge `DocumentId`s to wait to flush (see {@link DocumentIdString}).
   */
  documentIds: Schema.optional(mutableArray(DocumentIdString)),
});
export interface FlushRequest extends Schema.Schema.Type<typeof FlushRequest> {}

export const GetDocumentHeadsRequest = Schema.Struct({
  /** Automerge `DocumentId`s (see {@link DocumentIdString}). */
  documentIds: Schema.optional(mutableArray(DocumentIdString)),
});
export interface GetDocumentHeadsRequest extends Schema.Schema.Type<typeof GetDocumentHeadsRequest> {}

export const Entry = Schema.Struct({
  /** Automerge `DocumentId` (see {@link DocumentIdString}). */
  documentId: DocumentIdString,
  /** Automerge `Heads` of the document (see {@link HeadsArray}). */
  heads: Schema.optional(HeadsArray),
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
  /** Automerge `DocumentId`s (see {@link DocumentIdString}). */
  documentIds: Schema.optional(mutableArray(DocumentIdString)),
});
export interface ReIndexHeadsRequest extends Schema.Schema.Type<typeof ReIndexHeadsRequest> {}

export const UpdateIndexesRequest = Schema.Struct({
  /**
   * Also index the secondary-index backlog (full text). Off by default: it lags the primary pass
   * by design, and only a caller that reads it back needs to wait for it.
   */
  secondaryIndexes: Schema.optional(Schema.Boolean),
});
export interface UpdateIndexesRequest extends Schema.Schema.Type<typeof UpdateIndexesRequest> {}

export const GetSpaceSyncStateRequest = Schema.Struct({
  /** {@link SpaceId} of the space. */
  spaceId: Schema.String,
});
export interface GetSpaceSyncStateRequest extends Schema.Schema.Type<typeof GetSpaceSyncStateRequest> {}

const peerStateSchema = Schema.Struct({
  /**
   * Automerge repo `PeerId` of the remote replicator; an EDGE replicator's id carries the prefix that
   * [`isEdgePeerId`](../../echo/echo-protocol/src/edge-peer.ts) checks.
   */
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
  /** {@link SpaceId} of the space. */
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
  /** Documents something on the host is using right now, across every space; the rest of `documentsTotal` is idle cache. */
  leases: Schema.Number,
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
  /** {@link SpaceId} of the space. */
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

/** Progress through one kind of index work: `done` of `total` items, where `total` can grow as new data arrives. */
export const IndexProgress = Schema.Struct({
  done: Schema.Number,
  total: Schema.Number,
});
export interface IndexProgress extends Schema.Schema.Type<typeof IndexProgress> {}

/**
 * The index work a boot screen or a deadline waits on: running index migrations, or rebuilding the
 * index over documents it has no cursor for and the feed blocks of its spaces stored before the host
 * opened. `done` of `total` counts migrations while migrating and documents plus feed blocks while
 * indexing; `total` can grow while indexing. The host reports it only when it changes, so each status
 * is progress.
 */
export const IndexStatus = Schema.Struct({
  phase: Schema.Literals(['migrating', 'indexing', 'idle']),
  done: Schema.Number,
  total: Schema.Number,
});
export interface IndexStatus extends Schema.Schema.Type<typeof IndexStatus> {}

/**
 * Index work queries answer through, from an index that is behind, for a progress indicator:
 * `catchUp` counts indexed documents whose heads moved on and feed blocks stored after the host opened,
 * as after time offline, and `fullText` counts objects the full-text index has not reached, as after it
 * is rebuilt. A lane is absent while it has no work.
 */
export const IndexActivity = Schema.Struct({
  catchUp: Schema.optional(IndexProgress),
  fullText: Schema.optional(IndexProgress),
});
export interface IndexActivity extends Schema.Schema.Type<typeof IndexActivity> {}

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
    payload: UpdateIndexesRequest,
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
   * The host's index status: the current value at once, then each change.
   */
  Rpc.make('subscribeIndexStatus', {
    success: IndexStatus,
    error: serviceError,
    stream: true,
  }),
  /**
   * The host's index activity: the current value at once, then each change.
   */
  Rpc.make('subscribeIndexActivity', {
    success: IndexActivity,
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
