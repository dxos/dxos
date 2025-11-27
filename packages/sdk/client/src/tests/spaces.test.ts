//
// Copyright 2021 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout, latch, sleep } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { SpaceProperties } from '@dxos/client-protocol';
import { performInvitation } from '@dxos/client-services/testing';
import { Context } from '@dxos/context';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { getObjectCore } from '@dxos/echo-db';
import { SpaceId } from '@dxos/keys';
import { type Live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { range } from '@dxos/util';

import { Client } from '../client';
import { SpaceState, getSpace } from '../echo';
import { CreateEpochRequest } from '../halo';
import {
  type CreateInitializedClientsOptions,
  TestBuilder,
  TestSchema,
  createInitializedClientsWithContext,
  testSpaceAutomerge,
  waitForSpace,
} from '../testing';

describe('Spaces', () => {
  test.skip('creates a default space', async () => {
    const [client] = await createInitializedClients(1, { storage: true });

    await expect.poll(() => client.spaces.get()).toBeDefined();
    const space = client.spaces.default;
    await testSpaceAutomerge(expect, space.db);

    expect(space.members.get()).to.be.length(1);
  });

  test('creates a space', async () => {
    const [client] = await createInitializedClients(1, { storage: true });

    // TODO(burdon): Extend basic queries.
    const space = await client.spaces.create();
    await testSpaceAutomerge(expect, space.db);

    expect(SpaceId.isValid(space.id)).to.be.true;
    expect(space.members.get()).to.be.length(1);

    // Get by id.
    expect(client.spaces.get(space.id) === space).to.be.true;

    // Get by key.
    expect(client.spaces.get(space.key) === space).to.be.true;
  });

  // TODO(dmaretskyi): Test suit for different conditions/storages.
  test.skip('creates a space on webfs', async () => {
    const testBuilder = new TestBuilder();
    // testBuilder.storage = createStorage({ type: StorageType.WEBFS });

    const host = testBuilder.createClientServicesHost();
    await host.open(new Context());
    onTestFinished(() => host.close());
    const [client, server] = testBuilder.createClientServer(host);
    void server.open();
    onTestFinished(() => server.close());
    await client.initialize();
    onTestFinished(() => client.destroy());

    await client.halo.createIdentity({ displayName: 'test-user' });

    // TODO(burdon): Extend basic queries.
    const space = await client.spaces.create();
    await testSpaceAutomerge(expect, space.db);

    expect(space.members.get()).to.be.length(1);
  });

  test('creates a space re-opens the client', async () => {
    const [client] = await createInitializedClients(1, { storage: true });

    let objectId: string;
    {
      await client.spaces.waitUntilReady();
      const space = client.spaces.default;
      ({ objectId } = await testSpaceAutomerge(expect, space.db));
      expect(space.members.get()).to.be.length(1);
      await space.db.flush();
    }
    await client.destroy();

    await client.initialize();

    {
      // TODO(dmaretskyi): Replace with helper?.
      const spaceTrigger = new Trigger<Space>();
      if (client.spaces.get()[0]) {
        spaceTrigger.wake(client.spaces.get()[0]);
      }
      client.spaces.subscribe(() => {
        if (client.spaces.get()[0]) {
          spaceTrigger.wake(client.spaces.get()[0]);
        }
      });
      const space = await spaceTrigger.wait({ timeout: 500 });

      expect(SpaceId.isValid(space.id)).to.be.true;
      await space.waitUntilReady();

      const obj = await space.db.query(Filter.ids(objectId)).first();
      expect(obj).to.exist;
    }

    await client.destroy();
  });

  test('post and listen to messages', async () => {
    const [client1, client2] = await createInitializedClients(2);

    log('initialized');

    const space1 = await client1.spaces.create();
    log('spaces.create', { key: space1.key });
    const [, { invitation: guestInvitation }] = await Promise.all(
      performInvitation({ host: space1, guest: client2.spaces }),
    );
    const space2 = await waitForSpace(client2, guestInvitation!.spaceKey!, {
      ready: true,
    });

    const hello = new Trigger();
    {
      space2.listen('hello', (message) => {
        expect(message.channelId).to.include('hello');
        expect(message.payload).to.deep.contain({ data: 'Hello, world!' });
        hello.wake();
      });
      await space1.postMessage('hello', { data: 'Hello, world!' });
    }

    const goodbye = new Trigger();
    {
      space2.listen('goodbye', (message) => {
        expect(message.channelId).to.include('goodbye');
        expect(message.payload).to.deep.contain({ data: 'Goodbye' });
        goodbye.wake();
      });
      await space1.postMessage('goodbye', { data: 'Goodbye' });
    }

    await asyncTimeout(Promise.all([hello.wait(), goodbye.wait()]), 200);
  });

  // Trying to read from the feed, even if the range is not set to be downloaded, will trigger a download.
  test.skip('peer do not load mutations before epoch', async () => {
    const testBuilder = new TestBuilder();

    const services1 = testBuilder.createLocalClientServices();
    const client1 = new Client({ services: services1 });

    const services2 = testBuilder.createLocalClientServices();
    const client2 = new Client({ services: services2 });
    await client1.initialize();
    onTestFinished(() => client1.destroy());
    await client2.initialize();
    onTestFinished(() => client2.destroy());
    await client1.halo.createIdentity({ displayName: 'Peer 1' });
    await client2.halo.createIdentity({ displayName: 'Peer 2' });
    const space1 = await client1.spaces.create();
    await space1.waitUntilReady();

    const dataSpace1 = services1.host!.context.dataSpaceManager?.spaces.get(space1.key);
    const feedKey = dataSpace1!.inner.dataFeedKey;
    const feed1 = services1.host!.context.feedStore.getFeed(feedKey!)!;

    const amount = 10;
    {
      // Create mutations and epoch.
      for (const i of range(amount)) {
        const expando = createObject({ id: i.toString(), data: i.toString() });
        space1.db.add(expando);
      }
      // Wait to process all mutations.
      await space1.db.flush();
      // Create epoch.
      await client1.services.services.SpacesService?.createEpoch({
        spaceKey: space1.key,
      });
    }

    // log.break();
    // log.info('epoch created', { feedToCheck: feedKey, length: feed1.length })

    await Promise.all(performInvitation({ host: space1, guest: client2.spaces }));

    await waitForSpace(client2, space1.key, { ready: true });
    const feed2 = services2.host!.context.feedStore.getFeed(feedKey!)!;

    // log.info('check instance', { feed: getPrototypeSpecificInstanceId(feed2), coreKey: Buffer.from(feed2.core.key).toString('hex') })

    // Check that second peer does not have mutations before epoch.
    expect(feed1 !== feed2).to.eq(true);
    for (const i of range(feed1.length)) {
      expect(feed2.has(i)).to.be.false;
    }

    {
      // Create more mutations on first peer.
      const expando = createObject({ id: 'another one', data: 'something' });
      space1.db.add(expando);

      // Wait to process new mutation on second peer.
      // await dataSpace2!.inner.dataPipeline.waitUntilTimeframe(new Timeframe([[feedKey!, amount + 1]]));
      // expect(feed2.has(amount + 1)).to.be.true;
    }
  });

  test('space properties are reactive', async () => {
    const [client] = await createInitializedClients(1, { storage: true });

    const space = await client.spaces.create();
    await space.waitUntilReady();
    const trigger = new Trigger();
    getObjectCore(space.properties).updates.on(() => {
      trigger.wake();
    });

    expect(space.state.get()).to.equal(SpaceState.SPACE_READY);
    space.properties.name = 'example';
    await trigger.wait({ timeout: 500 });
    expect(space.properties.name).to.equal('example');
  });

  test('objects are owned by spaces', async () => {
    const [client] = await createInitializedClients(1, { storage: true });

    const space = await client.spaces.create();

    const obj = space.db.add(createObject({ data: 'test' }));
    expect(getSpace(obj)).to.equal(space);
  });

  test('spaces can be opened and closed', async () => {
    const [client] = await createInitializedClients(1);

    const space = await client.spaces.create();

    const { id } = space.db.add(createObject({ data: 'test' }));
    await space.db.flush();

    await space.close();
    // Since updates are throttled we need to wait for the state to change.
    await waitForSpaceState(space, SpaceState.SPACE_INACTIVE, 1000);

    await space.open();
    await space.waitUntilReady();
    await waitForSpaceState(space, SpaceState.SPACE_READY, 1000);
    expect(space.db.getObjectById(id)).to.exist;

    space.db.getObjectById(id)!.data = 'test2';
    await space.db.flush();
  });

  test('spaces can be opened and closed with two clients', async () => {
    const testBuilder = new TestBuilder();
    const host = testBuilder.createClientServicesHost();
    await host.open(new Context());

    log.info('host opened');

    const [client1, server1] = testBuilder.createClientServer(host);
    void server1.open();
    await client1.initialize();
    onTestFinished(() => client1.destroy());

    const [client2, server2] = testBuilder.createClientServer(host);
    void server2.open();
    await client2.initialize();
    onTestFinished(() => client2.destroy());

    log.info('ready');

    await client1.halo.createIdentity({ displayName: 'test-user' });

    const space1 = await client1.spaces.create();
    const obj = space1.db.add(createObject({ data: 'test' }));
    await space1.db.flush();

    const space2 = await waitForSpace(client2, space1.key, { ready: true });
    await waitForObject(space2, obj);

    await space1.close();
    // Since updates are throttled we need to wait for the state to change.
    await waitForSpaceState(space2, SpaceState.SPACE_INACTIVE, 1_000);

    await space1.open();
    await waitForSpaceState(space2, SpaceState.SPACE_READY, 1_000);
    expect(space2.db.getObjectById(obj.id)).to.exist;

    space2.db.getObjectById(obj.id)!.data = 'test2';
    await space2.db.flush();
  });

  test('text replicates between clients', async () => {
    const [host, guest] = await createInitializedClients(2);
    [host, guest].forEach(registerTypes);

    const [hostSpace, guestSpace] = await createSharedSpace(host, guest);

    const hostDocument = hostSpace.db.add(createDocument());
    await hostSpace.db.flush();
    await waitForObject(guestSpace, hostDocument);

    const text = Obj.make(TestSchema.TextV0Type, { content: 'Hello, world!' });
    hostDocument.content = Ref.make(text);

    await expect.poll(() => getDocumentText(guestSpace, hostDocument.id)).toEqual('Hello, world!');
  });

  test('collection-sync replicates missing documents', async () => {
    const [host, guest] = await createInitializedClients(2, { storage: true });
    [host, guest].forEach(registerTypes);

    const hostSpace = await host.spaces.create();
    const hostDocument = hostSpace.db.add(createDocument());
    (hostDocument.content as any).content = 'Hello, world!';
    await hostSpace.db.flush();

    await host.destroy();
    await host.initialize();
    const reloadedSpace = host.spaces.get().find((s) => s.id === hostSpace.id)!;
    await reloadedSpace.waitUntilReady();

    const [_, guestSpace] = await inviteMember(reloadedSpace, guest);
    await waitForObject(guestSpace, hostDocument);

    await expect.poll(() => getDocumentText(guestSpace, hostDocument.id)).toEqual('Hello, world!');
  });

  test('peer gains access to new documents', async () => {
    const [host, guest] = await createInitializedClients(2);
    [host, guest].forEach(registerTypes);

    // Create a shared space to have an active connection.
    await createSharedSpace(host, guest);

    // Create a document in a space to which guest doesn't yet have access.
    const hostSpace2 = await host.spaces.create();
    const hostDocument = hostSpace2.db.add(createDocument());
    await hostSpace2.db.flush();

    // Grant the access.
    await Promise.all(performInvitation({ host: hostSpace2, guest: guest.spaces }));
    const guestSpace = await waitForSpace(guest, hostSpace2.key, {
      ready: true,
    });

    await waitForObject(guestSpace, hostDocument);
  });

  test('peers do not gain access to documents from another space', async () => {
    const [alice, bob] = await createInitializedClients(3);
    [alice, bob].forEach(registerTypes);

    const bobPersonalDoc = bob.spaces.get()[0].db.add(createDocument());

    const [aliceSharedSpace, bobSharedSpace] = await createSharedSpace(alice, bob);
    const sharedDoc = bobSharedSpace.db.add(createDocument());

    await waitForObject(aliceSharedSpace, sharedDoc);
    await sleep(50);
    expect(aliceSharedSpace.db.getObjectById(bobPersonalDoc.id)).toBeUndefined();
  });

  test('peers do not gain transitive access to documents from another space', async () => {
    const [alice, bob, eve] = await createInitializedClients(3);
    [alice, bob, eve].forEach(registerTypes);

    // Eve should not gain transitive access to the document created by bob in space A
    const [aliceSpaceA, bobSpaceA] = await createSharedSpace(alice, bob);
    const doc1 = bobSpaceA.db.add(createDocument());
    const [__, eveSpaceB] = await createSharedSpace(bob, eve);

    // Create a document in a space to which Eve shouldn't have access.
    const doc2 = bobSpaceA.db.add(createDocument());

    await Promise.all([doc1, doc2].map((doc) => waitForObject(aliceSpaceA, doc)));
    await sleep(50);
    [doc1, doc2].forEach((doc) => expect(eveSpaceB.db.getObjectById(doc.id)).toBeUndefined());
  });

  test('share two spaces between clients', async () => {
    const [host, guest] = await createInitializedClients(2);
    [host, guest].forEach(registerTypes);

    {
      const [hostSpace, guestSpace] = await createSharedSpace(host, guest);

      const hostDocument = hostSpace.db.add(createDocument());
      await hostSpace.db.flush();
      await waitForObject(guestSpace, hostDocument);

      const text = Obj.make(TestSchema.TextV0Type, {
        content: 'Hello, world!',
      });
      hostDocument.content = Ref.make(text);

      await expect.poll(() => getDocumentText(guestSpace, hostDocument.id)).toEqual('Hello, world!');
    }

    {
      const [hostSpace, guestSpace] = await createSharedSpace(host, guest);

      const hostDocument = hostSpace.db.add(createDocument());
      await hostSpace.db.flush();
      await waitForObject(guestSpace, hostDocument);

      const text = Obj.make(TestSchema.TextV0Type, {
        content: 'Hello, world!',
      });
      hostDocument.content = Ref.make(text);

      await expect.poll(() => getDocumentText(guestSpace, hostDocument.id)).toEqual('Hello, world!');
    }
  });

  test('queries respect space boundaries', async () => {
    const [client] = await createInitializedClients(1, { storage: true });

    const spaceA = await client.spaces.create();
    const spaceB = await client.spaces.create();

    const objA = spaceA.db.add(createObject({ data: 'object A' }));
    const objB = spaceB.db.add(createObject({ data: 'object B' }));

    await spaceA.db.flush();
    await spaceB.db.flush();

    const [wait, inc] = latch({ count: 2, timeout: 1000 });

    spaceA.db.query(Filter.everything()).subscribe(
      (query) => {
        const objects = query.results;
        expect(objects).to.have.length(2);
        expect(objects.some((obj) => getObjectCore(obj).getType()?.objectId === Type.getTypename(SpaceProperties))).to
          .be.true;
        expect(objects.some((obj) => obj === objA)).to.be.true;
        inc();
      },
      { fire: true },
    );

    spaceB.db.query(Filter.everything()).subscribe(
      (query) => {
        const objects = query.results;
        expect(objects).to.have.length(2);
        expect(objects.some((obj) => getObjectCore(obj).getType()?.objectId === Type.getTypename(SpaceProperties))).to
          .be.true;
        expect(objects.some((obj) => obj === objB)).to.be.true;
        inc();
      },
      { fire: true },
    );

    await wait();
  });

  test('object receives updates from another peer', async () => {
    const [host, guest] = await createInitializedClients(2);

    const hostSpace = await host.spaces.create();
    await hostSpace.waitUntilReady();
    const hostRoot = hostSpace.db.add(createObject({ entries: [Ref.make(createObject({ name: 'first' }))] }));

    await Promise.all(performInvitation({ host: hostSpace, guest: guest.spaces }));
    const guestSpace = await waitForSpace(guest, hostSpace.key, {
      ready: true,
    });

    {
      const done = new Trigger();
      await waitForObject(guestSpace, hostRoot);
      const guestRoot = guestSpace.db.getObjectById(hostRoot.id)!;
      expect(guestRoot).toBeDefined();

      const unsub = getObjectCore(guestRoot).updates.on(() => {
        if (guestRoot.entries.length === 2) {
          done.wake();
        }
      });

      onTestFinished(() => unsub());

      hostRoot.entries.push(Ref.make(createObject({ name: 'second' })));
      await done.wait({ timeout: 1_000 });
    }
  });

  test('getEpochs', async () => {
    const [client] = await createInitializedClients(1, { storage: true });

    const space = await client.spaces.create();
    await space.internal.createEpoch({
      migration: CreateEpochRequest.Migration.PRUNE_AUTOMERGE_ROOT_HISTORY,
    });
    const epochs = await space.internal.getEpochs();
    expect(epochs.length).to.eq(2);
  });

  test('export space archive', { timeout: 3_000 }, async () => {
    const [client] = await createInitializedClients(1, { storage: true });
    registerTypes(client);

    const space = await client.spaces.create();
    space.db.add(createDocument());
    await space.db.flush();
    const archive = await space.internal.export();
    expect(archive.contents.length).to.be.greaterThan(0);
  });

  test('import space archive', { timeout: 3_000, retry: 1 }, async () => {
    const [client1, client2] = await createInitializedClients(2, {
      storage: true,
    });
    [client1, client2].forEach(registerTypes);

    const space = await client1.spaces.create();
    const doc1 = space.db.add(createDocument());
    await space.db.flush();
    const archive = await space.internal.export();
    expect(archive.contents.length).to.be.greaterThan(0);

    const importedSpace = await client2.spaces.import(archive);
    expect(importedSpace.id).not.toEqual(space.id);
    expect((await importedSpace.db.query(Filter.ids(doc1.id)).first()).title).toEqual(doc1.title);
  });

  const createInitializedClients = async (
    count: number,
    options?: CreateInitializedClientsOptions,
  ): Promise<Client[]> => {
    const context = new Context();
    onTestFinished(async () => {
      await context.dispose();
    });

    return createInitializedClientsWithContext(context, count, options);
  };

  const createSharedSpace = async (host: Client, guest: Client) => {
    return inviteMember(await host.spaces.create(), guest);
  };

  const inviteMember = async (hostSpace: Space, guest: Client) => {
    await Promise.all(performInvitation({ host: hostSpace, guest: guest.spaces }));
    const guestSpace = await waitForSpace(guest, hostSpace.key, {
      ready: true,
    });
    return [hostSpace, guestSpace];
  };

  const getDocumentText = (space: Space, documentId: string): string => {
    return space.db.getObjectById<TestSchema.DocumentType>(documentId)!.content.target!.content;
  };

  const registerTypes = (client: Client) => {
    client.addTypes([TestSchema.DocumentType, TestSchema.TextV0Type]);
  };

  const createDocument = (): Live<TestSchema.DocumentType> => {
    const text = Obj.make(TestSchema.TextV0Type, { content: 'Hello, world!' });
    return Obj.make(TestSchema.DocumentType, {
      title: 'Test document',
      content: Ref.make(text),
    });
  };

  const createObject = <T extends {}>(props: T) => {
    return Obj.make(Type.Expando, props);
  };

  const waitForObject = async (space: Space, object: Obj.Any) => {
    await expect.poll(() => space.db.getObjectById(object.id)).not.toEqual(undefined);
  };

  const waitForSpaceState = async (space: Space, state: SpaceState, timeout: number) => {
    await expect.poll(() => space.state.get(), { timeout }).toEqual(state);
  };
});
