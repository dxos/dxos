//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { configPreset } from '@dxos/config';
import { Obj, Ref } from '@dxos/echo';
import { Trigger } from '@dxos/functions';

import { deployFunction, observeInvocations, setup, sync } from './test-utils';

const FIB_FUNCTION_PATH = new URL('./functions/fib.ts', import.meta.url).pathname;

describe.runIf(process.env.DX_TEST_TAGS?.includes('functions-e2e'))('CPU limit', () => {
  const config = configPreset({ edge: 'main' });

  test('invoke directly', { timeout: 120_000 }, async ({ expect }) => {
    const { client, space, functionsServiceClient } = await setup(config);
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
    const { client, space, functionsServiceClient } = await setup(config);
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
    const { client, space, functionsServiceClient } = await setup(config);
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
    const { client, space, functionsServiceClient } = await setup(config);
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
    const { client, space, functionsServiceClient } = await setup(config);
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
