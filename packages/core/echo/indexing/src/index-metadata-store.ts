//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type SubLevelDB, type BatchLevel } from '@dxos/echo-pipeline';
import { type ObjectPointerEncoded } from '@dxos/protocols';
import { trace } from '@dxos/tracing';

import { type IdsWithHash, type ConcatenatedHeadHashes } from './types';

export type IndexMetadataStoreParams = {
  db: SubLevelDB;
};

@trace.resource()
export class IndexMetadataStore {
  public readonly dirty = new Event<void>();
  public readonly clean = new Event<void>();

  /**
   * Documents that were saved by automerge-repo but maybe not indexed (also includes indexed documents).
   * ObjectPointerEncoded -> ConcatenatedHeadHashes
   */
  private readonly _lastSeen: SubLevelDB;

  /**
   * Documents that were indexing
   * ObjectPointerEncoded -> ConcatenatedHeadHashes
   */
  private readonly _lastIndexed: SubLevelDB;

  constructor({ db }: IndexMetadataStoreParams) {
    this._lastSeen = db.sublevel('last-seen', { valueEncoding: 'utf8', keyEncoding: 'utf8' });
    this._lastIndexed = db.sublevel('last-indexed', { valueEncoding: 'utf8', keyEncoding: 'utf8' });
  }

  @trace.span({ showInBrowserTimeline: true })
  async getDirtyDocuments(): Promise<IdsWithHash> {
    return new Map(await this._lastSeen.iterator<ObjectPointerEncoded>({}).all());
  }

  /**
   * @returns All document id's that were already indexed. May include dirty documents.
   */
  async getAllIndexedDocuments(): Promise<IdsWithHash> {
    return new Map(await this._lastIndexed.iterator<ObjectPointerEncoded>({}).all());
  }

  @trace.span({ showInBrowserTimeline: true })
  markDirty(idToLastHash: Map<ObjectPointerEncoded, ConcatenatedHeadHashes>, batch: BatchLevel) {
    for (const [id, lastAvailableHash] of idToLastHash.entries()) {
      batch.put<string, string>(id, lastAvailableHash, { sublevel: this._lastSeen });
    }
  }

  /**
   * Called after leveldb batch commit.
   */
  afterMarkDirty() {
    this.dirty.emit();
  }

  async markClean(id: ObjectPointerEncoded, lastIndexedHash: ConcatenatedHeadHashes) {
    await this._lastIndexed.put<ObjectPointerEncoded, ConcatenatedHeadHashes>(id, lastIndexedHash, {});
    await this._lastSeen.del(id);
    this.clean.emit();
  }

  /**
   * Called on re-indexing.
   */
  dropFromClean(ids: ObjectPointerEncoded[], batch: BatchLevel) {
    for (const id of ids) {
      batch.del(id, { sublevel: this._lastIndexed });
    }
  }
}
