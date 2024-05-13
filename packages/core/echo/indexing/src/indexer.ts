//
// Copyright 2024 DXOS.org
//

import isEqual from 'lodash.isequal';

import { DeferredTask, Event, sleepWithContext, synchronized } from '@dxos/async';
import { type Context, LifecycleState, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { type LevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { IndexKind, type IndexConfig } from '@dxos/protocols/proto/dxos/echo/indexing';
import { trace } from '@dxos/tracing';
import { ComplexMap } from '@dxos/util';

import { IndexConstructors } from './index-constructors';
import { type IndexMetadataStore } from './index-metadata-store';
import { type IndexStore } from './index-store';
import { type IndexQuery, type Index, type IdToHeads, type ObjectSnapshot } from './types';

/**
 * Amount of documents processed in a batch to save indexes after.
 */
const INDEX_UPDATE_BATCH_SIZE = 100;

const INDEX_COOLDOWN_TIME = 300;

export type IndexerParams = {
  db: LevelDB;

  metadataStore: IndexMetadataStore;
  indexStore: IndexStore;

  /**
   * Load documents by their pointers at specific hash.
   */
  loadDocuments: (ids: IdToHeads) => AsyncGenerator<ObjectSnapshot[]>;
};

@trace.resource()
export class Indexer extends Resource {
  private _indexConfig?: IndexConfig;
  private readonly _indexes = new ComplexMap<IndexKind, Index>((kind) =>
    kind.kind === IndexKind.Kind.FIELD_MATCH ? `${kind.kind}:${kind.field}` : kind.kind,
  );

  private readonly _newIndexes: Index[] = [];

  public readonly updated = new Event<void>();

  private _run!: DeferredTask;

  private readonly _db: LevelDB;
  private readonly _metadataStore: IndexMetadataStore;
  private readonly _indexStore: IndexStore;
  private readonly _loadDocuments: (ids: IdToHeads) => AsyncGenerator<ObjectSnapshot[]>;

  private _lastRunFinishedAt = 0;

  constructor({ db, metadataStore, indexStore, loadDocuments }: IndexerParams) {
    super();
    this._db = db;
    this._metadataStore = metadataStore;
    this._indexStore = indexStore;
    this._loadDocuments = loadDocuments;
  }

  get initialized() {
    return this._lifecycleState === LifecycleState.OPEN;
  }

  @synchronized
  setIndexConfig(config: IndexConfig) {
    if (this._indexConfig) {
      log.warn('Index config is already set');
      return;
    }
    this._indexConfig = config;
    if (this._lifecycleState === LifecycleState.OPEN) {
      for (const kind of this._indexes.keys()) {
        if (!config.indexes?.some((kind) => isEqual(kind, kind))) {
          this._indexes.delete(kind);
        }
      }
      this._run.schedule();
    }
  }

  @trace.span({ showInBrowserTimeline: true })
  protected override async _open(ctx: Context): Promise<void> {
    if (!this._indexConfig) {
      log.warn('Index config is not set');
    }

    // Needs to be re-created because context changes.
    // TODO(dmaretskyi): Find a way to express this better for resources.
    this._run = new DeferredTask(this._ctx, async () => {
      try {
        if (this._lifecycleState !== LifecycleState.OPEN || this._indexConfig?.enabled !== true) {
          return;
        }

        const cooldownMs = this._lastRunFinishedAt + INDEX_COOLDOWN_TIME - Date.now();
        if (cooldownMs > 0) {
          await sleepWithContext(this._ctx, cooldownMs);
        }

        if (this._newIndexes.length > 0) {
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
    for (const index of this._indexes.values()) {
      await index.close();
    }
    this._newIndexes.length = 0;
    this._indexes.clear();
  }

  protected override async _catch(err: Error): Promise<void> {
    // TODO(dmaretskyi): Better error handling.
    log.catch(err);
  }

  @synchronized
  async find(filter: IndexQuery): Promise<{ id: string; rank: number }[]> {
    if (this._lifecycleState !== LifecycleState.OPEN || this._indexConfig?.enabled !== true) {
      throw new Error('Indexer is not initialized or not enabled');
    }
    const arraysOfIds = await Promise.all(Array.from(this._indexes.values()).map((index) => index.find(filter)));
    return arraysOfIds.reduce((acc, ids) => acc.concat(ids), []);
  }

  async reIndex(idToHeads: IdToHeads) {
    const batch = this._db.batch();
    this._metadataStore.markDirty(idToHeads, batch);
    this._metadataStore.dropFromClean(Array.from(idToHeads.keys()), batch);
    await batch.write();
    this._run.schedule();
  }

  /**
   * Perform any pending index updates.
   */
  async updateIndexes() {
    await this._run.runBlocking();
  }

  private async _loadIndexes() {
    const kinds = await this._indexStore.loadIndexKindsFromDisk();
    for (const [identifier, kind] of kinds.entries()) {
      if (!this._indexConfig || this._indexConfig.indexes?.some((configKind) => isEqual(configKind, kind))) {
        await this._indexStore
          .load(identifier)
          .then((index) => this._indexes.set(index.kind, index))
          .catch((err) => {
            log.warn('Failed to load index', { err, identifier });
          });
      } else {
        // Note: We remove indexes that are not used
        //       to not store indexes that are getting out of sync with database.
        await this._indexStore.remove(identifier);
      }
    }

    // Create indexes that are not loaded from disk.
    for (const kind of this._indexConfig?.indexes || []) {
      if (!this._indexes.has(kind)) {
        const IndexConstructor = IndexConstructors[kind.kind];
        invariant(IndexConstructor, `Index kind ${kind.kind} is not supported`);
        // Note: New indexes are not saved to disk until they are promoted.
        //       New Indexes will be promoted to `_indexes` map on indexing job run.
        this._newIndexes.push(new IndexConstructor(kind));
      }
    }
    await Promise.all(this._newIndexes.map((index) => index.open()));
  }

  @trace.span({ showInBrowserTimeline: true })
  private async _promoteNewIndexes() {
    const documentsToIndex = await this._metadataStore.getAllIndexedDocuments();
    for await (const documents of this._loadDocuments(documentsToIndex)) {
      if (this._ctx.disposed) {
        return;
      }
      await this._updateIndexes(this._newIndexes, documents);
    }
    this._newIndexes.forEach((index) => this._indexes.set(index.kind, index));
    this._newIndexes.length = 0; // Clear new indexes.
    await this._saveIndexes();
    this.updated.emit();
  }

  @trace.span({ showInBrowserTimeline: true })
  private async _indexUpdatedObjects() {
    if (this._ctx.disposed) {
      return;
    }
    const idToHeads = await this._metadataStore.getDirtyDocuments();

    log('dirty objects to index', { count: idToHeads.size });

    if (idToHeads.size === 0 || this._ctx.disposed) {
      return;
    }

    const documentsUpdated: ObjectSnapshot[] = [];
    const saveIndexChanges = async () => {
      await this._saveIndexes();
      const batch = this._db.batch();
      this._metadataStore.markClean(new Map(documentsUpdated.map((document) => [document.id, document.heads])), batch);
      await batch.write();
    };

    const updates: boolean[] = [];
    for await (const documents of this._loadDocuments(idToHeads)) {
      if (this._ctx.disposed) {
        return;
      }
      updates.push(...(await this._updateIndexes(Array.from(this._indexes.values()), documents)));
      documentsUpdated.push(...documents);
      if (documentsUpdated.length >= INDEX_UPDATE_BATCH_SIZE) {
        await saveIndexChanges();
        documentsUpdated.length = 0;
      }
    }
    await saveIndexChanges();
    if (updates.some(Boolean)) {
      this.updated.emit();
    }
  }

  @trace.span({ showInBrowserTimeline: true })
  private async _updateIndexes(indexes: Index[], documents: ObjectSnapshot[]): Promise<boolean[]> {
    const updates: boolean[] = [];
    for (const index of indexes) {
      if (this._ctx.disposed) {
        return updates;
      }
      switch (index.kind.kind) {
        case IndexKind.Kind.FIELD_MATCH:
          invariant(index.kind.field, 'Field match index kind should have a field');
          updates.push(
            ...(await updateIndexWithObjects(
              index,
              documents.filter((document) => index.kind.field! in document.object),
            )),
          );
          break;
        case IndexKind.Kind.SCHEMA_MATCH:
          updates.push(...(await updateIndexWithObjects(index, documents)));
          break;
      }
    }
    return updates;
  }

  @trace.span({ showInBrowserTimeline: true })
  @synchronized
  private async _saveIndexes() {
    for (const index of this._indexes.values()) {
      if (this._ctx.disposed) {
        return;
      }
      await this._indexStore.save(index);
    }
  }
}

const updateIndexWithObjects = async (index: Index, snapshots: ObjectSnapshot[]) =>
  Promise.all(snapshots.map((snapshot) => index.update(snapshot.id, snapshot.object)));
