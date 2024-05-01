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
      db: level.sublevel('index-metadata'),
    });

    const ids = ['1', '2', '3'];
    const pointersWithHashes = new Map(ids.map((id) => [id, [`hash-${id}`]]));
    {
      const batch = level.batch();
      metadataStore.markDirty(pointersWithHashes, batch);
      await batch.write();

      expect(await metadataStore.getDirtyDocuments()).to.deep.equal(pointersWithHashes);
    }

    {
      const batch = level.batch();
      metadataStore.markClean(new Map([['1', ['hash-1']]]), batch);
      await batch.write();
      expect((await metadataStore.getDirtyDocuments()).size).to.deep.equal(2);
      expect(await metadataStore.getDirtyDocuments()).to.deep.equal(
        new Map(ids.slice(1).map((id) => [id, [`hash-${id}`]])),
      );
    }
  });
});
