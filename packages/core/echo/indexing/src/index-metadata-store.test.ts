//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { createTestLevel } from '@dxos/echo-pipeline/testing';
import { describe, openAndClose, test } from '@dxos/test';

import { IndexMetadataStore } from './index-metadata-store';

describe('IndexMetadataStore', () => {
  test('basic', async () => {
    const level = createTestLevel();
    await openAndClose(level);

    const metadataStore = new IndexMetadataStore({ db: level.sublevel('index-metadata') });

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

  test('decoding migration works', async () => {
    const level = createTestLevel();
    await openAndClose(level);

    // Automerge heads format.
    const heads = [Array(64).fill(0).join(''), Array(64).fill(1).join('')];
    const id = '1';

    // Setup storage as if there were some data in the old format.
    level.sublevel('index-metadata').sublevel('last-seen').put(id, heads.join(''), { valueEncoding: 'json' });

    // Check if data is accessible with the new format.
    const metadataStore = new IndexMetadataStore({ db: level.sublevel('index-metadata') });
    const dirty = await metadataStore.getDirtyDocuments();
    expect(dirty).to.deep.equal(new Map([[id, heads]]));
  });
});
