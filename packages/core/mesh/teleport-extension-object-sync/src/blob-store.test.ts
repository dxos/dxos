//
// Copyright 2023 DXOS.org
//

//
// Copyright 2023 DXOS.org
//

import expect from 'expect';

import { BlobMeta } from '@dxos/protocols/proto/dxos/echo/blob';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { describe, test } from '@dxos/test';

import { BlobStore } from './blob-store';

describe('BlobStore', () => {
  test('set/get', async () => {
    const storage = createStorage({ type: StorageType.RAM });
    const blobStore = new BlobStore(storage.createDirectory('blobs'));
    const data = Buffer.from('hello');
    const meta1 = await blobStore.set(data);
    expect(meta1.bitfield).toEqual(new Uint8Array([0b10000000]));
    expect(meta1.state).toEqual(BlobMeta.State.FULLY_PRESENT);

    const meta2 = await blobStore.getMeta(meta1.id);
    expect(meta2).toEqual(meta1);
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
      });
      const readData = await blobStore.get(meta.id);
      expect(readData).toEqual(new Uint8Array([...new Array(4096).fill(1), ...new Array(4096).fill(0)]));
      expect(newMeta.bitfield).toEqual(new Uint8Array([0b11000000]));
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
      });
      expect(meta1.state).toEqual(BlobMeta.State.PARTIALLY_PRESENT);
      expect(meta1.bitfield).toEqual(new Uint8Array([0b10000000]));

      const meta2 = await blobStore.setChunk({
        id,
        chunkOffset: chunkSize,
        totalLength: length,
        chunkSize,
        payload: Buffer.from(new Uint8Array(length - chunkSize).fill(2)),
      });
      expect(meta2.state).toEqual(BlobMeta.State.FULLY_PRESENT);
      expect(meta2.bitfield).toEqual(new Uint8Array([0b11000000]));
      const readData = await blobStore.get(id);
      expect(readData).toEqual(
        new Uint8Array([...new Array(chunkSize).fill(1), ...new Array(length - chunkSize).fill(2)]),
      );
    }
  });
});
