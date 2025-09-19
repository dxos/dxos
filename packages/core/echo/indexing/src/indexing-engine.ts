//
// Copyright 2025 DXOS.org
//

import { synchronized } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import type { LevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { trace } from '@dxos/tracing';
import { ComplexMap } from '@dxos/util';

import type { IndexMetadataStore, IndexStore } from './store';
import type { IdToHeads, Index, ObjectSnapshot } from './types';

/**
 * Loads documents by their ID and version.
 */
interface DocumentLoader {
  loadDocuments: (ids: IdToHeads) => AsyncGenerator<ObjectSnapshot[]>;
}

export type IndexingEngineOptions = {
  db: LevelDB;

  metadataStore: IndexMetadataStore;
  indexStore: IndexStore;

  /**
   * Load documents by their pointers at specific hash.
   */
  documentLoader: DocumentLoader;
};

type IndexUpdatedObjectsOptions = {
  indexTimeBudget: number;
  indexUpdateBatchSize: number;
};

/**
 * Manages multiple asynchronous indexes.
 */
export class IndexingEngine extends Resource {
  private readonly _db: LevelDB;
  private readonly _metadataStore: IndexMetadataStore;
  private readonly _indexStore: IndexStore;
  private readonly _documentLoader: DocumentLoader;

  /**
   * Indexes that are kept in-sync with the documents and are serialized to disk.
   */
  private readonly _indexes = new ComplexMap<IndexKind, Index>((kind) =>
    kind.kind === IndexKind.Kind.FIELD_MATCH ? `${kind.kind}:${kind.field}` : kind.kind,
  );

  /**
   * Indexes that were recently created and might not be fully caught up with the documents.
   * They are not serialized to disk until they are promoted.
   *
   * This separation is needed because the tracking of processed documents is done globally and not per-index.
   * This means that all indexes will be updated with the same documents in lockstep.
   * This also means that newly created indexes cannot be saved to disk until they have processed all clean documents.
   */
  private readonly _newIndexes: Index[] = [];

  constructor(options: IndexingEngineOptions) {
    super();

    this._db = options.db;
    this._metadataStore = options.metadataStore;
    this._indexStore = options.indexStore;
    this._documentLoader = options.documentLoader;
  }

  protected override async _open(ctx: Context): Promise<void> {}

  protected override async _close(ctx: Context): Promise<void> {
    for (const index of this._indexes.values()) {
      await index.close();
    }
    this._newIndexes.length = 0;
    this._indexes.clear();
  }

  get indexKinds(): IndexKind[] {
    return [...this._indexes.keys()];
  }

  get indexes(): Index[] {
    return [...this._indexes.values()];
  }

  get newIndexCount(): number {
    return this._newIndexes.length;
  }

  getIndex(kind: IndexKind): Index | undefined {
    return this._indexes.get(kind);
  }

  deleteIndex(kind: IndexKind): void {
    this._indexes.delete(kind);
  }

  async addPersistentIndex(index: Index): Promise<void> {
    this._indexes.set(index.kind, index);
    await index.open();
  }

  async addNewIndex(index: Index): Promise<void> {
    this._newIndexes.push(index);
    await index.open();
  }

  async loadIndexKindsFromDisk(): Promise<Map<string, IndexKind>> {
    return this._indexStore.loadIndexKindsFromDisk();
  }

  async loadIndexFromDisk(identifier: string): Promise<void> {
    const index = await this._indexStore.load(identifier);
    this._indexes.set(index.kind, index);
    await index.open();
  }

  async removeIndexFromDisk(identifier: string): Promise<void> {
    await this._indexStore.remove(identifier);
  }

  /**
   * Promotes new indexes to the main indexes.
   */
  @trace.span({ showInBrowserTimeline: true })
  async promoteNewIndexes(): Promise<void> {
    const documentsToIndex = await this._metadataStore.getAllIndexedDocuments();
    for await (const documents of this._documentLoader.loadDocuments(documentsToIndex)) {
      if (this._ctx.disposed) {
        return;
      }
      await this._updateIndexes(this._newIndexes, documents);
    }
    this._newIndexes.forEach((index) => this._indexes.set(index.kind, index));
    this._newIndexes.length = 0; // Clear new indexes.
    await this._saveIndexes();
  }

  /**
   * Indexes updated objects.
   * @returns completed - whether the indexing was completed
   * @returns updated - whether the indexing updated any indexes
   */
  @trace.span({ showInBrowserTimeline: true })
  async indexUpdatedObjects(options: IndexUpdatedObjectsOptions): Promise<{ completed: boolean; updated: boolean }> {
    let completed = true;
    let updated = false;

    if (this._ctx.disposed) {
      return { completed, updated };
    }
    const idToHeads = await this._metadataStore.getDirtyDocuments();

    log('dirty objects to index', { count: idToHeads.size });
    if (idToHeads.size === 0 || this._ctx.disposed) {
      return { completed, updated };
    }

    const startTime = Date.now();
    const documentsUpdated: ObjectSnapshot[] = [];
    const saveIndexChanges = async () => {
      log('Saving index changes', { count: documentsUpdated.length, timeSinceStart: Date.now() - startTime });
      await this._saveIndexes();
      const batch = this._db.batch();
      this._metadataStore.markClean(new Map(documentsUpdated.map((document) => [document.id, document.heads])), batch);
      await batch.write();
    };

    const updates: boolean[] = [];
    for await (const documents of this._documentLoader.loadDocuments(idToHeads)) {
      if (this._ctx.disposed) {
        return { completed, updated };
      }
      updates.push(...(await this._updateIndexes(Array.from(this._indexes.values()), documents)));
      documentsUpdated.push(...documents);
      if (documentsUpdated.length >= options.indexUpdateBatchSize) {
        await saveIndexChanges();
        documentsUpdated.length = 0;
      }
      if (Date.now() - startTime > options.indexTimeBudget) {
        if (documentsUpdated.length > 0) {
          await saveIndexChanges();
        }
        log('Indexing time budget exceeded', { time: Date.now() - startTime });
        completed = false;
        break;
      }
    }
    await saveIndexChanges();
    if (updates.some(Boolean)) {
      updated = true;
    }

    log('Indexing finished', {
      time: Date.now() - startTime,
      updated,
      completed,
      updatedCount: documentsUpdated.length,
    });
    return { completed, updated };
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
        case IndexKind.Kind.GRAPH:
          updates.push(...(await updateIndexWithObjects(index, documents)));
          break;
        case IndexKind.Kind.VECTOR:
          updates.push(...(await updateIndexWithObjects(index, documents)));
          break;
        case IndexKind.Kind.FULL_TEXT:
          updates.push(...(await updateIndexWithObjects(index, documents)));
          break;
      }
    }
    return updates;
  }

  @trace.span({ showInBrowserTimeline: true })
  @synchronized
  private async _saveIndexes(): Promise<void> {
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
