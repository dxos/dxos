//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { asyncTimeout, Trigger } from '@dxos/async';
import { type ClientServicesProvider, type Space } from '@dxos/client-protocol';
import { Filter, getAutomergeObjectCore, type Query } from '@dxos/echo-db';
import { create, type S, Expando, getEchoObjectAnnotation } from '@dxos/echo-schema';
import { type PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { log } from '@dxos/log';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest, test } from '@dxos/test';

import { Client } from '../client';
import { ContactType, DocumentType, TestBuilder, TextV0Type } from '../testing';

describe('Index queries', () => {
  const john = 'John Doe';

  const initClient = async (services: ClientServicesProvider) => {
    const client = new Client({ services });
    await client.initialize();
    for (const schema of [ContactType, DocumentType, TextV0Type]) {
      client.experimental.graph.runtimeSchemaRegistry.registerSchema(schema);
    }
    return client;
  };

  const addContact = async (space: Space, name: string) => {
    await space.waitUntilReady();
    const contact = create(ContactType, { name: john, identifiers: [] });
    space.db.add(contact);
    await space.db.flush();
    return contact;
  };

  const addDocument = async (space: Space, title: string) => {
    await space.waitUntilReady();
    const document = create(DocumentType, {
      title,
      content: create(TextV0Type, { content: 'very important text' }),
    });
    space.db.add(document);
    await space.db.flush();
    return document;
  };

  const checkIfQueryContainsObject = async (query: Query, type: S.Schema<any>, content: Record<string, any>) => {
    const receivedIndexedObject = new Trigger<any>();
    const unsub = query.subscribe(
      (query) => {
        log('Query results', {
          length: query.results.length,
          results: query.results.map(({ object, resolution }) => ({
            object: (object as any).toJSON(),
            resolution,
          })),
          type: getEchoObjectAnnotation(type)?.typename,
        });
        for (const result of query.results) {
          if (
            result.resolution?.source === 'index' &&
            ((getEchoObjectAnnotation(type)?.typename === 'Expando' &&
              getAutomergeObjectCore(result.object!).getType().itemId === 'Expando') ||
              result.object instanceof (type as any))
          ) {
            unsub();
            receivedIndexedObject.wake(result.object);
          }
        }
      },
      { fire: true },
    );
    const obj = await receivedIndexedObject.wait({ timeout: 5000 });
    for (const key of Object.keys(content)) {
      expect(obj[key]).to.deep.equal(content[key]);
    }
    return obj;
  };

  test('index queries work with client', async () => {
    const builder = new TestBuilder();
    afterTest(async () => {
      await builder.destroy();
    });
    const client = await initClient(builder.createLocalClientServices());
    afterTest(() => client.destroy());

    await client.halo.createIdentity();

    const space = await client.spaces.create();
    await addContact(space, john);

    await checkIfQueryContainsObject(space.db.query(Filter.schema(ContactType)), ContactType, { name: john });
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
      const client = await initClient(builder.createLocalClientServices());
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      spaceKey = space.key;

      await addContact(space, john);
      await checkIfQueryContainsObject(space.db.query(Filter.schema(ContactType)), ContactType, { name: john });

      await client.destroy();
    }

    {
      const client = await initClient(builder.createLocalClientServices());
      afterTest(() => client.destroy());
      await asyncTimeout(client.spaces.isReady.wait(), 5000);
      const space = client.spaces.get(spaceKey)!;
      await space.waitUntilReady();

      await checkIfQueryContainsObject(space.db.query(Filter.schema(ContactType)), ContactType, { name: john });
    }
  });

  test('index available data', async () => {
    const builder = new TestBuilder();
    builder.storage = createStorage({ type: StorageType.RAM });
    builder.level = createTestLevel();
    afterTest(async () => {
      await builder.destroy();
    });

    let spaceKey: PublicKey;
    {
      const client = await initClient(builder.createLocalClientServices());
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      spaceKey = space.key;

      await addContact(space, john);
      await checkIfQueryContainsObject(space.db.query(Filter.schema(ContactType)), ContactType, { name: john });

      await client.destroy();
    }

    await builder.level.open();
    await builder.level.sublevel('index-storage').clear();

    {
      const client = await initClient(builder.createLocalClientServices());
      afterTest(() => client.destroy());
      await client.spaces.isReady.wait({ timeout: 1000 });
      const space = client.spaces.get(spaceKey)!;
      await asyncTimeout(space.waitUntilReady(), 1000);

      await checkIfQueryContainsObject(space.db.query(Filter.schema(ContactType)), ContactType, { name: john });
    }
  });

  test('re-index', async () => {
    const builder = new TestBuilder();
    builder.storage = createStorage({ type: StorageType.RAM });
    builder.level = createTestLevel();
    afterTest(async () => {
      await builder.destroy();
    });

    let spaceKey: PublicKey;
    {
      const client = await initClient(builder.createLocalClientServices());
      await client.halo.createIdentity();

      const space = await client.spaces.create();
      spaceKey = space.key;

      await addContact(space, john);
      await checkIfQueryContainsObject(space.db.query(Filter.schema(ContactType)), ContactType, { name: john });

      await client.destroy();
    }

    await builder.level.open();
    await builder.level.sublevel('index-storage').clear();
    await builder.level.sublevel('index-metadata').clear();

    {
      const client = await initClient(builder.createLocalClientServices());
      afterTest(() => client.destroy());
      await client.spaces.isReady.wait();
      const space = client.spaces.get(spaceKey)!;
      await asyncTimeout(space.waitUntilReady(), 1000);

      await client.services.services.QueryService?.reindex();
      await checkIfQueryContainsObject(space.db.query(Filter.schema(ContactType)), ContactType, { name: john });
    }
  });

  test('`or` query', async () => {
    const builder = new TestBuilder();
    afterTest(async () => await builder.destroy());
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    const space = await client.spaces.create();

    {
      await addContact(space, john);
      await checkIfQueryContainsObject(space.db.query(Filter.schema(ContactType)), ContactType, { name: john });
    }

    {
      const query = space.db.query(Filter.schema(DocumentType));
      await addDocument(space, 'important document');
      await checkIfQueryContainsObject(query, DocumentType, { title: 'important document' });
      expect((await query.run()).objects.length).to.equal(1);
    }

    {
      const query = space.db.query(Filter.or(Filter.schema(ContactType), Filter.schema(DocumentType)));
      await checkIfQueryContainsObject(query, ContactType, { name: john });
      await checkIfQueryContainsObject(query, DocumentType, { title: 'important document' });
      expect((await query.run()).objects.length).to.equal(2);
    }
  });

  test('`not(or)` query', async () => {
    const builder = new TestBuilder();
    afterTest(async () => await builder.destroy());
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    const contact = await addContact(space, john);
    const document = await addDocument(space, 'important document');

    {
      const query = space.db.query(Filter.not(Filter.or(Filter.schema(ContactType), Filter.schema(DocumentType))));
      const ids = (await query.run()).objects.map(({ id }) => id);
      expect(ids.every((id) => contact.id !== id && document.id !== id)).to.be.true;
    }
  });

  test('query Expando objects', async () => {
    const builder = new TestBuilder();
    afterTest(async () => await builder.destroy());
    const client = await initClient(builder.createLocal());
    await client.halo.createIdentity();
    const space = await client.spaces.create();

    const expando = create(Expando, { data: { name: john } });
    space.db.add(expando);
    await space.db.flush();

    const query = space.db.query(Filter.schema(Expando));
    await query.run();

    await checkIfQueryContainsObject(space.db.query(Filter.schema(Expando)), Expando, { data: { name: john } });
  });
});
