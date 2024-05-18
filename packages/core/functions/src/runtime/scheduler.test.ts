//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { describe, test } from '@dxos/test';

import { Scheduler } from './scheduler';
import { type FunctionManifest } from '../types';

// TODO(burdon): Test can add and remove triggers.
// TODO(burdon): Define as ECHO objects (Effect schema)
describe('scheduler', () => {
  let client: Client;
  beforeEach(async () => {
    const testBuilder = new TestBuilder();
    client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    await client.halo.createIdentity();
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
      await client.destroy();
    });

    await done.wait();
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
      await client.destroy();
    });

    void fetch('http://localhost:9999');
    await done.wait();
  });
});
