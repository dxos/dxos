//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

import type { SpaceId } from '@dxos/keys';

import { type IndexCursor, type IndexTracker } from './index-tracker';
import type { FtsIndex, Index, IndexerObject, ObjectMetaIndex, ReverseRefIndex } from './indexes';

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

  constructor({ tracker, objectMetaIndex, ftsIndex, reverseRefIndex }: IndexEngineParams) {
    this.#tracker = tracker;
    this.#objectMetaIndex = objectMetaIndex;
    this.#ftsIndex = ftsIndex;
    this.#reverseRefIndex = reverseRefIndex;
  }

  update(dataSource: IndexDataSource, opts: { spaceId: SpaceId; limit?: number }) {
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
    opts: { indexName: string; spaceId: SpaceId; limit?: number },
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
