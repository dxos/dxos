//
// Copyright 2020 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { rmSync } from 'node:fs';
import waitForExpect from 'wait-for-expect';

import { Message, Thread } from '@braneframe/types';
import { Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { testWithAutomerge } from '@dxos/echo-schema/testing';
import { describe, test, afterTest } from '@dxos/test';
import { isNode } from '@dxos/util';

import { Client } from '../client';
import { TestBuilder, performInvitation } from '../testing';

chai.use(chaiAsPromised);

describe('Client', () => {
  testWithAutomerge(() => {
    const dataRoot = '/tmp/dxos/client/storage';

    afterEach(async () => {
      // Clean up.
      isNode() && rmSync(dataRoot, { recursive: true, force: true });
    });

    test('creates client with embedded services', async () => {
      const testBuilder = new TestBuilder();

      const client = new Client({ services: testBuilder.createLocal() });
      await client.initialize();
      afterTest(() => client.destroy());
      expect(client.initialized).to.be.true;
    });

    test('initialize and destroy multiple times', async () => {
      const testBuilder = new TestBuilder();

      const client = new Client({ services: testBuilder.createLocal() });
      await client.initialize();
      await client.initialize();
      expect(client.initialized).to.be.true;

      await client.destroy();
      await client.destroy();
      expect(client.initialized).to.be.false;
    });

    test('closes and reopens', async () => {
      const testBuilder = new TestBuilder();

      const client = new Client({ services: testBuilder.createLocal() });
      await client.initialize();
      expect(client.initialized).to.be.true;

      await client.destroy();
      expect(client.initialized).to.be.false;

      await client.initialize();
      expect(client.initialized).to.be.true;

      await client.destroy();
      expect(client.initialized).to.be.false;
    });

    test('create space before identity', async () => {
      const testBuilder = new TestBuilder();

      const client = new Client({ services: testBuilder.createLocal() });
      await client.initialize();
      afterTest(() => client.destroy());
      await expect(client.spaces.create()).to.eventually.be.rejectedWith('This device has no HALO identity available.');
    }).timeout(1_000);

    test('creates identity then resets', async () => {
      const config = new Config({
        version: 1,
        runtime: {
          client: {
            storage: { persistent: true, dataRoot },
          },
        },
      });
      const testBuilder = new TestBuilder(config);
      const client = new Client({ services: testBuilder.createLocal() });
      const displayName = 'test-user';
      {
        // Create identity.
        await client.initialize();
        expect(client.halo.identity.get()).not.to.exist;
        const identity = await client.halo.createIdentity({ displayName });
        expect(client.halo.identity.get()).to.deep.eq(identity);
        await client.destroy();
      }

      {
        // Should throw trying to create another.
        await client.initialize();
        expect(client.halo.identity).to.exist;
        // TODO(burdon): Error type.
        await expect(client.halo.createIdentity({ displayName })).to.be.rejected;
      }

      {
        // Reset storage.
        await client.reset();
      }

      {
        // Start again.
        expect(client.halo.identity.get()).to.eq(null);
        await client.halo.createIdentity({ displayName });
        expect(client.halo.identity).to.exist;
        await client.destroy();
      }
    }).onlyEnvironments('nodejs', 'chromium', 'firefox');

    test('objects are being synced between clients', async () => {
      const testBuilder = new TestBuilder();
      afterTest(() => testBuilder.destroy());

      const client1 = new Client({ services: testBuilder.createLocal() });
      const client2 = new Client({ services: testBuilder.createLocal() });
      await client1.initialize();
      await client2.initialize();

      await client1.halo.createIdentity();
      await client2.halo.createIdentity();

      const threadQueried = new Trigger<Thread>();

      // Create space and invite second client.
      const space1 = await client1.spaces.create();
      await space1.waitUntilReady();
      const spaceKey = space1.key;

      const query = space1.db.query(Thread.filter());
      query.subscribe(({ objects }) => {
        if (objects.length === 1) {
          threadQueried.wake(objects[0]);
        }
      });
      await Promise.all(performInvitation({ host: space1, guest: client2.spaces }));

      // Create Thread on second client.
      const space2 = client2.spaces.get(spaceKey)!;
      await space2.waitUntilReady();
      const thread2 = space2.db.add(new Thread());
      await space2.db.flush();

      const thread1 = await threadQueried.wait({ timeout: 1000 });

      const text = 'Hello, Dmytro';
      const message = space2.db.add(new Message({ blocks: [{ text }] }));
      await space2.db.flush();
      thread2.messages.push(message);

      await waitForExpect(() => {
        expect(thread1.messages.length).to.eq(1);
        expect(thread1.messages[0].blocks[0].text).to.eq(text);
      }, 1000);
    });
  });
});
