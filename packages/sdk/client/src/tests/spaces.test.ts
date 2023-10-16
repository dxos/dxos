//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { Document as DocumentType, types } from '@braneframe/types';
import { asyncTimeout, Trigger } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { performInvitation } from '@dxos/client-services/testing';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { Expando, subscribe } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type EchoSnapshot, type SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { type Epoch } from '@dxos/protocols/proto/dxos/halo/credentials';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { describe, test, afterTest } from '@dxos/test';
import { Timeframe } from '@dxos/timeframe';
import { range } from '@dxos/util';

import { Client } from '../client';
import { SpaceState } from '../echo';
import { type SpaceProxy } from '../echo/space-proxy';
import { TestBuilder, testSpace, waitForSpace } from '../testing';

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
    await testSpace(space.internal.db);

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
    await testSpace(space.internal.db);

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
    await testSpace(space.internal.db);

    expect(space.members.get()).to.be.length(1);
  });

  test('creates a space re-opens the client', async () => {
    const testBuilder = new TestBuilder(new Config({ version: 1 }));
    testBuilder.storage = createStorage({ type: StorageType.RAM });

    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    await client.halo.createIdentity({ displayName: 'test-user' });

    let itemId: string;
    {
      await client.spaces.isReady.wait();
      const space = client.spaces.default;
      const {
        updateEvent: {
          itemsUpdated: [item],
        },
      } = await testSpace(space.internal.db);
      itemId = item.id;
      expect(space.members.get()).to.be.length(1);
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

      const item = space.internal.db._itemManager.getItem(itemId)!;
      expect(item).to.exist;
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
      performInvitation({ host: space1 as SpaceProxy, guest: client2.spaces }),
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
        const expando = new Expando({ id: i.toString(), data: i.toString() });
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
    const dataSpace2 = services2.host!.context.dataSpaceManager?.spaces.get(space1.key);
    const feed2 = services2.host!.context.feedStore.getFeed(feedKey!)!;

    // log.info('check instance', { feed: getPrototypeSpecificInstanceId(feed2), coreKey: Buffer.from(feed2.core.key).toString('hex') })

    // Check that second peer does not have mutations before epoch.
    expect(feed1 !== feed2).to.eq(true);
    for (const i of range(feed1.length)) {
      expect(feed2.has(i)).to.be.false;
    }

    {
      // Create more mutations on first peer.
      const expando = new Expando({ id: 'another one', data: 'something' });
      space1.db.add(expando);

      // Wait to process new mutation on second peer.
      await dataSpace2!.inner.dataPipeline.waitUntilTimeframe(new Timeframe([[feedKey!, amount + 1]]));
      expect(feed2.has(amount + 1)).to.be.true;
    }
  });

  test('epoch correctly resets database', async () => {
    const testBuilder = new TestBuilder();
    const services = testBuilder.createLocal();
    const client = new Client({ services });
    await client.initialize();
    afterTest(() => client.destroy());
    await client.halo.createIdentity({ displayName: 'test-user' });

    const space = await client.spaces.create();
    await space.waitUntilReady();

    const dataSpace = services.host!.context.dataSpaceManager!.spaces.get(space.key)!;

    // Create Item.
    const text = PublicKey.random().toHex();
    const idx = '0';
    const item = new Expando({ idx, text });
    space.db.add(item);
    await space.db.flush();
    expect(space.db.objects.length).to.equal(2);

    const writeEpochWithSnapshot = async (databaseSnapshot: EchoSnapshot) => {
      const processedEpoch = dataSpace.dataPipeline.onNewEpoch.waitForCount(1);

      // Empty snapshot.
      const snapshot: SpaceSnapshot = {
        spaceKey: space.key.asUint8Array(),
        timeframe: dataSpace.inner.dataPipeline.pipelineState!.timeframe,
        database: databaseSnapshot,
      };

      const snapshotCid = await services.host!.context.snapshotStore.saveSnapshot(snapshot);

      const epoch: Epoch = {
        previousId: dataSpace.dataPipeline.currentEpoch?.id,
        timeframe: dataSpace.inner.dataPipeline.pipelineState!.timeframe,
        number: (dataSpace.dataPipeline.currentEpoch?.subject.assertion as Epoch).number + 1,
        snapshotCid,
      };

      const receipt = await dataSpace.inner.controlPipeline.writer.write({
        credential: {
          credential: await services
            .host!.context.identityManager.identity!.getIdentityCredentialSigner()
            .createCredential({
              subject: space.key,
              assertion: {
                '@type': 'dxos.halo.credentials.Epoch',
                ...epoch,
              },
            }),
        },
      });
      await dataSpace.inner.controlPipeline.state.waitUntilTimeframe(new Timeframe([[receipt.feedKey, receipt.seq]]));
      await asyncTimeout(processedEpoch, 1000);
    };

    const dataBaseState = dataSpace.dataPipeline.databaseHost!.createSnapshot();

    const query = space.db.query({ idx });

    // Create empty Epoch and check if it clears items.
    {
      const trigger = new Trigger();
      expect(query.objects.length).to.equal(1);

      const subscription = query.subscribe(async (query) => {
        expect(query.objects.length).to.equal(0);
        trigger.wake();
      });

      await writeEpochWithSnapshot({});
      await asyncTimeout(trigger.wait(), 500);

      expect(space.db.objects.length).to.equal(0);
      expect(query.objects.length).to.equal(0);
      expect(item.__deleted).to.be.true;
      subscription();
    }

    // Reset database to previous state.
    {
      const trigger = new Trigger();
      const subscription = query.subscribe(async (query) => {
        expect(query.objects.length).to.equal(1);
        trigger.wake();
      });
      afterTest(() => subscription());

      await writeEpochWithSnapshot(dataBaseState);
      await asyncTimeout(trigger.wait(), 500);

      expect(item.__deleted).to.be.false;
      expect(space.db.objects.length).to.equal(2);
      expect(query.objects[0].text).to.equal(text);
      expect(query.objects[0]).to.equal(item);
    }

    // Create Epoch and check if Item do not flickers.
    {
      const checkItem = (object = item) => {
        expect(object.__deleted).to.be.false;
        expect(object.text).to.equal(text);
      };
      const trigger = new Trigger();
      const subscription = space.db.query({ idx }).subscribe((query) => {
        checkItem(query.objects[0]);
        trigger.wake();
      });
      afterTest(() => subscription());

      await client.services.services.SpacesService?.createEpoch({ spaceKey: space.key });
      await asyncTimeout(trigger.wait(), 500);
      checkItem();
    }

    // Set new field and query it.
    {
      item.data = 'new text';
      await space.db.flush();
      expect(space.db.query({ idx }).objects[0].data).to.equal('new text');
    }
  });

  test('spaces can be opened and closed', async () => {
    const testBuilder = new TestBuilder();
    const services = testBuilder.createLocal();
    const client = new Client({ services });
    await client.initialize();
    afterTest(() => client.destroy());
    await client.halo.createIdentity({ displayName: 'test-user' });

    const space = await client.spaces.create();

    const { id } = space.db.add(new Expando({ data: 'test' }));
    await space.db.flush();

    await space.internal.close();
    // Since updates are throttled we need to wait for the state to change.
    await waitForExpect(() => {
      expect(space.state.get()).to.equal(SpaceState.INACTIVE);
    }, 1000);

    await space.internal.open();
    await space.waitUntilReady();
    await waitForExpect(() => {
      expect(space.state.get()).to.equal(SpaceState.READY);
    }, 1000);
    expect(space.db.getObjectById(id)).to.exist;

    space.db.getObjectById<Expando>(id)!.data = 'test2';
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

    const { id } = space1.db.add(new Expando({ data: 'test' }));
    await space1.db.flush();

    const space2 = await waitForSpace(client2, space1.key, { ready: true });
    await waitForExpect(() => {
      expect(space2.db.getObjectById(id)).to.exist;
    });

    await space1.internal.close();
    // Since updates are throttled we need to wait for the state to change.
    await waitForExpect(() => {
      expect(space1.state.get()).to.equal(SpaceState.INACTIVE);
    }, 1000);

    await space1.internal.open();

    await space2.waitUntilReady();
    await waitForExpect(() => {
      expect(space2.state.get()).to.equal(SpaceState.READY);
    }, 1000);
    expect(space2.db.getObjectById(id)).to.exist;

    space2.db.getObjectById<Expando>(id)!.data = 'test2';
    await space2.db.flush();
  });

  test('text replicates between clients', async () => {
    const testBuilder = new TestBuilder();

    const host = new Client({ services: testBuilder.createLocal() });
    const guest = new Client({ services: testBuilder.createLocal() });

    host.addTypes(types);
    guest.addTypes(types);

    await host.initialize();
    await guest.initialize();

    afterTest(() => host.destroy());
    afterTest(() => guest.destroy());

    await host.halo.createIdentity({ displayName: 'host' });
    await guest.halo.createIdentity({ displayName: 'guest' });

    const hostSpace = await host.spaces.create();
    await Promise.all(performInvitation({ host: hostSpace, guest: guest.spaces }));
    const guestSpace = await waitForSpace(guest, hostSpace.key, { ready: true });

    const hostDocument = hostSpace.db.add(new DocumentType());
    await hostSpace.db.flush();

    await waitForExpect(() => {
      expect(guestSpace.db.getObjectById(hostDocument.id)).not.to.be.undefined;
    });

    hostDocument.content.model?.insert('Hello, world!', 0);

    await waitForExpect(() => {
      expect(guestSpace.db.getObjectById<DocumentType>(hostDocument.id)!.content.text).to.equal('Hello, world!');
    });
  });

  test('space properties are reactive', async () => {
    const testBuilder = new TestBuilder();
    testBuilder.storage = createStorage({ type: StorageType.RAM });

    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());

    await client.halo.createIdentity({ displayName: 'test-user' });

    const space = await client.spaces.create();
    const trigger = new Trigger();
    space.properties[subscribe](() => {
      trigger.wake();
    });

    expect(space.state.get()).to.equal(SpaceState.READY);
    space.properties.name = 'example';
    await trigger.wait({ timeout: 500 });
    expect(space.properties.name).to.equal('example');
  });
});
