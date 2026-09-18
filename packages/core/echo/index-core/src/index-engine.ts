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
import { type IndexCursor, IndexTracker } from './index-tracker.ts';
import {
  ActivityIndex,
  type ActivityRow,
  type ChangeSummary,
  type EntityMeta,
  EntityMetaIndex,
  FtsIndex,
  type FtsQuery,
  type FtsQueryResult,
  type Index,
  type IndexerObject,
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

/**
 * Cursor into indexable data-source.
 */
export interface DataSourceCursor {
  spaceId: SpaceId | null;

  /**
   * documentId or queueNamespace.
   */
  resourceId: string | null;

  /**
   * heads or queue position.
   */
  cursor: number | string;
}

export interface IndexDataSource {
  readonly sourceName: string; // e.g. queue, automerge, etc.

  /**
   * Marks the start/end of one `IndexEngine.update` pass, letting a source reuse the
   * cursor-independent part of its read across every index updated in that pass. Cursors differ per
   * index, so the diff itself cannot be shared — only the underlying snapshot. Optional: a source
   * with no expensive shared read can omit both.
   */
  beginPass?(): void;
  endPass?(): void;

  /**
   * Objects changed since `cursors`, and, when `opts.changes` is set, a summary of every change
   * behind them (the activity ledger's input). Both are relative to the same cursors, so a source
   * reporting a change once per cursor advance reports it exactly once. `opts.objects === false`
   * asks for the summaries alone, so a changes-only caller does not pay for object extraction.
   */
  getChangedObjects(
    ctx: Context,
    cursors: DataSourceCursor[],
    opts?: { limit?: number; changes?: boolean; objects?: boolean },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[]; changes?: ChangeSummary[] }>;
}

export interface IndexEngineParams {
  tracker: IndexTracker;
  objectMetaIndex: EntityMetaIndex;
  ftsIndex: FtsIndex;
  reverseRefIndex: ReverseRefIndex;
  activityIndex?: ActivityIndex;

  /** Defaults to a fresh store; injectable for tests. */
  convergenceKeyIntents?: ConvergenceKeyIntentStore;
}

export class IndexEngine {
  readonly #tracker: IndexTracker;
  readonly #objectMetaIndex: EntityMetaIndex;
  readonly #ftsIndex: FtsIndex;
  readonly #reverseRefIndex: ReverseRefIndex;
  readonly #activityIndex: ActivityIndex;
  readonly #convergenceKeyIntents: ConvergenceKeyIntentStore;

  constructor(params?: IndexEngineParams) {
    this.#tracker = params?.tracker ?? new IndexTracker();
    this.#objectMetaIndex = params?.objectMetaIndex ?? new EntityMetaIndex();
    this.#ftsIndex = params?.ftsIndex ?? new FtsIndex();
    this.#reverseRefIndex = params?.reverseRefIndex ?? new ReverseRefIndex();
    this.#activityIndex = params?.activityIndex ?? new ActivityIndex();
    this.#convergenceKeyIntents = params?.convergenceKeyIntents ?? new ConvergenceKeyIntentStore();
  }

  migrate() {
    return Effect.gen({ self: this }, function* () {
      yield* this.#tracker.migrate();
      yield* this.#objectMetaIndex.migrate();
      yield* this.#ftsIndex.migrate();
      yield* this.#reverseRefIndex.migrate();
      yield* this.#activityIndex.migrate();
      yield* this.#convergenceKeyIntents.migrate();
    });
  }

  /**
   * Query text index and return full object metadata with rank.
   */
  queryText(query: FtsQuery): Effect.Effect<readonly FtsQueryResult[], SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen({ self: this }, function* () {
      return yield* this.#ftsIndex.query(query);
    });
  }

  queryReverseRef(query: ReverseRefQuery) {
    // TODO(mykola): Join with metadata table here.
    return this.#reverseRefIndex.query(query);
  }

  /**
   * Hour buckets of the activity ledger for one space (see {@link ActivityIndex.query}).
   */
  queryActivity(query: {
    spaceId: string;
    from?: number;
    to?: number;
  }): Effect.Effect<readonly ActivityRow[], SqlError.SqlError, SqlClient.SqlClient> {
    return this.#activityIndex.query(query);
  }

  /**
   * Referrers of one target in one space, joined to the object metadata for the referrer's
   * document (see {@link ReverseRefIndex.queryReferrers}).
   */
  queryReferrers(
    spaceId: SpaceId,
    targetDXN: URI.URI,
  ): Effect.Effect<readonly Referrer[], SqlError.SqlError, SqlClient.SqlClient> {
    return this.#reverseRefIndex.queryReferrers({ spaceId, targetDXN });
  }

  queryAll(query: {
    spaceIds: readonly SpaceId[];
    includeAllQueues?: boolean;
    queues?: readonly QueueRef[] | null;
    window?: QueueWindow;
  }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> {
    return this.#objectMetaIndex.queryAll(query);
  }

  /**
   * Query snapshots by recordIds.
   * Used to load queue objects from indexed snapshots.
   */
  querySnapshotsJSON(recordIds: number[]) {
    return this.#ftsIndex.querySnapshotsJSON(recordIds);
  }

  /**
   * Live rows carrying any of the given convergence keys in one space — the detection point-lookup
   * for convergence-key merging.
   */
  queryByConvergenceKeys(
    spaceId: SpaceId,
    convergenceKeys: readonly string[],
  ): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> {
    return this.#objectMetaIndex.queryByConvergenceKeys(spaceId, convergenceKeys);
  }

  /**
   * Pending convergence-key merge intents (see {@link ConvergenceKeyIntentStore.record}).
   */
  takeConvergenceKeyIntents(): Effect.Effect<
    { maxId: number; intents: Map<SpaceId, Set<string>> },
    SqlError.SqlError,
    SqlClient.SqlClient
  > {
    return this.#convergenceKeyIntents.take();
  }

  /**
   * Clear a serviced convergence-key intent up to the id returned by {@link takeConvergenceKeyIntents}.
   */
  clearConvergenceKeyIntents(
    spaceId: SpaceId,
    convergenceKey: string,
    upToId: number,
  ): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> {
    return this.#convergenceKeyIntents.clear(spaceId, convergenceKey, upToId);
  }

  queryType(
    query: Pick<EntityMeta, 'spaceId' | 'typeDXN'>,
  ): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> {
    return this.#objectMetaIndex.query(query);
  }

  /**
   * Query children by parent object ids.
   */
  queryChildren(query: {
    spaceId: SpaceId[];
    parentIds: EntityId[];
  }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> {
    return this.#objectMetaIndex.queryChildren(query);
  }

  queryTypes(query: {
    spaceIds: readonly SpaceId[];
    typeDxns: readonly EntityMeta['typeDXN'][];
    inverted?: boolean;
    includeAllQueues?: boolean;
    queues?: readonly QueueRef[] | null;
    window?: QueueWindow;
  }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> {
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
  }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> {
    return this.#objectMetaIndex.queryByTimeRange(query);
  }

  queryRelations(query: {
    endpoint: 'source' | 'target';
    anchorDxns: readonly string[];
  }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> {
    return this.#objectMetaIndex.queryRelations(query);
  }
  lookupByRecordIds(recordIds: number[]): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> {
    return this.#objectMetaIndex.lookupByRecordIds(recordIds);
  }

  lookupByObjectId(query: {
    objectId: string;
    spaceId: string;
    queueId: string;
  }): Effect.Effect<EntityMeta | null, SqlError.SqlError, SqlClient.SqlClient> {
    return this.#objectMetaIndex.lookupByObjectId(query);
  }

  queryObjectIds(query: {
    spaceIds: readonly SpaceId[];
    objectIds: readonly EntityMeta['objectId'][];
  }): Effect.Effect<readonly EntityMeta[], SqlError.SqlError, SqlClient.SqlClient> {
    return this.#objectMetaIndex.queryObjectIds(query);
  }

  /**
   * Delete index rows for garbage-collected documents and objects: whole documents (all their
   * rows) plus individual objects removed from a surviving document. Cascades from `objectMeta`
   * (by record id) into the FTS and reverse-ref indexes, and drops the tracker cursors for wiped
   * documents. See `docs/GARBAGE_COLLECTION.md` in `@dxos/echo-host`.
   *
   * @returns Number of `objectMeta` rows deleted.
   */
  deleteObjects(opts: {
    spaceId: SpaceId;
    documentIds: readonly string[];
    objects: readonly { documentId: string; objectId: string }[];
  }): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;
      return yield* sql.withTransaction(
        Effect.gen({ self: this }, function* () {
          const recordIds = yield* this.#objectMetaIndex.selectRecordIdsForRemoval({
            spaceId: opts.spaceId,
            documentIds: opts.documentIds,
            objects: opts.objects,
          });
          if (recordIds.length > 0) {
            yield* this.#ftsIndex.deleteByRecordIds(recordIds);
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
  ): Effect.Effect<IndexingResult, SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen({ self: this }, function* () {
      const result = makeEmptyIndexingResult();

      dataSource.beginPass?.();

      // One cursor read serves every index in this pass; the per-index diff still uses its own slice.
      const cursorsByIndex = yield* this.#tracker.queryCursorsBySource({
        sourceName: dataSource.sourceName,
        // Pass undefined to get all cursors when spaceId is null.
        spaceId: opts.spaceId ?? undefined,
      });

      const {
        updated: updatedFtsIndex,
        done: doneFtsIndex,
        objects: ftsObjects,
      } = yield* this.#update(ctx, this.#ftsIndex, dataSource, {
        indexName: 'fts6',
        spaceId: opts.spaceId,
        limit: opts.limit,
        cursors: cursorsByIndex.get('fts6') ?? [],
      });
      result.updated += updatedFtsIndex;
      result.done = result.done && doneFtsIndex;
      accumulateIndexingResult(result, ftsObjects);

      const {
        updated: updatedReverseRefIndex,
        done: doneReverseRefIndex,
        objects: reverseRefObjects,
      } = yield* this.#update(ctx, this.#reverseRefIndex, dataSource, {
        indexName: 'reverseRef2',
        spaceId: opts.spaceId,
        limit: opts.limit,
        cursors: cursorsByIndex.get('reverseRef2') ?? [],
      });
      result.updated += updatedReverseRefIndex;
      result.done = result.done && doneReverseRefIndex;
      accumulateIndexingResult(result, reverseRefObjects);

      const {
        updated: updatedActivityIndex,
        done: doneActivityIndex,
        spaces: activitySpaces,
      } = yield* this.#updateActivity(ctx, dataSource, {
        spaceId: opts.spaceId,
        limit: opts.limit,
        cursors: cursorsByIndex.get('activity') ?? [],
      });
      result.updated += updatedActivityIndex;
      result.done = result.done && doneActivityIndex;
      for (const spaceId of activitySpaces) {
        result.spaces.add(spaceId);
      }

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
   * Update a dependent index that requires recordId enrichment.
   * This method:
   * 1. Gets changed objects from the source.
   * 2. Ensures those objects exist in EntityMetaIndex.
   * 3. Looks up recordIds for those objects.
   * 4. Enriches objects with recordIds.
   * 5. Updates the dependent index.
   */
  #update(
    ctx: Context,
    index: Index,
    source: IndexDataSource,
    opts: { indexName: string; spaceId: SpaceId | null; limit?: number; cursors: IndexCursor[] },
  ): Effect.Effect<
    { updated: number; done: boolean; objects: readonly IndexerObject[] },
    SqlError.SqlError,
    SqlClient.SqlClient
  > {
    return Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;

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
      // record that these writes were ever seen.
      const intents: { spaceId: SpaceId; convergenceKey: string }[] = [];
      const seenIntents = new Set<string>();
      for (const obj of objects) {
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
          // Ensure objects exist in EntityMetaIndex.
          yield* this.#objectMetaIndex.update(objects);

          // Look up recordIds for the objects.
          yield* this.#objectMetaIndex.lookupRecordIds(objects);

          yield* this.#convergenceKeyIntents.record(intents);

          yield* index.update(objects);
          yield* this.#tracker.updateCursors(
            updatedCursors.map(
              (_): IndexCursor => ({
                indexName: opts.indexName,
                spaceId: _.spaceId,
                sourceName: source.sourceName,
                resourceId: _.resourceId,
                cursor: _.cursor,
              }),
            ),
          );
          return { updated: objects.length, done: false, objects };
        }),
      );
    }).pipe(Effect.withSpan('IndexEngine.#update'), SpanAttributes.annotateSpace(opts.spaceId));
  }

  /**
   * Update the activity ledger from a source's change summaries. Simpler than {@link #update}:
   * the ledger is keyed by `(spaceId, hour)` rather than by object, so it needs no recordId
   * enrichment and no convergence-key bookkeeping.
   */
  #updateActivity(
    ctx: Context,
    source: IndexDataSource,
    opts: { spaceId: SpaceId | null; limit?: number; cursors: IndexCursor[] },
  ): Effect.Effect<
    { updated: number; done: boolean; spaces: readonly SpaceId[] },
    SqlError.SqlError,
    SqlClient.SqlClient
  > {
    return Effect.gen({ self: this }, function* () {
      const sql = yield* SqlClient.SqlClient;

      // The ledger needs only the change summaries; skipping object extraction keeps this pass from
      // re-serializing every object the other two passes already handled.
      const { cursors: updatedCursors, changes = [] } = yield* source.getChangedObjects(ctx, opts.cursors, {
        limit: opts.limit,
        changes: true,
        objects: false,
      });

      if (updatedCursors.length === 0) {
        return { updated: 0, done: true, spaces: [] };
      }

      return yield* sql.withTransaction(
        Effect.gen({ self: this }, function* () {
          yield* this.#activityIndex.record(changes);
          yield* this.#tracker.updateCursors(
            updatedCursors.map(
              (_): IndexCursor => ({
                indexName: 'activity',
                spaceId: _.spaceId,
                sourceName: source.sourceName,
                resourceId: _.resourceId,
                cursor: _.cursor,
              }),
            ),
          );
          // Progress is a cursor that moved, even when the batch held no countable change (branch documents,
          // clockless changes); sources that hand back an unchanged cursor would otherwise keep the host re-running passes.
          const previous = new Map(
            opts.cursors
              .filter((cursor) => cursor.sourceName === source.sourceName)
              .map((cursor) => [`${cursor.spaceId}/${cursor.resourceId}`, cursor.cursor]),
          );
          const advanced = updatedCursors.some(
            (cursor) => previous.get(`${cursor.spaceId}/${cursor.resourceId}`) !== cursor.cursor,
          );
          const spaces = new Set(changes.map((change) => change.spaceId));
          return { updated: changes.length, done: !advanced, spaces: [...spaces] };
        }),
      );
    }).pipe(Effect.withSpan('IndexEngine.#updateActivity'), SpanAttributes.annotateSpace(opts.spaceId));
  }
}
