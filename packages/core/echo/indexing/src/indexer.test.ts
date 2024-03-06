//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { type Filter } from '@dxos/echo-schema';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { afterTest, describe, test } from '@dxos/test';

import { IndexMetadataStore } from './index-metadata-store';
import { IndexStore } from './index-store';
import { Indexer, type ObjectSnapshot } from './indexer';

describe('Indexer', () => {
  test('objects that are marked as dirty are getting indexed', async () => {
    const storage = createStorage({ type: StorageType.RAM });
    afterTest(() => storage.close());

    const documents: ObjectSnapshot[] = [];

    const metadataStore = new IndexMetadataStore({ directory: storage.createDirectory('IndexMetadataStore') });
    const doneIndexing = metadataStore.clean.waitForCount(1);
    const indexer = new Indexer({
      indexStore: new IndexStore({ directory: storage.createDirectory('IndexStore') }),
      metadataStore,
      loadDocuments: async (ids) => documents.filter((doc) => ids.includes(doc.object.id)),
    });

    const schemaURI = '@example.org/schema/Contact';
    const objects = [
      { id: '1', data: { name: 'John' }, system: { type: { itemId: schemaURI } } },
      { id: '2', data: { title: 'first document' }, system: { type: { itemId: '@example.org/schema/Document' } } },
    ];
    objects.forEach((object) => documents.push({ id: object.id, object, currentHash: 'hash' }));

    {
      indexer.setIndexConfig({ indexes: [{ kind: 'SCHEMA_MATCH' }] });
      await indexer.initialize();
    }

    {
      await Promise.all(objects.map((object) => metadataStore.markDirty(object.id, 'hash')));
    }

    await doneIndexing;

    {
      const ids = await indexer.find({ type: { itemId: schemaURI } } as Filter);
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('1');
    }
  });
});
