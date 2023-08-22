//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { Document } from '@braneframe/types';
import { asyncTimeout, Trigger } from '@dxos/async';
import { Space } from '@dxos/client-protocol';
import { performInvitation } from '@dxos/client-services/testing';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { Expando } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { describe, test, afterTest } from '@dxos/test';
import { Timeframe } from '@dxos/timeframe';
import { range } from '@dxos/util';

import { Client } from '../client';
import { SpaceState } from '../echo';
import { SpaceProxy } from '../echo/space-proxy';
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
      expect(client.getSpace()).not.to.be.undefined;
    });
    const space = client.getSpace()!;
    await testSpace(space.internal.db);

    expect(space.members.get()).to.be.length(1);
  });

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
    await host.open(new Context());
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
      const space = client.getSpace()!;
      const {
        objectsUpdated: [item],
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

    const space1 = await client1.createSpace();
    log('createSpace', { key: space1.key });
    const [, { invitation: guestInvitation }] = await Promise.all(
      performInvitation({ host: space1 as SpaceProxy, guest: client2 }),
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

  // TODO(dmaretskyi): Started failing after I've disabled feed purging. Investigate why, if target timeframes are set correctly it should work regardless.
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
    const space1 = await client1.createSpace();
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

    await Promise.all(performInvitation({ host: space1, guest: client2 }));

    await waitForSpace(client2, space1.key, { ready: true });
    const dataSpace2 = services2.host!.context.dataSpaceManager?.spaces.get(space1.key);
    const feed2 = services2.host!.context.feedStore.getFeed(feedKey!)!;

    // Check that second peer does not have mutations before epoch.
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

  test.skip('spaces can be activated and deactivated', async () => {
    const testBuilder = new TestBuilder();
    const services = testBuilder.createLocal();
    const client = new Client({ services });
    await client.initialize();
    afterTest(() => client.destroy());
    await client.halo.createIdentity({ displayName: 'test-user' });

    const space = await client.createSpace();

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

    space.db.getObjectById(id)!.data = 'test2';
    await space.db.flush();
  });

  test('text replicates between clients', async () => {
    const testBuilder = new TestBuilder();

    const host = new Client({ services: testBuilder.createLocal() });
    const guest = new Client({ services: testBuilder.createLocal() });

    await host.initialize();
    await guest.initialize();

    afterTest(() => host.destroy());
    afterTest(() => guest.destroy());

    await host.halo.createIdentity({ displayName: 'host' });
    await guest.halo.createIdentity({ displayName: 'guest' });

    const hostSpace = await host.createSpace();
    await Promise.all(performInvitation({ host: hostSpace, guest }));
    const guestSpace = await waitForSpace(guest, hostSpace.key, { ready: true });

    const hostDocument = hostSpace.db.add(new Document());
    await hostSpace.db.flush();

    await waitForExpect(() => {
      expect(guestSpace.db.getObjectById(hostDocument.id)).not.to.be.undefined;
    });

    hostDocument.content.model?.insert('Hello, world!', 0);

    await waitForExpect(() => {
      expect(guestSpace.db.getObjectById(hostDocument.id)!.content.text).to.equal('Hello, world!');
    });
  });
});
