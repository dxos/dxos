//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';

import { Trigger, asyncTimeout, sleep } from '@dxos/async';
import { getHeads } from '@dxos/automerge/automerge';
import { type Space } from '@dxos/client-protocol';
import { warnAfterTimeout } from '@dxos/debug';
import * as E from '@dxos/echo-schema';
import { Filter } from '@dxos/echo-schema';
import { IndexServiceImpl, IndexStore, Indexer } from '@dxos/indexing';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { idCodec } from '@dxos/protocols';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { type Storage, StorageType, createStorage } from '@dxos/random-access-storage';
import { afterTest, describe, test } from '@dxos/test';

import { Client } from '../client';
import { QueryOptions } from '../echo';
import { IndexQuerySourceProvider } from '../echo/index-query-source-provider';
import { ContactType, TestBuilder } from '../testing';

describe('Index queries', () => {
  test('indexing stack', async () => {
    const { client, builder, services } = await setupClient();
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
    const indexingDone = indexer.indexed.waitForCount(2);

    indexer.setIndexConfig({ indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }], enabled: true });
    await indexer.initialize();

    const service = new IndexServiceImpl({ indexer, automergeHost: services.host!.context.automergeHost });
    const agentQuerySourceProvider = new IndexQuerySourceProvider({
      service,
      spaceList: client.spaces,
    });
    client._graph.registerQuerySourceProvider(agentQuerySourceProvider);
    const space = await client.spaces.create();
    {
      await space.waitUntilReady();

      const contact = E.object(ContactType, { name: 'John Doe', identifiers: [] });
      space.db.add(contact);
      await space.db.flush();
    }
    await asyncTimeout(indexingDone, 1000);

    await queryIndexedContact(space);
  });

  test('index queries work with client', async () => {
    const { client } = await setupClient();
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
    const testStoragePath = fs.mkdtempSync(path.join('tmp', 'client-indexing-'));
    const storage = createStorage({ type: StorageType.NODE, root: testStoragePath });
    afterTest(() => fs.rmSync(testStoragePath, { recursive: true, force: true }));

    let spaceKey: PublicKey;
    {
      const { client, builder } = await setupClient(storage);
      await client.halo.createIdentity();

      await client.spaces.isReady.wait();
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

      // TODO(mykola): Clean as automerge team updates storage API.
      await sleep(200); // Sleep to get services storage to finish writing.
      await client.destroy();
      await builder.storage!.close();
      builder.destroy();
    }

    {
      const { client } = await setupClient(storage);

      await client.spaces.setIndexConfig({ indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }], enabled: true });

      await client.spaces.isReady.wait();

      const space = client.spaces.get(spaceKey)!;

      await space.waitUntilReady();

      const indexedContact = await queryIndexedContact(space);
      expect(indexedContact.name).to.equal('John Doe');
    }
  });

  test('index already available data', async () => {
    const { client } = await setupClient();
    await client.halo.createIdentity();

    const space = await client.spaces.create();
    await space.waitUntilReady();

    const contact = E.object(ContactType, { name: 'John Doe', identifiers: [] });
    space.db.add(contact);
    await space.db.flush();

    const indexedContact = await queryIndexedContact(space);
    expect(indexedContact.name).to.equal('John Doe');
  });

  const setupClient = async (storage: Storage = createStorage({ type: StorageType.RAM })) => {
    const builder = new TestBuilder();
    builder.storage = storage;
    afterTest(async () => {
      await storage.close();
      builder.destroy();
    });
    const services = builder.createLocal();
    const client = new Client({ services });
    afterTest(() => client.destroy());
    await client.initialize();
    if (!client._graph.types.isEffectSchemaRegistered(ContactType)) {
      client._graph.types.registerEffectSchema(ContactType);
    }
    return { client, services, builder };
  };
});

const queryIndexedContact = async (space: Space) => {
  const receivedIndexedContact = new Trigger<ContactType>();
  const query = space.db.query(Filter.schema(ContactType), { dataLocation: QueryOptions.DataLocation.ALL });
  query.subscribe((query) => {
    log('Query results', {
      length: query.results.length,
      objects: query.results.map(({ object, resolution }) => ({
        object: (object as any).toJSON(),
        resolution,
      })),
    });
    for (const result of query.results) {
      if (result.object instanceof ContactType && result.resolution?.source === 'index') {
        receivedIndexedContact.wake(result.object);
      }
    }
  }, true);
  return receivedIndexedContact.wait({ timeout: 5000 });
};
