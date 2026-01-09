import { Effect } from 'effect';
import { IndexTracker, type IndexCursor } from './index-tracker';
import type { Index, IndexerObject } from './indexes/interface';
import { ObjectMetaIndex } from './indexes/object-meta-index';
import type { SpaceId } from '@dxos/keys';
import { SqlClient, SqlError } from '@effect/sql';

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
  readonly dataSourceId: string; // e.g. queue, automerge, etc.

  getChangedObjects(
    cursors: IndexCursor[],
    opts?: { limit?: number },
  ): Effect.Effect<{ objects: IndexerObject[]; cursors: DataSourceCursor[] }>;
}

export interface IndexEngineParams {
  tracker: IndexTracker;
  objectMetaIndex: ObjectMetaIndex;
}

export class IndexEngine {
  readonly #tracker: IndexTracker;
  readonly #objectMetaIndex: ObjectMetaIndex;

  constructor({ tracker, objectMetaIndex }: IndexEngineParams) {
    this.#tracker = tracker;
    this.#objectMetaIndex = objectMetaIndex;
  }

  update(dataSource: IndexDataSource, opts: { spaceId: SpaceId; limit?: number }) {
    return Effect.gen(this, function* () {
      const sql = yield* SqlClient.SqlClient;
      let updated = 0;

      yield* sql`BEGIN TRANSACTION`;

      const { updated: updatedObjects } = yield* this.#updateIndex(this.#objectMetaIndex, dataSource, {
        indexName: 'objectMeta',
        spaceId: opts.spaceId,
        limit: opts.limit,
      });
      updated += updatedObjects;

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
        sourceName: source.dataSourceId,
        spaceId: opts.spaceId,
      });
      const { objects, cursors: updatedCursors } = yield* source.getChangedObjects(cursors, { limit: opts.limit });

      yield* index.update(objects);
      yield* this.#tracker.updateCursors(
        updatedCursors.map(
          (_): IndexCursor => ({
            indexName: opts.indexName,
            spaceId: opts.spaceId,
            sourceName: source.dataSourceId,
            resourceId: _.resourceId,
            cursor: _.cursor,
          }),
        ),
      );

      return { updated: objects.length };
    }).pipe(Effect.withSpan('IndexEngine.#updateIndex'));
  }
}
