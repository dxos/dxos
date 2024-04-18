//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { createTestLevel } from '@dxos/echo-pipeline/testing';
import { afterTest, describe, test } from '@dxos/test';

import { IndexMetadataStore } from './index-metadata-store';

describe('IndexMetadataStore', () => {
  test('basic', async () => {
    const level = createTestLevel();
    await level.open();
    afterTest(() => level.close());

    const metadataStore = new IndexMetadataStore({
      db: level.sublevel('indexer-metadata'),
    });

    const ids = ['1', '2', '3'];
    const dirtyMap = new Map(ids.map((id) => [id, `hash-${id}`]));
    const batch = level.batch();
    metadataStore.markDirty(dirtyMap, batch);
    await batch.write();
    expect(await metadataStore.getDirtyDocuments()).to.deep.equal(ids);

    await metadataStore.markClean('1', 'hash-1');
    expect(await metadataStore.getDirtyDocuments()).to.deep.equal(['2', '3']);
  });
});
