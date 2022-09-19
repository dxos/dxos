//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { synchronized } from '@dxos/async';
import { log } from '@dxos/log';
import { PublicKey, schema } from '@dxos/protocols';
import { IdentityRecord } from '@dxos/protocols/proto/dxos/halo/credentials';
import { EchoMetadata, PartyMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { Directory } from '@dxos/random-access-storage';

/**
 * Version for the schema of the stored data as defined in dxos.echo.metadata.EchoMetadata.
 *
 * Should be incremented every time there's a breaking change to the stored data.
 */
export const STORAGE_VERSION = 1;

export interface AddPartyOptions {
  key: PublicKey
  genesisFeed: PublicKey
}

const emptyEchoMetadata = (): EchoMetadata => ({
  version: STORAGE_VERSION,
  parties: [],
  created: new Date(),
  updated: new Date()
});

export class MetadataStore {
  private _metadata: EchoMetadata = emptyEchoMetadata();

  constructor (
    private readonly _directory: Directory
  ) {}

  get version (): number {
    return this._metadata.version ?? 0;
  }

  /**
   * Returns a list of currently saved parties. The list and objects in it can be modified addParty and
   * addPartyFeed functions.
   */
  get parties (): PartyMetadata[] {
    return this._metadata.parties ?? [];
  }

  /**
   * Loads metadata from persistent storage.
   */
  @synchronized
  async load (): Promise<void> {
    const file = this._directory.createOrOpenFile('EchoMetadata');
    try {
      const { size: fileLength } = await file.stat();
      if (fileLength < 4) {
        return;
      }
      // Loading file size from first 4 bytes.
      const dataSize = fromBytesInt32(await file.read(0, 4));
      log(`Load: data size ${dataSize}`);

      // Sanity check.
      {
        if (fileLength < dataSize + 4) {
          throw new Error('Metadata storage is corrupted');
        }
      }

      const data = await file.read(4, dataSize);
      this._metadata = schema.getCodecForType('dxos.echo.metadata.EchoMetadata').decode(data);
    } catch (err: any) {
      log(`Error loading metadata: ${err}`);
      this._metadata = emptyEchoMetadata();
    } finally {
      await file.close();
    }
  }

  @synchronized
  private async _save (): Promise<void> {
    const data: EchoMetadata = {
      ...this._metadata,
      version: STORAGE_VERSION,
      created: this._metadata.created ?? new Date(),
      updated: new Date()
    };

    const file = this._directory.createOrOpenFile('EchoMetadata');

    try {
      const encoded = Buffer.from(schema.getCodecForType('dxos.echo.metadata.EchoMetadata').encode(data));

      // Saving file size at first 4 bytes.
      log(`Save: data size ${encoded.length}`);
      await file.write(0, toBytesInt32(encoded.length));

      // Saving data.
      await file.write(4, encoded);

    } finally {
      await file.close();
    }
  }

  /**
   * Clears storage - doesn't work for now.
   */
  async clear (): Promise<void> {
    log('Clearing all echo metadata...');
    await this._directory.delete();
  }

  getIdentityRecord (): IdentityRecord | undefined {
    return this._metadata.identity;
  }

  async setIdentityRecord (record: IdentityRecord) {
    assert(!this._metadata.identity, 'Cannot overwrite existing identity in metadata');

    this._metadata.identity = record;
    await this._save();
  }
}

const toBytesInt32 = (num: number) => {
  const buf = Buffer.alloc(4);
  buf.writeInt32LE(num, 0);
  return buf;
};

const fromBytesInt32 = (buf: Buffer) => buf.readInt32LE(0);
