//
// Copyright 2024 DXOS.org
//

import isEqual from 'lodash.isequal';

import { DeferredTask, Event, synchronized } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Filter } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { IndexKind, type IndexConfig } from '@dxos/protocols/proto/dxos/echo/indexing';
import { trace } from '@dxos/tracing';
import { ComplexMap } from '@dxos/util';

import { IndexConstructors } from './index-constructors';
import { type IndexMetadataStore } from './index-metadata-store';
import { type IndexStore } from './index-store';
import { type ObjectType, type Index } from './types';

/**
 * Amount of documents processed in a batch to save indexes after.
 */
const INDEX_UPDATE_BATCH_SIZE = 100;

export type ObjectSnapshot = {
  /**
   * Index ID.
   */
  id: string;
  object: ObjectType;
  currentHash: string;
};

export type IndexerParams = {
  metadataStore: IndexMetadataStore;
  indexStore: IndexStore;

  loadDocuments: (ids: string[]) => AsyncGenerator<ObjectSnapshot[]>;

  getAllDocuments: () => AsyncGenerator<ObjectSnapshot[]>;

  /**
   * Amount of updates to save indexes after.
   */
  saveAfterUpdates?: number;

  /**
   * Amount of time in [ms] to save indexes after.
   */
  saveAfterTime?: number;
};

@trace.resource()
export class Indexer {
  private readonly _ctx = new Context();
  private _indexConfig?: IndexConfig;
  private readonly _indexes = new ComplexMap<IndexKind, Index>((kind) =>
    kind.kind === IndexKind.Kind.FIELD_MATCH ? `${kind.kind}:${kind.field}` : kind.kind,
  );

  private _initialized = false;
  private readonly _newIndexes: Index[] = [];

  private _updatesAfterSave = 0;
  private _lastSave = Date.now();

  public readonly indexed = new Event<void>();

  private readonly _run = new DeferredTask(this._ctx, async () => {
    if (!this._initialized || this._indexConfig?.enabled !== true) {
      return;
    }

    if (this._newIndexes.length > 0) {
      await this._promoteNewIndexes();
    }

    await this._indexUpdatedObjects();
  });

  private readonly _metadataStore: IndexMetadataStore;
  private readonly _indexStore: IndexStore;
  private readonly _loadDocuments: (ids: string[]) => AsyncGenerator<ObjectSnapshot[]>;
  private readonly _getAllDocuments: () => AsyncGenerator<ObjectSnapshot[]>;
  private readonly _saveAfterUpdates: number;
  private readonly _saveAfterTime: number;

  constructor({
    metadataStore,
    indexStore,
    loadDocuments,
    getAllDocuments,
    saveAfterUpdates = 100,
    saveAfterTime = 30_000,
  }: IndexerParams) {
    this._metadataStore = metadataStore;
    this._indexStore = indexStore;
    this._loadDocuments = loadDocuments;
    this._getAllDocuments = getAllDocuments;
    this._saveAfterUpdates = saveAfterUpdates;
    this._saveAfterTime = saveAfterTime;
  }

  get initialized() {
    return this._initialized;
  }

  @synchronized
  setIndexConfig(config: IndexConfig) {
    invariant(!this._indexConfig, 'Index config is already set');
    this._indexConfig = config;
    if (this._initialized) {
      for (const kind of this._indexes.keys()) {
        if (!config.indexes?.some((kind) => isEqual(kind, kind))) {
          this._indexes.delete(kind);
        }
      }
      this._run.schedule();
    }
  }

  @trace.span({ showInBrowserTimeline: true })
  @synchronized
  async initialize() {
    if (this._initialized) {
      log.warn('Indexer is already initialized');
      return;
    }

    if (!this._indexConfig) {
      log.warn('Index config is not set');
    }

    // Load indexes from disk.
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

    if (this._indexConfig?.enabled === true) {
      this._metadataStore.dirty.on(this._ctx, () => this._run.schedule());
      this._run.schedule();
    }

    this._initialized = true;
  }

  // TODO(mykola): `Find` should use junctions and conjunctions of ID sets.
  async find(filter: Filter): Promise<{ id: string; rank: number }[]> {
    if (!this._initialized || this._indexConfig?.enabled !== true) {
      return [];
    }
    const arraysOfIds = await Promise.all(Array.from(this._indexes.values()).map((index) => index.find(filter)));
    return arraysOfIds.reduce((acc, ids) => acc.concat(ids), []);
  }

  @trace.span({ showInBrowserTimeline: true })
  private async _promoteNewIndexes() {
    for await (const documents of this._getAllDocuments()) {
      if (this._ctx.disposed) {
        return;
      }
      await this._updateIndexes(this._newIndexes, documents);
    }
    this._newIndexes.forEach((index) => this._indexes.set(index.kind, index));
    this._newIndexes.length = 0; // Clear new indexes.
    await this._saveIndexes();
    this.indexed.emit();
  }

  @trace.span({ showInBrowserTimeline: true })
  private async _indexUpdatedObjects() {
    if (this._ctx.disposed) {
      return;
    }
    const ids = await this._metadataStore.getDirtyDocuments();
    if (ids.length === 0 || this._ctx.disposed) {
      return;
    }

    const documentsUpdated: ObjectSnapshot[] = [];
    const saveIndexChanges = async () => {
      await this._saveIndexes();
      await Promise.all(
        documentsUpdated.map(async (document) => this._metadataStore.markClean(document.id, document.currentHash)),
      );
    };

    for await (const documents of this._loadDocuments(ids)) {
      if (this._ctx.disposed) {
        return;
      }
      await this._updateIndexes(Array.from(this._indexes.values()), documents);
      documentsUpdated.push(...documents);
      if (documentsUpdated.length >= INDEX_UPDATE_BATCH_SIZE) {
        await saveIndexChanges();
        documentsUpdated.length = 0;
      }
    }
    await saveIndexChanges();
    this.indexed.emit();
  }

  @trace.span({ showInBrowserTimeline: true })
  private async _updateIndexes(indexes: Index[], documents: ObjectSnapshot[]) {
    for (const index of indexes) {
      if (this._ctx.disposed) {
        return;
      }
      switch (index.kind.kind) {
        case IndexKind.Kind.FIELD_MATCH:
          invariant(index.kind.field, 'Field match index kind should have a field');
          await updateIndexWithObjects(
            index,
            documents.filter((document) => index.kind.field! in document.object),
          );
          break;
        case IndexKind.Kind.SCHEMA_MATCH:
          await updateIndexWithObjects(index, documents);
          break;
      }
    }
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
    this._updatesAfterSave = 0;
    this._lastSave = Date.now();
  }

  async destroy() {
    await this._ctx.dispose();
  }
}

const updateIndexWithObjects = async (index: Index, snapshots: ObjectSnapshot[]) =>
  Promise.all(snapshots.map((snapshot) => index.update(snapshot.id, snapshot.object)));
