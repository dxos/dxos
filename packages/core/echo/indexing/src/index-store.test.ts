//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { encodeReference, type ObjectStructure } from '@dxos/echo-protocol';
import { Reference } from '@dxos/echo-protocol';
import { createTestLevel } from '@dxos/kv-store/testing';
import { afterTest, describe, openAndClose, test } from '@dxos/test';

import { IndexSchema } from './index-schema';
import { IndexStore } from './index-store';

describe('IndexStore', () => {
  test('basic', async () => {
    const db = createTestLevel();
    await openAndClose(db);
    const store = new IndexStore({ db: db.sublevel('index-store') });

    const index = new IndexSchema();
    await index.open();
    afterTest(() => index.close());

    const schemaURI = '@example.org/schema/Contact';
    const objects: Partial<ObjectStructure>[] = [
      { data: { name: 'John' }, system: { type: encodeReference(new Reference(schemaURI)) } },
      {
        data: { title: 'first document' },
        system: { type: encodeReference(new Reference('@example.org/schema/Document')) },
      },
    ];

    {
      await Promise.all(objects.map((object, id) => index.update(String(id), object)));

      const ids = await index.find({ typename: schemaURI });
      expect(ids.length).to.equal(1);

      expect(ids[0].id).to.equal('0');
      await store.save(index);
    }

    {
      const loadedIndex = await store.load(index.identifier);

      const ids = await loadedIndex.find({ typename: schemaURI });
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('0');
    }
  });

  test('update loaded index', async () => {
    const db = createTestLevel();
    await openAndClose(db);
    const store = new IndexStore({ db: db.sublevel('index-store') });

    const index = new IndexSchema();
    await index.open();
    afterTest(() => index.close());

    const schemaURI = '@example.org/schema/Contact';
    const objects: Partial<ObjectStructure>[] = [
      { data: { name: 'John' }, system: { type: encodeReference(new Reference(schemaURI)) } },
      {
        data: { title: 'first document' },
        system: { type: encodeReference(new Reference('@example.org/schema/Document')) },
      },
    ];

    {
      await Promise.all(objects.map((object, id) => index.update(String(id), object)));
      await store.save(index);
    }

    {
      const kinds = await store.loadIndexKindsFromDisk();
      expect(kinds.size).to.equal(1);

      const identifier = [...kinds.keys()][0];
      const loadedIndex = await store.load(identifier);

      const ids = await loadedIndex.find({ typename: schemaURI });
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('0');

      await loadedIndex.update('3', {
        data: { name: 'John' },
        system: { type: encodeReference(new Reference(schemaURI)) },
      });
      await store.save(loadedIndex);
    }

    {
      const loadedIndex = await store.load(index.identifier);

      const ids = await loadedIndex.find({ typename: schemaURI });
      expect(ids.length).to.equal(2);
      expect(ids.map(({ id }) => id)).to.deep.eq(['0', '3']);
    }
  });
});
