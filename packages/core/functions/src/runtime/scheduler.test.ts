//
// Copyright 2023 DXOS.org
//

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { create } from '@dxos/live-object';

import { Scheduler, type SchedulerOptions } from './scheduler';
import { FunctionRegistry } from '../function';
import { createInitializedClients, TestType, triggerWebhook } from '../testing';
import { TriggerRegistry } from '../trigger';
import { TriggerKind, type FunctionManifest } from '../types';

// TODO(burdon): Test we can add and remove triggers.
// Flaky: https://cloud.nx.app/runs/uqhKOBA6JQ/task/functions%3Atest
describe.skip('scheduler', () => {
  let testBuilder: TestBuilder;
  let client: Client;

  beforeAll(async () => {
    testBuilder = new TestBuilder();
    client = (await createInitializedClients(testBuilder, 1))[0];
  });

  afterAll(async () => {
    await testBuilder.destroy();
  });

  const createScheduler = (callback: SchedulerOptions['callback']) => {
    const scheduler = new Scheduler(new FunctionRegistry(client), new TriggerRegistry(client), { callback });

    afterAll(async () => {
      await scheduler.stop();
    });

    return scheduler;
  };

  test('timer', async () => {
    const manifest: FunctionManifest = {
      functions: [
        {
          uri: 'example.com/function/test',
          route: '/test',
          handler: 'test',
        },
      ],
      triggers: [
        {
          function: 'example.com/function/test',
          enabled: true,
          spec: {
            type: TriggerKind.Timer,
            cron: '0/1 * * * * *', // Every 1s.
          },
        },
      ],
    };

    let count = 0;
    const done = new Trigger();
    const scheduler = createScheduler(async () => {
      if (++count === 3) {
        done.wake();
      }
    });
    await scheduler.register(client.spaces.default, manifest);
    await scheduler.start();

    await done.wait({ timeout: 5_000 });
    expect(count).to.equal(3);
  });

  // Flaky.
  test.skip('webhook', async () => {
    const manifest: FunctionManifest = {
      functions: [
        {
          uri: 'example.com/function/test',
          route: '/test',
          handler: 'test',
        },
      ],
      triggers: [
        {
          function: 'example.com/function/test',
          enabled: true,
          spec: {
            type: TriggerKind.Webhook,
            method: 'GET',
          },
        },
      ],
    };

    const done = new Trigger();
    const scheduler = createScheduler(async () => {
      done.wake();
    });
    const space = await client.spaces.create();
    await scheduler.register(space, manifest);
    await scheduler.start();

    setTimeout(async () => triggerWebhook(space, manifest.functions![0].uri));

    await done.wait();
  });

  test('subscription', async () => {
    const manifest: FunctionManifest = {
      functions: [
        {
          uri: 'example.com/function/test',
          route: '/test',
          handler: 'test',
        },
      ],
      triggers: [
        {
          function: 'example.com/function/test',
          enabled: true,
          spec: {
            type: TriggerKind.Subscription,
            filter: { type: TestType.typename },
          },
        },
      ],
    };

    let count = 0;
    const done = new Trigger();
    const scheduler = createScheduler(async () => {
      if (++count === 1) {
        done.wake();
      }
    });
    await scheduler.register(client.spaces.default, manifest);
    await scheduler.start();

    setTimeout(() => {
      const space = client.spaces.default;
      const object = create(TestType, { title: 'Hello world!' });
      space.db.add(object);
    }, 100);

    await done.wait();
  });
});
