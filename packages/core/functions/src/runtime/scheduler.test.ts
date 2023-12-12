//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { describe, test } from '@dxos/test';

import { Scheduler } from './scheduler';
import { type FunctionManifest } from '../manifest';

describe('scheduler', () => {
  test('basic', async () => {
    const testBuilder = new TestBuilder();
    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    await client.halo.createIdentity();

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
          schedule: '* * * * * *', // Every second.
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

        return 200;
      },
    });

    await scheduler.start();
    await done.wait();
    expect(count).to.equal(3);

    await scheduler.stop();
    await client.destroy();
  });
});
