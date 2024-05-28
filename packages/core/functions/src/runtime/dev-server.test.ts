//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import path from 'path';

import { waitForCondition } from '@dxos/async';
import { type Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { describe, test } from '@dxos/test';

import { DevServer } from './dev-server';
import { FunctionRegistry } from '../function';
import { createFunctionRuntime } from '../testing';
import { type FunctionManifest } from '../types';

describe('dev server', () => {
  let client: Client;
  let testBuilder: TestBuilder;
  before(async () => {
    testBuilder = new TestBuilder();
    client = await createFunctionRuntime(testBuilder);
    expect(client.services.services.FunctionRegistryService).to.exist;
  });

  after(async () => {
    await testBuilder.destroy();
  });

  test('start/stop', async () => {
    const manifest: FunctionManifest = {
      functions: [
        {
          uri: 'example.com/function/test',
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
    await registry.register(space, manifest.functions);
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
