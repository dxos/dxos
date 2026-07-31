//
// Copyright 2020 DXOS.org
//

import { rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout } from '@dxos/async';
import { Client } from '@dxos/client';
import { TestBuilder, TestSchema, performInvitation } from '@dxos/client/testing';
import { Config } from '@dxos/config';
import { Filter, Obj, Ref } from '@dxos/echo';
import { isNode } from '@dxos/util';

describe('Client', () => {
  const dataRoot = '/tmp/dxos/client/storage';
  const cleanUp = () => isNode() && rmSync(dataRoot, { recursive: true, force: true });

  beforeEach(cleanUp);
  afterEach(cleanUp);

  test('creates client with embedded services', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({
      services: testBuilder.createLocalClientServices(),
    });
    await client.initialize();
    onTestFinished(() => client.destroy());
    expect(client.initialized).to.be.true;
  });

  test('space creation works after identity', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    const client = new Client({
      services: testBuilder.createLocalClientServices(),
    });
    onTestFinished(() => client.destroy());
    await asyncTimeout(client.initialize(), 2_000);
    await asyncTimeout(client.halo.createIdentity(), 2_000);
    const space = await asyncTimeout(client.spaces.create(), 2_000);
    await asyncTimeout(space.waitUntilReady(), 2_000);
  });

  test('initialize and destroy multiple times', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({
      services: testBuilder.createLocalClientServices(),
    });
    await client.initialize();
    await client.initialize();
    expect(client.initialized).to.be.true;

    await client.destroy();
    await client.destroy();
    expect(client.initialized).to.be.false;
  });

  test('closes and reopens', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({
      services: testBuilder.createLocalClientServices(),
    });
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

    const client = new Client({
      services: testBuilder.createLocalClientServices(),
    });
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
    const client = new Client({
      services: testBuilder.createLocalClientServices(),
    });
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
      await expect(client.halo.createIdentity({ displayName })).rejects.toBeInstanceOf(Error);
    }
    {
      // Reset storage.
      await client.reset();
    }

    {
      // TODO(wittjosiah): This functionality is currently disabled because it was unreliable.
      // Start again.
      // expect(client.halo.identity.get()).to.eq(null);
      // await client.halo.createIdentity({ displayName });
      // expect(client.halo.identity).to.exist;
      // await client.destroy();
    }
  });

  test('storage is cleared after client.reset', async () => {
    const config = new Config({
      version: 1,
      runtime: { client: { storage: { persistent: true, dataRoot } } },
    });
    const testBuilder = new TestBuilder(config);
    const services = testBuilder.createLocalClientServices();
    const client = new Client({ services });

    await client.initialize();
    onTestFinished(() => client.destroy());
    await client.halo.createIdentity({ displayName: 'reset-check' });
    await client.destroy();

    // After closing, identity must have been persisted to SQLite — attempting
    // to create another identity (when one already exists) should reject.
    await client.initialize();
    await expect(client.halo.createIdentity({ displayName: 'another' })).rejects.toBeInstanceOf(Error);

    // Reset should clear all SQLite storage.
    await client.reset();
  });

  test('objects are being synced between clients', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    const client1 = new Client({
      services: testBuilder.createLocalClientServices(),
      types: [TestSchema.MessageType, TestSchema.ThreadType, TestSchema.TextV0Type],
    });
    const client2 = new Client({
      services: testBuilder.createLocalClientServices(),
      types: [TestSchema.MessageType, TestSchema.ThreadType, TestSchema.TextV0Type],
    });

    await client1.initialize();
    await client1.halo.createIdentity();
    onTestFinished(() => client1.destroy());

    await client2.initialize();
    await client2.halo.createIdentity();
    onTestFinished(() => client2.destroy());

    const threadQueried = new Trigger<TestSchema.ThreadType>();

    // Create space and invite second client.
    const space1 = await client1.spaces.create();
    await space1.waitUntilReady();
    const spaceKey = space1.key;

    const query = space1.db.query(Filter.type(TestSchema.ThreadType));
    query.subscribe(
      (query) => {
        const objects = query.results;
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
    const thread2 = space2.db.add(Obj.make(TestSchema.ThreadType, { messages: [] }));
    await space2.db.flush();

    const thread1 = await threadQueried.wait({ timeout: 2_000 });

    const text = 'Hello world';
    const message = space2.db.add(
      Obj.make(TestSchema.MessageType, {
        blocks: [
          {
            timestamp: new Date().toISOString(),
            content: Ref.make(Obj.make(TestSchema.TextV0Type, { content: text })),
          },
        ],
      }),
    );
    Obj.update(thread2, (thread2) => {
      thread2.messages.push(Ref.make(message));
    });
    await space2.db.flush();

    await expect.poll(() => thread1.messages.length, { timeout: 1_000 }).toEqual(1);
    await expect
      .poll(() => thread1.messages[0].target!.blocks[0].content?.target?.content, { timeout: 1_000 })
      .toEqual(text);
  });

  // TODO(wittjosiah): This functionality is currently disabled because it was unreliable.
  test.skip('reset & create space', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({
      services: testBuilder.createLocalClientServices(),
    });
    await client.initialize();
    onTestFinished(() => client.destroy());

    await client.reset();

    await client.halo.createIdentity();
    await client.spaces.create();
  });

  // The dedicated worker path (used by Composer) runs client services over effect-rpc.
  test('client over dedicated worker services', { timeout: 10_000 }, async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    await using services = await testBuilder.createDedicatedWorkerClientServices().open();
    await using client = await new Client({ services }).initialize();
    await client.halo.createIdentity({ displayName: 'test-user' });
    expect(client.halo.identity.get()?.profile?.displayName).toEqual('test-user');

    await client.addTypes([TestSchema.TextV0Type]);
    const space = await client.spaces.create();
    await space.waitUntilReady();
    const object = space.db.add(Obj.make(TestSchema.TextV0Type, { content: 'test' }));
    await space.db.flush();

    const queried = await space.db.query(Filter.id(object.id)).first({ timeout: 1_000 });
    expect(queried.id).toEqual(object.id);
  });

  test('two clients share a dedicated worker', { timeout: 10_000 }, async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    await using services1 = await testBuilder.createDedicatedWorkerClientServices().open();
    await using client1 = await new Client({ services: services1 }).initialize();
    const identity = await client1.halo.createIdentity();

    await using services2 = await testBuilder.createDedicatedWorkerClientServices().open();
    await using client2 = await new Client({ services: services2 }).initialize();

    expect(client2.halo.identity.get()).toEqual(identity);
  });
});
