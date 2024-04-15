//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Trigger, asyncTimeout } from '@dxos/async';
import { getHeads } from '@dxos/automerge/automerge';
import { type Space } from '@dxos/client-protocol';
import { warnAfterTimeout } from '@dxos/debug';
import { createTestLevel } from '@dxos/echo-pipeline/testing';
import * as E from '@dxos/echo-schema';
import { Filter } from '@dxos/echo-schema';
import { IndexServiceImpl, IndexStore, Indexer } from '@dxos/indexing';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { idCodec } from '@dxos/protocols';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { afterTest, describe, test } from '@dxos/test';

import { Client } from '../client';
import { QueryOptions } from '../echo';
import { IndexQuerySourceProvider } from '../echo/index-query-source-provider';
import { ContactType, TestBuilder } from '../testing';

describe.only('Index queries', () => {
  test('indexing stack', async () => {
    const builder = new TestBuilder();
    builder.storage = createStorage({ type: StorageType.RAM });
    afterTest(async () => {
      await builder.destroy();
    });
    const services = builder.createLocal();
    const client = new Client({ services });
    afterTest(() => client.destroy());
    await client.initialize();
    if (!client._graph.types.isEffectSchemaRegistered(ContactType)) {
      client._graph.types.registerEffectSchema(ContactType);
    }

    await client.halo.createIdentity();

    const indexer = new Indexer({
      indexStore: new IndexStore({ directory: builder.storage!.createDirectory('index-store') }),
      metadataStore: services.host!.context.indexMetadata,
      loadDocuments: async function* (ids: string[]) {
        for (const id of ids) {
          const { documentId, objectId } = idCodec.decode(id);
          const handle = services.host!.context.automergeHost.repo.find(documentId as any);
          await warnAfterTimeout(1000, 'to long to load doc', () => handle.whenReady());
          const doc = handle.docSync();
          const heads = getHeads(doc);
          yield [{ id, object: doc.objects[objectId], currentHash: heads.at(-1)! }];
        }
      },
      getAllDocuments: async function* () {},
    });
    afterTest(() => indexer.destroy());

    indexer.setIndexConfig({ indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }], enabled: true });
    await indexer.initialize();

    const service = new IndexServiceImpl({ indexer, automergeHost: services.host!.context.automergeHost });
    const indexQuerySourceProvider = new IndexQuerySourceProvider({
      service,
      spaceList: client.spaces,
    });
    client._graph.registerQuerySourceProvider(indexQuerySourceProvider);
    const space = await client.spaces.create();
    {
      await space.waitUntilReady();

      const contact = E.object(ContactType, { name: 'John Doe', identifiers: [] });
      space.db.add(contact);
      await space.db.flush();
    }

    await queryIndexedContact(space);
  });

  test('index queries work with client', async () => {
    const builder = new TestBuilder();
    afterTest(async () => {
      await builder.destroy();
    });
    const client = new Client({ services: builder.createLocal() });
    afterTest(() => client.destroy());
    await client.initialize();
    if (!client._graph.types.isEffectSchemaRegistered(ContactType)) {
      client._graph.types.registerEffectSchema(ContactType);
    }

    await client.halo.createIdentity();

    const space = await client.spaces.create();
    {
      await space.waitUntilReady();

      const contact = E.object(ContactType, { name: 'John Doe', identifiers: [] });
      space.db.add(contact);
      await space.db.flush();
    }

    const indexedContact = await queryIndexedContact(space);
    expect(indexedContact.name).to.equal('John Doe');
  });

  test('indexes persists between client restarts', async () => {
    let spaceKey: PublicKey;

    const builder = new TestBuilder();
    builder.storage = createStorage({ type: StorageType.RAM });
    builder.level = createTestLevel();
    afterTest(async () => {
      await builder.destroy();
    });

    {
      const client = new Client({ services: builder.createLocal() });
      await client.initialize();
      if (!client._graph.types.isEffectSchemaRegistered(ContactType)) {
        client._graph.types.registerEffectSchema(ContactType);
      }
      await client.halo.createIdentity();

      const space = await client.spaces.create();
      {
        await space.waitUntilReady();
        spaceKey = space.key;

        const contact = E.object(ContactType, { name: 'John Doe', identifiers: [] });
        space.db.add(contact);
        await space.db.flush();
      }

      const indexedContact = await queryIndexedContact(space);
      expect(indexedContact.name).to.equal('John Doe');

      await client.destroy();
    }

    {
      const client = new Client({ services: builder.createLocal() });
      await client.initialize();
      if (!client._graph.types.isEffectSchemaRegistered(ContactType)) {
        client._graph.types.registerEffectSchema(ContactType);
      }
      afterTest(() => client.destroy());

      await asyncTimeout(client.spaces.isReady.wait(), 5000);

      const space = client.spaces.get(spaceKey)!;

      await space.waitUntilReady();

      const indexedContact = await queryIndexedContact(space);
      expect(indexedContact.name).to.equal('John Doe');
    }
  });

  test('index already available data', async () => {
    const builder = new TestBuilder();
    afterTest(async () => {
      await builder.destroy();
    });
    const client = new Client({ services: builder.createLocal() });
    await client.initialize();
    if (!client._graph.types.isEffectSchemaRegistered(ContactType)) {
      client._graph.types.registerEffectSchema(ContactType);
    }
    afterTest(() => client.destroy());

    await client.halo.createIdentity();

    const space = await client.spaces.create();
    await space.waitUntilReady();

    const contact = E.object(ContactType, { name: 'John Doe', identifiers: [] });
    space.db.add(contact);
    await space.db.flush();

    const indexedContact = await queryIndexedContact(space);
    expect(indexedContact.name).to.equal('John Doe');
  });
});

const queryIndexedContact = async (space: Space) => {
  const receivedIndexedContact = new Trigger<ContactType>();
  const query = space.db.query(Filter.schema(ContactType), { dataLocation: QueryOptions.DataLocation.ALL });
  const unsub = query.subscribe((query) => {
    log('Query results', {
      length: query.results.length,
      results: query.results.map(({ object, resolution }) => ({
        object: (object as any).toJSON(),
        resolution,
      })),
    });
    for (const result of query.results) {
      if (result.object instanceof ContactType && result.resolution?.source === 'index') {
        unsub();
        receivedIndexedContact.wake(result.object);
      }
    }
  }, true);
  return receivedIndexedContact.wait({ timeout: 5000 });
};
