//
// Copyright 2024 DXOS.org
//

import isEqual from 'lodash.isequal';

import { DeferredTask, synchronized } from '@dxos/async';
import { Context, cancelWithContext } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

import { IndexConstructors } from './index-constructors';
import { type IndexMetadataStore } from './index-metadata-store';
import { type IndexStore } from './index-store';
import { type ObjectType, type Index, type IndexKind } from './types';
import { type Filter } from '../query';

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
  loadDocuments: (ids: string[]) => Promise<ObjectSnapshot[]>;
  /**
   * Amount of updates to save indexes after.
   */
  saveAfterUpdates?: number;

  /**
   * Amount of time in [ms] to save indexes after.
   */
  saveAfterTime?: number;
};

export type IndexerConfig = {
  indexes: IndexKind[];
};

export class Indexer {
  private readonly _ctx = new Context();
  private _indexConfig?: IndexerConfig;
  private readonly _indexes = new ComplexMap<IndexKind, Index>((kind) =>
    kind.kind === 'FIELD_MATCH' ? `${kind.kind}:${kind.field}` : kind.kind,
  );

  private _initialized = false;

  private _updatesAfterSave = 0;
  private _lastSave = Date.now();

  private readonly _run = new DeferredTask(this._ctx, async () => {
    const ids = await cancelWithContext(this._ctx, this._metadataStore.getDirtyDocuments());
    if (ids.length === 0) {
      return;
    }

    const snapshots = await cancelWithContext(this._ctx, this._loadDocuments(ids));
    if (snapshots.length === 0) {
      return;
    }

    for (const [kind, index] of this._indexes.entries()) {
      switch (kind.kind) {
        case 'FIELD_MATCH':
          await cancelWithContext(
            this._ctx,
            updateIndexWithObjects(
              index,
              snapshots.filter((snapshot) => kind.field in snapshot.object),
            ),
          );
          break;
        case 'SCHEMA_MATCH':
          await cancelWithContext(this._ctx, updateIndexWithObjects(index, snapshots));
          break;
      }
    }

    await cancelWithContext(
      this._ctx,
      Promise.all(snapshots.map((snapshot) => this._metadataStore.markClean(snapshot.id, snapshot.currentHash))),
    );

    await cancelWithContext(this._ctx, this._maybeSaveIndexes());
  });

  private readonly _metadataStore: IndexMetadataStore;
  private readonly _indexStore: IndexStore;
  private readonly _loadDocuments: (ids: string[]) => Promise<ObjectSnapshot[]>;
  private readonly _saveAfterUpdates: number;
  private readonly _saveAfterTime: number;

  constructor({
    metadataStore,
    indexStore,
    loadDocuments,
    saveAfterUpdates = 100,
    saveAfterTime = 30_000,
  }: IndexerParams) {
    this._metadataStore = metadataStore;
    this._indexStore = indexStore;
    this._loadDocuments = loadDocuments;
    this._saveAfterUpdates = saveAfterUpdates;
    this._saveAfterTime = saveAfterTime;

    this._metadataStore.dirty.on(this._ctx, () => this._run.schedule());
  }

  @synchronized
  setIndexConfig(config: IndexerConfig) {
    invariant(!this._indexConfig, 'Index config is already set');
    this._indexConfig = config;
    if (this._initialized) {
      for (const kind of this._indexes.keys()) {
        if (!config.indexes.some((kind) => isEqual(kind, kind))) {
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
    // TODO(mykola): Load only indexes that are needed.
    const indexesFromDisk = await this._indexStore.loadAllIndexes();
    for (const index of indexesFromDisk) {
      if (!this._indexConfig || this._indexConfig.indexes.some((kind) => isEqual(kind, index.kind))) {
        this._indexes.set(index.kind, index);
      }
    }

    // Create indexes that are not loaded from disk.
    for (const kind of this._indexConfig?.indexes || []) {
      if (!this._indexes.has(kind)) {
        const IndexConstructor = IndexConstructors[kind.kind];
        invariant(IndexConstructor, `Index kind ${kind.kind} is not supported`);
        this._indexes.set(kind, new IndexConstructor(kind));
      }
    }

    this._run.schedule();
    this._initialized = true;
  }

  // TODO(mykola): `Find` should use junctions and conjunctions of ID sets.
  async find(filter: Filter) {
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
