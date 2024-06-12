//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { asyncTimeout } from '@dxos/async';
import { encodeReference, type ObjectStructure, Reference } from '@dxos/echo-protocol';
import { createTestLevel } from '@dxos/kv-store/testing';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { afterTest, describe, openAndClose, test } from '@dxos/test';

import { IndexMetadataStore } from './index-metadata-store';
import { IndexStore } from './index-store';
import { Indexer } from './indexer';
import { type ObjectSnapshot } from './types';

describe('Indexer', () => {
  const setup = async () => {
    const schemaURI = '@example.org/schema/Contact';

    const objects: Partial<ObjectStructure>[] = [
      { data: { name: 'John' }, system: { type: encodeReference(Reference.forType(schemaURI)) } },
      {
        data: { title: 'first document' },
        system: { type: encodeReference(Reference.forType('@example.org/schema/Document')) },
      },
    ];
    const documents: ObjectSnapshot[] = objects.map((object, index) => ({
      id: String(index),
      object,
      heads: ['hash'],
    }));

    const level = createTestLevel();
    await openAndClose(level);

    const metadataStore = new IndexMetadataStore({ db: level.sublevel('index-metadata') });
    const indexStore = new IndexStore({ db: level.sublevel('index-store') });

    const indexer = new Indexer({
      db: level,
      indexStore,
      metadataStore,
      loadDocuments: async function* (pointersWithHash): AsyncGenerator<ObjectSnapshot[], void, void> {
        yield Array.from(pointersWithHash.entries()).map(([id]) => documents.find((doc) => doc.id === id)!);
      },
    });
    afterTest(() => indexer.close());

    {
      const doneIndexing = indexer.updated.waitForCount(1);
      indexer.setConfig({ indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }], enabled: true });
      await indexer.open();
      await asyncTimeout(doneIndexing, 1000);
    }

    return { level, metadataStore, indexStore, indexer, schemaURI, objects, documents };
  };

  test('objects that are marked as dirty are getting indexed', async () => {
    const { metadataStore, indexer, level, schemaURI, documents } = await setup();

    {
      const doneIndexing = indexer.updated.waitForCount(1);

      const dirtyMap = new Map(documents.map(({ id }) => [id, ['hash']]));
      const batch = level.batch();
      metadataStore.markDirty(dirtyMap, batch);
      await batch.write();
      metadataStore.notifyMarkedDirty();

      await asyncTimeout(doneIndexing, 1000);
    }

    {
      const ids = await indexer.execQuery({ typenames: [schemaURI] });
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('0');
    }
  });

  test('objects are indexed for first time', async () => {
    const { indexer, schemaURI, documents } = await setup();

    {
      const doneIndexing = indexer.updated.waitForCount(1);
      await indexer.reindex(new Map(documents.map(({ id }) => [id, ['hash']])));
      await asyncTimeout(doneIndexing, 1000);
    }

    {
      const ids = await indexer.execQuery({ typenames: [schemaURI] });
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('0');
    }
  });

  test.skip('object hash is updated between save and indexing', async () => {
    const { indexer, metadataStore, level, documents, schemaURI } = await setup();

    {
      const newHash = 'new-hash';
      documents[0].heads = [newHash];
      const dirtyMap = new Map(documents.map(({ id }) => [id, ['hash']]));
      const batch = level.batch();
      metadataStore.markDirty(dirtyMap, batch);
      await batch.write();
    }

    {
      const ids = await indexer.execQuery({ typenames: [schemaURI] });
      expect(ids.length).to.equal(0);
    }

    {
      const doneIndexing = indexer.updated.waitForCount(1);

      const newHash = 'new-hash';
      documents[0].heads = [newHash];
      // Not mark dirty, simulates a change that were not saved yet.
      metadataStore.notifyMarkedDirty();

      await asyncTimeout(doneIndexing, 1000);
    }

    {
      const ids = await indexer.execQuery({ typenames: [schemaURI] });
      expect(ids.length).to.equal(0);
    }
  });
});
