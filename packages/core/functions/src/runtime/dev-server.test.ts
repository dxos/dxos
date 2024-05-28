//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import path from 'path';

import { sleep, waitForCondition } from '@dxos/async';
import { type Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { describe, test } from '@dxos/test';

import { DevServer } from './dev-server';
import { FunctionRegistry } from '../function';
import { createFunctionRuntime, testFunctionManifest } from '../testing';

describe('dev server', () => {
  let port = 7201;
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

  test('function registry open after dev server started', async () => {
    const { registry, server, space } = await setupTest();
    await registry.register(space, testFunctionManifest.functions);
    await server.start();
    await registry.open();
    await waitForCondition({ condition: () => server.functions.length > 0 });
    await expectTestFunctionInvocable(server);
  });

  test('function registry open before dev server started', async () => {
    const { registry, server, space } = await setupTest();
    await registry.register(space, testFunctionManifest.functions);
    await registry.open();
    await server.start();
    await waitForCondition({ condition: () => server.functions.length > 0 });
    await expectTestFunctionInvocable(server);
  });

  test('unsubscribes from functions after stopped', async () => {
    const { registry, server, space } = await setupTest();
    await registry.register(space, testFunctionManifest.functions);
    await server.start();
    await server.stop();
    await registry.open();
    await sleep(20);
    expect(server.functions.length).to.eq(0);
  });

  const expectTestFunctionInvocable = async (server: DevServer) => {
    const seq = server.stats.seq;
    await server.invoke('test', {});
    expect(server.stats.seq).to.eq(seq + 1);
  };

  const setupTest = async () => {
    const registry = new FunctionRegistry(client);
    const server = new DevServer(client, registry, {
      baseDir: path.join(__dirname, '../testing'),
      port: port++,
    });
    const space = await client.spaces.create();
    // TODO(burdon): Doesn't shut down cleanly.
    //  Error: invariant violation [this._client.services.services.FunctionRegistryService]
    testBuilder.ctx.onDispose(() => server.stop());
    return { registry, server, space };
  };
});
