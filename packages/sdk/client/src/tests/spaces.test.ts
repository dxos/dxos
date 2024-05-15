//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { Trigger, asyncTimeout, latch } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { performInvitation } from '@dxos/client-services/testing';
import { Context } from '@dxos/context';
import { getAutomergeObjectCore } from '@dxos/echo-db';
import { Expando, TYPE_PROPERTIES, type ReactiveObject } from '@dxos/echo-schema';
import { create } from '@dxos/echo-schema';
import { createTestLevel } from '@dxos/kv-store/testing';
import { log } from '@dxos/log';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { afterTest, describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { Client } from '../client';
import { SpaceState, getSpace } from '../echo';
import { DocumentType, TextV0Type, TestBuilder, testSpaceAutomerge, waitForSpace } from '../testing';

describe('Spaces', () => {
  test('creates a default space', async () => {
    const testBuilder = new TestBuilder();
    testBuilder.storage = createStorage({ type: StorageType.RAM });

    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());

    await client.halo.createIdentity({ displayName: 'test-user' });

    await waitForExpect(() => {
      expect(client.spaces.get()).not.to.be.undefined;
    });
    const space = client.spaces.default;
    await testSpaceAutomerge(space.db);

    expect(space.members.get()).to.be.length(1);
  }).tag('flaky');

  test('creates a space', async () => {
    const testBuilder = new TestBuilder();
    testBuilder.storage = createStorage({ type: StorageType.RAM });

    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());

    await client.halo.createIdentity({ displayName: 'test-user' });

    // TODO(burdon): Extend basic queries.
    const space = await client.spaces.create();
    await testSpaceAutomerge(space.db);

    expect(space.members.get()).to.be.length(1);
  });

  // TODO(dmaretskyi): Test suit for different conditions/storages.
  test.skip('creates a space on webfs', async () => {
    const testBuilder = new TestBuilder();
    // testBuilder.storage = createStorage({ type: StorageType.WEBFS });

    const host = testBuilder.createClientServicesHost();
    await host.open(new Context());
    afterTest(() => host.close());
    const [client, server] = testBuilder.createClientServer(host);
    void server.open();
    afterTest(() => server.close());
    await client.initialize();
    afterTest(() => client.destroy());

    await client.halo.createIdentity({ displayName: 'test-user' });

    // TODO(burdon): Extend basic queries.
    const space = await client.spaces.create();
    await testSpaceAutomerge(space.db);

    expect(space.members.get()).to.be.length(1);
  });

  test('creates a space re-opens the client', async () => {
    const testBuilder = new TestBuilder();
    afterTest(() => testBuilder.destroy());
    testBuilder.storage = createStorage({ type: StorageType.RAM });
    testBuilder.level = createTestLevel();

    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    await client.halo.createIdentity({ displayName: 'test-user' });

    let objectId: string;
    {
      await client.spaces.isReady.wait();
      const space = client.spaces.default;
      ({ objectId } = await testSpaceAutomerge(space.db));
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
      await space.waitUntilReady();

      const obj = await space.db.automerge.loadObjectById(objectId)!;
      expect(obj).to.exist;
    }

    await client.destroy();
  });

  test('post and listen to messages', async () => {
    const testBuilder = new TestBuilder();

    const client1 = new Client({ services: testBuilder.createLocal() });
    const client2 = new Client({ services: testBuilder.createLocal() });
    await client1.initialize();
    await client2.initialize();
    await client1.halo.createIdentity({ displayName: 'Peer 1' });
    await client2.halo.createIdentity({ displayName: 'Peer 2' });

    log('initialized');

    afterTest(() => Promise.all([client1.destroy()]));
    afterTest(() => Promise.all([client2.destroy()]));

    const space1 = await client1.spaces.create();
    log('spaces.create', { key: space1.key });
    const [, { invitation: guestInvitation }] = await Promise.all(
      performInvitation({ host: space1, guest: client2.spaces }),
    );
    const space2 = await waitForSpace(client2, guestInvitation!.spaceKey!, { ready: true });

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

    const services1 = testBuilder.createLocal();
    const client1 = new Client({ services: services1 });

    const services2 = testBuilder.createLocal();
    const client2 = new Client({ services: services2 });
    await client1.initialize();
    afterTest(() => client1.destroy());
    await client2.initialize();
    afterTest(() => client2.destroy());
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
        const expando = createEchoObject({ id: i.toString(), data: i.toString() });
        space1.db.add(expando);
      }
      // Wait to process all mutations.
      await space1.db.flush();
      // Create epoch.
      await client1.services.services.SpacesService?.createEpoch({ spaceKey: space1.key });
    }

    // log.break();
    // log.info('epoch created', { feedToCheck: feedKey, length: feed1.length })

    await Promise.all(performInvitation({ host: space1, guest: client2.spaces }));

    await waitForSpace(client2, space1.key, { ready: true });
    const _dataSpace2 = services2.host!.context.dataSpaceManager?.spaces.get(space1.key);
    const feed2 = services2.host!.context.feedStore.getFeed(feedKey!)!;

    // log.info('check instance', { feed: getPrototypeSpecificInstanceId(feed2), coreKey: Buffer.from(feed2.core.key).toString('hex') })

    // Check that second peer does not have mutations before epoch.
    expect(feed1 !== feed2).to.eq(true);
    for (const i of range(feed1.length)) {
      expect(feed2.has(i)).to.be.false;
    }

    {
      // Create more mutations on first peer.
      const expando = createEchoObject({ id: 'another one', data: 'something' });
      space1.db.add(expando);

      // Wait to process new mutation on second peer.
      // await dataSpace2!.inner.dataPipeline.waitUntilTimeframe(new Timeframe([[feedKey!, amount + 1]]));
      // expect(feed2.has(amount + 1)).to.be.true;
    }
  });

  test('space properties are reactive', async () => {
    const testBuilder = new TestBuilder();
    testBuilder.storage = createStorage({ type: StorageType.RAM });

    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());

    await client.halo.createIdentity({ displayName: 'test-user' });

    const space = await client.spaces.create();
    await space.waitUntilReady();
    const trigger = new Trigger();
    getAutomergeObjectCore(space.properties).updates.on(() => {
      trigger.wake();
    });

    expect(space.state.get()).to.equal(SpaceState.READY);
    space.properties.name = 'example';
    await trigger.wait({ timeout: 500 });
    expect(space.properties.name).to.equal('example');
  });

  test('objects are owned by spaces', async () => {
    const testBuilder = new TestBuilder();
    testBuilder.storage = createStorage({ type: StorageType.RAM });

    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());

    await client.halo.createIdentity({ displayName: 'test-user' });

    const space = await client.spaces.create();

    const obj = space.db.add(createEchoObject({ data: 'test' }));
    expect(getSpace(obj)).to.equal(space);
  });

  test('spaces can be opened and closed', async () => {
    const testBuilder = new TestBuilder();
    const services = testBuilder.createLocal();
    const client = new Client({ services });
    await client.initialize();
    afterTest(() => client.destroy());
    await client.halo.createIdentity({ displayName: 'test-user' });

    const space = await client.spaces.create();

    const { id } = space.db.add(createEchoObject({ data: 'test' }));
    await space.db.flush();

    await space.close();
    // Since updates are throttled we need to wait for the state to change.
    await waitForExpect(() => {
      expect(space.state.get()).to.equal(SpaceState.INACTIVE);
    }, 1000);

    await space.open();
    await space.waitUntilReady();
    await waitForExpect(() => {
      expect(space.state.get()).to.equal(SpaceState.READY);
    }, 1000);
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
    afterTest(() => client1.destroy());

    const [client2, server2] = testBuilder.createClientServer(host);
    void server2.open();
    await client2.initialize();
    afterTest(() => client2.destroy());

    log.info('ready');

    await client1.halo.createIdentity({ displayName: 'test-user' });

    const space1 = await client1.spaces.create();

    const { id } = space1.db.add(createEchoObject({ data: 'test' }));
    await space1.db.flush();

    const space2 = await waitForSpace(client2, space1.key, { ready: true });
    await waitForExpect(() => {
      expect(space2.db.getObjectById(id)).to.exist;
    });

    await space1.close();
    // Since updates are throttled we need to wait for the state to change.
    await waitForExpect(() => {
      expect(space1.state.get()).to.equal(SpaceState.INACTIVE);
    }, 1000);

    await space1.open();

    await space2.waitUntilReady();
    await waitForExpect(() => {
      expect(space2.state.get()).to.equal(SpaceState.READY);
    }, 1000);
    expect(space2.db.getObjectById(id)).to.exist;

    space2.db.getObjectById(id)!.data = 'test2';
    await space2.db.flush();
  });

  test('text replicates between clients', async () => {
    const testBuilder = new TestBuilder();

    const host = new Client({ services: testBuilder.createLocal() });
    const guest = new Client({ services: testBuilder.createLocal() });

    await host.initialize();
    await guest.initialize();
    afterTest(() => host.destroy());
    afterTest(() => guest.destroy());
    [host, guest].forEach(registerTypes);

    await host.halo.createIdentity({ displayName: 'host' });
    await guest.halo.createIdentity({ displayName: 'guest' });

    const hostSpace = await host.spaces.create();
    await Promise.all(performInvitation({ host: hostSpace, guest: guest.spaces }));
    const guestSpace = await waitForSpace(guest, hostSpace.key, { ready: true });

    const hostDocument = hostSpace.db.add(createDocument());
    await hostSpace.db.flush();

    await waitForExpect(() => {
      expect(guestSpace.db.getObjectById(hostDocument.id)).not.to.be.undefined;
    });

    (hostDocument.content as any).content = 'Hello, world!';

    await waitForExpect(() => {
      expect(getDocumentText(guestSpace, hostDocument.id)).to.equal('Hello, world!');
    });
  });

  test('share two spaces between clients', async () => {
    const testBuilder = new TestBuilder();

    const host = new Client({ services: testBuilder.createLocal() });
    const guest = new Client({ services: testBuilder.createLocal() });

    await host.initialize();
    await guest.initialize();
    afterTest(() => host.destroy());
    afterTest(() => guest.destroy());
    [host, guest].forEach(registerTypes);

    await host.halo.createIdentity({ displayName: 'host' });
    await guest.halo.createIdentity({ displayName: 'guest' });

    {
      const hostSpace = await host.spaces.create();
      await Promise.all(performInvitation({ host: hostSpace, guest: guest.spaces }));
      const guestSpace = await waitForSpace(guest, hostSpace.key, { ready: true });

      const hostDocument = hostSpace.db.add(createDocument());
      await hostSpace.db.flush();

      await waitForExpect(() => {
        expect(guestSpace.db.getObjectById(hostDocument.id)).not.to.be.undefined;
      });

      (hostDocument.content as any).content = 'Hello, world!';

      await waitForExpect(() => {
        expect(getDocumentText(guestSpace, hostDocument.id)).to.equal('Hello, world!');
      });
    }

    {
      const hostSpace = await host.spaces.create();

      await Promise.all(performInvitation({ host: hostSpace, guest: guest.spaces }));
      const guestSpace = await waitForSpace(guest, hostSpace.key, { ready: true });

      const hostDocument = hostSpace.db.add(createDocument());
      await hostSpace.db.flush();

      await waitForExpect(() => {
        expect(guestSpace.db.getObjectById(hostDocument.id)).not.to.be.undefined;
      });

      (hostDocument.content as any).content = 'Hello, world!';

      await waitForExpect(() => {
        expect(getDocumentText(guestSpace, hostDocument.id)).to.equal('Hello, world!');
      });
    }
  });

  test('queries respect space boundaries', async () => {
    const testBuilder = new TestBuilder();
    testBuilder.storage = createStorage({ type: StorageType.RAM });

    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());

    await client.halo.createIdentity({ displayName: 'test-user' });

    const spaceA = await client.spaces.create();
    const spaceB = await client.spaces.create();

    const objA = spaceA.db.add(createEchoObject({ data: 'object A' }));
    const objB = spaceB.db.add(createEchoObject({ data: 'object B' }));

    await spaceA.db.flush();
    await spaceB.db.flush();

    const [wait, inc] = latch({ count: 2, timeout: 1000 });

    spaceA.db.query().subscribe(
      ({ objects }) => {
        expect(objects).to.have.length(2);
        expect(objects.some((obj) => getAutomergeObjectCore(obj).getType()?.itemId === TYPE_PROPERTIES)).to.be.true;
        expect(objects.some((obj) => obj === objA)).to.be.true;
        inc();
      },
      { fire: true },
    );

    spaceB.db.query().subscribe(
      ({ objects }) => {
        expect(objects).to.have.length(2);
        expect(objects.some((obj) => getAutomergeObjectCore(obj).getType()?.itemId === TYPE_PROPERTIES)).to.be.true;
        expect(objects.some((obj) => obj === objB)).to.be.true;
        inc();
      },
      { fire: true },
    );

    await wait();
  });

  test('object receives updates from another peer', async () => {
    const testBuilder = new TestBuilder();

    const host = new Client({ services: testBuilder.createLocal() });
    const guest = new Client({ services: testBuilder.createLocal() });

    await host.initialize();
    await guest.initialize();

    afterTest(() => host.destroy());
    afterTest(() => guest.destroy());

    await host.halo.createIdentity({ displayName: 'host' });
    await guest.halo.createIdentity({ displayName: 'guest' });

    const hostSpace = await host.spaces.create();
    await hostSpace.waitUntilReady();
    const hostRoot = hostSpace.db.add(createEchoObject({ entries: [createEchoObject({ name: 'first' })] }));

    await Promise.all(performInvitation({ host: hostSpace, guest: guest.spaces }));

    const guestSpace = await waitForSpace(guest, hostSpace.key, { ready: true });
    await guestSpace.waitUntilReady();

    {
      const done = new Trigger();

      await waitForExpect(async () => {
        expect(await guestSpace.db.automerge.loadObjectById(hostRoot.id)).not.to.be.undefined;
      });
      const guestRoot: Expando = guestSpace.db.getObjectById(hostRoot.id)!;

      const unsub = getAutomergeObjectCore(guestRoot).updates.on(() => {
        if (guestRoot.entries.length === 2) {
          done.wake();
        }
      });

      afterTest(() => unsub());

      hostRoot.entries.push(createEchoObject({ name: 'second' }));
      await done.wait({ timeout: 1000 });
    }
  });

  const getDocumentText = (space: Space, documentId: string): string => {
    return (space.db.getObjectById(documentId) as DocumentType).content!.content;
  };

  const registerTypes = (client: Client) => {
    client.addSchema(DocumentType, TextV0Type);
  };

  const createDocument = (): ReactiveObject<DocumentType> => {
    return create(DocumentType, {
      content: create(TextV0Type, { content: '' }),
    });
  };

  const createEchoObject = <T extends {}>(props: T): ReactiveObject<Expando> => {
    return create(Expando, props);
  };
});
