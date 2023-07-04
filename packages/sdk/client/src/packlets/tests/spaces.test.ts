//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { asyncTimeout, Trigger } from '@dxos/async';
import { Space } from '@dxos/client-protocol';
import { performInvitation } from '@dxos/client-services/testing';
import { Config } from '@dxos/config';
import { Expando } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { describe, test, afterTest } from '@dxos/test';
import { Timeframe } from '@dxos/timeframe';
import { range } from '@dxos/util';

import { Client } from '../client';
import { SpaceProxy } from '../proxies';
import { TestBuilder, testSpace } from '../testing';

describe('Spaces', () => {
  test('creates a space', async () => {
    const testBuilder = new TestBuilder();
    testBuilder.storage = createStorage({ type: StorageType.RAM });

    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());

    await client.halo.createIdentity({ displayName: 'test-user' });

    // TODO(burdon): Extend basic queries.
    const space = await client.createSpace();
    await testSpace(space.internal.db);

    expect(space.members.get()).to.be.length(1);
  });

  // TODO(dmaretskyi): Test suit for different conditions/storages.
  test.skip('creates a space on webfs', async () => {
    const testBuilder = new TestBuilder();
    // testBuilder.storage = createStorage({ type: StorageType.WEBFS });

    const host = testBuilder.createClientServicesHost();
    await host.open();
    afterTest(() => host.close());
    const [client, server] = testBuilder.createClientServer(host);
    void server.open();
    afterTest(() => server.close());
    await client.initialize();
    afterTest(() => client.destroy());

    await client.halo.createIdentity({ displayName: 'test-user' });

    // TODO(burdon): Extend basic queries.
    const space = await client.createSpace();
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
      // TODO(burdon): API (client.echo/client.halo).
      const space = await client.createSpace();
      const {
        objectsUpdated: [item],
      } = await testSpace(space.internal.db);
      itemId = item.id;
      expect(space.members.get()).to.be.length(1);
    }

    await client.destroy();

    log.break();

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

    const space1 = await client1.createSpace();
    log('createSpace', { key: space1.key });
    const [, { invitation: guestInvitation }] = await Promise.all(
      performInvitation({ host: space1 as SpaceProxy, guest: client2 }),
    );
    const space2 = await client2.getSpace(guestInvitation!.spaceKey!)!.waitUntilReady();

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

  test('Peer do not load mutations before epoch', async () => {
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
    const space1 = await client1.createSpace();
    await space1.waitUntilReady();

    const feedKey = services1.host._serviceContext.dataSpaceManager?.spaces.get(space1.key)?.inner.dataFeedKey;
    const dataSpace1 = services1.host._serviceContext.dataSpaceManager?.spaces.get(space1.key);

    {
      // Create mutations and epoch.
      const amount = 10;
      for (const i of range(amount)) {
        const expando = new Expando({ id: i.toString(), data: i.toString() });
        space1.db.add(expando);
      }
      // Wait to process all mutations.
      await dataSpace1!.inner.dataPipeline.waitUntilTimeframe(new Timeframe([[feedKey!, amount]]));
      // Create epoch.
      await client1.services.services.SpacesService?.createEpoch({ spaceKey: space1.key });
    }

    await Promise.all(performInvitation({ host: space1, guest: client2 }));

    const space2 = client2.getSpace(space1.key)!;
    await space2.waitUntilReady();

    for (const i of range(services1.host._serviceContext.feedStore.getFeed(feedKey!)?.length)) {
      expect(services2.host._serviceContext.feedStore.getFeed(feedKey!)?.has(i)).to.be.false;
    }
  });
});
