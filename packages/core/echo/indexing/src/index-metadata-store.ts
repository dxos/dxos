//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { type SubLevelDB, type BatchLevel, type LevelDB } from '@dxos/echo-pipeline';
import { trace } from '@dxos/tracing';
import { defaultMap } from '@dxos/util';

import { type ConcatenatedHeadHashes } from './types';

export type IndexMetadataStoreParams = {
  db: LevelDB;
};

export type DocumentMetadata = {
  /**
   * Encoded object pointer: `${documentId}|${objectId}`.
   */
  id: string;
  lastIndexedHash?: ConcatenatedHeadHashes;
  lastAvailableHash?: ConcatenatedHeadHashes;
};

@trace.resource()
export class IndexMetadataStore {
  public readonly dirty = new Event<void>();
  public readonly clean = new Event<void>();

  private readonly _lastSeen: SubLevelDB;
  private readonly _lastIndexed: SubLevelDB;

  constructor({ db }: IndexMetadataStoreParams) {
    this._lastSeen = db.sublevel('last-seen');
    this._lastIndexed = db.sublevel('last-indexed');
  }

  @trace.span({ showInBrowserTimeline: true })
  async getDirtyDocuments(): Promise<string[]> {
    const res = new Map<string, DocumentMetadata>();

    for await (const [id, lastAvailableHash] of this._lastIndexed.iterator<string, string>({
      valueEncoding: 'json',
    })) {
      defaultMap(res, id, { id, lastAvailableHash });
    }

    for await (const [id, lastIndexedHash] of this._lastSeen.iterator<string, string>({
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

  @trace.span({ showInBrowserTimeline: true })
  markDirty(idToLastHash: Map<string, string>, batch: BatchLevel) {
    idToLastHash.forEach((lastAvailableHash, id) => {
      batch.put<string, string>(id, lastAvailableHash, { valueEncoding: 'json', sublevel: this._lastSeen });
    });
  }

  async afterMarkDirty() {
    this.dirty.emit();
  }

  async markClean(id: string, lastIndexedHash: string) {
    await this._lastIndexed.put<string, string>(id, lastIndexedHash, { valueEncoding: 'json' });
    this.clean.emit();
  }
}
