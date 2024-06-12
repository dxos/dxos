//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import isEqual from 'lodash.isequal';

import { Trigger, TriggerState, asyncTimeout } from '@dxos/async';
import { type ClientServicesProvider, PropertiesType, type Space } from '@dxos/client-protocol';
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
  const createObjects = () => ({
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
      client.addSchema(schema);
    }

    return client;
  };

  const addObjects = async <T extends {}>(space: Space, objects: EchoReactiveObject<T>[]) => {
    await space.waitUntilReady();
    const objectsInDataBase = objects.map((object) => {
      return space.db.add(object);
    });

    await space.db.flush();
    return objectsInDataBase;
  };

  const matchObjects = async (query: Query, objects: EchoReactiveObject<any>[]) => {
    const receivedIndexedObject = new Trigger<EchoReactiveObject<any>[]>();
    const unsubscribe = query.subscribe(
      (query) => {
        const indexResults = query.results.filter((result) => result.resolution?.source === 'index');
        log.info('Query results', {
          length: indexResults.length,
          results: indexResults.map(({ object, resolution }) => ({
            object: (object as any).toJSON(),
            resolution,
          })),
        });

        if (
          query.objects.length === objects.length &&
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

    const { contacts } = createObjects();
    await addObjects(space, contacts);
    await matchObjects(space.db.query(Filter.schema(ContactType)), contacts);
  });

  test('indexes persists between client restarts', async () => {
    let spaceKey: PublicKey;

    const builder = new TestBuilder();
    builder.storage = createStorage({ type: StorageType.RAM });
    builder.level = createTestLevel();
    afterTest(async () => {
      await builder.destroy();
    });

    const { contacts } = createObjects();

    {
      const client = await initClient(builder.createLocalClientServices());
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      spaceKey = space.key;

      await addObjects(space, contacts);
      await matchObjects(space.db.query(Filter.schema(ContactType)), contacts);

      await client.destroy();
    }

    {
      const client = await initClient(builder.createLocalClientServices());
      afterTest(() => client.destroy());
      await asyncTimeout(client.spaces.isReady.wait(), 5000);
      const space = client.spaces.get(spaceKey)!;
      await space.waitUntilReady();

      await matchObjects(space.db.query(Filter.schema(ContactType)), contacts);
    }
  });

  test('index available data', async () => {
    const builder = new TestBuilder();
    builder.storage = createStorage({ type: StorageType.RAM });
    builder.level = createTestLevel();
    afterTest(async () => {
      await builder.destroy();
    });

    const { contacts } = createObjects();
    let spaceKey: PublicKey;
    {
      const client = await initClient(builder.createLocalClientServices());
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      spaceKey = space.key;

      await addObjects(space, contacts);
      await matchObjects(space.db.query(Filter.schema(ContactType)), contacts);

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

      await matchObjects(space.db.query(Filter.schema(ContactType)), contacts);
    }
  });

  test('re-index', async () => {
    const builder = new TestBuilder();
    builder.storage = createStorage({ type: StorageType.RAM });
    builder.level = createTestLevel();
    afterTest(async () => {
      await builder.destroy();
    });

    const { contacts } = createObjects();
    let spaceKey: PublicKey;
    {
      const client = await initClient(builder.createLocalClientServices());
      await client.halo.createIdentity();

      const space = await client.spaces.create();
      spaceKey = space.key;

      await addObjects(space, contacts);
      await matchObjects(space.db.query(Filter.schema(ContactType)), contacts);

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
      await matchObjects(space.db.query(Filter.schema(ContactType)), contacts);
    }
  });

  test('`or` query', async () => {
    const builder = new TestBuilder();
    afterTest(async () => await builder.destroy());
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    const { contacts, documents } = createObjects();

    {
      await addObjects(space, contacts);
      await matchObjects(space.db.query(Filter.schema(ContactType)), contacts);
    }

    // TODO(burdon): Do we support text matching?
    {
      const query = space.db.query(Filter.schema(DocumentType));
      await addObjects(space, documents);
      await matchObjects(query, documents);
      expect((await query.run()).objects.length).to.equal(2);
    }

    {
      const query = space.db.query(Filter.or(Filter.schema(ContactType), Filter.schema(DocumentType)));
      await matchObjects(query, [...contacts, ...documents]);
      expect((await query.run()).objects.length).to.equal(5);
    }
  });

  test('`not(or)` query', async () => {
    const builder = new TestBuilder();
    afterTest(async () => await builder.destroy());
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    const { contacts, documents } = createObjects();

    const contactsInDatabase = await addObjects(space, contacts);
    const documentsInDatabase = await addObjects(space, documents);
    const expectedIds = [...contactsInDatabase, ...documentsInDatabase].map(({ id }) => id);

    {
      const query = space.db.query(
        Filter.not(Filter.or(Filter.schema(ContactType), Filter.schema(DocumentType), Filter.schema(PropertiesType))),
      );
      const ids = (await query.run()).objects.map(({ id }) => id);
      expect(ids.every((id) => expectedIds.every((expectedId) => expectedId !== id))).to.be.true;
      expect(expectedIds.every((expectedId) => ids.every((id) => expectedId !== id))).to.be.true;
    }
  });

  test('query Expando objects', async () => {
    const builder = new TestBuilder();
    afterTest(async () => await builder.destroy());
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    const { expandos } = createObjects();

    await addObjects(space, expandos);
    const query = space.db.query(Filter.schema(Expando));
    await matchObjects(query, expandos);
  });

  test('object deletion triggers query update', async () => {
    const builder = new TestBuilder();
    afterTest(async () => await builder.destroy());
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    const { contacts, documents } = createObjects();
    const echoContacts = await addObjects(space, contacts);
    await addObjects(space, documents);

    const query = space.db.query(Filter.or(Filter.schema(ContactType), Filter.schema(DocumentType)));
    const queriedEverything = new Trigger();
    const receivedDeleteUpdate = new Trigger();
    const unsub = query.subscribe((query) => {
      const indexedObjects = query.results
        .filter((result) => result.resolution?.source === 'index')
        .map(({ object }) => object);
      if (indexedObjects.length === contacts.length + documents.length) {
        queriedEverything.wake();
      }

      if (
        indexedObjects.length === contacts.length + documents.length - 1 &&
        queriedEverything.state === TriggerState.RESOLVED
      ) {
        receivedDeleteUpdate.wake();
      }
    });
    afterTest(() => unsub());

    await queriedEverything.wait({ timeout: TIMEOUT });
    expect(receivedDeleteUpdate.state).to.equal(TriggerState.WAITING);

    const deletedContact = echoContacts.splice(0, 1)[0];
    space.db.remove(deletedContact);
    await space.db.flush();
    await receivedDeleteUpdate.wait({ timeout: TIMEOUT });

    log.info('query', { objects: (await query.run()).objects.length });
  });
});

const objectContains = (container: any, content: any): Boolean => {
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
