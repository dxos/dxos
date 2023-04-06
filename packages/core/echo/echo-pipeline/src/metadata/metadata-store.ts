//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { synchronized } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { DataCorruptionError } from '@dxos/errors'
import { EchoMetadata, SpaceMetadata, IdentityRecord } from '@dxos/protocols/proto/dxos/echo/metadata';
import { Directory } from '@dxos/random-access-storage';
import { Timeframe } from '@dxos/timeframe';
import CRC32 from 'crc-32'

/**
 * Version for the schema of the stored data as defined in dxos.echo.metadata.EchoMetadata.
 *
 * Should be incremented every time there's a breaking change to the stored data.
 */
export const STORAGE_VERSION = 1;

export interface AddSpaceOptions {
  key: PublicKey;
  genesisFeed: PublicKey;
}

const emptyEchoMetadata = (): EchoMetadata => ({
  version: STORAGE_VERSION,
  spaces: [],
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
   * Returns a list of currently saved spaces. The list and objects in it can be modified addSpace and
   * addSpaceFeed functions.
   */
  get spaces(): SpaceMetadata[] {
    return this._metadata.spaces ?? [];
  }

  /**
   * Loads metadata from persistent storage.
   */
  @synchronized
  async load(): Promise<void> {
    const file = this._directory.getOrCreateFile('EchoMetadata');
    try {
      const { size: fileLength } = await file.stat();
      if (fileLength < 8) {
        return;
      }
      // Loading file size from first 4 bytes.
      const dataSize = fromBytesInt32(await file.read(0, 4));
      const checksum = fromBytesInt32(await file.read(4, 4));
      log('loaded', { size: dataSize, checksum });

      if (fileLength < dataSize + 8) {
        throw new DataCorruptionError('Metadata size is smaller than expected.');
      }


      const data = await file.read(8, dataSize);

      const calculatedChecksum = CRC32.buf(data);
      if (calculatedChecksum !== checksum) {
        throw new DataCorruptionError('Metadata checksum is invalid.');
      }

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
      const checksum = CRC32.buf(encoded);

      // Saving file size at first 4 bytes.
      await file.write(0, toBytesInt32(encoded.length));
      // Saving checksum at 4th byte.
      await file.write(4, toBytesInt32(checksum));
      // Saving data.
      await file.write(8, encoded);

      log('saved', { size: encoded.length, checksum });
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

  async addSpace(record: SpaceMetadata) {
    assert(
      !(this._metadata.spaces ?? []).find((space) => space.key === record.key),
      'Cannot overwrite existing space in metadata'
    );

    (this._metadata.spaces ??= []).push(record);
    await this._save();
  }

  async setSpaceLatestTimeframe(spaceKey: PublicKey, timeframe: Timeframe) {
    const space = this.spaces.find((space) => space.key === spaceKey);
    assert(space, 'Space not found');

    space.dataTimeframe = timeframe;
    await this._save();
  }

  async setSpaceSnapshot(spaceKey: PublicKey, snapshot: string) {
    const space = this.spaces.find((space) => space.key === spaceKey);
    assert(space, 'Space not found');

    space.snapshot = snapshot;
    await this._save();
  }

  async setWritableFeedKeys(spaceKey: PublicKey, controlFeedKey: PublicKey, dataFeedKey: PublicKey) {
    const space = this.spaces.find((space) => space.key === spaceKey);
    assert(space, 'Space not found');

    space.controlFeedKey = controlFeedKey;
    space.dataFeedKey = dataFeedKey;
    await this._save();
  }
}

const toBytesInt32 = (num: number) => {
  const buf = Buffer.alloc(4);
  buf.writeInt32LE(num, 0);
  return buf;
};

const fromBytesInt32 = (buf: Buffer) => buf.readInt32LE(0);
