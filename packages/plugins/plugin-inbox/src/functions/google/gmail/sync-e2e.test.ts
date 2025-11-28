//
// Copyright 2025 DXOS.org
//

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
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { AccessToken, Message } from '@dxos/types';

import { log } from '../../../../../../common/log/src';
import { Mailbox } from '../../../types';

describe.runIf(process.env.DX_TEST_TAGS?.includes('functions-e2e'))('Functions deployment', () => {
  test('bundle function', async () => {
    const artifact = await bundleFunction({
      entryPoint: new URL('./sync.ts', import.meta.url).pathname,
      verbose: true,
    });
    console.log(artifact);
  });

  test('deploy function', { timeout: 120_000 }, async () => {
    const { client, space, mailbox, functionsServiceClient } = await setup();
    const artifact = await bundleFunction({
      entryPoint: new URL('./sync.ts', import.meta.url).pathname,
      verbose: true,
    });
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
});

const setup = async () => {
  const config = configPreset({ edge: 'local' });

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
  });
  space.db.add(func);

  return func;
};

const checkEmails = async (mailbox: Mailbox.Mailbox) => {
  const messages = await mailbox.queue.target!.query(Query.type(Message.Message)).run();
  console.log(`Found ${messages.length} messages in mailbox`);
  return messages;
};
