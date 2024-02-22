//
// Copyright 2024 DXOS.org
//

import { synchronized } from '@dxos/async';
import { log } from '@dxos/log';
import { type Directory } from '@dxos/random-access-storage';

import { overrideFile } from './util';

export type IndexMetadataStoreParams = {
  directory: Directory;
};

export type DocumentMetadata = {
  id: string;
  lastIndexedHash?: string;
  lastAvailableHash?: string;
};

export class IndexMetadataStore {
  private readonly _directory: Directory;
  /** map objectId -> index metadata */
  private readonly _metadata: Map<string, DocumentMetadata> = new Map();

  constructor({ directory }: IndexMetadataStoreParams) {
    this._directory = directory;
  }

  async markDocumentAsDirty(id: string, lastAvailableHash: string) {
    const metadata = await this._getMetadata(id);
    metadata.lastAvailableHash = lastAvailableHash;
    await this._setMetadata(id, metadata);
  }

  async getDirtyDocuments(): Promise<string[]> {
    const ids = await this._directory.list();
    const dirty: string[] = [];
    await Promise.all(
      ids.map(async (id) => {
        const metadata = await this._getMetadata(id);
        if (metadata.lastIndexedHash !== metadata.lastAvailableHash) {
          dirty.push(metadata.id);
        }
      }),
    );
    return dirty;
  }

  async markDocumentAsClean(id: string, lastIndexedHash: string) {
    const metadata = await this._getMetadata(id);
    metadata.lastIndexedHash = lastIndexedHash;
    await this._setMetadata(id, metadata);
  }

  @synchronized
  private async _getMetadata(id: string): Promise<DocumentMetadata> {
    if (this._metadata.has(id)) {
      return this._metadata.get(id)!;
    } else {
      try {
        const file = this._directory.getOrCreateFile(id);
        const { size } = await file.stat();
        const serializedData = (await file.read(0, size)).toString();
        const metadata: DocumentMetadata = serializedData.length !== 0 ? JSON.parse(serializedData) : { id };
        this._metadata.set(id, metadata);
        return metadata;
      } catch (err) {
        log.warn('failed to read metadata', err);
        this._metadata.set(id, { id });
        return { id };
      }
    }
  }

  @synchronized
  private async _setMetadata(id: string, metadata: DocumentMetadata): Promise<boolean> {
    try {
      const file = this._directory.getOrCreateFile(id);
      await overrideFile(file, Buffer.from(JSON.stringify(metadata)));
      this._metadata.set(id, metadata);
      return true;
    } catch (err) {
      log.warn('failed to write metadata', err);
      return false;
    }
  }
}
