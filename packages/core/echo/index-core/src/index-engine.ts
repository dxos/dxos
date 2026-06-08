//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

import { type Context } from '@dxos/context';
import { ATTR_TYPE } from '@dxos/echo/internal';
import type { EntityId, SpaceId } from '@dxos/keys';
import * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';

import { type IndexCursor, IndexTracker } from './index-tracker';
import {
  FtsIndex,
  type FtsQuery,
  type FtsQueryResult,
  type Index,
  type IndexerObject,
  type EntityMeta,
  EntityMetaIndex,
  ReverseRefIndex,
  type ReverseRefQuery,
} from './indexes';

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

  getChangedObjects(
    ctx: Context,
    cursors: DataSourceCursor[],
    opts?: { limit?: number },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[] }>;
}

export interface IndexEngineParams {
  tracker: IndexTracker;
  objectMetaIndex: EntityMetaIndex;
  ftsIndex: FtsIndex;
  reverseRefIndex: ReverseRefIndex;
}

export class IndexEngine {
  readonly #tracker: IndexTracker;
  readonly #objectMetaIndex: EntityMetaIndex;
  readonly #ftsIndex: FtsIndex;
  readonly #reverseRefIndex: ReverseRefIndex;

  constructor(params?: IndexEngineParams) {
    this.#tracker = params?.tracker ?? new IndexTracker();
    this.#objectMetaIndex = params?.objectMetaIndex ?? new EntityMetaIndex();
    this.#ftsIndex = params?.ftsIndex ?? new FtsIndex();
    this.#reverseRefIndex = params?.reverseRefIndex ?? new ReverseRefIndex();
  }

  migrate() {
    return Effect.gen(this, function* () {
      yield* this.#tracker.migrate();
      yield* this.#objectMetaIndex.migrate();
      yield* this.#ftsIndex.migrate();
      yield* this.#reverseRefIndex.migrate();
    });
  }

  /**
   * Query text index and return full object metadata with rank.
   */
  queryText(query: FtsQuery): Effect.Effect<readonly FtsQueryResult[], SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen(this, function* () {
      return yield* this.#ftsIndex.query(query);
    });
  }

  queryReverseRef(query: ReverseRefQuery) {
    // TODO(mykola): Join with metadata table here.
    return this.#reverseRefIndex.query(query);
  }

  queryAll(query: {
    spaceIds: readonly SpaceId[];
    includeAllQueues?: boolean;
    queueIds?: readonly string[] | null;
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
    queueIds?: readonly string[] | null;
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
    queueIds?: readonly string[] | null;
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

  update(
    ctx: Context,
    dataSource: IndexDataSource,
    opts: { spaceId: SpaceId | null; limit?: number },
  ): Effect.Effect<IndexingResult, SqlError.SqlError, SqlTransaction.SqlTransaction | SqlClient.SqlClient> {
    return Effect.gen(this, function* () {
      const result = makeEmptyIndexingResult();

      const {
        updated: updatedFtsIndex,
        done: doneFtsIndex,
        objects: ftsObjects,
      } = yield* this.#update(ctx, this.#ftsIndex, dataSource, {
        indexName: 'fts5',
        spaceId: opts.spaceId,
        limit: opts.limit,
      });
      result.updated += updatedFtsIndex;
      result.done = result.done && doneFtsIndex;
      accumulateIndexingResult(result, ftsObjects);

      const {
        updated: updatedReverseRefIndex,
        done: doneReverseRefIndex,
        objects: reverseRefObjects,
      } = yield* this.#update(ctx, this.#reverseRefIndex, dataSource, {
        indexName: 'reverseRef',
        spaceId: opts.spaceId,
        limit: opts.limit,
      });
      result.updated += updatedReverseRefIndex;
      result.done = result.done && doneReverseRefIndex;
      accumulateIndexingResult(result, reverseRefObjects);

      return result as IndexingResult;
    }).pipe(Effect.withSpan('IndexEngine.update'));
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
    opts: { indexName: string; spaceId: SpaceId | null; limit?: number },
  ): Effect.Effect<
    { updated: number; done: boolean; objects: readonly IndexerObject[] },
    SqlError.SqlError,
    SqlTransaction.SqlTransaction | SqlClient.SqlClient
  > {
    return Effect.gen(this, function* () {
      const sqlTransaction = yield* SqlTransaction.SqlTransaction;

      // Reads run OUTSIDE the transaction: getChangedObjects may call RuntimeProvider.runPromise
      // internally (e.g. listDocumentHeads), which creates a fresh Effect fiber with no
      // TransactionConnection context. If those reads ran inside withTransaction, they would
      // try to acquire the same semaphore that the transaction already holds — causing a deadlock.
      const cursors = yield* this.#tracker.queryCursors({
        indexName: opts.indexName,
        sourceName: source.sourceName,
        // Pass undefined to get all cursors when spaceId is null.
        spaceId: opts.spaceId ?? undefined,
      });
      const { objects, cursors: updatedCursors } = yield* source.getChangedObjects(ctx, cursors, { limit: opts.limit });

      if (objects.length === 0) {
        return { updated: 0, done: true, objects: [] as readonly IndexerObject[] };
      }

      // Writes run INSIDE the transaction for atomicity.
      return yield* sqlTransaction.withTransaction(
        Effect.gen(this, function* () {
          // Ensure objects exist in EntityMetaIndex.
          yield* this.#objectMetaIndex.update(objects);

          // Look up recordIds for the objects.
          yield* this.#objectMetaIndex.lookupRecordIds(objects);

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
    }).pipe(Effect.withSpan('IndexEngine.#update'));
  }
}
