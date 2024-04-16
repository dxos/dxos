//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { type Filter } from '@dxos/echo-schema';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { afterTest, describe, openAndClose, test } from '@dxos/test';

import { IndexSchema } from './index-schema';
import { IndexStore } from './index-store';

describe('IndexStore', () => {
  test('basic', async () => {
    const storage = createStorage({ type: StorageType.RAM });
    afterTest(() => storage.close());
    const directory = storage.createDirectory('IndexStore');
    const store = new IndexStore({ directory });

    const index = new IndexSchema();
    await index.open();
    afterTest(() => index.close());

    const schemaURI = '@example.org/schema/Contact';
    const objects = [
      { id: '1', data: { name: 'John' }, system: { type: { itemId: schemaURI } } },
      { id: '2', data: { title: 'first document' }, system: { type: { itemId: '@example.org/schema/Document' } } },
    ];

    {
      await Promise.all(objects.map((object) => index.update(object.id, object)));

      const ids = await index.find({ type: { itemId: schemaURI } } as Filter);
      expect(ids.length).to.equal(1);

      expect(ids[0].id).to.equal('1');
      await store.save(index);
    }

    {
      const loadedIndex = await store.load(index.identifier);

      const ids = await loadedIndex.find({ type: { itemId: schemaURI } } as Filter);
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('1');
    }
  });

  test('update loaded index', async () => {
    const storage = createStorage({ type: StorageType.RAM });
    afterTest(() => storage.close());
    const directory = storage.createDirectory('IndexStore');
    const store = new IndexStore({ directory });

    const index = new IndexSchema();
    await index.open();
    afterTest(() => index.close());

    const schemaURI = '@example.org/schema/Contact';
    const objects = [
      { id: '1', data: { name: 'John' }, system: { type: { itemId: schemaURI } } },
      { id: '2', data: { title: 'first document' }, system: { type: { itemId: '@example.org/schema/Document' } } },
    ];

    {
      await Promise.all(objects.map((object) => index.update(object.id, object)));
      await store.save(index);
    }

    {
      const kinds = await store.loadIndexKindsFromDisk();
      expect(kinds.size).to.equal(1);

      const identifier = [...kinds.keys()][0];
      const loadedIndex = await store.load(identifier);

      const ids = await loadedIndex.find({ type: { itemId: schemaURI } } as Filter);
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('1');

      await loadedIndex.update('3', { id: '3', data: { name: 'John' }, system: { type: { itemId: schemaURI } } });
      await store.save(loadedIndex);
    }

    {
      const loadedIndex = await store.load(index.identifier);

      const ids = await loadedIndex.find({ type: { itemId: schemaURI } } as Filter);
      expect(ids.length).to.equal(2);
      expect(ids.map(({ id }) => id)).to.deep.eq(['1', '3']);
    }
  });
});
