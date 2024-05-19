//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import path from 'path';

import { Client, Config } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { describe, test } from '@dxos/test';

import { DevServer } from './dev-server';
import { type FunctionManifest } from '../types';

describe.only('dev server', () => {
  let client: Client;
  let testBuilder: TestBuilder;
  before(async () => {
    testBuilder = new TestBuilder();
    const config = new Config({
      runtime: {
        agent: {
          plugins: [
            {
              id: 'dxos.org/agent/plugin/functions',
              config: {
                port: 8080,
              },
            },
          ],
        },
      },
    });

    client = new Client({ config, services: testBuilder.createLocal() });
    await client.initialize();
    await client.halo.createIdentity();
    testBuilder.ctx.onDispose(() => client.destroy());
  });
  after(async () => {
    await testBuilder.destroy();
  });

  test('start/stop', async () => {
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

    const server = new DevServer(client, {
      manifest,
      baseDir: path.join(__dirname, '../testing'),
    });

    await server.initialize();
    await server.start();
    testBuilder.ctx.onDispose(() => server.stop());
    expect(server).to.exist;
  });
});
