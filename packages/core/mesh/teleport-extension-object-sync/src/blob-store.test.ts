//
// Copyright 2023 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { BlobMeta_State } from '@dxos/protocols/buf/dxos/echo/blob_pb';
import { StorageType, createStorage } from '@dxos/random-access-storage';

import { BlobStore } from './blob-store';

describe('BlobStore', () => {
  test('set/get', async () => {
    const storage = createStorage({ type: StorageType.RAM });
    const blobStore = new BlobStore(storage.createDirectory('blobs'));
    const data = Buffer.from('hello');
    const meta1 = await blobStore.set(data);
    expect(Uint8Array.from(meta1.bitfield!)).toEqual(new Uint8Array([0b10000000]));
    expect(meta1.state).toEqual(BlobMeta_State.FULLY_PRESENT);

    const meta2 = await blobStore.getMeta(meta1.id);
    expect(Uint8Array.from(meta2!.id)).toEqual(meta1.id);

    const partialData = await blobStore.get(meta1.id, { offset: 1, length: 2 });
    expect(partialData).toEqual(Buffer.from('el'));
  });

  test('set chunk', async () => {
    const storage = createStorage({ type: StorageType.RAM });
    const blobStore = new BlobStore(storage.createDirectory('blobs'));
    // Set all data from beginning.
    {
      const data = Buffer.from(new Uint8Array(4096 * 2).fill(1));
      const meta = await blobStore.set(data);
      const newMeta = await blobStore.setChunk({
        id: meta.id,
        chunkOffset: 4096,
        totalLength: data.length,
        payload: Buffer.from(new Uint8Array(4096).fill(0)),
      } as any);
      const readData = await blobStore.get(meta.id);
      expect(Uint8Array.from(readData)).toEqual(
        new Uint8Array([...new Array(4096).fill(1), ...new Array(4096).fill(0)]),
      );
      expect(Uint8Array.from(newMeta.bitfield!)).toEqual(new Uint8Array([0b11000000]));
    }

    // Set data chunk by chunk.
    {
      const id = new Uint8Array([1, 2, 3]);
      const chunkSize = 4096;
      const length = 8000;
      const meta1 = await blobStore.setChunk({
        id,
        chunkOffset: 0,
        totalLength: length,
        chunkSize,
        payload: Buffer.from(new Uint8Array(chunkSize).fill(1)),
      } as any);
      expect(meta1.state).toEqual(BlobMeta_State.PARTIALLY_PRESENT);
      expect(Uint8Array.from(meta1.bitfield!)).toEqual(new Uint8Array([0b10000000]));

      const meta2 = await blobStore.setChunk({
        id,
        chunkOffset: chunkSize,
        totalLength: length,
        chunkSize,
        payload: Buffer.from(new Uint8Array(length - chunkSize).fill(2)),
      } as any);
      expect(meta2.state).toEqual(BlobMeta_State.FULLY_PRESENT);
      expect(Uint8Array.from(meta2.bitfield!)).toEqual(new Uint8Array([0b11000000]));
      const readData = await blobStore.get(id);
      expect(Uint8Array.from(readData)).toEqual(
        new Uint8Array([...new Array(chunkSize).fill(1), ...new Array(length - chunkSize).fill(2)]),
      );
    }
  });
});
