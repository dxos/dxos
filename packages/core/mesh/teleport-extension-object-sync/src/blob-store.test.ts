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
  test('set', async () => {
    const storage = createStorage({ type: StorageType.RAM });
    const blobStore = new BlobStore(storage.createDirectory('blobs'));
    const data = Buffer.from('hello');
    const meta = await blobStore.set(data);
    expect(meta.bitfield).toEqual(new Uint8Array([0b10000000]));
    expect(meta.state).toEqual(BlobMeta.State.FULLY_PRESENT);
  });

  test.only('set chunk', async () => {
    const storage = createStorage({ type: StorageType.RAM });
    const blobStore = new BlobStore(storage.createDirectory('blobs'));
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
  });
});
