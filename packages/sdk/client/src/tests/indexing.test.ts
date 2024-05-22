//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { asyncTimeout, Trigger } from '@dxos/async';
import { type ClientServicesProvider, type Space } from '@dxos/client-protocol';
import { Filter, getAutomergeObjectCore, type Query } from '@dxos/echo-db';
import { create, Expando, ExpandoTypename, getEchoObjectAnnotation, type S } from '@dxos/echo-schema';
import { type PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { log } from '@dxos/log';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest, test } from '@dxos/test';

import { Client } from '../client';
import { ContactType, DocumentType, TestBuilder, TextV0Type } from '../testing';

// TODO(burdon): Update tests:
//  Avoid using variable names that are specific ('john') in tests.
//  Even when testing basic functionality, start to build out more testing capability (edge cases).
const objects: Record<string, any> = [
  {
    contacts: [
      {
        name: 'Alice',
      },
      {
        name: 'Bob',
      },
      {
        name: 'Catherine',
      },
    ],
    documents: [
      {
        title: 'DXOS Design Doc',
      },
      {
        title: 'ECHO Architecture',
      },
    ],
  },
];

const TIMEOUT = 1_000;

describe('Index queries', () => {
  const initClient = async (services: ClientServicesProvider) => {
    const client = new Client({ services });
    await client.initialize();
    for (const schema of [ContactType, DocumentType, TextV0Type]) {
      client.experimental.graph.runtimeSchemaRegistry.registerSchema(schema);
    }
    return client;
  };

  const addObjects = async <T>(space: Space, type: S.Schema<T>, objects: T[]) => {
    await space.waitUntilReady();
    const contact = objects.map((object) => {
      return space.db.add(create(type, object)); // TODO(burdon): Type?
    });

    await space.db.flush();
    return contact;
  };

  const matchObjects = async (query: Query, type: S.Schema<any>, content: Record<string, any>) => {
    const receivedIndexedObject = new Trigger<any>();
    const unsubscribe = query.subscribe(
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
            ((getEchoObjectAnnotation(type)?.typename === ExpandoTypename &&
              getAutomergeObjectCore(result.object!).getType() === undefined) ||
              result.object instanceof (type as any))
          ) {
            unsubscribe();
            receivedIndexedObject.wake(result.object);
          }
        }
      },
      // TODO(burdon): Too limited to check for the first object.
      { fire: true },
    );

    // TODO(burdon): Return array to check how many matches.
    const obj = await receivedIndexedObject.wait({ timeout: TIMEOUT });

    for (const key of Object.keys(content)) {
      // TODO(burdon): Don't expect here. Make this function/reusable pure and just return the results to expect.
      expect(obj[key]).to.deep.equal(content[key]);
    }
  };

  test('index queries work with client', async () => {
    const builder = new TestBuilder();
    afterTest(async () => {
      await builder.destroy();
    });
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    afterTest(() => client.destroy());

    const space = await client.spaces.create();
    await addObjects(space, ContactType, objects.contacts);

    await matchObjects(space.db.query(Filter.schema(ContactType)), ContactType, objects.contacts[0]);
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

      await addObjects(space, ContactType, objects.contacts);
      await matchObjects(space.db.query(Filter.schema(ContactType)), ContactType, objects.contacts[0]);

      await client.destroy();
    }

    {
      const client = await initClient(builder.createLocalClientServices());
      afterTest(() => client.destroy());
      await asyncTimeout(client.spaces.isReady.wait(), 5000);
      const space = client.spaces.get(spaceKey)!;
      await space.waitUntilReady();

      await matchObjects(space.db.query(Filter.schema(ContactType)), ContactType, objects.contacts[0]);
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

      await addObjects(space, ContactType, objects.contacts);
      await matchObjects(space.db.query(Filter.schema(ContactType)), ContactType, objects.contacts[0]);

      await client.destroy();
    }

    await builder.level.open();
    await builder.level.sublevel('index-storage').clear();

    {
      const client = await initClient(builder.createLocalClientServices());
      afterTest(() => client.destroy());
      await client.spaces.isReady.wait({ timeout: TIMEOUT });
      const space = client.spaces.get(spaceKey)!;
      await asyncTimeout(space.waitUntilReady(), TIMEOUT);

      await matchObjects(space.db.query(Filter.schema(ContactType)), ContactType, objects.contacts[0]);
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

      await addObjects(space, ContactType, objects.contacts);
      await matchObjects(space.db.query(Filter.schema(ContactType)), ContactType, objects.contacts[0]);

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
      await asyncTimeout(space.waitUntilReady(), TIMEOUT);

      await client.services.services.QueryService?.reindex();
      await matchObjects(space.db.query(Filter.schema(ContactType)), ContactType, objects.contacts[0]);
    }
  });

  test('`or` query', async () => {
    const builder = new TestBuilder();
    afterTest(async () => await builder.destroy());
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    const space = await client.spaces.create();

    {
      await addObjects(space, ContactType, objects.contacts);
      await matchObjects(space.db.query(Filter.schema(ContactType)), ContactType, objects.contacts[0]);
    }

    // TODO(burdon): Do we support text matching?
    {
      const query = space.db.query(Filter.schema(DocumentType));
      await addObjects(space, DocumentType, objects.documents);
      await matchObjects(query, DocumentType, objects.documents[0]);
      expect((await query.run()).objects.length).to.equal(1);
    }

    {
      const query = space.db.query(Filter.or(Filter.schema(ContactType), Filter.schema(DocumentType)));
      await matchObjects(query, ContactType, objects.contacts[0]);
      await matchObjects(query, DocumentType, objects.documents[0]);
      expect((await query.run()).objects.length).to.equal(2);
    }
  });

  test('`not(or)` query', async () => {
    const builder = new TestBuilder();
    afterTest(async () => await builder.destroy());
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    const space = await client.spaces.create();

    const [contact] = await addObjects(space, ContactType, objects.contacts);
    const [document] = await addObjects(space, DocumentType, objects.documents);

    {
      const query = space.db.query(Filter.not(Filter.or(Filter.schema(ContactType), Filter.schema(DocumentType))));
      const ids = (await query.run()).objects.map(({ id }) => id);
      expect(ids.every((id) => contact.id !== id && document.id !== id)).to.be.true;
    }
  });

  test('query Expando objects', async () => {
    const builder = new TestBuilder();
    afterTest(async () => await builder.destroy());
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    const space = await client.spaces.create();

    const expando = create(Expando, { data: objects.contacts[0] });
    space.db.add(expando);
    await space.db.flush();

    const query = space.db.query(Filter.schema(Expando));
    await query.run();

    await matchObjects(space.db.query(Filter.schema(Expando)), Expando, { data: objects.contacts[0] });
  });
});
