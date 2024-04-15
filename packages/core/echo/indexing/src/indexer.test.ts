//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { asyncTimeout } from '@dxos/async';
import { createTestLevel } from '@dxos/echo-pipeline/testing';
import { type Filter } from '@dxos/echo-schema';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { afterTest, describe, test } from '@dxos/test';

import { IndexMetadataStore } from './index-metadata-store';
import { IndexStore } from './index-store';
import { Indexer, type ObjectSnapshot } from './indexer';

describe('Indexer', () => {
  test('objects that are marked as dirty are getting indexed', async () => {
    const storage = createStorage({ type: StorageType.RAM });
    afterTest(() => storage.close());
    const level = createTestLevel();
    await level.open();
    afterTest(() => level.close());

    const documents: ObjectSnapshot[] = [];

    const metadataStore = new IndexMetadataStore({ db: level.sublevel('indexer-metadata') });
    const doneIndexing = metadataStore.clean.waitForCount(2);
    const indexer = new Indexer({
      indexStore: new IndexStore({ directory: storage.createDirectory('IndexStore') }),
      metadataStore,
      loadDocuments: async function* (ids) {
        yield documents.filter((doc) => ids.includes(doc.object.id));
      },
      getAllDocuments: async function* () {},
    });
    afterTest(() => indexer.destroy());

    const schemaURI = '@example.org/schema/Contact';
    const objects = [
      { id: '1', data: { name: 'John' }, system: { type: { itemId: schemaURI } } },
      { id: '2', data: { title: 'first document' }, system: { type: { itemId: '@example.org/schema/Document' } } },
    ];
    objects.forEach((object) => documents.push({ id: object.id, object, currentHash: 'hash' }));

    {
      indexer.setIndexConfig({ indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }], enabled: true });
      await indexer.initialize();
    }

    {
      const dirtyMap = new Map(objects.map((object) => [object.id, 'hash']));
      await metadataStore.markDirty(dirtyMap);
    }

    await asyncTimeout(doneIndexing, 1000);

    {
      const ids = await indexer.find({ type: { itemId: schemaURI } } as Filter);
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('1');
    }
  });

  test('objects are indexed for first time', async () => {
    const storage = createStorage({ type: StorageType.RAM });
    afterTest(() => storage.close());
    const level = createTestLevel();
    await level.open();
    afterTest(() => level.close());

    const documents: ObjectSnapshot[] = [];

    const schemaURI = '@example.org/schema/Contact';
    const objects = [
      { id: '1', data: { name: 'John' }, system: { type: { itemId: schemaURI } } },
      { id: '2', data: { title: 'first document' }, system: { type: { itemId: '@example.org/schema/Document' } } },
    ];
    objects.forEach((object) => documents.push({ id: object.id, object, currentHash: 'hash' }));

    const metadataStore = new IndexMetadataStore({ db: level.sublevel('indexer-metadata') });
    const indexer = new Indexer({
      indexStore: new IndexStore({ directory: storage.createDirectory('IndexStore') }),
      metadataStore,
      loadDocuments: async function* () {},
      getAllDocuments: async function* () {
        for (const object of objects) {
          yield [{ id: object.id, object, currentHash: 'hash' }];
        }
      },
    });
    afterTest(() => indexer.destroy());

    const doneIndexing = indexer.indexed.waitForCount(1);

    {
      indexer.setIndexConfig({ indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }], enabled: true });
      await indexer.initialize();
    }

    await asyncTimeout(doneIndexing, 1000);

    {
      const ids = await indexer.find({ type: { itemId: schemaURI } } as Filter);
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('1');
    }
  });
});
