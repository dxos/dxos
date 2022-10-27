//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { synchronized } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { EchoMetadata, PartyMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { IdentityRecord } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Directory } from '@dxos/random-access-storage';

/**
 * Version for the schema of the stored data as defined in dxos.echo.metadata.EchoMetadata.
 *
 * Should be incremented every time there's a breaking change to the stored data.
 */
export const STORAGE_VERSION = 1;

export interface AddPartyOptions {
  key: PublicKey;
  genesisFeed: PublicKey;
}

const emptyEchoMetadata = (): EchoMetadata => ({
  version: STORAGE_VERSION,
  parties: [],
  created: new Date(),
  updated: new Date()
});

export class MetadataStore {
  private _metadata: EchoMetadata = emptyEchoMetadata();

  // prettier-ignore
  constructor(
    private readonly _directory: Directory
  ) {}

  get version(): number {
    return this._metadata.version ?? 0;
  }

  /**
   * Returns a list of currently saved parties. The list and objects in it can be modified addParty and
   * addPartyFeed functions.
   */
  get parties(): PartyMetadata[] {
    return this._metadata.parties ?? [];
  }

  /**
   * Loads metadata from persistent storage.
   */
  @synchronized
  async load(): Promise<void> {
    const file = this._directory.getOrCreateFile('EchoMetadata');
    try {
      const { size: fileLength } = await file.stat();
      if (fileLength < 4) {
        return;
      }
      // Loading file size from first 4 bytes.
      const dataSize = fromBytesInt32(await file.read(0, 4));
      log('loaded', { size: dataSize });

      // Sanity check.
      {
        if (fileLength < dataSize + 4) {
          throw new Error('Metadata storage is corrupted');
        }
      }

      const data = await file.read(4, dataSize);
      this._metadata = schema.getCodecForType('dxos.echo.metadata.EchoMetadata').decode(data);
    } catch (err: any) {
      log.error('failed to load metadata', { err });
      this._metadata = emptyEchoMetadata();
    } finally {
      await file.close();
    }
  }

  @synchronized
  private async _save(): Promise<void> {
    const data: EchoMetadata = {
      ...this._metadata,
      version: STORAGE_VERSION,
      created: this._metadata.created ?? new Date(),
      updated: new Date()
    };

    const file = this._directory.getOrCreateFile('EchoMetadata');

    try {
      const encoded = Buffer.from(schema.getCodecForType('dxos.echo.metadata.EchoMetadata').encode(data));

      // Saving file size at first 4 bytes.
      await file.write(0, toBytesInt32(encoded.length));
      log('saved', { size: encoded.length });

      // Saving data.
      await file.write(4, encoded);
    } finally {
      await file.close();
    }
  }

  /**
   * Clears storage - doesn't work for now.
   */
  async clear(): Promise<void> {
    log('clearing all metadata');
    await this._directory.delete();
  }

  getIdentityRecord(): IdentityRecord | undefined {
    return this._metadata.identity;
  }

  async setIdentityRecord(record: IdentityRecord) {
    assert(!this._metadata.identity, 'Cannot overwrite existing identity in metadata');

    this._metadata.identity = record;
    await this._save();
  }

  async addSpace(record: PartyMetadata) {
    assert(
      !(this._metadata.parties ?? []).find((party) => party.key === record.key),
      'Cannot overwrite existing party in metadata'
    );

    (this._metadata.parties ??= []).push(record);
    await this._save();
  }
}

const toBytesInt32 = (num: number) => {
  const buf = Buffer.alloc(4);
  buf.writeInt32LE(num, 0);
  return buf;
};

const fromBytesInt32 = (buf: Buffer) => buf.readInt32LE(0);
