//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { getRandomPort } from 'get-port-please';
import WebSocket from 'ws';

import { Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { create } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { Scheduler, type SchedulerOptions } from './scheduler';
import { FunctionRegistry } from '../function';
import { createInitializedClients, TestType, triggerWebhook } from '../testing';
import { TriggerRegistry } from '../trigger';
import { type FunctionManifest } from '../types';

// TODO(burdon): Test we can add and remove triggers.
describe('scheduler', () => {
  let testBuilder: TestBuilder;
  let client: Client;
  before(async () => {
    testBuilder = new TestBuilder();
    client = (await createInitializedClients(testBuilder, 1))[0];
  });
  after(async () => {
    await testBuilder.destroy();
  });

  const createScheduler = (callback: SchedulerOptions['callback']) => {
    const scheduler = new Scheduler(new FunctionRegistry(client), new TriggerRegistry(client), { callback });
    after(async () => {
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
            type: 'timer',
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

  test('webhook', async () => {
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
            type: 'webhook',
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

  test('websocket', async () => {
    const port = await getRandomPort('127.0.0.1');
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
            type: 'websocket',
            // url: 'https://hub.dxos.network/api/mailbox/test',
            url: `http://localhost:${port}`,
            init: {
              type: 'sync',
            },
          },
        },
      ],
    };

    const done = new Trigger();
    const scheduler = createScheduler(async () => {
      done.wake();
    });
    await scheduler.register(client.spaces.default, manifest);
    await scheduler.start();

    // Test server.
    setTimeout(() => {
      const wss = new WebSocket.Server({ port });
      wss.on('connection', (ws: WebSocket) => {
        ws.on('message', (data) => {
          const info = JSON.parse(new TextDecoder().decode(data as ArrayBuffer));
          expect(info.type).to.equal('sync');
          done.wake();
        });
      });
    }, 500);

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
            type: 'subscription',
            filter: [{ type: TestType.typename }],
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
