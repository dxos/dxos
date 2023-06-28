//
// Copyright 2021 DXOS.org
//

import CRC32 from 'crc-32';
import assert from 'node:assert';

import { synchronized, Event } from '@dxos/async';
import { DataCorruptionError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { STORAGE_VERSION, schema } from '@dxos/protocols';
import { EchoMetadata, SpaceMetadata, IdentityRecord, SpaceCache } from '@dxos/protocols/proto/dxos/echo/metadata';
import { Directory } from '@dxos/random-access-storage';
import { Timeframe } from '@dxos/timeframe';

export interface AddSpaceOptions {
  key: PublicKey;
  genesisFeed: PublicKey;
}

const emptyEchoMetadata = (): EchoMetadata => ({
  version: STORAGE_VERSION,
  spaces: [],
  created: new Date(),
  updated: new Date(),
});

export class MetadataStore {
  private _metadata: EchoMetadata = emptyEchoMetadata();
  public readonly update = new Event<EchoMetadata>();

  // prettier-ignore
  constructor(
    private readonly _directory: Directory
  ) {}

  get metadata(): EchoMetadata {
    return this._metadata;
  }

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
      updated: new Date(),
    };
    this.update.emit(data);

    const file = this._directory.getOrCreateFile('EchoMetadata');

    try {
      const encoded = Buffer.from(schema.getCodecForType('dxos.echo.metadata.EchoMetadata').encode(data));
      const checksum = CRC32.buf(encoded);

      const result = Buffer.alloc(8 + encoded.length);

      result.writeInt32LE(encoded.length, 0);
      result.writeInt32LE(checksum, 4);
      encoded.copy(result, 8);

      // NOTE: This must be done in one write operation, otherwise the file can be corrupted.
      await file.write(0, result);

      log('saved', { size: encoded.length, checksum });
    } finally {
      await file.close();
    }
  }

  _getSpace(spaceKey: PublicKey): SpaceMetadata {
    const space = this.spaces.find((space) => space.key === spaceKey);
    assert(space, 'Space not found');
    return space;
  }

  /**
   * Clears storage - doesn't work for now.
   */
  async clear(): Promise<void> {
    log('clearing all metadata');
    await this._directory.delete();
    this._metadata = emptyEchoMetadata();
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
      'Cannot overwrite existing space in metadata',
    );

    (this._metadata.spaces ??= []).push(record);
    await this._save();
  }

  async setSpaceDataLatestTimeframe(spaceKey: PublicKey, timeframe: Timeframe) {
    this._getSpace(spaceKey).dataTimeframe = timeframe;
    await this._save();
  }

  async setCache(spaceKey: PublicKey, cache: SpaceCache) {
    this._getSpace(spaceKey).cache = cache;
    await this._save();
  }

  async setWritableFeedKeys(spaceKey: PublicKey, controlFeedKey: PublicKey, dataFeedKey: PublicKey) {
    const space = this._getSpace(spaceKey);
    space.controlFeedKey = controlFeedKey;
    space.dataFeedKey = dataFeedKey;
    await this._save();
  }
}
const fromBytesInt32 = (buf: Buffer) => buf.readInt32LE(0);
