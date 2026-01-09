//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

import type { SpaceId } from '@dxos/keys';

import { type IndexCursor, type IndexTracker } from './index-tracker';
import type { FtsIndex, Index, IndexerObject, ObjectMetaIndex } from './indexes';

/**
 * Cursor into indexable data-source
 */
export interface DataSourceCursor {
  spaceId: SpaceId | null;

  /**
   * documentId or queueId
   */
  resourceId: string | null;

  /**
   * heads or queue position
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
  ftsIndex: FtsIndex;
  objectMetaIndex: ObjectMetaIndex;
}

export class IndexEngine {
  readonly #tracker: IndexTracker;
  readonly #objectMetaIndex: ObjectMetaIndex;
  readonly #ftsIndex: FtsIndex;

  constructor({ tracker, objectMetaIndex, ftsIndex }: IndexEngineParams) {
    this.#tracker = tracker;
    this.#objectMetaIndex = objectMetaIndex;
    this.#ftsIndex = ftsIndex;
  }

  update(dataSource: IndexDataSource, opts: { spaceId: SpaceId; limit?: number }) {
    return Effect.gen(this, function* () {
      const sql = yield* SqlClient.SqlClient;
      let updated = 0;

      yield* sql`BEGIN TRANSACTION`;

      const { updated: updatedObjectMetaIndex } = yield* this.#updateIndex(this.#objectMetaIndex, dataSource, {
        indexName: 'objectMeta',
        spaceId: opts.spaceId,
        limit: opts.limit,
      });
      updated += updatedObjectMetaIndex;
      const { updated: updatedFtsIndex } = yield* this.#updateIndex(this.#ftsIndex, dataSource, {
        indexName: 'fts',
        spaceId: opts.spaceId,
        limit: opts.limit,
      });
      updated += updatedFtsIndex;

      yield* sql`COMMIT`;

      return { updated };
    }).pipe(
      Effect.withSpan('IndexEngine.update'),
      Effect.tapDefect(() =>
        Effect.gen(this, function* () {
          const sql = yield* SqlClient.SqlClient;
          yield* sql`ROLLBACK`;
        }),
      ),
    );
  }

  #updateIndex(
    index: Index,
    source: IndexDataSource,
    opts: { indexName: string; spaceId: SpaceId; limit?: number },
  ): Effect.Effect<{ updated: number }, SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen(this, function* () {
      const cursors = yield* this.#tracker.queryCursors({
        indexName: opts.indexName,
        sourceName: source.sourceName,
        spaceId: opts.spaceId,
      });
      const { objects, cursors: updatedCursors } = yield* source.getChangedObjects(cursors, { limit: opts.limit });

      yield* index.update(objects);
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

      return { updated: objects.length };
    }).pipe(Effect.withSpan('IndexEngine.#updateIndex'));
  }
}
