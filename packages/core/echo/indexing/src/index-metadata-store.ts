//
// Copyright 2024 DXOS.org
//

import { synchronized, Event } from '@dxos/async';
import { type MetadataMethods } from '@dxos/echo-pipeline';
import { log } from '@dxos/log';
import { type Directory } from '@dxos/random-access-storage';
import { trace } from '@dxos/tracing';

import { overrideFile } from './util';

export type IndexMetadataStoreParams = {
  directory: Directory;
};

export type DocumentMetadata = {
  id: string;
  lastIndexedHash?: string;
  lastAvailableHash?: string;
};

@trace.resource()
// TODO(mykola): Use snapshot and append only log, not separate file for each document.
export class IndexMetadataStore implements MetadataMethods {
  public readonly dirty = new Event<void>();
  public readonly clean = new Event<void>();

  private readonly _directory: Directory;
  /** map objectId -> index metadata */
  private readonly _metadata: Map<string, DocumentMetadata> = new Map();

  constructor({ directory }: IndexMetadataStoreParams) {
    this._directory = directory;
  }

  @trace.span({ showInBrowserTimeline: true })
  async markDirty(idToLastHash: Map<string, string>) {
    const tasks = [...idToLastHash.entries()].map(async ([id, lastAvailableHash]) => {
      const metadata = await this._getMetadata(id);
      metadata.lastAvailableHash = lastAvailableHash;
      await this._setMetadata(id, metadata);
      this.dirty.emit();
    });
    await Promise.all(tasks);
  }

  @trace.span({ showInBrowserTimeline: true })
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

  async markClean(id: string, lastIndexedHash: string) {
    const metadata = await this._getMetadata(id);
    metadata.lastIndexedHash = lastIndexedHash;
    await this._setMetadata(id, metadata);
    this.clean.emit();
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
      await overrideFile({ path: id, directory: this._directory, content: Buffer.from(JSON.stringify(metadata)) });
      this._metadata.set(id, metadata);
      return true;
    } catch (err) {
      log.warn('failed to write metadata', err);
      return false;
    }
  }
}
