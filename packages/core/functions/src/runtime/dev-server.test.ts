//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import path from 'path';

import { FunctionsPlugin } from '@dxos/agent';
import { waitForCondition } from '@dxos/async';
import { type Client, Config } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { describe, openAndClose, test } from '@dxos/test';

import { DevServer } from './dev-server';
import { FunctionRegistry } from '../functions';
import { createInitializedClients } from '../testing/setup';
import { type FunctionManifest } from '../types';

describe('dev server', () => {
  let client: Client;
  let testBuilder: TestBuilder;
  before(async () => {
    testBuilder = new TestBuilder();
    const config = new Config({
      runtime: {
        agent: {
          plugins: [{ id: 'dxos.org/agent/plugin/functions', config: { port: 8080 } }],
        },
      },
    });

    client = (await createInitializedClients(testBuilder, 1, config))[0];

    // TODO(burdon): Better way to configure plugin? (Rationalize chess.test).
    const functionsPlugin = new FunctionsPlugin();
    await functionsPlugin.initialize({ client, clientServices: client.services });
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
          functionId: 'example.com/function/test',
          route: 'test',
          handler: 'test',
        },
      ],
    };

    const registry = new FunctionRegistry(client);
    const server = new DevServer(client, registry, {
      baseDir: path.join(__dirname, '../testing'),
    });
    const space = await client.spaces.create();
    await registry.register(space, manifest);
    await server.start();

    // TODO(burdon): Doesn't shut down cleanly.
    //  Error: invariant violation [this._client.services.services.FunctionRegistryService]
    testBuilder.ctx.onDispose(() => server.stop());
    expect(server).to.exist;

    await waitForCondition({ condition: () => server.functions.length > 0 });

    await server.invoke('test', {});
    expect(server.stats.seq).to.eq(1);
  });
});
