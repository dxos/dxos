import { schema } from "@dxos/protocols";
import { BlobMeta } from "@dxos/protocols/proto/dxos/echo/blob";
import { BlobChunk } from "@dxos/protocols/proto/dxos/mesh/teleport/blobsync";
import { Directory } from '@dxos/random-access-storage';
import { BitField } from "@dxos/util";
import { th } from "date-fns/locale";
import assert from "node:assert";
import path from "node:path";

export type GetOptions = {
  offset?: number;
  length?: number;
}

export class BlobStore {
  // prettier-ignore
  constructor(
    private readonly _directory: Directory
  ) { }


  async getMeta(id: Uint8Array): Promise<BlobMeta> {
    const file = this._directory.getOrCreateFile(path.join(Buffer.from(id).toString('hex'), 'meta'));
    const data = await file.read(0, (await file.stat()).size);
    return schema.getCodecForType('dxos.echo.blob.BlobMeta').decode(data);
  }

  /**
   * @throws If range is not available.
   */
  async get(id: Uint8Array, options: GetOptions = {}): Promise<Uint8Array> {
    const metadata = await this.getMeta(id);

    const { offset = 0, length = metadata.length } = options;

    if (offset + length > metadata.length) {
      throw new Error('Invalid range');
    }

    if (metadata.state === BlobMeta.State.FULLY_PRESENT) {
      const file = this._directory.getOrCreateFile(path.join(Buffer.from(id).toString('hex'), 'data'));
      return file.read(offset, length);
    } else if (options.offset === undefined && options.length === undefined) {
      throw new Error('Blob not available');
    }

    const beginChunk = Math.floor(offset / metadata.chunkSize);
    const endChunk = Math.ceil((offset + length) / metadata.chunkSize);

    assert(metadata.bitfield, 'Bitfield not present')
    assert(metadata.bitfield.length >= endChunk, 'Invalid bitfield length');

    const present = BitField.count(metadata.bitfield, beginChunk, endChunk) === endChunk - beginChunk;

    if (!present) {
      throw new Error('Blob not available');
    }

    const file = this._directory.getOrCreateFile(path.join(Buffer.from(id).toString('hex'), 'data'));
    return file.read(offset, length);
  }

  async list(): Promise<BlobMeta[]> {

  }


  async set(data: Uint8Array): Promise<BlobMeta> {

  }

  async setChunk(chunk: BlobChunk): Promise<Uint8Array> {

  }
}