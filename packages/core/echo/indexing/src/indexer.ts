//
// Copyright 2024 DXOS.org
//

import isEqual from 'lodash.isequal';

import { DeferredTask, Event, sleepWithContext, synchronized } from '@dxos/async';
import { type Context, LifecycleState, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { type LevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { type IndexConfig, IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { trace } from '@dxos/tracing';

import { IndexConstructors } from './indexes';
import { IndexingEngine } from './indexing-engine';
import { type IndexMetadataStore, type IndexStore } from './store';
import { type FindResult, type IdToHeads, type IndexQuery, type ObjectSnapshot } from './types';

const DEFAULT_INDEX_UPDATE_BATCH_SIZE = 100;

const DEFAULT_INDEX_COOLDOWN_TIME = 100;

const DEFAULT_INDEX_TIME_BUDGET = 300;

export type IndexerProps = {
  db: LevelDB;

  metadataStore: IndexMetadataStore;
  indexStore: IndexStore;

  /**
   * Load documents by their pointers at specific hash.
   */
  loadDocuments: (ids: IdToHeads) => AsyncGenerator<ObjectSnapshot[]>;

  /**
   * Amount of documents processed in a batch to save indexes after.
   */
  indexUpdateBatchSize?: number;

  /**
   * Minimum time between indexing runs.
   */
  indexCooldownTime?: number;

  /**
   * Time budget for indexing run.
   * Does not cover creating new indexes.
   */
  indexTimeBudget?: number;
};

// TODO(burdon): Rename package @dxos/indexer?
@trace.resource()
export class Indexer extends Resource {
  public readonly updated = new Event<void>();

  private readonly _db: LevelDB;
  private readonly _metadataStore: IndexMetadataStore;
  private readonly _engine: IndexingEngine;

  private readonly _indexUpdateBatchSize: number;
  private readonly _indexCooldownTime: number;
  private readonly _indexTimeBudget: number;

  private _indexConfig?: IndexConfig;
  private _lastRunFinishedAt = 0;
  private _run!: DeferredTask;

  constructor({
    db,
    metadataStore,
    indexStore,
    loadDocuments,
    indexUpdateBatchSize = DEFAULT_INDEX_UPDATE_BATCH_SIZE,
    indexCooldownTime = DEFAULT_INDEX_COOLDOWN_TIME,
    indexTimeBudget = DEFAULT_INDEX_TIME_BUDGET,
  }: IndexerProps) {
    super();
    this._db = db;
    this._metadataStore = metadataStore;
    this._indexUpdateBatchSize = indexUpdateBatchSize;
    this._indexCooldownTime = indexCooldownTime;
    this._indexTimeBudget = indexTimeBudget;
    this._engine = new IndexingEngine({
      db,
      metadataStore,
      indexStore,
      documentLoader: {
        loadDocuments,
      },
    });
  }

  get initialized() {
    return this._lifecycleState === LifecycleState.OPEN;
  }

  get config() {
    return this._indexConfig;
  }

  @synchronized
  // TODO(mykola): Make it iterative (e.g. `initConfig(<index1>); initConfig(<index2>); ...`).
  async setConfig(config: IndexConfig): Promise<void> {
    this._indexConfig = config;
    if (this._lifecycleState === LifecycleState.OPEN) {
      log.warn('Setting index config after initialization, this is unstable', { config });
      for (const kind of this._engine.indexKinds) {
        if (!config.indexes?.some((kind) => isEqual(kind, kind))) {
          this._engine.deleteIndex(kind);
        }
      }
      await this._loadIndexes();
      this._run.schedule();
    }
  }

  @trace.span({ showInBrowserTimeline: true })
  protected override async _open(ctx: Context): Promise<void> {
    if (!this._indexConfig) {
      log.warn('Index config is not set');
    }

    await this._engine.open(ctx);

    // Needs to be re-created because context changes.
    // TODO(dmaretskyi): Find a way to express this better for resources.
    this._run = new DeferredTask(this._ctx, async () => {
      try {
        if (this._lifecycleState !== LifecycleState.OPEN || this._indexConfig?.enabled !== true) {
          return;
        }

        const cooldownMs = this._lastRunFinishedAt + this._indexCooldownTime - Date.now();
        if (cooldownMs > 0) {
          await sleepWithContext(this._ctx, cooldownMs);
        }

        if (this._engine.newIndexCount > 0) {
          await this._promoteNewIndexes();
        }
        await this._indexUpdatedObjects();
      } finally {
        this._lastRunFinishedAt = Date.now();
      }
    });

    // Load indexes from disk.
    await this._loadIndexes();

    if (this._indexConfig?.enabled === true) {
      this._metadataStore.dirty.on(this._ctx, () => this._run.schedule());
      this._run.schedule();
    }
  }

  protected override async _close(ctx: Context): Promise<void> {
    await this._run.join();
    await this._engine.close(ctx);
  }

  protected override async _catch(err: Error): Promise<void> {
    // TODO(dmaretskyi): Better error handling.
    log.catch(err);
  }

  // TODO(dmaretskyi): Allow consumers to get specific index instances and query them directly.
  @synchronized
  async execQuery(filter: IndexQuery): Promise<FindResult[]> {
    if (this._lifecycleState !== LifecycleState.OPEN || this._indexConfig?.enabled !== true) {
      // TODO(burdon): Unexpectedly thrown in query.test.ts.
      throw new Error('Indexer is not initialized or not enabled');
    }

    if (filter.graph) {
      const graphIndex = this._engine.getIndex({ kind: IndexKind.Kind.GRAPH });
      if (!graphIndex) {
        // TODO(dmaretskyi): This shouldn't be the default?
        return [];
      }
      return graphIndex.find(filter);
    } else if (filter.text?.kind === 'vector') {
      const vectorIndex = this._engine.getIndex({ kind: IndexKind.Kind.VECTOR });
      if (!vectorIndex) {
        // TODO(dmaretskyi): This shouldn't be the default?
        return [];
      }
      return vectorIndex.find(filter);
    } else if (filter.text?.kind === 'text') {
      const textIndex = this._engine.getIndex({ kind: IndexKind.Kind.FULL_TEXT });
      if (!textIndex) {
        // TODO(dmaretskyi): This shouldn't be the default?
        return [];
      }
      return textIndex.find(filter);
    } else {
      const typenameIndex = this._engine.getIndex({ kind: IndexKind.Kind.SCHEMA_MATCH });
      if (!typenameIndex) {
        // TODO(dmaretskyi): This shouldn't be the default?
        return [];
      }
      return typenameIndex.find(filter);
    }
  }

  @trace.span({ showInBrowserTimeline: true })
  async reindex(idToHeads: IdToHeads): Promise<void> {
    const batch = this._db.batch();
    this._metadataStore.markDirty(idToHeads, batch);
    this._metadataStore.dropFromClean(Array.from(idToHeads.keys()), batch);
    await batch.write();
    await this._run.runBlocking();
  }

  /**
   * Perform any pending index updates.
   */
  async updateIndexes(): Promise<void> {
    await this._run.runBlocking();
    // Note: Indexing task might schedule itself again if it run over indexing budget.
    let iterations = 0;
    while (this._run.scheduled) {
      await this._run.join();
      iterations++;
      if (iterations > 25) {
        log.warn('Indexer: updateIndexes is stuck');
        break;
      }
    }
  }

  private async _loadIndexes(): Promise<void> {
    const kinds = await this._engine.loadIndexKindsFromDisk();
    for (const [identifier, kind] of kinds.entries()) {
      if (!this._indexConfig || this._indexConfig.indexes?.some((configKind) => isEqual(configKind, kind))) {
        try {
          await this._engine.loadIndexFromDisk(identifier);
        } catch (err) {
          log.warn('Failed to load index', { err, identifier });
        }
      } else {
        // Note: We remove indexes that are not used
        //       to not store indexes that are getting out of sync with database.
        await this._engine.removeIndexFromDisk(identifier);
      }
    }

    // Create indexes that are not loaded from disk.
    for (const kind of this._indexConfig?.indexes || []) {
      if (!this._engine.getIndex(kind)) {
        const IndexConstructor = IndexConstructors[kind.kind];
        invariant(IndexConstructor, `Index kind ${kind.kind} is not supported`);
        // Note: New indexes are not saved to disk until they are promoted.
        //       New Indexes will be promoted to `_indexes` map on indexing job run.
        await this._engine.addNewIndex(new IndexConstructor(kind));
      }
    }
  }

  @trace.span({ showInBrowserTimeline: true })
  private async _promoteNewIndexes(): Promise<void> {
    await this._engine.promoteNewIndexes();
    this.updated.emit();
  }

  @trace.span({ showInBrowserTimeline: true })
  private async _indexUpdatedObjects(): Promise<void> {
    if (this._ctx.disposed) {
      return;
    }

    const { completed, updated } = await this._engine.indexUpdatedObjects({
      indexTimeBudget: this._indexTimeBudget,
      indexUpdateBatchSize: this._indexUpdateBatchSize,
    });

    if (!completed) {
      this._run.schedule();
    }

    if (updated) {
      this.updated.emit();
    }
  }
}
