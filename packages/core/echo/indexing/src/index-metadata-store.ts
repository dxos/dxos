//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type SubLevelDB, type BatchLevel } from '@dxos/echo-pipeline';
import { type ObjectPointerEncoded } from '@dxos/protocols';
import { trace } from '@dxos/tracing';
import { defaultMap } from '@dxos/util';

import { type ConcatenatedHeadHashes } from './types';
import { log } from '@dxos/log';

export type IndexMetadataStoreParams = {
  db: SubLevelDB;
};

export type DocumentMetadata = {
  /**
   * Encoded object pointer: `${documentId}|${objectId}`.
   */
  id: ObjectPointerEncoded;
  lastIndexedHash?: ConcatenatedHeadHashes;
  lastAvailableHash?: ConcatenatedHeadHashes;
};

@trace.resource()
export class IndexMetadataStore {
  public readonly dirty = new Event<void>();
  public readonly clean = new Event<void>();

  /**
   * Documents that were saved by automerge-repo but maybe not indexed (also includes indexed documents).
   *
   * ObjectPointerEncoded -> ConcatenatedHeadHashes
   */
  private readonly _lastSeen: SubLevelDB;

  /**
   * Documents that were indexing
   */
  private readonly _lastIndexed: SubLevelDB;

  constructor({ db }: IndexMetadataStoreParams) {
    this._lastSeen = db.sublevel('last-seen');
    this._lastIndexed = db.sublevel('last-indexed');
  }

  @trace.span({ showInBrowserTimeline: true })
  async getDirtyDocuments(): Promise<ObjectPointerEncoded[]> {
    const res = new Map<ObjectPointerEncoded, DocumentMetadata>();

    for await (const [id, lastAvailableHash] of this._lastSeen.iterator<ObjectPointerEncoded, ConcatenatedHeadHashes>({
      valueEncoding: 'json',
    })) {
      defaultMap(res, id, { id, lastAvailableHash });
    }

    for await (const [id, lastIndexedHash] of this._lastIndexed.iterator<ObjectPointerEncoded, ConcatenatedHeadHashes>({
      valueEncoding: 'json',
    })) {
      if (res.has(id)) {
        res.get(id)!.lastIndexedHash = lastIndexedHash;
      } else {
        defaultMap(res, id, { id, lastIndexedHash });
      }
    }

    return Array.from(res.values())
      .filter((metadata) => metadata.lastIndexedHash !== metadata.lastAvailableHash)
      .map((metadata) => metadata.id);
  }

  /**
   * @returns All document id's that were already indexed. May include dirty documents.
   */
  async getAllIndexedDocuments(): Promise<ObjectPointerEncoded[]> {
    const tuples = await this._lastIndexed
      .iterator<ObjectPointerEncoded>({
        valueEncoding: 'json',
        values: false,
      })
      .all();

    return tuples.map(([id]) => id);
  }

  @trace.span({ showInBrowserTimeline: true })
  markDirty(idToLastHash: Map<ObjectPointerEncoded, ConcatenatedHeadHashes>, batch: BatchLevel) {
    for (const [id, lastAvailableHash] of idToLastHash.entries()) {
      batch.put<string, string>(id, lastAvailableHash, { valueEncoding: 'json', sublevel: this._lastSeen });
    }
  }

  /**
   * Called after leveldb batch commit.
   */
  afterMarkDirty() {
    this.dirty.emit();
  }

  async markClean(id: ObjectPointerEncoded, lastIndexedHash: ConcatenatedHeadHashes) {
    await this._lastIndexed.put<string, string>(id, lastIndexedHash, { valueEncoding: 'json' });
    this.clean.emit();
  }

  // markClean(idToLastHash: Map<ObjectPointerEncoded, ConcatenatedHeadHashes>, batch: BatchLevel) {
  //   for (const [id, lastIndexedHash] of idToLastHash.entries()) {
  //     batch.put<string, string>(id, lastIndexedHash, { valueEncoding: 'json', sublevel: this._lastIndexed });
  //   }
  // }

  dropFromClean(ids: ObjectPointerEncoded[], batch: BatchLevel) {
    for (const id of ids) {
      batch.del(id, { sublevel: this._lastIndexed });
    }
  }
}
