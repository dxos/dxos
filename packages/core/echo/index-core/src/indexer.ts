//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

import { DeferredTask, Event, sleepWithContext } from '@dxos/async';
import { type Context, LifecycleState, Resource } from '@dxos/context';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { type IndexDataSource, IndexEngine } from './index-engine';
import { IndexTracker } from './index-tracker';
import { FtsIndex, ObjectMetaIndex, ReverseRefIndex } from './indexes';
import { type IndexQuery, type QueryResult } from './query';

const DEFAULT_INDEX_UPDATE_BATCH_SIZE = 100;
const DEFAULT_INDEX_COOLDOWN_TIME = 100;

export interface IndexerParams {
  /**
   * Data source for pulling objects to index.
   */
  dataSource: IndexDataSource;

  /**
   * Space ID to index.
   */
  spaceId: SpaceId;

  /**
   * Function to run Effect operations.
   * Injected for testability.
   */
  runEffect: <A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>) => Promise<A>;

  /**
   * Amount of documents processed in a batch.
   */
  indexUpdateBatchSize?: number;

  /**
   * Minimum time between indexing runs.
   */
  indexCooldownTime?: number;
}

/**
 * Indexer wraps IndexEngine with lifecycle management and DeferredTask scheduling.
 * Provides unified query API via execQuery method.
 */
export class Indexer extends Resource {
  /**
   * Emitted when indexes are updated.
   */
  public readonly updated = new Event<void>();

  readonly #dataSource: IndexDataSource;
  readonly #spaceId: SpaceId;
  readonly #runEffect: <A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>) => Promise<A>;
  readonly #indexUpdateBatchSize: number;
  readonly #indexCooldownTime: number;

  readonly #tracker: IndexTracker;
  readonly #objectMetaIndex: ObjectMetaIndex;
  readonly #ftsIndex: FtsIndex;
  readonly #reverseRefIndex: ReverseRefIndex;
  readonly #engine: IndexEngine;

  #lastRunFinishedAt = 0;
  #run!: DeferredTask;

  constructor({
    dataSource,
    spaceId,
    runEffect,
    indexUpdateBatchSize = DEFAULT_INDEX_UPDATE_BATCH_SIZE,
    indexCooldownTime = DEFAULT_INDEX_COOLDOWN_TIME,
  }: IndexerParams) {
    super();
    this.#dataSource = dataSource;
    this.#spaceId = spaceId;
    this.#runEffect = runEffect;
    this.#indexUpdateBatchSize = indexUpdateBatchSize;
    this.#indexCooldownTime = indexCooldownTime;

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

  get initialized(): boolean {
    return this._lifecycleState === LifecycleState.OPEN;
  }

  protected override async _open(ctx: Context): Promise<void> {
    // Run migrations.
    await this.#runMigrations();

    // Create deferred task with all indexing logic.
    this.#run = new DeferredTask(this._ctx, async () => {
      try {
        const cooldownMs = this.#lastRunFinishedAt + this.#indexCooldownTime - Date.now();
        if (cooldownMs > 0) {
          await sleepWithContext(this._ctx, cooldownMs);
        }

        await this.#indexUpdatedObjects();
      } finally {
        this.#lastRunFinishedAt = Date.now();
      }
    });
  }

  protected override async _close(ctx: Context): Promise<void> {
    await this.#run.join();
  }

  /**
   * Schedule an indexing run.
   */
  scheduleUpdate(): void {
    this.#run.schedule();
  }

  /**
   * Wait for all pending index updates to complete.
   */
  async updateIndexes(): Promise<void> {
    await this.#run.runBlocking();
    let iterations = 0;
    while (this.#run.scheduled) {
      await this.#run.join();
      iterations++;
      if (iterations > 25) {
        log.warn('Indexer: updateIndexes is stuck');
        break;
      }
    }
  }

  /**
   * Execute a query against the indexes.
   * Routes to the appropriate index based on query type.
   */
  async execQuery(query: IndexQuery): Promise<QueryResult[]> {
    const effect = this.#execQueryEffect(query);
    return this.#runEffect(effect);
  }

  #execQueryEffect(query: IndexQuery): Effect.Effect<QueryResult[], SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen(this, function* () {
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
    });
  }

  async #runMigrations(): Promise<void> {
    const effect = Effect.gen(this, function* () {
      yield* this.#tracker.migrate();
      yield* this.#objectMetaIndex.migrate();
      yield* this.#ftsIndex.migrate();
      yield* this.#reverseRefIndex.migrate();
    });
    await this.#runEffect(effect);
  }

  async #indexUpdatedObjects(): Promise<void> {
    const effect = this.#engine.update(this.#dataSource, {
      spaceId: this.#spaceId,
      limit: this.#indexUpdateBatchSize,
    });

    try {
      const { updated } = await this.#runEffect(effect);
      if (updated > 0) {
        this.updated.emit();
      }
    } catch (error) {
      log.error('Error indexing objects', { error });
    }
  }
}
