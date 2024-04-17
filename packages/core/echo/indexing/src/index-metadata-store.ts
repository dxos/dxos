//
// Copyright 2024 DXOS.org
//

import { Event, synchronized } from '@dxos/async';
import { type MySublevel, type MetadataMethods, type MyLevelBatch } from '@dxos/echo-pipeline';
import { trace } from '@dxos/tracing';
import { defaultMap } from '@dxos/util';

import { type ConcatenatedHeadHashes } from './types';

export type IndexMetadataStoreParams = {
  db: MySublevel;
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
export class IndexMetadataStore implements MetadataMethods {
  public readonly dirty = new Event<void>();
  public readonly clean = new Event<void>();

  private readonly _lastSeen: MySublevel;
  private readonly _lastIndexed: MySublevel;

  constructor({ db }: IndexMetadataStoreParams) {
    this._lastSeen = db.sublevel('clean');
    this._lastIndexed = db.sublevel('dirty');
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
  @synchronized
  async markDirty(idToLastHash: Map<string, string>, outerBatch?: MyLevelBatch) {
    const batch = outerBatch ?? this._lastIndexed.batch();

    for (const [id, lastAvailableHash] of idToLastHash.entries()) {
      batch.put<string, string>(id, lastAvailableHash, { valueEncoding: 'json', sublevel: this._lastSeen });
    }

    // Commit the batch if it was created here.
    if (!outerBatch) {
      await batch.write();
      await this.afterMarkDirty();
    }
  }

  async afterMarkDirty() {
    this.dirty.emit();
  }

  async markClean(id: string, lastIndexedHash: string) {
    await this._lastSeen.put<string, string>(id, lastIndexedHash, { valueEncoding: 'json' });
    this.clean.emit();
  }
}
