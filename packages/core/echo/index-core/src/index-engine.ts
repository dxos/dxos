//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

import type { SpaceId } from '@dxos/keys';
import * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';

import { type IndexCursor, IndexTracker } from './index-tracker';
import {
  FtsIndex,
  type FtsQuery,
  type FtsQueryResult,
  type Index,
  type IndexerObject,
  type ObjectMeta,
  ObjectMetaIndex,
  ReverseRefIndex,
  type ReverseRefQuery,
} from './indexes';

/**
 * Cursor into indexable data-source.
 */
export interface DataSourceCursor {
  spaceId: SpaceId | null;

  /**
   * documentId or queueId.
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
    cursors: DataSourceCursor[],
    opts?: { limit?: number },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[] }>;
}

export interface IndexEngineParams {
  tracker: IndexTracker;
  objectMetaIndex: ObjectMetaIndex;
  ftsIndex: FtsIndex;
  reverseRefIndex: ReverseRefIndex;
}

export class IndexEngine {
  readonly #tracker: IndexTracker;
  readonly #objectMetaIndex: ObjectMetaIndex;
  readonly #ftsIndex: FtsIndex;
  readonly #reverseRefIndex: ReverseRefIndex;

  constructor(params?: IndexEngineParams) {
    this.#tracker = params?.tracker ?? new IndexTracker();
    this.#objectMetaIndex = params?.objectMetaIndex ?? new ObjectMetaIndex();
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
  }): Effect.Effect<readonly ObjectMeta[], SqlError.SqlError, SqlClient.SqlClient> {
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
    query: Pick<ObjectMeta, 'spaceId' | 'typeDxn'>,
  ): Effect.Effect<readonly ObjectMeta[], SqlError.SqlError, SqlClient.SqlClient> {
    return this.#objectMetaIndex.query(query);
  }

  queryTypes(query: {
    spaceIds: readonly SpaceId[];
    typeDxns: readonly ObjectMeta['typeDxn'][];
    inverted?: boolean;
  }): Effect.Effect<readonly ObjectMeta[], SqlError.SqlError, SqlClient.SqlClient> {
    return this.#objectMetaIndex.queryTypes(query);
  }

  queryRelations(query: {
    endpoint: 'source' | 'target';
    anchorDxns: readonly string[];
  }): Effect.Effect<readonly ObjectMeta[], SqlError.SqlError, SqlClient.SqlClient> {
    return this.#objectMetaIndex.queryRelations(query);
  }

  lookupByRecordIds(recordIds: number[]): Effect.Effect<readonly ObjectMeta[], SqlError.SqlError, SqlClient.SqlClient> {
    return this.#objectMetaIndex.lookupByRecordIds(recordIds);
  }

  update(
    dataSource: IndexDataSource,
    opts: { spaceId: SpaceId | null; limit?: number },
  ): Effect.Effect<
    { updated: number; done: boolean },
    SqlError.SqlError,
    SqlTransaction.SqlTransaction | SqlClient.SqlClient
  > {
    return Effect.gen(this, function* () {
      let updated = 0;

      const { updated: updatedFtsIndex, done: doneFtsIndex } = yield* this.#update(this.#ftsIndex, dataSource, {
        indexName: 'fts',
        spaceId: opts.spaceId,
        limit: opts.limit,
      });
      updated += updatedFtsIndex;

      const { updated: updatedReverseRefIndex, done: doneReverseRefIndex } = yield* this.#update(
        this.#reverseRefIndex,
        dataSource,
        {
          indexName: 'reverseRef',
          spaceId: opts.spaceId,
          limit: opts.limit,
        },
      );
      updated += updatedReverseRefIndex;

      return { updated, done: doneFtsIndex && doneReverseRefIndex };
    }).pipe(Effect.withSpan('IndexEngine.update'));
  }

  /**
   * Update a dependent index that requires recordId enrichment.
   * This method:
   * 1. Gets changed objects from the source.
   * 2. Ensures those objects exist in ObjectMetaIndex.
   * 3. Looks up recordIds for those objects.
   * 4. Enriches objects with recordIds.
   * 5. Updates the dependent index.
   */
  #update(
    index: Index,
    source: IndexDataSource,
    opts: { indexName: string; spaceId: SpaceId | null; limit?: number },
  ): Effect.Effect<
    { updated: number; done: boolean },
    SqlError.SqlError,
    SqlTransaction.SqlTransaction | SqlClient.SqlClient
  > {
    return Effect.gen(this, function* () {
      const sqlTransaction = yield* SqlTransaction.SqlTransaction;

      return yield* sqlTransaction.withTransaction(
        Effect.gen(this, function* () {
          const cursors = yield* this.#tracker.queryCursors({
            indexName: opts.indexName,
            sourceName: source.sourceName,
            // Pass undefined to get all cursors when spaceId is null.
            spaceId: opts.spaceId ?? undefined,
          });
          const { objects, cursors: updatedCursors } = yield* source.getChangedObjects(cursors, { limit: opts.limit });
          if (objects.length === 0) {
            return { updated: 0, done: true };
          }

          // Ensure objects exist in ObjectMetaIndex.
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
          return { updated: objects.length, done: false };
        }),
      );
    }).pipe(Effect.withSpan('IndexEngine.#updateDependentIndex'));
  }
}
