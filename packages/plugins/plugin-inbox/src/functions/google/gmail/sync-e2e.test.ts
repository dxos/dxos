//
// Copyright 2025 DXOS.org
//

import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { describe, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { configPreset } from '@dxos/config';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { Function } from '@dxos/functions';
import { Trigger } from '@dxos/functions';
import { InvocationTraceEndEvent, InvocationTraceStartEvent } from '@dxos/functions-runtime';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { bundleFunction } from '@dxos/functions-runtime/native';
import { failedInvariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Runtime } from '@dxos/protocols';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { AccessToken, Message } from '@dxos/types';

import { Mailbox } from '../../../types';

describe.runIf(process.env.DX_TEST_TAGS?.includes('functions-e2e'))('Functions deployment', () => {
  test('bundle function', async () => {
    const artifact = await bundleFunction({
      entryPoint: new URL('./sync.ts', import.meta.url).pathname,
      verbose: true,
    });
    console.log(artifact);
    const tmpDir = tmpdir();
    for (const [name, data] of Object.entries(artifact.assets)) {
      writeFileSync(`${tmpDir}/${name}`, data);
      console.log(`${tmpDir}/${name}`);
    }
  });

  test('deploy function', { timeout: 120_000 }, async () => {
    const { client, space, mailbox, functionsServiceClient } = await setup();
    const func = await deployFunction(space, functionsServiceClient, new URL('./sync.ts', import.meta.url).pathname);
    console.log(func);
  });

  test('inbox sync function (invoke)', { timeout: 120_000 }, async ({ expect }) => {
    const { client, space, mailbox, functionsServiceClient } = await setup();
    await sync(space);
    const func = await deployFunction(space, functionsServiceClient, new URL('./sync.ts', import.meta.url).pathname);
    const result = await functionsServiceClient.invoke(
      func,
      {
        mailboxId: Obj.getDXN(mailbox),
      },
      {
        spaceId: space.id,
      },
    );
    console.log(result);
    await checkEmails(mailbox);
  });

  test('deployes inbox sync function (force-trigger)', { timeout: 120_000 }, async ({ expect }) => {
    const { client, space, mailbox, functionsServiceClient } = await setup();
    await sync(space);

    const func = await deployFunction(space, functionsServiceClient, new URL('./sync.ts', import.meta.url).pathname);
    const trigger = space.db.add(
      Obj.make(Trigger.Trigger, {
        enabled: true,
        function: Ref.make(func),
        spec: { kind: 'timer', cron: '*/30 * * * * *' },
        input: { mailboxId: Obj.getDXN(mailbox).toString() },
      }),
    );
    await sync(space);
    await space.db.flush({ indexes: true });
    await space.internal.syncToEdge({
      onProgress: (state) => console.log('sync', state ?? 'no connection to edge'),
    });
    const result = await functionsServiceClient.forceRunCronTrigger(space.id, trigger.id);
    console.log(result);
    await checkEmails(mailbox);
  });

  test('deployes inbox sync function (wait for trigger)', { timeout: 120_000 }, async ({ expect }) => {
    const { client, space, mailbox, functionsServiceClient } = await setup();
    await sync(space);
    const func = await deployFunction(space, functionsServiceClient, new URL('./sync.ts', import.meta.url).pathname);
    const trigger = space.db.add(
      Obj.make(Trigger.Trigger, {
        enabled: true,
        function: Ref.make(func),
        spec: { kind: 'timer', cron: '*/30 * * * * *' },
        input: { mailboxId: Obj.getDXN(mailbox).toString() },
      }),
    );
    await sync(space);
    await space.db.flush({ indexes: true });
    await space.internal.syncToEdge({
      onProgress: (state) => console.log('sync', state ?? 'no connection to edge'),
    });
    log.info('waiting for trigger to fire');
    await expect.poll(async () => {
      log.info('poll');
      await checkEmails(mailbox);
    });
  });

  test('deployes inbox sync function (wait for trigger)', { timeout: 120_000 }, async ({ expect }) => {
    const { client, space, mailbox, functionsServiceClient } = await setup();
    await sync(space);
    const func = await deployFunction(space, functionsServiceClient, new URL('./sync.ts', import.meta.url).pathname);
    space.db.add(
      Obj.make(Trigger.Trigger, {
        enabled: true,
        function: Ref.make(func),
        spec: { kind: 'timer', cron: '* * * * * *' },
        input: { mailboxId: Obj.getDXN(mailbox).toString() },
      }),
    );
    await space.db.flush({ indexes: true });
    await sync(space);

    await observeInvocations(space, 10);

    await expect.poll(async () => {
      log.info('poll');
      await checkEmails(mailbox);
    });
  });
});

const setup = async () => {
  const config = configPreset({ edge: 'dev' });

  const client = await new Client({
    config,
    types: [Mailbox.Mailbox, AccessToken.AccessToken, Function.Function, Trigger.Trigger],
  }).initialize();
  await client.halo.createIdentity();

  const space = await client.spaces.create();
  await space.waitUntilReady();
  await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);

  const mailbox = space.db.add(Mailbox.make({ name: 'test', space }));
  space.db.add(
    Obj.make(AccessToken.AccessToken, {
      note: 'Email read access.',
      source: 'google.com',
      token: process.env.GOOGLE_ACCESS_TOKEN ?? failedInvariant('GOOGLE_ACCESS_TOKEN is not set'),
    }),
  );
  const functionsServiceClient = FunctionsServiceClient.fromClient(client);

  return { client, space, mailbox, functionsServiceClient };
};

const sync = async (space: Space) => {
  await space.db.flush({ indexes: true });
  await space.internal.syncToEdge({
    onProgress: (state) => console.log('sync', state ?? 'no connection to edge'),
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

const checkEmails = async (mailbox: Mailbox.Mailbox) => {
  const messages = await mailbox.queue.target!.query(Query.type(Message.Message)).run();
  console.log(`Found ${messages.length} messages in mailbox`);
  return messages;
};

export const observeInvocations = async (space: Space, count: number | null) => {
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
