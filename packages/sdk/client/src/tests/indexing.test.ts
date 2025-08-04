//
// Copyright 2024 DXOS.org
//

import isEqual from 'lodash.isequal';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, TriggerState, asyncTimeout } from '@dxos/async';
import { type ClientServicesProvider, PropertiesType, type Space } from '@dxos/client-protocol';
import { type AnyLiveObject, Filter, type QueryResult } from '@dxos/echo-db';
import { Expando, Ref } from '@dxos/echo-schema';
import { type PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { StorageType, createStorage } from '@dxos/random-access-storage';

import { Client } from '../client';
import { ContactType, DocumentType, TestBuilder, TextV0Type } from '../testing';

describe('Index queries', () => {
  const createObjects = () => ({
    contacts: [
      live(ContactType, {
        name: 'Alice',
        identifiers: [],
      }),
      live(ContactType, {
        name: 'Bob',
        identifiers: [],
      }),
      live(ContactType, {
        name: 'Catherine',
        identifiers: [],
      }),
    ],
    documents: [
      live(DocumentType, {
        title: 'DXOS Design Doc',
        content: Ref.make(
          live(TextV0Type, {
            content: 'Very important design document',
          }),
        ),
      }),
      live(DocumentType, {
        title: 'ECHO Architecture',
        content: Ref.make(
          live(TextV0Type, {
            content: 'Very important architecture document',
          }),
        ),
      }),
    ],
    expandos: [
      live(Expando, { org: 'DXOS' }), //
      live(Expando, { name: 'Mykola' }),
      live(Expando, { height: 185 }),
    ],
  });

  const TIMEOUT = 1_000;

  const initClient = async (services: ClientServicesProvider) => {
    const client = new Client({ services, types: [ContactType, DocumentType, TextV0Type] });
    await client.initialize();
    return client;
  };

  const addObjects = async <T extends {}>(space: Space, objects: AnyLiveObject<T>[]) => {
    await space.waitUntilReady();
    const objectsInDataBase = objects.map((object) => {
      return space.db.add(object);
    });

    await space.db.flush();
    return objectsInDataBase;
  };

  const matchObjects = async (query: QueryResult, objects: AnyLiveObject<any>[]) => {
    const receivedIndexedObject = new Trigger<AnyLiveObject<any>[]>();
    const unsubscribe = query.subscribe(
      (query) => {
        const indexResults = query.results;
        log('Query results', {
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
    onTestFinished(async () => {
      await builder.destroy();
    });
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    onTestFinished(() => client.destroy());

    const space = await client.spaces.create();

    const { contacts } = createObjects();
    await addObjects(space, contacts);
    await matchObjects(space.db.query(Filter.type(ContactType)), contacts);
  });

  test('indexes persists between client restarts', async () => {
    let spaceKey: PublicKey;

    const { builder } = createTestBuilder();
    onTestFinished(async () => {
      await builder.destroy();
    });

    const { contacts } = createObjects();

    {
      const client = await initClient(builder.createLocalClientServices());
      await client.halo.createIdentity();
      const space = await client.spaces.create();
      spaceKey = space.key;

      await addObjects(space, contacts);
      await matchObjects(space.db.query(Filter.type(ContactType)), contacts);

      await client.destroy();
    }

    {
      const client = await initClient(builder.createLocalClientServices());
      onTestFinished(() => client.destroy());
      await asyncTimeout(client.spaces.waitUntilReady(), 5000);
      const space = client.spaces.get(spaceKey)!;
      await space.waitUntilReady();

      await matchObjects(space.db.query(Filter.type(ContactType)), contacts);
    }
  });

  test('index available data', async () => {
    const { builder, level } = createTestBuilder();
    onTestFinished(async () => {
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
      await matchObjects(space.db.query(Filter.type(ContactType)), contacts);

      await client.destroy();
    }

    await level.open();
    await level.sublevel('index-storage').clear();

    {
      const client = await initClient(builder.createLocalClientServices());
      onTestFinished(() => client.destroy());
      await asyncTimeout(client.spaces.waitUntilReady(), TIMEOUT);
      const space = client.spaces.get(spaceKey)!;
      await asyncTimeout(space.waitUntilReady(), TIMEOUT);

      await matchObjects(space.db.query(Filter.type(ContactType)), contacts);
    }
  });

  test('re-index', async () => {
    const { builder, level } = createTestBuilder();
    onTestFinished(async () => {
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
      await matchObjects(space.db.query(Filter.type(ContactType)), contacts);

      await client.destroy();
    }

    await level.open();
    await level.sublevel('index-storage').clear();
    await level.sublevel('index-metadata').clear();

    {
      const client = await initClient(builder.createLocalClientServices());
      onTestFinished(() => client.destroy());
      await client.spaces.waitUntilReady();
      const space = client.spaces.get(spaceKey)!;
      await asyncTimeout(space.waitUntilReady(), TIMEOUT);

      await client.services.services.QueryService?.reindex();
      await matchObjects(space.db.query(Filter.type(ContactType)), contacts);
    }
  });

  test('`or` query', async () => {
    const builder = new TestBuilder();
    onTestFinished(async () => await builder.destroy());
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    const { contacts, documents } = createObjects();

    {
      await addObjects(space, contacts);
      await matchObjects(space.db.query(Filter.type(ContactType)), contacts);
    }

    // TODO(burdon): Do we support text matching?
    {
      const query = space.db.query(Filter.type(DocumentType));
      await addObjects(space, documents);
      await matchObjects(query, documents);
      expect((await query.run()).objects.length).to.equal(2);
    }

    {
      const query = space.db.query(Filter.or(Filter.type(ContactType), Filter.type(DocumentType)));
      await matchObjects(query, [...contacts, ...documents]);
      expect((await query.run()).objects.length).to.equal(5);
    }
  });

  test('`not(or)` query', async () => {
    const builder = new TestBuilder();

    onTestFinished(async () => await builder.destroy());
    const client = await initClient(builder.createLocalClientServices());

    await client.halo.createIdentity();
    const space = await client.spaces.create();
    const { contacts, documents } = createObjects();

    const contactsInDatabase = await addObjects(space, contacts);
    const documentsInDatabase = await addObjects(space, documents);
    const excludedIds = [...contactsInDatabase, ...documentsInDatabase].map(({ id }) => id);

    {
      const query = space.db.query(
        Filter.not(Filter.or(Filter.type(ContactType), Filter.type(DocumentType), Filter.type(PropertiesType))),
      );
      const ids = (await query.run()).objects.map(({ id }) => id);
      expect(ids.every((id) => !excludedIds.includes(id))).to.be.true;
    }
  });

  test('query Expando objects', async () => {
    const builder = new TestBuilder();
    onTestFinished(async () => await builder.destroy());
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    const { expandos } = createObjects();

    await addObjects(space, expandos);
    const query = space.db.query(Filter.type(Expando));
    await matchObjects(query, expandos);
  });

  test('object deletion triggers query update', async () => {
    const builder = new TestBuilder();
    onTestFinished(async () => await builder.destroy());
    const client = await initClient(builder.createLocalClientServices());
    await client.halo.createIdentity();
    const space = await client.spaces.create();
    const { contacts, documents } = createObjects();
    const echoContacts = await addObjects(space, contacts);
    await addObjects(space, documents);

    const query = space.db.query(Filter.or(Filter.type(ContactType), Filter.type(DocumentType)));
    const queriedEverything = new Trigger();
    const receivedDeleteUpdate = new Trigger();
    const unsub = query.subscribe((query) => {
      const objects = query.objects;
      if (objects.length === contacts.length + documents.length) {
        queriedEverything.wake();
      }

      if (
        objects.length === contacts.length + documents.length - 1 &&
        queriedEverything.state === TriggerState.RESOLVED
      ) {
        receivedDeleteUpdate.wake();
      }
    });
    onTestFinished(() => unsub());

    await queriedEverything.wait({ timeout: TIMEOUT });
    expect(receivedDeleteUpdate.state).to.equal(TriggerState.WAITING);

    const deletedContact = echoContacts.splice(0, 1)[0];
    space.db.remove(deletedContact);
    await space.db.flush();
    await receivedDeleteUpdate.wait({ timeout: TIMEOUT });

    log.info('query', { objects: (await query.run()).objects.length });
  });

  const createTestBuilder = () => {
    const level = createTestLevel();
    const storage = createStorage({ type: StorageType.RAM });
    const builder = new TestBuilder();
    builder.storage = () => storage;
    builder.level = () => level;
    return { builder, level };
  };
});

const objectContains = (container: any, content: any): boolean => {
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
