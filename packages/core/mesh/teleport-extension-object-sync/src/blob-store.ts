//
// Copyright 2023 DXOS.org
//

import path from 'node:path';

import { synchronized } from '@dxos/async';
import { subtleCrypto } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { schema } from '@dxos/protocols/proto';
import { type BlobMeta, BlobMeta_State } from '@dxos/protocols/buf/dxos/echo/blob_pb';
import { type BlobChunk } from '@dxos/protocols/buf/dxos/mesh/teleport/blobsync_pb';
import { type Directory } from '@dxos/random-access-storage';
import { BitField, arrayToBuffer } from '@dxos/util';

export type GetOptions = {
  offset?: number;
  length?: number;
};

export const DEFAULT_CHUNK_SIZE = 4096;

const BlobMetaCodec = schema.getCodecForType('dxos.echo.blob.BlobMeta');

export class BlobStore {
  constructor(private readonly _directory: Directory) {}

  @synchronized
  async getMeta(id: Uint8Array): Promise<BlobMeta | undefined> {
    return this._getMeta(id);
  }

  /**
   * @throws If range is not available.
   */
  @synchronized
  async get(id: Uint8Array, options: GetOptions = {}): Promise<Uint8Array> {
    const metadata = await this._getMeta(id);

    if (!metadata) {
      throw new Error('Blob not available');
    }

    const { offset = 0, length = metadata.length } = options;

    if (offset + length > metadata.length) {
      throw new Error('Invalid range');
    }

    if (metadata.state === BlobMeta_State.FULLY_PRESENT) {
      const file = this._getDataFile(id);
      return file.read(offset, length);
    } else if (options.offset === undefined && options.length === undefined) {
      throw new Error('Blob not available');
    }

    const beginChunk = Math.floor(offset / metadata.chunkSize);
    const endChunk = Math.ceil((offset + length) / metadata.chunkSize);

    invariant(metadata.bitfield, 'Bitfield not present');
    invariant(metadata.bitfield.length * 8 >= endChunk, 'Invalid bitfield length');

    const present = BitField.count(metadata.bitfield, beginChunk, endChunk) === endChunk - beginChunk;

    if (!present) {
      throw new Error('Blob not available');
    }

    const file = this._getDataFile(id);
    return file.read(offset, length);
  }

  @synchronized
  async list(): Promise<BlobMeta[]> {
    /*
    Weird path formatting:

    "e9b9aa7a21c2c55a9eca333cd59975633157562ca0a0f4f243d4778f192c291e_meta"
    "e9b9aa7a21c2c55a9eca333cd59975633157562ca0a0f4f243d4778f192c291e_data"
    "5001de5a47191357c075aeee6451c4cc323f3a8ada24dd1191e83403608a38d5_meta
     */
    const files = new Set((await this._directory.list()).map((f) => f.split('_')[0]));

    const res: BlobMeta[] = [];

    for (const file of files) {
      const id = PublicKey.from(file).asUint8Array();
      const meta = await this._getMeta(id);
      if (meta) {
        res.push(meta);
      }
    }

    return res;
  }

  @synchronized
  async set(data: Uint8Array): Promise<BlobMeta> {
    const id = new Uint8Array(await subtleCrypto.digest('SHA-256', data as Uint8Array<ArrayBuffer>));
    const bitfield = BitField.ones(data.length / DEFAULT_CHUNK_SIZE);

    // Proto codec handles Date at runtime for Timestamp fields; cast at boundary.
    const meta = {
      id,
      state: BlobMeta_State.FULLY_PRESENT,
      length: data.length,
      chunkSize: DEFAULT_CHUNK_SIZE,
      bitfield,
      created: new Date(),
      updated: new Date(),
    } as any as BlobMeta;

    await this._getDataFile(id).write(0, arrayToBuffer(data));
    await this._writeMeta(id, meta);
    return meta;
  }

  // TODO(dmaretskyi): Optimize locking.
  @synchronized
  async setChunk(chunk: BlobChunk): Promise<BlobMeta> {
    // Proto codec uses @dxos/keys PublicKey, Date, etc.; operate via `any` internally.
    const chk: any = chunk;
    let meta: any = await this._getMeta(chk.id);
    if (!meta) {
      invariant(chk.totalLength, 'totalLength is not present');
      meta = {
        id: chk.id,
        state: BlobMeta_State.PARTIALLY_PRESENT,
        length: chk.totalLength,
        chunkSize: chk.chunkSize ?? DEFAULT_CHUNK_SIZE,
        created: new Date(),
      };
      meta.bitfield = BitField.zeros(meta.length / meta.chunkSize);
    }

    if (chk.chunkSize && chk.chunkSize !== meta.chunkSize) {
      throw new Error('Invalid chunk size');
    }

    invariant(meta.bitfield, 'Bitfield not present');
    invariant(chk.chunkOffset !== undefined, 'chunkOffset is not present');

    await this._getDataFile(chk.id).write(chk.chunkOffset, arrayToBuffer(chk.payload));

    BitField.set(meta.bitfield, Math.floor(chk.chunkOffset / meta.chunkSize), true);

    if (BitField.count(meta.bitfield, 0, meta.length) * meta.chunkSize >= meta.length) {
      meta.state = BlobMeta_State.FULLY_PRESENT;
    }
    meta.updated = new Date();

    await this._writeMeta(chk.id, meta);

    return meta;
  }

  private async _writeMeta(id: Uint8Array, meta: any): Promise<void> {
    const encoded = arrayToBuffer(BlobMetaCodec.encode(meta));
    const data = Buffer.alloc(encoded.length + 4);
    data.writeUInt32LE(encoded.length, 0);
    encoded.copy(data, 4);

    // Write metadata.
    await this._getMetaFile(id).write(0, data);
  }

  private async _getMeta(id: Uint8Array): Promise<any | undefined> {
    const file = this._getMetaFile(id);
    const size = (await file.stat()).size;
    if (size === 0) {
      return;
    }
    const data = await file.read(0, size);
    const protoSize = data.readUInt32LE(0);
    return BlobMetaCodec.decode(data.subarray(4, protoSize + 4));
  }

  private _getMetaFile(id: Uint8Array) {
    return this._directory.getOrCreateFile(path.join(arrayToBuffer(id).toString('hex'), 'meta'));
  }

  private _getDataFile(id: Uint8Array) {
    return this._directory.getOrCreateFile(path.join(arrayToBuffer(id).toString('hex'), 'data'));
  }
}
