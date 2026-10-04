//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import type { CleanupFn } from '@dxos/async';
import { SpanAttributes } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type SpaceId, type URI } from '@dxos/keys';

import type * as Blob from './Blob.ts';
import type * as Change from './Change.ts';
import type * as Entity from './Entity.ts';
import * as Error from './Error.ts';
import type * as Feed from './Feed.ts';
import type * as Filter from './Filter.ts';
import type * as Hypergraph from './Hypergraph.ts';
import { type AnyProperties, EntityKind, KindId } from './internal/common/types/index.ts';
// Deep import (not the `./internal/Entity` barrel) to avoid a cycle:
// Database → internal/Entity → entity → JsonSchema → Ref → Database.
import { isInstanceOf } from './internal/Entity/type-uri.ts';
import * as queryInternal from './internal/Query/index.ts';
import type { LoadOptions, Ref } from './internal/Ref/ref.ts';
import type * as Obj from './Obj.ts';
import type * as Query from './Query.ts';
import type * as QueryResult from './QueryResult.ts';
import type * as Registry from './Registry.ts';
import type * as Type from './Type.ts';

/**
 * `query` API function declaration.
 */
// TODO(burdon): Reconcile Query and Filter (should only have one root type).
export interface QueryFn {
  <Q extends Query.Any>(query: Q): QueryResult.QueryResult<Query.Type<Q>>;
  <F extends Filter.Any>(filter: F): QueryResult.QueryResult<Filter.Type<F>>;
}

/**
 * Common interface for Database, Feed, and Hypergraph.
 */
export interface Queryable {
  query: QueryFn;
}

export type GetObjectByIdOptions = {
  deleted?: boolean;
};

export type ObjectPlacement = 'root-doc' | 'linked-doc';

/**
 * Whether a write was a person's own action, reported with ECHO's trace events. `system` is everything a person
 * did not directly do: agents, syncs and imports, seeded content, migrations and automation. When no origin is
 * given, an object with foreign keys was written by a sync or import (`system`) and anything else is `unknown`:
 * a write path that still needs attributing.
 */
export type Origin = 'user' | 'system' | 'unknown';

/**
 * The {@link Origin} the Effect wrappers ({@link add}, {@link remove}, {@link addType}, {@link appendToFeed})
 * attribute their writes to. Provided once around a unit of work, e.g. `system` around seeding code or an
 * agent's operations, rather than at every write.
 */
export const Origin: Context.Reference<Origin | undefined> = Context.Reference<Origin | undefined>(
  '@dxos/echo/Database/Origin',
  { defaultValue: () => undefined },
);

/**
 * The trace events ECHO emits on `trace.events` from `@dxos/tracing` for local writes, each with the write's
 * {@link Origin}. Replicated writes are not reported.
 */
export const TraceEvents = {
  objectAdd: 'echo.object.add',
  objectRemove: 'echo.object.remove',
  typeAdd: 'echo.type.add',
  feedAppend: 'echo.feed.append',
} as const;

/** Options for writes that only carry attribution. */
export type WriteOptions = {
  /** See {@link Origin}. */
  origin?: Origin;
};

export type AddOptions = {
  /**
   * Where to place the object in the Automerge document tree.
   * Root document is always loaded with the space.
   * Linked documents are loaded lazily.
   * Placing large number of objects in the root document may slow down the initial load.
   *
   * @default 'linked-doc'
   */
  placeIn?: ObjectPlacement;

  /** See {@link Origin}. */
  origin?: Origin;

  /**
   * Append the object to this feed instead of the automerge-backed space database. The object is
   * returned synchronously (a live feed object) and persisted in the background — confirm the write
   * completed with {@link Database.flush}. Synchronous alternative to the async
   * {@link Database.appendToFeed}; `placeIn` is ignored when set.
   */
  to?: Feed.Feed;
};

/**
 * Rejects Type entities from {@link Database.add} at compile time via their `[KindId]` brand. Used
 * as `T & RejectTypeEntity<T>` to preserve inference of `T`. Bounding `add` on
 * `Obj.Unknown | Relation.Unknown` instead would reject broadly-typed instance adds (e.g.
 * `Entity.Any`, `Obj.OfShape<T>`), forcing casts repo-wide.
 */
export type RejectTypeEntity<T> = T extends { readonly [KindId]: EntityKind.Type }
  ? { __error: 'Type entities must be persisted via db.addType(), not db.add().' }
  : T;

export type FlushOptions = {
  /**
   * Write any pending changes to disk.
   * @default true
   */
  disk?: boolean;

  /**
   * Wait for pending index updates.
   * @default true
   */
  indexes?: boolean;

  /**
   * Also wait for the secondary indexes (full text), which lag the primary pass by design.
   * @default false
   */
  secondaryIndexes?: boolean;

  /**
   * Flush pending updates to objects and queries.
   * @default false
   */
  updates?: boolean;
};

/**
 * A caller-owned, writable **independent instance** of one object bound to one branch: a distinct
 * object instance (not a UI surface), separate from the device-global canonical object.
 * @see Database.branch
 */
export type BranchBinding<T extends Obj.Unknown = Obj.Unknown> = {
  /** Live object bound to the branch document (`'main'` -> the canonical live object). */
  readonly object: T;
  /** Release the binding (drops the doc-handle listener; never deletes the branch document). */
  dispose(): void;
};

/**
 * Identifier denoting an ECHO Database.
 *
 * Namespaced (like `@dxos/echo/Database/Service` below) rather than the bare `@dxos/echo/Database`:
 * that key belongs to the `[ObjectDatabaseId]` accessor every ECHO object carries, and a shared
 * registry key would make `TypeId in obj` true for every object in the graph.
 */
export const TypeId = Symbol.for('@dxos/echo/Database/TypeId');
export type TypeId = typeof TypeId;

/**
 * ECHO Database interface.
 */
export interface Database extends Queryable {
  readonly [TypeId]: TypeId;

  get spaceId(): SpaceId;

  get graph(): Hypergraph.Hypergraph;

  /**
   * Registry for this database. Delegates type lookups to the shared hypergraph registry.
   * To persist a schema so it replicates to other clients, add the type entity with
   * {@link addType} (e.g. `await db.addType(Type.makeObjectFromJsonSchema(...))`).
   */
  readonly registry: Registry.Registry;

  /**
   * Summary of the database for logging.
   *
   * @performance O(n) in loaded objects; allocates the object-core list to count it.
   */
  toJSON(): object;

  /**
   * Return object by local ID.
   * @deprecated Use `db.query(Filter.id(id)).runSync()[0]` for a working-set lookup, or resolve via a {@link Ref}.
   *
   * @performance O(1) working-set lookup by id; never loads from disk.
   */
  getObjectById<T extends Obj.Unknown = Obj.OfShape<AnyProperties>>(
    id: string,
    opts?: GetObjectByIdOptions,
  ): T | undefined;

  /**
   * Query objects.
   *
   * @performance O(AST size) to key the result cache; returns a shared, lazily executed result, so nothing runs until
   * read.
   */
  query: QueryFn;

  /**
   * Creates a reference to an existing object in the database.
   *
   * NOTE: The reference may be dangling if the object is not present in the database.
   * NOTE: Difference from `Ref.fromURI`
   * `Ref.fromURI(dxn)` returns an unhydrated reference. The `.load` and `.target` APIs will not work.
   * `db.makeRef(dxn)` is preferable in cases with access to the database.
   *
   * @performance O(1); allocates a resolver-bound ref without looking the target up.
   */
  makeRef<T extends Entity.Unknown = Entity.Unknown>(uri: URI.URI): Ref<T>;

  /**
   * Adds an object or relation to the database.
   *
   * Only Object and Relation entities are accepted. To persist a Type definition use
   * {@link addType} — passing a Type entity is rejected at compile time (and at runtime).
   *
   * Pass `{ to: feed }` to append to a feed instead (synchronous; confirm with {@link flush}).
   *
   * @performance Synchronous; O(n) in object size to write it into a new linked document (or the root), persisted in
   * the background.
   */
  add<T extends Entity.Unknown = Entity.Unknown>(obj: T & RejectTypeEntity<T>, opts?: AddOptions): T;

  /**
   * Persists a Type definition (clones/forks the entity) so it replicates to other peers.
   *
   * Runs a conflict query first: if a type with the same typename + version already exists in
   * this space, the existing persisted entity is returned and no duplicate is created. This is
   * the only supported way to add Type entities — {@link add} rejects them.
   *
   * @performance Async; O(t) in the space persisted types, which it queries in full for a duplicate before writing.
   */
  addType<T extends Type.AnyEntity>(type: T, opts?: WriteOptions): Promise<T>;

  /**
   * Removes object from the database.
   *
   * @performance O(1); sets the deletion marker (a soft delete).
   */
  // TODO(burdon): Return true if removed (currently throws if not present).
  remove(obj: Entity.Unknown, opts?: WriteOptions): void;

  /**
   * Appends entities to a feed.
   *
   * The feed must already be stored in the database (added via {@link add}); its underlying
   * queue is addressed by the feed object's URI.
   *
   * @performance Async; O(n) in entities encoded and appended to the feed in one batch.
   */
  appendToFeed(feed: Feed.Feed, entities: Entity.Unknown[], opts?: WriteOptions): Promise<void>;

  /**
   * Removes entities from a feed.
   *
   * @performance Async; O(n) in entities, deleted by id in one batch.
   */
  deleteFromFeed(feed: Feed.Feed, entities: Entity.Unknown[]): Promise<void>;

  /**
   * Wait for all pending changes to be saved to disk.
   * Optionaly waits for changes to be propagated to indexes and event handlers.
   *
   * @performance Async; always waits for pending document creation, then only for the disk, index and update work
   * that `opts` selects, so it is as slow as that selected backlog.
   */
  flush(opts?: FlushOptions): Promise<void>;

  //
  // Branching. A branch is a writable alternate timeline of an object subtree (same object ids,
  // shared automerge history, true CRDT merge-back). The registry is synced on the space root;
  // the currently-viewed branch stays device-local.
  //

  /**
   * The device-global current branch for an object id (`'main'` by default).
   * @deprecated Prefer `Obj.getBranch(obj)` — it takes the object and reports the branch of that
   * specific instance (including `db.branch()` independent instances), not just the device selection.
   *
   * @performance O(1) device-local map lookup.
   */
  getCurrentBranch(objectId: string): string;

  /**
   * An immutable snapshot of the object at the given historical heads — a detached instance, not a
   * pin on the live object. Prefer `Obj.getVersion(obj, heads)`.
   *
   * @performance O(object size) plus the Automerge cost of viewing the document at `heads`; nothing is cached.
   */
  getVersion<T extends Obj.Unknown>(obj: T, heads: readonly string[]): Obj.Snapshot<T>;

  /**
   * The object's history, oldest first: one entry per document change that touched the object (or,
   * given `property`, that property). Prefer `Obj.getChanges(obj, opts)`.
   *
   * @performance O(document history): diffs every change of the Automerge document and snapshots each match; not
   * cached.
   */
  getChanges<T extends Obj.Unknown>(obj: T, opts?: Obj.GetChangesOptions): Change.ValueChange<unknown>[];

  /**
   * All branch names available for an object, including the implicit `'main'` (always first).
   *
   * @performance O(1) for a subtree root; a member scans every branch record in the space to find its root.
   */
  listBranches(objectId: string): string[];

  /**
   * Fork the object and its referenced subtree into a new branch (does not switch to it).
   * @param opts.fromHeads Fork from a historical frontier instead of the tip (a bare heads array
   *   applies to the root only; a map forks each member from its own frontier).
   *
   * @performance Async; O(subtree size), each member document forked as a full history copy.
   */
  createBranch(
    rootObjectId: string,
    name: string,
    opts?: { fromHeads?: readonly string[] | Record<string, readonly string[]> },
  ): Promise<void>;

  /**
   * Switch the object's subtree to a branch (or back to `'main'`). Device-local; cascades to children.
   *
   * @performance Async; O(subtree size) rebinds, serialized with other branch operations.
   */
  switchBranch(rootObjectId: string, name: string): Promise<void>;

  /**
   * Merge a branch back into main across the subtree, then switch back to main.
   *
   * @performance Async; O(subtree size) Automerge merges followed by a switch back to main.
   */
  mergeBranch(rootObjectId: string, name: string, opts?: { deleteAfter?: boolean }): Promise<void>;

  /**
   * Fold main's changes into a branch across the subtree (the reverse of {@link mergeBranch}).
   *
   * @performance Async; O(subtree size) Automerge merges, serialized with other branch operations.
   */
  syncBranch(rootObjectId: string, name: string): Promise<void>;

  /**
   * Delete a branch (its documents lose their sync reference). Cannot delete `'main'`.
   *
   * @performance O(subtree size); one root-document change plus a background rebind of members viewing the branch.
   */
  deleteBranch(rootObjectId: string, name: string): void;

  /**
   * Create a caller-owned, writable binding to one branch of one object — a live object whose reads
   * resolve the branch document and whose writes land on the branch document only. Multiple bindings
   * to different branches of the same object may coexist; the device-global current branch and other
   * bindings are unaffected. Binding to `'main'` returns the canonical live object. Bindings are
   * ephemeral and never persisted — the caller must `dispose()`.
   *
   * @performance Async; O(1) for main, otherwise loads and binds the branch document of this one object.
   */
  branch<T extends Obj.Unknown>(obj: T, name: string): Promise<BranchBinding<T>>;

  /**
   * Removes feed items by ID.
   *
   * @performance Async; O(n) in ids, deleted in one batch.
   */
  removeFeedItemsByIds(feed: Feed.Feed, ids: string[]): Promise<void>;

  /**
   * Syncs a feed with the server.
   *
   * @performance Async; network-bound, proportional to the replication backlog.
   */
  syncFeed(feed: Feed.Feed, options?: Feed.SyncOptions): Promise<void>;

  /**
   * Returns queue replication backlog for the feed's namespace.
   *
   * @performance Async; one service round trip.
   */
  getFeedSyncState(feed: Feed.Feed): Promise<Feed.SyncState>;

  /**
   * Disposes and drops the in-memory handle (live working-set / core cache) for a feed, so the next
   * access re-reads it cold. Advanced cache-control; primarily used by tests to model a spawned
   * process reading the feed with an empty in-memory cache. Public (not `_`-prefixed) so it survives
   * declaration stripping for cross-package test use.
   *
   * @performance Async; O(1) eviction, and the next access re-reads the feed cold.
   */
  evictFeedHandle(feed: Feed.Feed): Promise<void>;

  /**
   * Hashes and uploads `bytes` via the chosen storage backend, returning an un-added Blob object.
   * Rejects with `Error.BlobTooLargeError` (over inline storage's fixed cap, or the backend's own
   * `maxSize`), `Error.BlobWriteError` (backend upload failure), or `Error.BlobNotAvailableError`
   * (`reason: 'backend-not-registered'` — the requested storage name has no registered backend).
   *
   * @performance Async; O(size) to hash, plus the backend upload (a no-op for inline storage).
   */
  createBlob(bytes: Uint8Array, options?: { type?: string; storage?: string }): Promise<Blob.Blob>;

  /**
   * Adopts bytes already staged by a direct upload, returning an un-added Blob object.
   *
   * Unlike {@link createBlob} the bytes never enter this process: they were written straight to the
   * store by whoever held the upload URL, which is the point — the uploader is typically an agent's
   * shell moving a file far too large to pass through a model. Size and content type therefore come
   * back from the store rather than from the caller.
   *
   * Rejects with `Error.BlobNotAvailableError` (`reason: 'backend-not-registered'` when the storage
   * name has no backend, `'not-found'` when the backend cannot adopt uploads or the upload is gone)
   * or `Error.BlobWriteError` if adoption fails.
   *
   * @performance Async; one backend round trip, and the bytes never pass through this process.
   */
  createBlobFromUpload(uploadId: string, options?: { storage?: string }): Promise<Blob.Blob>;

  /**
   * Loads a blob's bytes. Rejects with `Error.BlobNotAvailableError` if the backend for the blob's
   * storage scheme is not registered, offline, or cannot find the bytes.
   *
   * @performance Async; O(size), read inline or fetched from the backend.
   */
  readBlob(blob: Blob.Blob): Promise<Uint8Array>;

  /**
   * Checks whether a blob's bytes are currently available.
   *
   * @performance Async; one backend check, with no byte transfer.
   */
  blobExists(blob: Blob.Blob): Promise<boolean>;

  /**
   * Returns a renderable URL for the blob, if one can be produced.
   *
   * @performance Async; an inline blob encodes all of its bytes into a `data:` URL (O(size)), an external one asks the
   * backend.
   */
  getBlobUrl(blob: Blob.Blob): Promise<string | undefined>;

  /**
   * Get the current combined (automerge documents + feed blocks) sync state, reported against a
   * single remote peer.
   *
   * @performance Async; two concurrent service round trips (documents and feeds).
   */
  getSyncState(options?: GetSyncStateOptions): Promise<SyncState>;

  /**
   * Subscribe to combined sync state changes.
   *
   * @performance O(1) setup of two service streams, each update recombined in O(peers).
   */
  subscribeToSyncState(cb: (state: SyncState) => void, options?: GetSyncStateOptions): CleanupFn;

  /**
   * Per-space storage metrics: objects (alive/deleted), automerge documents, feeds, feed blocks.
   * Read-only. Intended as an occasional/administrative call. See garbage-collection design notes
   * in `@dxos/echo-host`.
   *
   * @performance Async; one host round trip plus an O(feeds) client-side tally.
   */
  stats(): Promise<DatabaseStats>;

  /**
   * Reclaim storage held by soft-deleted objects and the documents / feed blocks that are no longer
   * reachable. Per-space and destructive; intended as an occasional/administrative call. See
   * garbage-collection design notes in `@dxos/echo-host`.
   *
   * @performance Async; host-side and O(space size), so run it rarely.
   */
  runGarbageCollection(options?: GarbageCollectionOptions): Promise<GarbageCollectionReport>;

  /**
   * Replaces the set of objects the space directory tracks, dropping everything not retained.
   *
   * Derived from the directory's own maps, so clearing a space costs one change rather than a scan
   * of its contents. The objects are dropped, not soft-deleted: they are gone from the space and
   * their documents are reclaimed by garbage collection, on this peer and — as the change
   * replicates — on every other. Permanent; there is nothing left to restore from.
   *
   * @returns Ids of the objects dropped from the directory.
   *
   * @performance O(directory size) scan of the space root plus one root-document change, with no object loads.
   */
  retainObjects(keep: Iterable<string>): string[];
}

/**
 * Type guard for databases.
 *
 * @performance O(1) brand check; no allocation.
 */
export const isDatabase = (obj: unknown): obj is Database => {
  return obj ? typeof obj === 'object' && TypeId in obj && obj[TypeId] === TypeId : false;
};

export const Database: Schema.Codec<Database> = Schema.Any.pipe(Schema.refine(isDatabase));

/**
 * Effect service tag for Database dependency injection.
 */
export class Service extends Context.Service<
  Service,
  {
    readonly db: Database;
  }
>()('@dxos/echo/Database/Service') {}

/**
 * Layer that provides a Database service that throws when accessed.
 * Useful as a default layer when no database is available.
 */
export const notAvailable = Layer.succeed(Service, {
  get db(): Database {
    throw new globalThis.Error('Database not available');
  },
});

/**
 * Creates a Database service instance from a Database.
 *
 * @performance O(1).
 */
export const makeService = (db: Database): Service['Service'] => {
  return {
    get db() {
      return db;
    },
  };
};

/**
 * Creates a Layer that provides the Database service.
 *
 * @performance O(1).
 */
export const layer = (db: Database): Layer.Layer<Service> => {
  return Layer.succeed(Service, makeService(db));
};

/**
 * Stamps the database's space on every span the effect opens, so a span can be filtered by the space
 * it ran in. Applied after `Effect.withSpan`, so the span it names is inside the annotated region.
 *
 * @performance O(1) span annotation around the effect.
 */
export const withSpaceId = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R | Service> =>
  Effect.flatMap(Service, ({ db }) => effect.pipe(Effect.annotateSpans(SpanAttributes.SPACE_ID, db.spaceId)));

/**
 * Returns the space ID of the database.
 *
 * @performance O(1) service read.
 */
export const spaceId = Effect.gen(function* () {
  const { db } = yield* Service;
  return db.spaceId;
});

/**
 * Resolves an object by its DXN.
 *
 * @performance Async; working-set hit is O(1), otherwise loads the object from disk or the network.
 */
export const resolve: {
  // No type check.
  (ref: URI.URI | Ref<any>): Effect.Effect<Entity.Unknown, never, Service>;
  // Check matches schema.
  <S extends Type.AnyEntity>(
    ref: URI.URI | Ref<any>,
    schema: S,
  ): Effect.Effect<Type.InstanceType<S>, Error.EntityNotFoundError, Service>;
} = (<S extends Type.AnyEntity>(
  ref: URI.URI | Ref<any>,
  schema?: S,
): Effect.Effect<Type.InstanceType<S>, Error.EntityNotFoundError, Service> =>
  Effect.gen(function* () {
    const { db } = yield* Service;
    const dxn = typeof ref === 'string' ? ref : ref.uri;
    const object = yield* Effect.promise(() =>
      db.graph
        .createRefResolver({
          context: {
            space: db.spaceId,
          },
        })
        .resolveLegacy(dxn),
    );

    if (!object) {
      return yield* Effect.fail(new Error.EntityNotFoundError(dxn));
    }
    // `isInstanceOf` uses a conditional generic that TS can't resolve through
    // the local `S extends Type.AnyEntity` parameter — runtime accepts it fine.
    invariant(!schema || isInstanceOf(schema as any, object), 'Object type mismatch.');
    return object as any;
  }).pipe(Effect.withSpan('Database.resolve'), withSpaceId)) as any;

/**
 * Loads an object reference. A deleted target reads as absent unless `{ deleted: 'include' }` asks
 * for it.
 *
 * The options parameter means this cannot be passed point-free where the caller supplies a second
 * argument — `Effect.forEach(refs, (ref) => load(ref))`, not `Effect.forEach(refs, load)`, since the
 * iteratee index would land on `options`.
 *
 * Catching not found error:
 *
 * ```ts
 * yield* load(ref).pipe(Effect.catchTag('EntityNotFoundError', () => Effect.succeed(undefined)));
 * ```
 *
 * @performance Async; resolves immediately for a loaded target, otherwise loads from disk or the network.
 */
export const load: <T>(ref: Ref<T>, options?: LoadOptions) => Effect.Effect<T, Error.EntityNotFoundError, never> =
  Effect.fn('Database.load')(function* (ref, options) {
    const object = yield* Effect.promise(() => ref.tryLoad(options));
    if (!object) {
      return yield* Effect.fail(new Error.EntityNotFoundError(ref.uri));
    }
    return object;
  });

/**
 * Synchronous working-set read (see {@link Ref.peek}): the materialized target, or `undefined` —
 * never throws and never triggers loading. Compose with {@link load} for a sync-when-materialized
 * read with an async fallback, keeping the effect runnable under `Effect.runSync` when every ref
 * is materialized (e.g. a mutation in a gesture frame):
 *
 * ```ts
 * const task = Database.peek(ref) ?? (yield* Database.load(ref));
 * ```
 *
 * Peek skips {@link load}'s settling — a just-added object can resolve here before it has its own
 * document — so callers that branch (or otherwise need a settled document) must load.
 *
 * @performance O(1) working-set lookup; never loads and never throws.
 */
export const peek = <T>(ref: Ref<T>): T | undefined => ref.peek();

/**
 * Makes a reference to an object addressed by URI, resolvable against this database.
 * @see {@link Database.makeRef}
 *
 * @performance O(1) delegation to the database; costs whatever the corresponding method costs.
 */
export const makeRef = <T extends Entity.Unknown = Entity.Unknown>(
  uri: URI.URI,
): Effect.Effect<Ref<T>, never, Service> =>
  Service.pipe(Effect.map(({ db }) => db.makeRef<T>(uri))).pipe(Effect.withSpan('Database.makeRef'), withSpaceId);

/**
 * Adds an object or relation to the database.
 * @see {@link Database.add}
 *
 * @performance O(1) delegation to the database; costs whatever the corresponding method costs.
 */
// The Effect wrapper intentionally omits the method's `opts` (e.g. `{ to: feed }`): it is applied
// point-free (`Effect.forEach(Database.add)`), where a second parameter would collide with the
// iteratee index. Effect-style feed appends go through `Database.appendToFeed` / `Feed.append`.
export const add = <T extends Entity.Unknown>(obj: T & RejectTypeEntity<T>): Effect.Effect<T, never, Service> =>
  Service.pipe(Effect.flatMap(({ db }) => Effect.map(Origin, (origin) => db.add<T>(obj, { origin })))).pipe(
    Effect.withSpan('Database.add'),
    withSpaceId,
  );

/**
 * Persists a Type definition to the database.
 * @see {@link Database.addType}
 *
 * @performance O(1) delegation to the database; costs whatever the corresponding method costs.
 */
export const addType = <T extends Type.AnyEntity>(type: T): Effect.Effect<T, never, Service> =>
  Service.pipe(
    Effect.flatMap(({ db }) => Effect.flatMap(Origin, (origin) => Effect.promise(() => db.addType(type, { origin })))),
  ).pipe(Effect.withSpan('Database.addType'), withSpaceId);

/**
 * Removes an object from the database.
 * @see {@link Database.remove}
 *
 * @performance O(1) delegation to the database; costs whatever the corresponding method costs.
 */
export const remove = <T extends Entity.Unknown>(obj: T): Effect.Effect<void, never, Service> =>
  Service.pipe(Effect.flatMap(({ db }) => Effect.map(Origin, (origin) => db.remove(obj, { origin })))).pipe(
    Effect.withSpan('Database.remove'),
    withSpaceId,
  );

/**
 * Appends entities to a feed.
 * @see {@link Database.appendToFeed}
 *
 * @performance O(1) delegation to the database; costs whatever the corresponding method costs.
 */
export const appendToFeed = (feed: Feed.Feed, entities: Entity.Unknown[]): Effect.Effect<void, never, Service> =>
  Service.pipe(
    Effect.flatMap(({ db }) =>
      Effect.flatMap(Origin, (origin) => Effect.promise(() => db.appendToFeed(feed, entities, { origin }))),
    ),
  ).pipe(Effect.withSpan('Database.appendToFeed'), withSpaceId);

/**
 * Removes entities from a feed.
 * @see {@link Database.deleteFromFeed}
 *
 * @performance O(1) delegation to the database; costs whatever the corresponding method costs.
 */
export const deleteFromFeed = (feed: Feed.Feed, entities: Entity.Unknown[]): Effect.Effect<void, never, Service> =>
  Service.pipe(Effect.flatMap(({ db }) => Effect.promise(() => db.deleteFromFeed(feed, entities)))).pipe(
    Effect.withSpan('Database.deleteFromFeed'),
    withSpaceId,
  );

/**
 * Flushes pending changes to disk.
 * @see {@link Database.flush}
 *
 * @performance O(1) delegation to the database; costs whatever the corresponding method costs.
 */
export const flush = (opts?: FlushOptions) =>
  Service.pipe(Effect.flatMap(({ db }) => Effect.promise(() => db.flush(opts)))).pipe(
    Effect.withSpan('Database.flush'),
    withSpaceId,
  );

/**
 * Reclaims storage held by soft-deleted objects and the documents they orphan.
 * @see {@link Database.runGarbageCollection}
 *
 * @performance O(1) delegation to the database; costs whatever the corresponding method costs.
 */
export const runGarbageCollection = (options?: GarbageCollectionOptions) =>
  Service.pipe(Effect.flatMap(({ db }) => Effect.promise(() => db.runGarbageCollection(options)))).pipe(
    Effect.withSpan('Database.runGarbageCollection'),
    withSpaceId,
  );

/**
 * Drops every object in the space except the retained ones. Permanent.
 * @see {@link Database.retainObjects}
 *
 * @performance O(1) delegation to the database; costs whatever the corresponding method costs.
 */
export const retainObjects = (keep: Iterable<string>) =>
  Service.pipe(Effect.map(({ db }) => db.retainObjects(keep))).pipe(
    Effect.withSpan('Database.retainObjects'),
    withSpaceId,
  );

/**
 * Per-space storage metrics.
 * @see {@link Database.stats}
 *
 * @performance O(1) delegation to the database; costs whatever the corresponding method costs.
 */
export const stats = () =>
  Service.pipe(Effect.flatMap(({ db }) => Effect.promise(() => db.stats()))).pipe(
    Effect.withSpan('Database.stats'),
    withSpaceId,
  );

/**
 * Creates a `QueryResult` object that can be subscribed to.
 *
 * @performance O(1) delegation to the database; costs whatever the corresponding method costs.
 */
export const query: {
  <Q extends Query.Any>(query: Q): QueryResult.QueryResultEffect<Query.Type<Q>, never, Service>;
  <F extends Filter.Any>(filter: F): QueryResult.QueryResultEffect<Filter.Type<F>, never, Service>;
} = (queryOrFilter: Query.Any | Filter.Any) =>
  Service.pipe(
    Effect.map(({ db }) => db.query(queryOrFilter as any) as QueryResult.QueryResult<any>),
    Effect.withSpan('Database.query'),
    withSpaceId,
    queryInternal.makeQueryResultEffect,
  );

/**
 * Sync state of the database in relation to EDGE.
 */
export interface SyncState {
  //
  // Automerge
  //

  /**
   * Total number of documents locally.
   */
  readonly localDocumentCount: number;
  /**
   * Total number of documents on the remote peer.
   */
  readonly remoteDocumentCount: number;
  /**
   * Total number of documents across this peer and the remote peer.
   */
  readonly totalDocumentCount: number;
  /**
   * Total number of documents that are not synced.
   * Includes documents that are present only locally, only on the remote peer, or whether the peers have different versions.
   */
  readonly unsyncedDocumentCount: number;

  //
  // Feeds.
  //

  /**
   * Blocks still to pull from remote. 0 when caught up.
   */
  readonly blocksToPull: string;
  /**
   * Unpositioned blocks still to push to remote. 0 when caught up.
   */
  readonly blocksToPush: string;
  /**
   * Total blocks stored locally for this namespace in the space.
   */
  readonly totalBlocks: string;
}

/**
 * Per-space storage metrics returned by {@link Database.stats}.
 */
export interface DatabaseStats {
  readonly objects: {
    /** Live (non-deleted) objects across the root and all linked documents. */
    readonly alive: number;
    /** Soft-deleted objects not yet reclaimed by garbage collection. */
    readonly deleted: number;
  };
  /** Automerge documents owned by the space (root + linked + branch documents). */
  readonly documents: number;
  /** Feeds registered for the space. */
  readonly feeds: number;
  /** Total feed blocks stored locally for the space. */
  readonly feedBlocks: number;
  /**
   * What is resident in memory right now, as opposed to the stored counts above. Split by realm
   * because the client and the host cache independently — a client-side working set that is never
   * released reads as nothing at all in the host's numbers, and vice versa.
   */
  readonly loaded: {
    readonly client: ClientLoadedStats;
    readonly host: HostLoadedStats;
  };
}

/**
 * Client-side residency. Space-scoped except where noted.
 */
export interface ClientLoadedStats {
  /** Document handles held by this space's repo proxy. */
  readonly documents: number;
  /** Object cores held by this space's entity manager. */
  readonly objects: number;
  /** Feed handles cached by this database. */
  readonly feeds: number;
  /** Objects resident across those feed handles — the feeds' working set, not what is stored. */
  readonly feedObjects: number;
  /** Entities in the runtime registry (types and other static entities), across the whole client. */
  readonly registryTotal: number;
}

/**
 * Host-side residency. A document on disk costs nothing until a handle for it is cached.
 */
export interface HostLoadedStats {
  /** Automerge handles cached for this space. */
  readonly documents: number;
  /** Automerge handles cached across every space on this host. */
  readonly documentsTotal: number;
  /** Active reactive queries registered with the host, across every space. */
  readonly queriesTotal: number;
  /** Documents something on the host is using right now, across every space; the rest of `documentsTotal` is idle cache. */
  readonly leases: number;
}

/**
 * Options for {@link Database.runGarbageCollection}.
 */
export interface GarbageCollectionOptions {
  /**
   * Also delete stale index rows for reclaimed documents/objects.
   * @default true
   */
  readonly index?: boolean;
  /**
   * Reserved for feed-block purge (positioned deletion markers). Not yet effective on the local
   * host — see the feed-purge deferral in `@dxos/echo-host` garbage-collection design notes.
   * @default true
   */
  readonly feeds?: boolean;
}

/**
 * Report of what {@link Database.runGarbageCollection} reclaimed.
 */
export interface GarbageCollectionReport {
  /** Soft-deleted objects unlinked from the space directory. */
  readonly unlinkedObjects: number;
  /** Automerge documents wiped from storage (chunks + heads). */
  readonly removedDocuments: number;
  /** Index rows deleted. */
  readonly removedIndexEntries: number;
  /** Feed blocks purged. */
  readonly purgedFeedBlocks: number;
}

/**
 * Options for reading combined sync state.
 */
export interface GetSyncStateOptions {
  /**
   * Peer to report the automerge document backlog against. Defaults to the EDGE peer.
   * Provide explicitly in local/test topologies where there is no EDGE peer.
   */
  readonly peerId?: string;
}

/**
 * Get the current sync state.
 *
 * @performance O(1) delegation to the database; costs whatever the corresponding method costs.
 */
export const getSyncState = (options?: GetSyncStateOptions): Effect.Effect<SyncState, never, Service> =>
  Service.pipe(Effect.flatMap(({ db }) => Effect.promise(() => db.getSyncState(options))));

/**
 * Subscribe to sync state changes.
 *
 * @performance O(1) delegation to the database; costs whatever the corresponding method costs.
 */
export const subscribeToSyncState = (options?: GetSyncStateOptions): Stream.Stream<SyncState, never, Service> =>
  Stream.callback<SyncState, never, Service>((queue) =>
    Effect.gen(function* () {
      const { db } = yield* Service;
      const cleanup = db.subscribeToSyncState((state) => Queue.offerUnsafe(queue, state), options);
      yield* Effect.addFinalizer(() => Effect.sync(cleanup));
    }),
  );
