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
});
