//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import path from 'path';

import { FunctionsPlugin } from '@dxos/agent';
import { Client, Config } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { describe, openAndClose, test } from '@dxos/test';

import { DevServer } from './dev-server';
import { type FunctionManifest } from '../types';

describe('dev server', () => {
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

    const services = testBuilder.createLocalClientServices();
    client = new Client({ config, services });

    await client.initialize();
    await client.halo.createIdentity();
    testBuilder.ctx.onDispose(() => client.destroy());

    // TODO(burdon): Better way to configure plugin? (Rationalize chess.test).
    const functionsPlugin = new FunctionsPlugin();
    await functionsPlugin.initialize({ client, clientServices: services });
    await openAndClose(functionsPlugin);

    expect(client.services.services.FunctionRegistryService).to.exist;
  });
  after(async () => {
    await testBuilder.destroy();
  });

  test('start/stop', async () => {
    const manifest: FunctionManifest = {
      functions: [
        {
          id: 'example.com/function/test',
          path: 'test',
          handler: 'test',
        },
      ],
    };

    const server = new DevServer(client, {
      manifest,
      baseDir: path.join(__dirname, '../testing'),
    });
    await server.initialize();
    await server.start();

    // TODO(burdon): Doesn't shut down cleanly.
    //  Error: invariant violation [this._client.services.services.FunctionRegistryService]
    testBuilder.ctx.onDispose(() => server.stop());
    expect(server).to.exist;

    await server.invoke('test', {});
    expect(server.stats.seq).to.eq(1);
  });
});
