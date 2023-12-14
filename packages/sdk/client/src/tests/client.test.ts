//
// Copyright 2020 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { rmSync } from 'node:fs';

import { Contact } from '@braneframe/types';
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
        await client.initialize();
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

      const firstContactQueried = new Trigger<Contact>();
      const secondContactQueried = new Trigger<Contact>();
      const firstContactName = 'Rich Ivanov';
      const secondContactName = 'Dmytro Veremchuk';

      // Create space and invite second client.
      const space = await client1.spaces.create();
      await space.waitUntilReady();
      const spaceKey = space.key;
      await Promise.all(performInvitation({ host: space, guest: client2.spaces }));

      const query = space.db.query(Contact.filter());
      query.subscribe(({ objects }) => {
        if (objects.length === 1 && objects[0].name === firstContactName) {
          firstContactQueried.wake(objects[0]);
        }
        if (objects.length === 2 && objects.some((obj) => obj.name === secondContactName)) {
          secondContactQueried.wake(objects.find((obj) => obj.name === secondContactName)!);
        }
      });

      {
        // Create contact on first client.
        const space = client1.spaces.get(spaceKey)!;
        await space.waitUntilReady();
        const contact = space.db.add(new Contact());
        contact.name = firstContactName;
        await space.db.flush();
      }

      {
        // Create contact on second client.
        const space = client2.spaces.get(spaceKey)!;
        await space.waitUntilReady();
        const contact = space.db.add(new Contact());
        contact.name = secondContactName;
        await space.db.flush();
      }

      expect((await firstContactQueried.wait({ timeout: 1000 })).name).to.eq(firstContactName);
      expect((await secondContactQueried.wait({ timeout: 1000 })).name).to.eq(secondContactName);
    });
  });
});
