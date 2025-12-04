//
// Copyright 2025 DXOS.org
//

import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { describe, test } from 'vitest';

import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { configPreset } from '@dxos/config';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { Function } from '@dxos/functions';
import { Trigger } from '@dxos/functions';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { bundleFunction } from '@dxos/functions-runtime/native';
import { failedInvariant } from '@dxos/invariant';
import { Runtime } from '@dxos/protocols';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

import { log } from '@dxos/log';
import { sleep } from '@dxos/async';
import { InvocationTraceEndEvent, InvocationTraceStartEvent } from '@dxos/functions-runtime';

const FIB_FUNCTION_PATH = new URL('./functions/fib.ts', import.meta.url).pathname;

const config = configPreset({ edge: 'main' });

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

  test('force-trigger', { timeout: 120_000 }, async ({ expect }) => {
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

  test('break CPU limit', { timeout: 120_000 }, async ({ expect }) => {
    const { client, space, functionsServiceClient } = await setup();
    const func = await deployFunction(space, functionsServiceClient, FIB_FUNCTION_PATH);
    const trigger = space.db.add(
      Obj.make(Trigger.Trigger, {
        enabled: true,
        function: Ref.make(func),
        spec: { kind: 'timer', cron: '*/5 * * * * *' },
        input: { iterations: 1_000_000_000 },
      }),
    );
    await sync(space);
    {
      const result = await functionsServiceClient.forceRunCronTrigger(space.id, trigger.id);
      console.log(result);
    }

    {
      const result = await functionsServiceClient.forceRunCronTrigger(space.id, trigger.id);
      console.log(result);
    }

    {
      trigger.input!.iterations = 100;
      await sync(space);
      const result = await functionsServiceClient.forceRunCronTrigger(space.id, trigger.id);
      console.log(result);
    }
  });

  test('observe invocations', { timeout: 520_000 }, async ({ expect }) => {
    const { client, space, functionsServiceClient } = await setup();
    const func = await deployFunction(space, functionsServiceClient, FIB_FUNCTION_PATH);
    const trigger = space.db.add(
      Obj.make(Trigger.Trigger, {
        enabled: true,
        function: Ref.make(func),
        spec: { kind: 'timer', cron: '* * * * * *' },
        input: { iterations: 1_000_000 },
      }),
    );
    await sync(space);
    await observeInvocations(space, 100);
  });

  test.only('break CPU limit through natural exection', { timeout: 520_000 }, async ({ expect }) => {
    const { client, space, functionsServiceClient } = await setup();
    const func = await deployFunction(space, functionsServiceClient, FIB_FUNCTION_PATH);
    const trigger = space.db.add(
      Obj.make(Trigger.Trigger, {
        enabled: true,
        function: Ref.make(func),
        spec: { kind: 'timer', cron: '* * * * * *' },
        input: { iterations: 100 },
      }),
    );
    await sync(space);
    await observeInvocations(space, 5);

    trigger.input!.iterations = 1_000_000_000;
    await sync(space);
    await observeInvocations(space, 10);

    trigger.input!.iterations = 100;
    await sync(space);
    await observeInvocations(space, 1_000);
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

const observeInvocations = async (space: Space, count: number | null) => {
  let initialCount = null;
  const invocationData = new Map<
    string,
    {
      begin: InvocationTraceStartEvent;
      end?: InvocationTraceEndEvent;
    }
  >();
  while (true) {
    try {
      const invocations =
        (await space.properties.invocationTraceQueue?.target!.query(Query.select(Filter.everything())).run()) ?? [];

      for (const invocation of invocations) {
        if (Obj.instanceOf(InvocationTraceStartEvent, invocation)) {
          if (invocationData.has(invocation.invocationId)) {
            continue;
          }
          invocationData.set(invocation.invocationId, {
            begin: invocation,
          });
          console.log(`BEGIN ${JSON.stringify(invocation.input)}`);
        } else if (Obj.instanceOf(InvocationTraceEndEvent, invocation)) {
          const data = invocationData.get(invocation.invocationId);
          if (!data || !!data.end) {
            continue;
          }
          data.end = invocation;

          const outcome = data.end.outcome;
          console.log(`END outcome=${outcome} duration=${data.end.timestamp - data.begin.timestamp}`);
          if (outcome === 'failure') {
            console.log(data.end.exception?.stack);
          }
        }
      }
      if (initialCount === null) {
        initialCount = invocations.length;
      }

      if (count !== null && invocationData.size >= count + initialCount) {
        break;
      }
    } catch (err) {
      console.error(err);
    }
    await sleep(1_000);
  }
};
