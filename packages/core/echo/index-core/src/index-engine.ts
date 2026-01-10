//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

import type { SpaceId } from '@dxos/keys';

import { type IndexCursor, IndexTracker } from './index-tracker';
import {
  FtsIndex,
  type FtsQuery,
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
    cursors: IndexCursor[],
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
   * Query text index and return full object metadata.
   */
  queryText(query: FtsQuery) {
    return Effect.gen(this, function* () {
      const ftsResults = yield* this.#ftsIndex.query(query);
      if (ftsResults.length === 0) {
        return [];
      }

      const recordIds = ftsResults.map((r) => r.rowid);
      const metaResults = yield* this.#objectMetaIndex.lookupByRecordIds(recordIds);

      // Map metadata by recordId for efficient lookup.
      const metaByRecordId = new Map(metaResults.map((m) => [m.recordId, m]));

      // Return combined results with metadata and snapshot.
      return ftsResults
        .map((fts) => {
          const meta = metaByRecordId.get(fts.rowid);
          if (!meta) {
            return null;
          }
          return {
            objectId: meta.objectId,
            spaceId: meta.spaceId,
            documentId: meta.documentId,
            snapshot: fts.snapshot,
          };
        })
        .filter((r) => r !== null);
    });
  }

  queryReverseRef(query: ReverseRefQuery) {
    // TODO(mykola): Join with metadata table here.
    return this.#reverseRefIndex.query(query);
  }

  queryType(query: Pick<ObjectMeta, 'spaceId' | 'typeDxn'>) {
    return this.#objectMetaIndex.query(query);
  }

  update(dataSource: IndexDataSource, opts: { spaceId: SpaceId | null; limit?: number }) {
    return Effect.gen(this, function* () {
      let updated = 0;

      const { updated: updatedFtsIndex } = yield* this.#update(this.#ftsIndex, dataSource, {
        indexName: 'fts',
        spaceId: opts.spaceId,
        limit: opts.limit,
      });
      updated += updatedFtsIndex;

      const { updated: updatedReverseRefIndex } = yield* this.#update(this.#reverseRefIndex, dataSource, {
        indexName: 'reverseRef',
        spaceId: opts.spaceId,
        limit: opts.limit,
      });
      updated += updatedReverseRefIndex;

      return { updated };
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
  ): Effect.Effect<{ updated: number }, SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen(this, function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`BEGIN TRANSACTION`;

      const cursors = yield* this.#tracker.queryCursors({
        indexName: opts.indexName,
        sourceName: source.sourceName,
        spaceId: opts.spaceId,
      });
      const { objects, cursors: updatedCursors } = yield* source.getChangedObjects(cursors, { limit: opts.limit });

      // Ensure objects exist in ObjectMetaIndex.
      yield* this.#objectMetaIndex.update(objects);

      // Look up recordIds for the objects.
      const recordIds = yield* this.#objectMetaIndex.lookupRecordIds(objects);

      // Enrich objects with recordIds.
      const enrichedObjects: IndexerObject[] = objects.map((obj, i) => ({
        ...obj,
        recordId: recordIds[i],
      }));

      yield* index.update(enrichedObjects);
      yield* this.#tracker.updateCursors(
        updatedCursors.map(
          (_): IndexCursor => ({
            indexName: opts.indexName,
            spaceId: opts.spaceId,
            sourceName: source.sourceName,
            resourceId: _.resourceId,
            cursor: _.cursor,
          }),
        ),
      );

      yield* sql`COMMIT`;
      return { updated: objects.length };
    }).pipe(
      Effect.withSpan('IndexEngine.#updateDependentIndex'),
      Effect.tapDefect(() =>
        Effect.gen(this, function* () {
          const sql = yield* SqlClient.SqlClient;
          yield* sql`ROLLBACK`;
        }),
      ),
    );
  }
}
