//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import isEqual from 'lodash.isequal';

import { asyncTimeout, Trigger } from '@dxos/async';
import { type ClientServicesProvider, type Space } from '@dxos/client-protocol';
import { Filter, type Query } from '@dxos/echo-db';
import { create, Expando, type EchoReactiveObject } from '@dxos/echo-schema';
import { type PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { log } from '@dxos/log';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest, test } from '@dxos/test';

import { Client } from '../client';
import { ContactType, DocumentType, TestBuilder, TextV0Type } from '../testing';

describe('Index queries', () => {
  const getObjects = () => ({
    contacts: [
      create(ContactType, {
        name: 'Alice',
        identifiers: [],
      }),
      create(ContactType, {
        name: 'Bob',
        identifiers: [],
      }),
      create(ContactType, {
        name: 'Catherine',
        identifiers: [],
      }),
    ],
    documents: [
      create(DocumentType, {
        title: 'DXOS Design Doc',
        content: create(TextV0Type, {
          content: 'Very important design document',
        }),
      }),
      create(DocumentType, {
        title: 'ECHO Architecture',
        content: create(TextV0Type, {
          content: 'Very important architecture document',
        }),
      }),
    ],
    expandos: [
      create(Expando, { org: 'DXOS' }), //
      create(Expando, { name: 'Mykola' }),
      create(Expando, { height: 185 }),
    ],
  });

  const TIMEOUT = 1_000;

  const initClient = async (services: ClientServicesProvider) => {
    const client = new Client({ services });
    await client.initialize();
    for (const schema of [ContactType, DocumentType, TextV0Type]) {
      client.experimental.graph.runtimeSchemaRegistry.registerSchema(schema);
    }
    return client;
  };

  const addObjects = async <T extends {}>(space: Space, objects: EchoReactiveObject<T>[]) => {
    await space.waitUntilReady();
    const objectsInDataBase = objects.map((object) => {
      const results = space.db.add(object);
      return results;
    });

    await space.db.flush();
    return objectsInDataBase;
  };

  const matchObjects = async (query: Query, objects: EchoReactiveObject<any>[]) => {
    const receivedIndexedObject = new Trigger<EchoReactiveObject<any>[]>();
    const unsubscribe = query.subscribe(
      (query) => {
        log('Query results', {
          length: query.results.length,
          results: query.results.map(({ object, resolution }) => ({
            object: (object as any).toJSON(),
            resolution,
          })),
        });

        const indexResults = query.results.filter((result) => result.resolution?.source === 'index');

        if (
          objects.every((object) => indexResults.some((result) => objectContains(result.object!, object))) &&
          indexResults.every((result) => objects.some((object) => objectContains(result.object!, object)))
        ) {
          receivedIndexedObject.wake(query.objects);
        }
      },
      { fire: true },
    );

    const queriedObjects = await receivedIndexedObject.wait({ timeout: TIMEOUT });
    unsubscribe();
    return queriedObjects;
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
    await addObjects(space, getObjects().contacts);

    await matchObjects(space.db.query(Filter.schema(ContactType)), getObjects().contacts);
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

      await addObjects(space, getObjects().contacts);
      await matchObjects(space.db.query(Filter.schema(ContactType)), getObjects().contacts);

      await client.destroy();
    }

    {
      const client = await initClient(builder.createLocalClientServices());
      afterTest(() => client.destroy());
      await asyncTimeout(client.spaces.isReady.wait(), 5000);
      const space = client.spaces.get(spaceKey)!;
      await space.waitUntilReady();

      await matchObjects(space.db.query(Filter.schema(ContactType)), getObjects().contacts);
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

      await addObjects(space, getObjects().contacts);
      await matchObjects(space.db.query(Filter.schema(ContactType)), getObjects().contacts);

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

      await matchObjects(space.db.query(Filter.schema(ContactType)), getObjects().contacts);
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

      await addObjects(space, getObjects().contacts);
      await matchObjects(space.db.query(Filter.schema(ContactType)), getObjects().contacts);

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
      await matchObjects(space.db.query(Filter.schema(ContactType)), getObjects().contacts);
    }
  });

  test('`or` query', async () => {
    const builder = new TestBuilder();
    afterTest(async () => await builder.destroy());
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    const space = await client.spaces.create();

    {
      await addObjects(space, getObjects().contacts);
      await matchObjects(space.db.query(Filter.schema(ContactType)), getObjects().contacts);
    }

    // TODO(burdon): Do we support text matching?
    {
      const query = space.db.query(Filter.schema(DocumentType));
      await addObjects(space, getObjects().documents);
      await matchObjects(query, getObjects().documents);
      expect((await query.run()).objects.length).to.equal(2);
    }

    {
      const query = space.db.query(Filter.or(Filter.schema(ContactType), Filter.schema(DocumentType)));
      await matchObjects(query, [...getObjects().contacts, ...getObjects().documents]);
      expect((await query.run()).objects.length).to.equal(5);
    }
  });

  test('`not(or)` query', async () => {
    const builder = new TestBuilder();
    afterTest(async () => await builder.destroy());
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    const space = await client.spaces.create();

    const [contact] = await addObjects(space, getObjects().contacts);
    const [document] = await addObjects(space, getObjects().documents);

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

    await addObjects(space, getObjects().expandos);
    const query = space.db.query(Filter.schema(Expando));
    await matchObjects(query, getObjects().expandos);
  });
});

const objectContains = (container: Object, content: Object): Boolean => {
  log('objectContains', {
    container,
    content,
    isEqual: Object.entries(content).every(([key, value]) => key === 'id' || isEqual((container as any)[key], value)),
    typeofContainer: typeof container,
    typeofContent: typeof content,
  });
  return Object.entries(content).every(
    ([key, value]) =>
      key === 'id' ||
      (typeof value === 'object' && typeof (container as any)[key] === 'object'
        ? objectContains((container as any)[key], value)
        : isEqual((container as any)[key], value)),
  );
};
