//
// Copyright 2024 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { type ObjectStructure, Reference, encodeReference } from '@dxos/echo-protocol';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';

import { IndexSchema } from '../indexes';

import { IndexStore } from './index-store';

describe('IndexStore', () => {
  test('basic', async () => {
    const db = createTestLevel();
    await openAndClose(db);
    const store = new IndexStore({ db: db.sublevel('index-store') });

    const index = new IndexSchema();
    await index.open();
    onTestFinished(async () => {
      await index.close();
    });

    const schemaURI = '@example.org/schema/Contact';
    const objects: Partial<ObjectStructure>[] = [
      // TODO(dmaretskyi): Fix references
      { data: { name: 'John' }, system: { type: encodeReference(Reference.localObjectReference(schemaURI)) } },
      {
        data: { title: 'first document' },
        // TODO(dmaretskyi): Fix references
        system: { type: encodeReference(Reference.localObjectReference('@example.org/schema/Document')) },
      },
    ];

    {
      await Promise.all(objects.map((object, id) => index.update(String(id), object)));

      const ids = await index.find({ typenames: [schemaURI] });
      expect(ids.length).to.equal(1);

      expect(ids[0].id).to.equal('0');
      await store.save(index);
    }

    {
      const loadedIndex = await store.load(index.identifier);

      const ids = await loadedIndex.find({ typenames: [schemaURI] });
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
    onTestFinished(async () => {
      await index.close();
    });

    const schemaURI = '@example.org/schema/Contact';
    const objects: Partial<ObjectStructure>[] = [
      // TODO(dmaretskyi): Fix references
      { data: { name: 'John' }, system: { type: encodeReference(Reference.localObjectReference(schemaURI)) } },
      {
        data: { title: 'first document' },
        // TODO(dmaretskyi): Fix references
        system: { type: encodeReference(Reference.localObjectReference('@example.org/schema/Document')) },
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

      const ids = await loadedIndex.find({ typenames: [schemaURI] });
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('0');

      await loadedIndex.update('3', {
        data: { name: 'John' },
        // TODO(dmaretskyi): Fix references
        system: { type: encodeReference(Reference.localObjectReference(schemaURI)) },
        meta: {
          keys: [],
        },
      });
      await store.save(loadedIndex);
    }

    {
      const loadedIndex = await store.load(index.identifier);

      const ids = await loadedIndex.find({ typenames: [schemaURI] });
      expect(ids.length).to.equal(2);
      expect(ids.map(({ id }) => id)).to.deep.eq(['0', '3']);
    }
  });
});
