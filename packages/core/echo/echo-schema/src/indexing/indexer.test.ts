//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { StorageType, createStorage } from '@dxos/random-access-storage';
import { afterTest, describe, test } from '@dxos/test';

import { IndexMetadataStore } from './index-metadata-store';
import { IndexStore } from './index-store';
import { Indexer, type ObjectSnapshot } from './indexer';
import { type Filter } from '../query';

describe('Indexer', () => {
  test.only('objects that are marked as dirty are getting indexed', async () => {
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
      { id: '1', name: 'John', schema: schemaURI },
      { id: '2', title: 'first document', schema: '@example.org/schema/Document' },
    ];
    objects.forEach((object) => documents.push({ object, currentHash: 'hash' }));

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
      expect(ids).to.deep.equal(['1']);
    }
  });
});
