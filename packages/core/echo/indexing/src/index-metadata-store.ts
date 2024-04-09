//
// Copyright 2024 DXOS.org
//

import { Event, synchronized } from '@dxos/async';
import { type MetadataMethods } from '@dxos/echo-pipeline';
import { trace } from '@dxos/tracing';

import { ConcatenatedHeadHashes } from './types';
import { MySublevel } from './level';
import { log } from '@dxos/log';

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

  private readonly _db: MySublevel;

  constructor({ db }: IndexMetadataStoreParams) {
    this._db = db;
  }

  @trace.span({ showInBrowserTimeline: true })
  @log.method()
  async getDirtyDocuments(): Promise<string[]> {
    let res: string[] = [];

    for await (const [id, metadata] of this._db.iterator<string, DocumentMetadata>({ valueEncoding: 'json' })) {
      if (metadata.lastIndexedHash !== metadata.lastAvailableHash) {
        res.push(id);
      }
    }

    return res;
  }

  @trace.span({ showInBrowserTimeline: true })
  @synchronized
  @log.method()
  async markDirty(idToLastHash: Map<string, string>) {
    const batch = this._db.batch();

    for (const [id, lastAvailableHash] of idToLastHash.entries()) {
      // TODO(dmaretskyi): Splitting metadata into separate keys would allow us set hashes without reading data.
      const metadata = await this._getMetadata(id);
      metadata.lastAvailableHash = lastAvailableHash;
      batch.put<string, DocumentMetadata>(id, metadata, { valueEncoding: 'json' });
    }

    await batch.write();
  }

  @log.method()
  async markClean(id: string, lastIndexedHash: string) {
    const metadata = await this._getMetadata(id);
    metadata.lastIndexedHash = lastIndexedHash;
    await this._db.put<string, DocumentMetadata>(id, metadata, { valueEncoding: 'json' });
    this.clean.emit();
  }

  private async _getMetadata(id: string): Promise<DocumentMetadata> {
    // TODO(dmaretskyi): Research performance implications of going using try-catch for missing keys.
    try {
      return await this._db.get<string, DocumentMetadata>(id, { valueEncoding: 'json' });
    } catch (err: any) {
      if (err.notFound) {
        return { id };
      } else {
        throw err;
      }
    }
  }
}
