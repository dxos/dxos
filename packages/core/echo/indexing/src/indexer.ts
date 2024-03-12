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
import { ComplexMap } from '@dxos/util';

import { IndexConstructors } from './index-constructors';
import { type IndexMetadataStore } from './index-metadata-store';
import { type IndexStore } from './index-store';
import { type ObjectType, type Index } from './types';

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
  // TODO(mykola): `loadDocuments` should be a async generator.
  loadDocuments: (ids: string[]) => Promise<ObjectSnapshot[]>;

  getAllDocuments: () => AsyncGenerator<ObjectSnapshot>;

  /**
   * Amount of updates to save indexes after.
   */
  saveAfterUpdates?: number;

  /**
   * Amount of time in [ms] to save indexes after.
   */
  saveAfterTime?: number;
};

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

  /**
   * @internal
   */
  _indexed = new Event<void>();

  private readonly _run = new DeferredTask(this._ctx, async () => {
    if (!this._initialized) {
      return;
    }

    if (this._newIndexes.length > 0) {
      for await (const document of this._getAllDocuments()) {
        for (const index of this._newIndexes) {
          await index.update(document.id, document.object);
        }
      }
      this._newIndexes.forEach((index) => this._indexes.set(index.kind, index));
      this._newIndexes.length = 0; // Clear new indexes.
    }

    const ids = await this._metadataStore.getDirtyDocuments();
    if (ids.length === 0 || this._ctx.disposed) {
      this._indexed.emit();
      return;
    }

    const snapshots = await this._loadDocuments(ids);
    if (snapshots.length === 0 || this._ctx.disposed) {
      this._indexed.emit();
      return;
    }

    for (const [kind, index] of this._indexes.entries()) {
      switch (kind.kind) {
        case IndexKind.Kind.FIELD_MATCH:
          invariant(kind.field, 'Field match index kind should have a field');
          await updateIndexWithObjects(
            index,
            snapshots.filter((snapshot) => kind.field! in snapshot.object),
          );
          break;
        case IndexKind.Kind.SCHEMA_MATCH:
          await updateIndexWithObjects(index, snapshots);
          break;
      }
    }

    await Promise.all(snapshots.map((snapshot) => this._metadataStore.markClean(snapshot.id, snapshot.currentHash)));

    await this._maybeSaveIndexes();
    this._indexed.emit();
  });

  private readonly _metadataStore: IndexMetadataStore;
  private readonly _indexStore: IndexStore;
  private readonly _loadDocuments: (ids: string[]) => Promise<ObjectSnapshot[]>;
  private readonly _getAllDocuments: () => AsyncGenerator<ObjectSnapshot>;
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

    this._metadataStore.dirty.on(this._ctx, () => this._run.schedule());
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
    const kinds = await this._indexStore.loadIndexKinds();
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

    this._run.schedule();
    this._initialized = true;
  }

  // TODO(mykola): `Find` should use junctions and conjunctions of ID sets.
  async find(filter: Filter): Promise<{ id: string; rank: number }[]> {
    if (!this._initialized) {
      return [];
    }
    const arraysOfIds = await Promise.all(Array.from(this._indexes.values()).map((index) => index.find(filter)));
    return arraysOfIds.reduce((acc, ids) => acc.concat(ids), []);
  }

  private async _maybeSaveIndexes() {
    this._updatesAfterSave++;
    if (this._updatesAfterSave >= this._saveAfterUpdates || Date.now() - this._lastSave >= this._saveAfterTime) {
      await this._saveIndexes();
    }
  }

  @synchronized
  private async _saveIndexes() {
    for (const index of this._indexes.values()) {
      await this._indexStore.save(index);
    }
    this._updatesAfterSave = 0;
    this._lastSave = Date.now();
  }

  async destroy() {
    await this._ctx.dispose();
    await this._saveIndexes();
  }
}

const updateIndexWithObjects = async (index: Index, snapshots: ObjectSnapshot[]) =>
  Promise.all(snapshots.map((snapshot) => index.update(snapshot.id, snapshot.object)));
