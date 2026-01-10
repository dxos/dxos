//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

import { type IndexDataSource, IndexEngine } from './index-engine';
import { IndexTracker } from './index-tracker';
import { FtsIndex, ObjectMetaIndex, ReverseRefIndex } from './indexes';
import { type IndexQuery, type QueryResult } from './query';

const DEFAULT_INDEX_UPDATE_BATCH_SIZE = 100;

export interface IndexerParams {
  /**
   * Data source for pulling objects to index.
   */
  dataSource: IndexDataSource;

  /**
   * Amount of documents processed in a batch.
   */
  indexUpdateBatchSize?: number;
}

/**
 * Indexer wraps IndexEngine with internal index initialization.
 * Exposes pure Effect methods for migration, updates, and queries.
 */
export class Indexer {
  readonly #dataSource: IndexDataSource;
  readonly #indexUpdateBatchSize: number;

  readonly #tracker: IndexTracker;
  readonly #objectMetaIndex: ObjectMetaIndex;
  readonly #ftsIndex: FtsIndex;
  readonly #reverseRefIndex: ReverseRefIndex;
  readonly #engine: IndexEngine;

  constructor({ dataSource, indexUpdateBatchSize = DEFAULT_INDEX_UPDATE_BATCH_SIZE }: IndexerParams) {
    this.#dataSource = dataSource;
    this.#indexUpdateBatchSize = indexUpdateBatchSize;

    this.#tracker = new IndexTracker();
    this.#objectMetaIndex = new ObjectMetaIndex();
    this.#ftsIndex = new FtsIndex();
    this.#reverseRefIndex = new ReverseRefIndex();

    this.#engine = new IndexEngine({
      tracker: this.#tracker,
      objectMetaIndex: this.#objectMetaIndex,
      ftsIndex: this.#ftsIndex,
      reverseRefIndex: this.#reverseRefIndex,
    });
  }

  /**
   * Run migrations to set up index tables.
   */
  migrate = Effect.fn('Indexer.migrate')(
    (): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        yield* this.#tracker.migrate();
        yield* this.#objectMetaIndex.migrate();
        yield* this.#ftsIndex.migrate();
        yield* this.#reverseRefIndex.migrate();
      }),
  );

  /**
   * Execute a query against the indexes.
   * Routes to the appropriate index based on query type.
   */
  query = Effect.fn('Indexer.query')(
    (query: IndexQuery): Effect.Effect<QueryResult[], SqlError.SqlError, SqlClient.SqlClient> =>
      Effect.gen(this, function* () {
        if (query.text) {
          const results = yield* this.#ftsIndex.query(query.text.query);
          return results.map(
            (r: { snapshot: string }): QueryResult => ({
              recordId: 0, // FTS doesn't return recordId directly, need to join.
              snapshot: r.snapshot,
            }),
          );
        }

        if (query.reverseRef) {
          const results = yield* this.#reverseRefIndex.query(query.reverseRef.targetDxn);
          return results.map(
            (r): QueryResult => ({
              recordId: r.recordId,
              propPath: r.propPath,
              targetDxn: r.targetDxn,
            }),
          );
        }

        if (query.type) {
          const results = yield* this.#objectMetaIndex.query({
            spaceId: query.type.spaceId,
            typeDxn: query.type.typeDxn,
          });
          return results.map(
            (r): QueryResult => ({
              recordId: r.recordId,
              objectId: r.objectId,
              spaceId: r.spaceId,
            }),
          );
        }

        // No query type specified.
        return [];
      }),
  );

  /**
   * Index updated objects from the data source.
   * Returns the number of objects that were updated.
   */
  update = Effect.fn('Indexer.update')(
    (): Effect.Effect<{ updated: number }, SqlError.SqlError, SqlClient.SqlClient> =>
      this.#engine.update(this.#dataSource, {
        limit: this.#indexUpdateBatchSize,
      }),
  );
}
