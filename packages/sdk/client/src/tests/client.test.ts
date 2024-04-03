//
// Copyright 2020 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { rmSync } from 'node:fs';
import waitForExpect from 'wait-for-expect';

import { MessageType, TextV0Type, ThreadType } from '@braneframe/types';
import { Trigger, asyncTimeout } from '@dxos/async';
import { Config } from '@dxos/config';
import * as E from '@dxos/echo-schema';
import { Filter } from '@dxos/echo-schema';
import { describe, test, afterTest } from '@dxos/test';
import { isNode } from '@dxos/util';

import { Client } from '../client';
import { TestBuilder, performInvitation } from '../testing';

chai.use(chaiAsPromised);

describe('Client', () => {
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

  test('default space loads', async () => {
    const testBuilder = new TestBuilder();
    afterTest(() => testBuilder.destroy());

    const client = new Client({ services: testBuilder.createLocal() });
    await asyncTimeout(client.initialize(), 2_000);
    await asyncTimeout(client.halo.createIdentity(), 2_000);
    await asyncTimeout(client.spaces.isReady.wait(), 2_000);
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
    for (const client of [client1, client2]) {
      client.addSchema(ThreadType, MessageType);
    }

    const threadQueried = new Trigger<ThreadType>();

    // Create space and invite second client.
    const space1 = await client1.spaces.create();
    await space1.waitUntilReady();
    const spaceKey = space1.key;

    const query = space1.db.query(Filter.schema(ThreadType));
    query.subscribe(({ objects }) => {
      if (objects.length === 1) {
        threadQueried.wake(objects[0]);
      }
    });
    await Promise.all(performInvitation({ host: space1, guest: client2.spaces }));

    // Create Thread on second client.
    const space2 = client2.spaces.get(spaceKey)!;
    await space2.waitUntilReady();
    const thread2 = space2.db.add(E.object(ThreadType, { messages: [] }));
    await space2.db.flush();

    const thread1 = await threadQueried.wait({ timeout: 1000 });

    const text = 'Hello world';
    const message = space2.db.add(
      E.object(MessageType, {
        from: {},
        blocks: [{ timestamp: new Date().toISOString(), content: E.object(TextV0Type, { content: text }) }],
      }),
    );
    thread2.messages.push(message);
    await space2.db.flush();

    await waitForExpect(() => {
      expect(thread1.messages.length).to.eq(1);
      expect(thread1.messages[0]!.blocks[0].content?.content).to.eq(text);
    }, 1000);
  });

  test('reactive object API', async () => {
    const config = new Config({
      runtime: {
        client: {
          useReactiveObjectApi: true,
        },
      },
    });
    const testBuilder = new TestBuilder(config);
    afterTest(() => testBuilder.destroy());

    const client = new Client({ config, services: testBuilder.createLocal() });
    await client.initialize();
    await client.halo.createIdentity();

    const space = await client.spaces.create();
    await space.waitUntilReady();
    space.properties.name = 'test';
    expect(space.properties.name).to.eq('test');
  });
});
