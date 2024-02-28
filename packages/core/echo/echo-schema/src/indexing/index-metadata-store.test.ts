//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { StorageType, createStorage } from '@dxos/random-access-storage';
import { afterTest, describe, test } from '@dxos/test';

import { IndexMetadataStore } from './index-metadata-store';

describe('IndexMetadataStore', () => {
  test('basic', async () => {
    const storage = createStorage({ type: StorageType.RAM });
    afterTest(() => storage.close());
    const directory = storage.createDirectory('IndexMetadataStore');
    const metadataStore = new IndexMetadataStore({ directory });

    const ids = ['1', '2', '3'];
    await Promise.all(ids.map((id) => metadataStore.markDirty(id, `hash-${id}`)));
    expect(await metadataStore.getDirtyDocuments()).to.deep.equal(ids);

    await metadataStore.markClean('1', 'hash-1');
    expect(await metadataStore.getDirtyDocuments()).to.deep.equal(['2', '3']);
  });
});
