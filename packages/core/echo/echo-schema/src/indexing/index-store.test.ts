//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { StorageType, createStorage } from '@dxos/random-access-storage';
import { afterTest, describe, test } from '@dxos/test';

import { IndexSchema } from './index-schema';
import { IndexStore } from './index-store';
import { type Filter } from '../query';

describe('IndexStore', () => {
  test('basic', async () => {
    const storage = createStorage({ type: StorageType.RAM });
    afterTest(() => storage.close());
    const directory = storage.createDirectory('IndexStore');
    const store = new IndexStore({ directory });

    const index = new IndexSchema();

    const schemaURI = '@example.org/schema/Contact';
    const objects = [
      { id: '1', name: 'John', schema: schemaURI },
      { id: '2', title: 'first document', schema: '@example.org/schema/Document' },
    ];

    {
      await Promise.all(objects.map((object) => index.update(object.id, object)));

      const ids = await index.find({ type: { itemId: schemaURI } } as Filter);
      expect(ids.length).to.equal(1);

      expect(ids[0].id).to.equal('1');
    }

    {
      await store.save(index);
      const loadedIndex = await store.load(index.identifier);

      const ids = await loadedIndex.find({ type: { itemId: schemaURI } } as Filter);
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('1');
    }
  });
});
