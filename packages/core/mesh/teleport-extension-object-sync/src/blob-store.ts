//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';
import path from 'node:path';

import { subtleCrypto } from '@dxos/crypto';
import { schema } from '@dxos/protocols';
import { BlobMeta } from '@dxos/protocols/proto/dxos/echo/blob';
import { BlobChunk } from '@dxos/protocols/proto/dxos/mesh/teleport/blobsync';
import { Directory } from '@dxos/random-access-storage';
import { BitField } from '@dxos/util';

export type GetOptions = {
  offset?: number;
  length?: number;
};

export const DEFAULT_CHUNK_SIZE = 4096;

export class BlobStore {
  // prettier-ignore
  constructor(
    private readonly _directory: Directory
  ) { }

  async getMeta(id: Uint8Array): Promise<BlobMeta | undefined> {
    const file = this._getMetaFile(id);
    const size = (await file.stat()).size;
    if (size === 0) {
      return;
    }
    const data = await file.read(0, size);
    return schema.getCodecForType('dxos.echo.blob.BlobMeta').decode(data);
  }

  /**
   * @throws If range is not available.
   */
  async get(id: Uint8Array, options: GetOptions = {}): Promise<Uint8Array> {
    const metadata = await this.getMeta(id);

    if (!metadata) {
      throw new Error('Blob not available');
    }

    const { offset = 0, length = metadata.length } = options;

    if (offset + length > metadata.length) {
      throw new Error('Invalid range');
    }

    if (metadata.state === BlobMeta.State.FULLY_PRESENT) {
      const file = this._getDataFile(id);
      return file.read(offset, length);
    } else if (options.offset === undefined && options.length === undefined) {
      throw new Error('Blob not available');
    }

    const beginChunk = Math.floor(offset / metadata.chunkSize);
    const endChunk = Math.ceil((offset + length) / metadata.chunkSize);

    assert(metadata.bitfield, 'Bitfield not present');
    assert(metadata.bitfield.length >= endChunk, 'Invalid bitfield length');

    const present = BitField.count(metadata.bitfield, beginChunk, endChunk) === endChunk - beginChunk;

    if (!present) {
      throw new Error('Blob not available');
    }

    const file = this._getDataFile(id);
    return file.read(offset, length);
  }

  async list(): Promise<BlobMeta[]> {
    throw new Error('Not implemented');
  }

  async set(data: Uint8Array): Promise<BlobMeta> {
    const id = new Uint8Array(await subtleCrypto.digest('SHA-256', data));
    const bitfield = BitField.ones(data.length / DEFAULT_CHUNK_SIZE);

    const meta: BlobMeta = {
      id,
      state: BlobMeta.State.FULLY_PRESENT,
      length: data.length,
      chunkSize: DEFAULT_CHUNK_SIZE,
      bitfield,
      created: new Date(),
      updated: new Date(),
    };

    await this._getDataFile(id).write(0, Buffer.from(data));
    await this._getMetaFile(id).write(0, Buffer.from(schema.getCodecForType('dxos.echo.blob.BlobMeta').encode(meta)));
    return meta;
  }

  async setChunk(chunk: BlobChunk): Promise<BlobMeta> {
    // Init metadata.
    let meta = await this.getMeta(chunk.id);
    if (!meta) {
      assert(chunk.totalLength, 'totalLength is not present');
      meta = {
        id: chunk.id,
        state: BlobMeta.State.PARTIALLY_PRESENT,
        length: chunk.totalLength,
        chunkSize: chunk.chunkSize ?? DEFAULT_CHUNK_SIZE,
        created: new Date(),
      };
      meta.bitfield = new Uint8Array(Math.ceil(meta.length / meta.chunkSize / 8)).fill(0);
    }

    if (chunk.chunkSize && chunk.chunkSize !== meta.chunkSize) {
      throw new Error('Invalid chunk size');
    }

    assert(meta.bitfield, 'Bitfield not present');
    assert(chunk.chunkOffset !== undefined, 'chunkOffset is not present');

    // Write chunk.
    await this._getDataFile(chunk.id).write(chunk.chunkOffset, Buffer.from(chunk.payload));

    // Update bitfield.
    BitField.set(meta.bitfield, Math.floor(chunk.chunkOffset / meta.chunkSize), true);

    // Update metadata.
    if (BitField.count(meta.bitfield, 0, meta.length) * meta.chunkSize >= meta.length) {
      meta.state = BlobMeta.State.FULLY_PRESENT;
    }
    meta.updated = new Date();

    // Write metadata.
    await this._getMetaFile(chunk.id).write(
      0,
      Buffer.from(schema.getCodecForType('dxos.echo.blob.BlobMeta').encode(meta)),
    );

    return meta;
  }

  private _getMetaFile(id: Uint8Array) {
    return this._directory.getOrCreateFile(path.join(Buffer.from(id).toString('hex'), 'meta'));
  }

  private _getDataFile(id: Uint8Array) {
    return this._directory.getOrCreateFile(path.join(Buffer.from(id).toString('hex'), 'data'));
  }
}
