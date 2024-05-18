//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { create, S, TypedObject } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { Scheduler } from './scheduler';
import { type FunctionManifest } from '../types';

// TODO(burdon): Test can add and remove triggers.
describe('scheduler', () => {
  let client: Client;
  beforeEach(async () => {
    const testBuilder = new TestBuilder();
    client = new Client({ services: testBuilder.createLocal() });
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
            port: 9999,
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
      void fetch('http://localhost:9999');
    });
    await done.wait();
  });

  test.only('subscription', async () => {
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
