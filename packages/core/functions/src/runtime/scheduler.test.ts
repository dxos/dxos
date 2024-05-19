//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import WebSocket from 'ws';

import { Trigger } from '@dxos/async';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { create, S, TypedObject } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { Scheduler } from './scheduler';
import { type FunctionManifest } from '../types';

// TODO(burdon): Test we can add and remove triggers.
describe('scheduler', () => {
  let client: Client;
  before(async () => {
    const testBuilder = new TestBuilder();
    client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    await client.halo.createIdentity();
  });
  after(async () => {
    await client.destroy();
  });

  test('timer', async () => {
    const manifest: FunctionManifest = {
      functions: [
        {
          id: 'example.com/function/test',
          name: 'test',
          handler: 'test',
        },
      ],
      triggers: [
        {
          function: 'example.com/function/test',
          timer: {
            cron: '0/1 * * * * *', // Every 1s.
          },
        },
      ],
    };

    let count = 0;
    const done = new Trigger();
    const scheduler = new Scheduler(client, manifest, {
      callback: async () => {
        if (++count === 3) {
          done.wake();
        }
      },
    });

    await scheduler.start();
    after(async () => {
      await scheduler.stop();
    });

    await done.wait({ timeout: 5_000 });
    expect(count).to.equal(3);
  });

  test('webhook', async () => {
    const manifest: FunctionManifest = {
      functions: [
        {
          id: 'example.com/function/test',
          name: 'test',
          handler: 'test',
        },
      ],
      triggers: [
        {
          function: 'example.com/function/test',
          webhook: {
            port: 8080,
          },
        },
      ],
    };

    const done = new Trigger();
    const scheduler = new Scheduler(client, manifest, {
      callback: async () => {
        done.wake();
      },
    });

    await scheduler.start();
    after(async () => {
      await scheduler.stop();
    });

    setTimeout(() => {
      void fetch('http://localhost:8080');
    });
    await done.wait();
  });

  test('websocket', async () => {
    const manifest: FunctionManifest = {
      functions: [
        {
          id: 'example.com/function/test',
          name: 'test',
          handler: 'test',
        },
      ],
      triggers: [
        {
          function: 'example.com/function/test',
          websocket: {
            // url: 'https://hub.dxos.network/api/mailbox/test',
            url: 'http://localhost:8081',
            init: {
              type: 'sync',
            },
          },
        },
      ],
    };

    const done = new Trigger();
    const scheduler = new Scheduler(client, manifest, {
      callback: async (data) => {
        done.wake();
      },
    });

    await scheduler.start();
    after(async () => {
      await scheduler.stop();
    });

    // Test server.
    setTimeout(() => {
      const wss = new WebSocket.Server({ port: 8081 });
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
    class TestType extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      title: S.string,
    }) {}
    client.addSchema(TestType);

    const manifest: FunctionManifest = {
      functions: [
        {
          id: 'example.com/function/test',
          name: 'test',
          handler: 'test',
        },
      ],
      triggers: [
        {
          function: 'example.com/function/test',
          subscription: {
            spaceKey: client.spaces.default.key.toHex(),
            filter: [
              {
                type: TestType.typename,
              },
            ],
          },
        },
      ],
    };

    let count = 0;
    const done = new Trigger();
    const scheduler = new Scheduler(client, manifest, {
      callback: async () => {
        if (++count === 2) {
          done.wake();
        }
      },
    });

    await scheduler.start();
    after(async () => {
      await scheduler.stop();
    });

    // TODO(burdon): Query for Expando?
    setTimeout(() => {
      const space = client.spaces.default;
      const object = create(TestType, { title: 'Hello world!' });
      space.db.add(object);
    }, 100);

    await done.wait();
  });
});
