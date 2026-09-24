//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { type Context } from '@dxos/context';
import { ATTR_META, ATTR_RELATION_SOURCE, ATTR_TYPE } from '@dxos/echo/internal';
import { SpanAttributes } from '@dxos/effect';
import type { EntityId, SpaceId, URI } from '@dxos/keys';

import { ConvergenceKeyIntentStore } from './convergence-key-intent-store.ts';
import { type IndexDataSource } from './data-source.ts';
import { type IndexCursor, IndexTracker } from './index-tracker.ts';
import { IndexedObjectSource } from './indexed-object-source.ts';
import {
  type EntityMeta,
  EntityMetaIndex,
  FtsIndex,
  type FtsQuery,
  type FtsQueryResult,
  type Index,
  type IndexerObject,
  ObjectSnapshotIndex,
  type QueueRef,
  type QueueWindow,
  type Referrer,
  ReverseRefIndex,
  type ReverseRefQuery,
} from './indexes/index.ts';

/**
 * Result of a single indexing pass over a data source.
 * Carries enough metadata for callers to build targeted invalidation hints.
 */
export type IndexingResult = {
  updated: number;
  done: boolean;
  spaces: ReadonlySet<SpaceId>;
  queues: ReadonlySet<EntityId>;
  documents: ReadonlySet<string>;
  types: ReadonlySet<string>;
  objects: ReadonlySet<EntityId>;
};

type MutableIndexingResult = {
  updated: number;
  done: boolean;
  spaces: Set<SpaceId>;
  queues: Set<EntityId>;
  documents: Set<string>;
  types: Set<string>;
  objects: Set<EntityId>;
};

const makeEmptyIndexingResult = (): MutableIndexingResult => ({
  updated: 0,
  done: true,
  spaces: new Set(),
  queues: new Set(),
  documents: new Set(),
  types: new Set(),
  objects: new Set(),
});

const accumulateIndexingResult = (acc: MutableIndexingResult, objects: readonly IndexerObject[]) => {
  for (const obj of objects) {
    acc.spaces.add(obj.spaceId);
    if (obj.queueId) {
      acc.queues.add(obj.queueId);
    }
    if (obj.documentId) {
      acc.documents.add(obj.documentId);
    }
    const t = (obj.data as Record<string, unknown>)[ATTR_TYPE];
    if (t) {
      acc.types.add(String(t));
    }
    if (obj.data.id) {
      acc.objects.add(obj.data.id as EntityId);
    }
  }
};

/**
 * The convergence key an indexed object contributes to the merge trigger, if any.
 *
 * Queue (feed) entities are out of merge scope — they have no automerge document to merge — and
 * relations are excluded: they are not merge subjects (endpoints would not be reconciled). The
 * empty string is not a key; grouping on it would merge unrelated entities.
 */
const convergenceKeyOf = (obj: IndexerObject): string | undefined => {
  if (!obj.documentId || (obj.data as Record<string, unknown>)[ATTR_RELATION_SOURCE] !== undefined) {
    return undefined;
  }
  const convergenceKey = (obj.data[ATTR_META] as { convergenceKey?: string } | undefined)?.convergenceKey;
  return typeof convergenceKey === 'string' && convergenceKey.length > 0 ? convergenceKey : undefined;
};

/** Name every index tracks its cursor under; a new name retires the old cursor and rebuilds. */
const INDEX_NAMES = {
  objectSnapshot: 'objectSnapshot',
  // Bumped for `propPathNormalized`, which the compiled query path matches reference paths on.
  reverseRef: 'reverseRef3',
  fts: 'fts7',
} as const;

/** `json_type(x, path)`, which the compiled query path relies on, returns NULL for a missing path only from here. */
const MIN_SQLITE_VERSION = [3, 45, 0] as const;

const compareVersions = (version: string, minimum: readonly number[]): number => {
  const parts = version.split('.').map((part) => Number.parseInt(part, 10));
  for (let index = 0; index < minimum.length; index++) {
    const actual = parts[index] ?? 0;
    if (actual !== minimum[index]) {
      return actual < minimum[index] ? -1 : 1;
    }
  }
  return 0;
};

export class IndexEngine {
  readonly #sql: SqlClient.SqlClient;

  // The engine owns its stores outright; a caller that wants to read one constructs its own
  // against the same client.
  readonly #tracker: IndexTracker;
  readonly #objectMetaIndex: EntityMetaIndex;
  readonly #ftsIndex: FtsIndex;
  readonly #objectSnapshotIndex: ObjectSnapshotIndex;
  readonly #reverseRefIndex: ReverseRefIndex;
  readonly #convergenceKeyIntents: ConvergenceKeyIntentStore;
  readonly #indexedObjectSource: IndexedObjectSource;

  constructor(sql: SqlClient.SqlClient) {
    this.#sql = sql;
    this.#tracker = new IndexTracker(sql);
    this.#objectMetaIndex = new EntityMetaIndex(sql);
    this.#ftsIndex = new FtsIndex(sql);
    this.#objectSnapshotIndex = new ObjectSnapshotIndex(sql);
    this.#reverseRefIndex = new ReverseRefIndex(sql);
    this.#convergenceKeyIntents = new ConvergenceKeyIntentStore(sql);
    this.#indexedObjectSource = new IndexedObjectSource(sql);
  }

  migrate() {
    return Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      const [{ version }] = yield* sql<{ version: string }>`SELECT sqlite_version() AS version`;
      if (compareVersions(version, MIN_SQLITE_VERSION) < 0) {
        return yield* Effect.die(
          new Error(`SQLite ${version} is below the ${MIN_SQLITE_VERSION.join('.')} the index requires`),
        );
      }
      yield* this.#tracker.migrate();
      yield* this.#objectMetaIndex.migrate();
      yield* this.#ftsIndex.migrate();
      yield* this.#objectSnapshotIndex.migrate();
      yield* this.#reverseRefIndex.migrate();
      yield* this.#convergenceKeyIntents.migrate();
    });
  }

  /**
   * Query text index and return full object metadata with rank.
   *
   * Reads the index as it stands: this is a query, not an indexing pass. A caller that has just
   * written and needs its own write matched drains first, via `Database.flush({ secondaryIndexes:
   * true })`.
   */
  queryText(query: FtsQuery): Effect.Effect<readonly FtsQueryResult[], SqlError.SqlError> {
    return this.#ftsIndex.query(query);
  }

  queryReverseRef(query: ReverseRefQuery) {
    // TODO(mykola): Join with metadata table here.
    return this.#reverseRefIndex.query(query);
  }

  /**
   * Referrers of one target in one space, joined to the object metadata for the referrer's
   * document (see {@link ReverseRefIndex.queryReferrers}).
   */
  queryReferrers(spaceId: SpaceId, targetDXN: URI.URI): Effect.Effect<readonly Referrer[], SqlError.SqlError> {
    return this.#reverseRefIndex.queryReferrers({ spaceId, targetDXN });
  }

  queryAll(query: {
    spaceIds: readonly SpaceId[];
    includeAllQueues?: boolean;
    queues?: readonly QueueRef[] | null;
    window?: QueueWindow;
  }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError> {
    return this.#objectMetaIndex.queryAll(query);
  }

  /**
   * True once every `objectMeta` row has a snapshot.
   *
   * `objectSnapshot` is filled by the indexing pass, so a database that predates it holds rows
   * without one, and the store fills over several passes after upgrade. The compiled query path
   * reads that store directly instead of loading documents, so until it is complete a query there
   * would silently return fewer objects than exist — not stale data, missing data. The query
   * service gates a compiled query's first execution on this and caches `true` once seen, since it
   * never goes back to false. The in-memory path loads documents itself and is not gated.
   */
  hasCompleteSnapshots(): Effect.Effect<boolean, SqlError.SqlError, SqlClient.SqlClient> {
    return this.#objectSnapshotIndex.countMissingSnapshots().pipe(Effect.map((missing) => missing === 0));
  }

  /**
   * Query snapshots by recordIds.
   * Used to load queue objects from indexed snapshots.
   */
  querySnapshotsJSON(recordIds: number[]) {
    return this.#objectSnapshotIndex.querySnapshotsJSON(recordIds);
  }

  /**
   * Indexes one batch into every secondary index — those sourced from the index itself rather than
   * from automerge or a feed (see {@link IndexedObjectSource}). `done` reports an empty batch, so a
   * caller wanting the whole backlog loops until it is set, exactly as with {@link update}.
   */
  updateSecondaryIndexes(ctx: Context, opts?: { limit?: number }): Effect.Effect<IndexingResult, SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      const result = makeEmptyIndexingResult();
      const cursors = yield* this.#tracker.queryCursorsBySource({ sourceName: this.#indexedObjectSource.sourceName });

      const { updated, done, objects } = yield* this.#update(ctx, this.#ftsIndex, this.#indexedObjectSource, {
        indexName: INDEX_NAMES.fts,
        spaceId: null,
        limit: opts?.limit,
        cursors: cursors.get(INDEX_NAMES.fts) ?? [],
      });
      result.updated += updated;
      result.done = result.done && done;
      accumulateIndexingResult(result, objects);

      return result as IndexingResult;
    }).pipe(Effect.withSpan('IndexEngine.updateSecondaryIndexes'));
  }

  /**
   * Live rows carrying any of the given convergence keys in one space — the detection point-lookup
   * for convergence-key merging.
   */
  queryByConvergenceKeys(
    spaceId: SpaceId,
    convergenceKeys: readonly string[],
  ): Effect.Effect<readonly EntityMeta[], SqlError.SqlError> {
    return this.#objectMetaIndex.queryByConvergenceKeys(spaceId, convergenceKeys);
  }

  /**
   * Pending convergence-key merge intents (see {@link ConvergenceKeyIntentStore.record}).
   */
  takeConvergenceKeyIntents(): Effect.Effect<{ maxId: number; intents: Map<SpaceId, Set<string>> }, SqlError.SqlError> {
    return this.#convergenceKeyIntents.take();
  }

  /**
   * Clear a serviced convergence-key intent up to the id returned by {@link takeConvergenceKeyIntents}.
   */
  clearConvergenceKeyIntents(
    spaceId: SpaceId,
    convergenceKey: string,
    upToId: number,
  ): Effect.Effect<void, SqlError.SqlError> {
    return this.#convergenceKeyIntents.clear(spaceId, convergenceKey, upToId);
  }

  queryType(query: Pick<EntityMeta, 'spaceId' | 'typeDXN'>): Effect.Effect<readonly EntityMeta[], SqlError.SqlError> {
    return this.#objectMetaIndex.query(query);
  }

  /**
   * Query children by parent object ids.
   */
  queryChildren(query: {
    spaceId: SpaceId[];
    parentIds: EntityId[];
  }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError> {
    return this.#objectMetaIndex.queryChildren(query);
  }

  queryTypes(query: {
    spaceIds: readonly SpaceId[];
    typeDxns: readonly EntityMeta['typeDXN'][];
    inverted?: boolean;
    includeAllQueues?: boolean;
    queues?: readonly QueueRef[] | null;
    window?: QueueWindow;
  }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError> {
    return this.#objectMetaIndex.queryTypes(query);
  }
  queryByTimeRange(query: {
    spaceIds: readonly string[];
    updatedAfter?: number;
    updatedBefore?: number;
    createdAfter?: number;
    createdBefore?: number;
    includeAllQueues?: boolean;
    queues?: readonly QueueRef[] | null;
  }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError> {
    return this.#objectMetaIndex.queryByTimeRange(query);
  }

  queryRelations(query: {
    endpoint: 'source' | 'target';
    anchorDxns: readonly string[];
  }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError> {
    return this.#objectMetaIndex.queryRelations(query);
  }
  lookupByRecordIds(recordIds: number[]): Effect.Effect<readonly EntityMeta[], SqlError.SqlError> {
    return this.#objectMetaIndex.lookupByRecordIds(recordIds);
  }

  lookupByObjectId(query: {
    objectId: string;
    spaceId: string;
    queueId: string;
  }): Effect.Effect<EntityMeta | null, SqlError.SqlError> {
    return this.#objectMetaIndex.lookupByObjectId(query);
  }

  queryObjectIds(query: {
    spaceIds: readonly SpaceId[];
    objectIds: readonly EntityMeta['objectId'][];
  }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError> {
    return this.#objectMetaIndex.queryObjectIds(query);
  }

  /**
   * Delete index rows for garbage-collected documents and objects: whole documents (all their
   * rows) plus individual objects removed from a surviving document. Cascades from `objectMeta`
   * (by record id) into the snapshot store and the FTS and reverse-ref indexes, and drops the
   * tracker cursors for wiped documents. See `docs/GARBAGE_COLLECTION.md` in `@dxos/echo-host`.
   *
   * @returns Number of `objectMeta` rows deleted.
   */
  deleteObjects(opts: {
    spaceId: SpaceId;
    documentIds: readonly string[];
    objects: readonly { documentId: string; objectId: string }[];
  }): Effect.Effect<number, SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      const sql = this.#sql;
      return yield* sql.withTransaction(
        Effect.gen({ self: this }, function* () {
          const recordIds = yield* this.#objectMetaIndex.selectRecordIdsForRemoval({
            spaceId: opts.spaceId,
            documentIds: opts.documentIds,
            objects: opts.objects,
          });
          if (recordIds.length > 0) {
            yield* this.#ftsIndex.deleteByRecordIds(recordIds);
            yield* this.#objectSnapshotIndex.deleteByRecordIds(recordIds);
            yield* this.#reverseRefIndex.deleteByRecordIds(recordIds);
            yield* this.#objectMetaIndex.deleteByRecordIds(recordIds);
          }
          if (opts.documentIds.length > 0) {
            yield* this.#tracker.deleteCursors({ spaceId: opts.spaceId, resourceIds: opts.documentIds });
          }
          return recordIds.length;
        }),
      );
    }).pipe(Effect.withSpan('IndexEngine.deleteObjects'), SpanAttributes.annotateSpace(opts.spaceId));
  }

  update(
    ctx: Context,
    dataSource: IndexDataSource,
    opts: { spaceId: SpaceId | null; limit?: number },
  ): Effect.Effect<IndexingResult, SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      const result = makeEmptyIndexingResult();

      dataSource.beginPass?.();

      // One cursor read serves every index in this pass; the per-index diff still uses its own slice.
      const cursorsByIndex = yield* this.#tracker.queryCursorsBySource({
        sourceName: dataSource.sourceName,
        // Pass undefined to get all cursors when spaceId is null.
        spaceId: opts.spaceId ?? undefined,
      });

      // The full-text index is not a leg of this pass: it is a secondary index, sourced from what
      // this one writes (see `updateSecondaryIndexes`).
      const {
        updated: updatedSnapshotIndex,
        done: doneSnapshotIndex,
        objects: snapshotObjects,
      } = yield* this.#update(ctx, this.#objectSnapshotIndex, dataSource, {
        indexName: INDEX_NAMES.objectSnapshot,
        spaceId: opts.spaceId,
        limit: opts.limit,
        cursors: cursorsByIndex.get(INDEX_NAMES.objectSnapshot) ?? [],
      });
      result.updated += updatedSnapshotIndex;
      result.done = result.done && doneSnapshotIndex;
      accumulateIndexingResult(result, snapshotObjects);

      const {
        updated: updatedReverseRefIndex,
        done: doneReverseRefIndex,
        objects: reverseRefObjects,
      } = yield* this.#update(ctx, this.#reverseRefIndex, dataSource, {
        indexName: INDEX_NAMES.reverseRef,
        spaceId: opts.spaceId,
        limit: opts.limit,
        cursors: cursorsByIndex.get(INDEX_NAMES.reverseRef) ?? [],
      });
      result.updated += updatedReverseRefIndex;
      result.done = result.done && doneReverseRefIndex;
      accumulateIndexingResult(result, reverseRefObjects);

      return result as IndexingResult;
    }).pipe(
      // The snapshot must be dropped even when a pass fails, or the next pass would diff against
      // stale heads and silently skip documents changed in between.
      Effect.ensuring(Effect.sync(() => dataSource.endPass?.())),
      Effect.withSpan('IndexEngine.update'),
      SpanAttributes.annotateSpace(opts.spaceId),
    );
  }

  /**
   * Indexes one batch from a source into one index, advancing that index's cursor in the same
   * transaction as the write so an interrupted pass resumes rather than losing the batch.
   *
   * A source feeding a primary index carries objects that may be new, so the batch is first written
   * to `objectMeta` — which stamps each object's `version` and yields the `recordId` the index
   * keys on. A source reading the index back (`indexed`) skips that: the rows are already there,
   * and re-stamping them would bump the very counter the source reads.
   */
  #update(
    ctx: Context,
    index: Index,
    source: IndexDataSource,
    opts: { indexName: string; spaceId: SpaceId | null; limit?: number; cursors: IndexCursor[] },
  ): Effect.Effect<{ updated: number; done: boolean; objects: readonly IndexerObject[] }, SqlError.SqlError> {
    return Effect.gen({ self: this }, function* () {
      const sql = this.#sql;

      // Reads run OUTSIDE the transaction: getChangedObjects may call RuntimeProvider.runPromise
      // internally (e.g. listDocumentHeads), which creates a fresh Effect fiber with no
      // TransactionConnection context. If those reads ran inside withTransaction, they would
      // try to acquire the same semaphore that the transaction already holds — causing a deadlock.
      const { objects, cursors: updatedCursors } = yield* source.getChangedObjects(ctx, opts.cursors, {
        limit: opts.limit,
      });

      if (objects.length === 0) {
        return { updated: 0, done: true, objects: [] as readonly IndexerObject[] };
      }

      // Convergence keys in this batch, deduplicated — recorded as durable merge intents inside the
      // transaction below, atomically with the cursor advance that would otherwise be the only
      // record that these writes were ever seen. A source reading the index has already contributed
      // them, and would otherwise re-raise the same merge on every pass.
      const intents: { spaceId: SpaceId; convergenceKey: string }[] = [];
      const seenIntents = new Set<string>();
      for (const obj of source.indexed ? [] : objects) {
        const convergenceKey = convergenceKeyOf(obj);
        if (convergenceKey !== undefined) {
          const composite = JSON.stringify([obj.spaceId, convergenceKey]);
          if (!seenIntents.has(composite)) {
            seenIntents.add(composite);
            intents.push({ spaceId: obj.spaceId, convergenceKey });
          }
        }
      }

      // Writes run INSIDE the transaction for atomicity.
      return yield* sql.withTransaction(
        Effect.gen({ self: this }, function* () {
          if (!source.indexed) {
            // Ensure objects exist in EntityMetaIndex.
            yield* this.#objectMetaIndex.update(objects);

            // Look up recordIds for the objects.
            yield* this.#objectMetaIndex.lookupRecordIds(objects);

            yield* this.#convergenceKeyIntents.record(intents);
          }

          yield* index.update(objects);
          yield* this.#tracker.updateCursors(
            updatedCursors.map((_): IndexCursor => ({
              indexName: opts.indexName,
              spaceId: _.spaceId,
              sourceName: source.sourceName,
              resourceId: _.resourceId,
              cursor: _.cursor,
            })),
          );
          return { updated: objects.length, done: false, objects };
        }),
      );
    }).pipe(Effect.withSpan('IndexEngine.#update'), SpanAttributes.annotateSpace(opts.spaceId));
  }
}
