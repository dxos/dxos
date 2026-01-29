//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout } from '@dxos/async';
import { Filter, Obj, Type } from '@dxos/echo';
import { log } from '@dxos/log';

import { Client } from '../../client';
import { TestBuilder } from '../../testing';

describe('DedicatedWorkerClientServices', { timeout: 1_000, retry: 0 }, () => {
  test('open & close', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());
    await using _services = await testBuilder.createDedicatedWorkerClientServices().open();
  });

  test('connect client', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    await using services = await testBuilder.createDedicatedWorkerClientServices().open();
    await using client = await new Client({ services }).initialize();
    await client.halo.createIdentity();
    await client.addTypes([Type.Expando]);
    client.spaces.default.db.add(Obj.make(Type.Expando, { name: 'Test' }));
    await client.spaces.default.db.flush({ indexes: true });
  });

  test('two clients share coordinator', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    await using services1 = await testBuilder.createDedicatedWorkerClientServices().open();
    await using client1 = await new Client({ services: services1 }).initialize();
    const identity = await client1.halo.createIdentity();

    await using services2 = await testBuilder.createDedicatedWorkerClientServices().open();
    await using client2 = await new Client({ services: services2 }).initialize();
    await client2.spaces.waitUntilReady();

    expect(client2.halo.identity.get()).toEqual(identity);
    await client2.spaces.default.db.query(Filter.everything()).run();

    // TODO(dmaretskyi): tried doing DB write -> flush(indexes) -> query here but flush(indexes) doesnt work
    // const object = client1.spaces.default.db.add(Obj.make(Type.Expando, { name: 'Test' }));
    // await client1.spaces.default.db.flush({ indexes: true });
    // const objects = await client2.spaces.default.db.query(Filter.type(Type.Expando, { name: 'Test' })).run();
    // expect(objects).toHaveLength(1);
    // expect(objects[0]).toEqual(object);
  });

  // Flaky.
  test('leader goes from first client to second', async () => {
    log.break();
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    await using services1 = await testBuilder.createDedicatedWorkerClientServices().open();
    await using client1 = await new Client({ services: services1 }).initialize();
    const identity = await client1.halo.createIdentity();

    await using services2 = await testBuilder.createDedicatedWorkerClientServices().open();
    await using client2 = await new Client({ services: services2 }).initialize();
    await client2.spaces.waitUntilReady();
    expect(client2.halo.identity.get()).toEqual(identity);

    await client1.destroy();

    expect(client2.halo.identity.get()).toEqual(identity);
    const objects = await client2.spaces.default.db.query(Filter.everything()).run();
    expect(objects).toHaveLength(1);
    log.break();
  });

  // TODO(wittjosiah): Using shared storage fixes this test but that doesn't seem like a realistic solution.
  test.fails('identity subscription survives leader change', { timeout: 2_000 }, async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    await using services1 = await testBuilder.createDedicatedWorkerClientServices().open();
    await using client1 = await new Client({ services: services1 }).initialize();
    await client1.halo.createIdentity({ displayName: 'initial-name' });

    await using services2 = await testBuilder.createDedicatedWorkerClientServices().open();
    await using client2 = await new Client({ services: services2 }).initialize();
    await client2.spaces.waitUntilReady();

    // Set up identity subscription before leader change.
    const updatedDisplayName = 'updated-name';
    const trigger = new Trigger();
    client2.halo.identity.subscribe((identity) => {
      if (identity?.profile?.displayName === updatedDisplayName) {
        trigger.wake();
      }
    });

    // Destroy client1 to trigger leader change.
    const reconnected = new Trigger();
    services2.reconnected.on(() => {
      reconnected.wake();
    });
    await client1.destroy();

    // Wait for client2 to reconnect to the new worker.
    await asyncTimeout(reconnected.wait(), 1000);

    // Update display name after leader change.
    await client2.halo.updateProfile({ displayName: updatedDisplayName });

    // Subscription should still receive the update.
    await asyncTimeout(trigger.wait(), 500);
    expect(client2.halo.identity.get()!.profile?.displayName).toEqual(updatedDisplayName);
  });
});
