//
// Copyright 2025 DXOS.org
//

import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { describe, test } from 'vitest';

import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { configPreset } from '@dxos/config';
import { Obj, Query, Ref } from '@dxos/echo';
import { Function } from '@dxos/functions';
import { Trigger } from '@dxos/functions';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { bundleFunction } from '@dxos/functions-runtime/native';
import { failedInvariant } from '@dxos/invariant';
import { Runtime } from '@dxos/protocols';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

import { log } from '@dxos/log';

const FIB_FUNCTION_PATH = new URL('./functions/fib.ts', import.meta.url).pathname;

const config = configPreset({ edge: 'dev' });

describe.runIf(process.env.DX_TEST_TAGS?.includes('functions-e2e'))('CPU limit', () => {
  test('invoke directly', { timeout: 120_000 }, async ({ expect }) => {
    const { client, space, functionsServiceClient } = await setup();
    const func = await deployFunction(space, functionsServiceClient, FIB_FUNCTION_PATH);
    const result = await functionsServiceClient.invoke(
      func,
      {
        iterations: 100,
      },
      {
        spaceId: space.id,
      },
    );
    console.log(result);
  });

  test.only('force-trigger', { timeout: 120_000 }, async ({ expect }) => {
    const { client, space, functionsServiceClient } = await setup();
    const func = await deployFunction(space, functionsServiceClient, FIB_FUNCTION_PATH);
    const trigger = space.db.add(
      Obj.make(Trigger.Trigger, {
        enabled: true,
        function: Ref.make(func),
        spec: { kind: 'timer', cron: '*/5 * * * * *' },
        input: { iterations: 100 },
      }),
    );
    await sync(space);
    const result = await functionsServiceClient.forceRunCronTrigger(space.id, trigger.id);
    console.log(result);
  });

  test.only('observe invocations', { timeout: 520_000 }, async ({ expect }) => {
    const { client, space, functionsServiceClient } = await setup();
    const func = await deployFunction(space, functionsServiceClient, FIB_FUNCTION_PATH);
    const trigger = space.db.add(
      Obj.make(Trigger.Trigger, {
        enabled: true,
        function: Ref.make(func),
        spec: { kind: 'timer', cron: '*/5 * * * * *' },
        input: { iterations: 100 },
      }),
    );
    await sync(space);
    const result = await functionsServiceClient.forceRunCronTrigger(space.id, trigger.id);
    console.log(result);
  });
});

const setup = async () => {
  const client = await new Client({
    config,
    types: [Function.Function, Trigger.Trigger],
  }).initialize();
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
    runtime: Runtime.WORKER_LOADER,
  });
  space.db.add(func);

  return func;
};
