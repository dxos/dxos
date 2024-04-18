//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { asyncTimeout } from '@dxos/async';
import { Reference } from '@dxos/echo-db';
import { type ObjectStructure, encodeReference } from '@dxos/echo-pipeline';
import { createTestLevel } from '@dxos/echo-pipeline/testing';
import { type Filter } from '@dxos/echo-schema';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { afterTest, describe, openAndClose, test } from '@dxos/test';

import { IndexMetadataStore } from './index-metadata-store';
import { IndexStore } from './index-store';
import { Indexer, type ObjectSnapshot } from './indexer';

describe('Indexer', () => {
  test('objects that are marked as dirty are getting indexed', async () => {
    const level = createTestLevel();
    await openAndClose(level);

    const documents: ObjectSnapshot[] = [];

    const metadataStore = new IndexMetadataStore({ db: level.sublevel('indexer-metadata') });
    const doneIndexing = metadataStore.clean.waitForCount(2);
    const indexer = new Indexer({
      indexStore: new IndexStore({ db: level.sublevel('index-store') }),
      metadataStore,
      loadDocuments: async function* (ids) {
        yield documents.filter((doc) => ids.includes(doc.id));
      },
      getAllDocuments: async function* () {},
    });
    afterTest(() => indexer.destroy());

    const schemaURI = '@example.org/schema/Contact';
    const objects: Partial<ObjectStructure>[] = [
      { data: { name: 'John' }, system: { type: encodeReference(new Reference(schemaURI)) } },
      {
        data: { title: 'first document' },
        system: { type: encodeReference(new Reference('@example.org/schema/Document')) },
      },
    ];
    objects.forEach((object, index) => documents.push({ id: String(index), object, currentHash: 'hash' }));

    {
      indexer.setIndexConfig({ indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }], enabled: true });
      await indexer.initialize();
    }

    {
      const dirtyMap = new Map(objects.map((_, index) => [String(index), 'hash']));
      const batch = level.batch();
      metadataStore.markDirty(dirtyMap, batch);
      await batch.write();
      metadataStore.afterMarkDirty();
    }

    await asyncTimeout(doneIndexing, 1000);

    {
      const ids = await indexer.find({ type: { itemId: schemaURI } } as Filter);
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('0');
    }
  });

  test('objects are indexed for first time', async () => {
    const level = createTestLevel();
    await openAndClose(level);

    const documents: ObjectSnapshot[] = [];

    const schemaURI = '@example.org/schema/Contact';
    const objects: Partial<ObjectStructure>[] = [
      { data: { name: 'John' }, system: { type: encodeReference(new Reference(schemaURI)) } },
      {
        data: { title: 'first document' },
        system: { type: encodeReference(new Reference('@example.org/schema/Document')) },
      },
    ];
    objects.forEach((object, index) => documents.push({ id: String(index), object, currentHash: 'hash' }));

    const metadataStore = new IndexMetadataStore({ db: level.sublevel('indexer-metadata') });
    const indexer = new Indexer({
      indexStore: new IndexStore({ db: level.sublevel('index-store') }),
      metadataStore,
      loadDocuments: async function* () {},
      getAllDocuments: async function* () {
        for (const index in objects) {
          yield [{ id: index, object: objects[index], currentHash: 'hash' }];
        }
      },
    });
    afterTest(() => indexer.destroy());

    const doneIndexing = indexer.updated.waitForCount(1);

    {
      indexer.setIndexConfig({ indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }], enabled: true });
      await indexer.initialize();
    }

    await asyncTimeout(doneIndexing, 1000);

    {
      const ids = await indexer.find({ type: { itemId: schemaURI } } as Filter);
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('0');
    }
  });
});
