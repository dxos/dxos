//
// Copyright 2025 DXOS.org
//

import { describe } from '@effect/vitest';
import { test } from 'vitest';

import { Client } from '@dxos/client';
import { type Space } from '@dxos/client-protocol';
import { configPreset } from '@dxos/config';
import { Function } from '@dxos/functions';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { bundleFunction } from '@dxos/functions-runtime/native';
import { FunctionRuntimeKind } from '@dxos/protocols';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

// To heavy to run in CI.
describe.runIf(process.env.DX_TEST_TAGS?.includes('functions-e2e')).skip('Function', () => {
  const config = configPreset({ edge: 'local' });

  test('bundle anthropic function', { timeout: 120_000 }, async () => {
    await bundleFunction({
      entryPoint: new URL('../templates/anthropic.ts', import.meta.url).pathname,
      verbose: true,
    });
  });

  test('deploy empty function', { timeout: 120_000 }, async () => {
    const { space, functionsServiceClient } = await setup();

    await sync(space);
    const func = await deployFunction(
      space,
      functionsServiceClient,
      new URL('../templates/ping.ts', import.meta.url).pathname,
    );
    console.log(func);
    throw new Error('test');
  });

  test('deploy and invoke anthropic function', { timeout: 120_000 }, async () => {
    const { space, functionsServiceClient } = await setup();
    await sync(space);
    const func = await deployFunction(
      space,
      functionsServiceClient,
      new URL('../templates/anthropic.ts', import.meta.url).pathname,
    );

    const result = await functionsServiceClient.invoke(func, {
      message: 'Hello, world!',
    });
    console.log(result);
    //
  });

  const setup = async () => {
    const client = await new Client({ config, types: [Function.Function] }).initialize();
    await client.halo.createIdentity();

    const space = await client.spaces.create();
    await space.waitUntilReady();
    await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);

    const functionsServiceClient = FunctionsServiceClient.fromClient(client);
    return { client, space, functionsServiceClient };
  };

  const sync = async (space: Space) => {
    await space.db.flush({ indexes: true });
    await space.internal.syncToEdge({
      onProgress: (state) =>
        console.log(state ? `${state.unsyncedDocumentCount} documents syncing...` : 'connecting to edge...'),
    });
  };

  const deployFunction = async (space: Space, functionsServiceClient: FunctionsServiceClient, entryPoint: string) => {
    const artifact = await bundleFunction({
      entryPoint,
      verbose: true,
    });
    const func = await functionsServiceClient.deploy({
      version: '0.0.1',
      ownerPublicKey: space.key,
      entryPoint: artifact.entryPoint,
      assets: artifact.assets,
      runtime: FunctionRuntimeKind.enums.WORKER_LOADER,
    });

    space.db.add(func);
    return func;
  };
});
