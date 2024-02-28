//
// Copyright 2024 DXOS.org
//

import isEqual from 'lodash.isequal';

import { DeferredTask, synchronized } from '@dxos/async';
import { Context, cancelWithContext } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

import { type IndexMetadataStore } from './index-metadata-store';
import { type IndexStore } from './index-store';
import { type ObjectType, type Index, type IndexKind } from './types';

export type ObjectSnapshot = { object: ObjectType; currentHash: string };

export type IndexerParams = {
  metadataStore: IndexMetadataStore;
  indexStore: IndexStore;
  loadDocuments: (ids: string[]) => Promise<ObjectSnapshot[]>;
  /**
   * Amount of updates to save indexes after.
   */
  saveAfterUpdates: number;

  /**
   * Amount of time in [ms] to save indexes after.
   */
  saveAfterTime: number;
};

export type IndexerConfig = {
  indexes: IndexKind[];
};

export class Indexer {
  private readonly _ctx = new Context();
  private readonly _indexes = new ComplexMap<IndexKind, Index>((kind) =>
    kind.kind === 'FIELD_MATCH' ? `${kind.kind}:${kind.field}` : kind.kind,
  );

  private _initialized = false;

  private _indexConfig?: IndexerConfig;
  private _updatesAfterSave = 0;
  private _lastSave = Date.now();

  private readonly _run = new DeferredTask(this._ctx, async () => {
    const ids = await cancelWithContext(this._ctx, this._params.metadataStore.getDirtyDocuments());
    if (ids.length === 0) {
      return;
    }

    const snapshots = await cancelWithContext(this._ctx, this._params.loadDocuments(ids));
    for (const [kind, index] of this._indexes.entries()) {
      switch (kind.kind) {
        case 'FIELD_MATCH':
          await cancelWithContext(
            this._ctx,
            updateIndexWithObjects(
              index,
              snapshots.filter((snapshot) => kind.field in snapshot.object).map((snapshot) => snapshot.object),
            ),
          );
          break;
        default:
          await cancelWithContext(
            this._ctx,
            updateIndexWithObjects(
              index,
              snapshots.map((snapshot) => snapshot.object),
            ),
          );
      }
    }

    await cancelWithContext(
      this._ctx,
      Promise.all(
        snapshots.map((snapshot) => this._params.metadataStore.markClean(snapshot.object.id, snapshot.currentHash)),
      ),
    );

    await cancelWithContext(this._ctx, this._maybeSaveIndexes());
  });

  constructor(private readonly _params: IndexerParams) {
    this._params.metadataStore.updated.on(this._ctx, () => {
      this._run.schedule();
    });
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

    const indexesFromDisk = await this._params.indexStore.loadAllIndexes();
    for (const index of indexesFromDisk) {
      if (!this._indexConfig || this._indexConfig.indexes.some((kind) => isEqual(kind, index.kind))) {
        this._indexes.set(index.kind, index);
      }
    }
    this._run.schedule();

    this._initialized = true;
  }

  private async _maybeSaveIndexes() {
    this._updatesAfterSave++;
    if (
      this._updatesAfterSave >= this._params.saveAfterUpdates ||
      Date.now() - this._lastSave >= this._params.saveAfterTime
    ) {
      await this._saveIndexes();
    }
  }

  @synchronized
  private async _saveIndexes() {
    for (const index of this._indexes.values()) {
      await this._params.indexStore.save(index);
    }
    this._updatesAfterSave = 0;
    this._lastSave = Date.now();
  }

  async destroy() {
    await this._ctx.dispose();
    await this._saveIndexes();
  }
}

const updateIndexWithObjects = async (index: Index, objects: ObjectType[]) =>
  Promise.all(objects.map((object) => index.update(object.id, object)));
