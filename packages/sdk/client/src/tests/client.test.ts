//
// Copyright 2020 DXOS.org
//

import { rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, onTestFinished } from 'vitest';

import { Trigger, asyncTimeout } from '@dxos/async';
import { Config } from '@dxos/config';
import { Filter } from '@dxos/echo-db';
import { create } from '@dxos/echo-schema';
import { isNode } from '@dxos/util';

import { Client } from '../client';
import { MessageType, TextV0Type, ThreadType, TestBuilder, performInvitation } from '../testing';

describe('Client', () => {
  const dataRoot = '/tmp/dxos/client/storage';
  const cleanUp = () => isNode() && rmSync(dataRoot, { recursive: true, force: true });

  beforeEach(cleanUp);
  afterEach(cleanUp);

  test('creates client with embedded services', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    onTestFinished(() => client.destroy());
    expect(client.initialized).to.be.true;
  });

  test('default space loads', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    const client = new Client({ services: testBuilder.createLocalClientServices() });
    onTestFinished(() => client.destroy());
    await asyncTimeout(client.initialize(), 2_000);
    await asyncTimeout(client.halo.createIdentity(), 2_000);
    await asyncTimeout(client.spaces.isReady.wait(), 2_000);
    await asyncTimeout(client.spaces.default.waitUntilReady(), 2_000);
  });

  test('initialize and destroy multiple times', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    await client.initialize();
    expect(client.initialized).to.be.true;

    await client.destroy();
    await client.destroy();
    expect(client.initialized).to.be.false;
  });

  test('closes and reopens', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    expect(client.initialized).to.be.true;

    await client.destroy();
    expect(client.initialized).to.be.false;

    await client.initialize();
    expect(client.initialized).to.be.true;

    await client.destroy();
    expect(client.initialized).to.be.false;
  });

  test('create space before identity', { timeout: 1_000 }, async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    onTestFinished(() => client.destroy());
    await expect(client.spaces.create()).rejects.toThrowError('This device has no HALO identity available.');
  });

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
    const client = new Client({ services: testBuilder.createLocalClientServices() });
    const displayName = 'test-user';
    {
      // Create identity.
      await client.initialize();
      expect(client.halo.identity.get()).not.to.exist;
      const identity = await client.halo.createIdentity({ displayName });
      expect(client.halo.identity.get()).to.deep.eq(identity);
      await client.spaces.isReady.wait();
      await client.destroy();
    }

    {
      // Should throw trying to create another.
      await client.initialize();
      expect(client.halo.identity).to.exist;
      // TODO(burdon): Error type.
      await expect(client.halo.createIdentity({ displayName })).rejects.toBeInstanceOf(Error);
      await client.spaces.isReady.wait();
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
      await client.spaces.isReady.wait();
      await client.destroy();
    }
  });

  test('objects are being synced between clients', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    const client1 = new Client({ services: testBuilder.createLocalClientServices() });
    const client2 = new Client({ services: testBuilder.createLocalClientServices() });
    await client1.initialize();
    onTestFinished(() => client1.destroy());
    await client2.initialize();
    onTestFinished(() => client2.destroy());

    await client1.halo.createIdentity();
    await client2.halo.createIdentity();
    for (const client of [client1, client2]) {
      client.addTypes([ThreadType, MessageType, TextV0Type]);
    }

    const threadQueried = new Trigger<ThreadType>();

    // Create space and invite second client.
    const space1 = await client1.spaces.create();
    await space1.waitUntilReady();
    const spaceKey = space1.key;

    const query = space1.db.query(Filter.schema(ThreadType));
    query.subscribe(
      ({ objects }) => {
        if (objects.length === 1) {
          threadQueried.wake(objects[0]);
        }
      },
      { fire: true },
    );
    await Promise.all(performInvitation({ host: space1, guest: client2.spaces }));

    // Create Thread on second client.
    const space2 = client2.spaces.get(spaceKey)!;
    await space2.waitUntilReady();
    const thread2 = space2.db.add(create(ThreadType, { messages: [] }));
    await space2.db.flush();

    const thread1 = await threadQueried.wait({ timeout: 2_000 });

    const text = 'Hello world';
    const message = space2.db.add(
      create(MessageType, {
        blocks: [{ timestamp: new Date().toISOString(), content: create(TextV0Type, { content: text }) }],
      }),
    );
    thread2.messages.push(message);
    await space2.db.flush();

    await expect.poll(() => thread1.messages.length, { timeout: 1_000 }).toEqual(1);
    await expect.poll(() => thread1.messages[0]!.blocks[0].content?.content, { timeout: 1_000 }).toEqual(text);
  });

  test('reset & create space', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    onTestFinished(() => client.destroy());

    await client.reset();

    await client.halo.createIdentity();
    await client.spaces.create();
  });
});
