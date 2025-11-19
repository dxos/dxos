//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Client } from '@dxos/client';
import { configPreset } from '@dxos/config';
import { Ref, Obj } from '@dxos/echo';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { bundleFunction } from '@dxos/functions-runtime/native';
import { failedInvariant } from '@dxos/invariant';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { AccessToken } from '@dxos/types';
import { Function } from '@dxos/functions';

import { Mailbox } from '../../../types';
import { Trigger } from '@dxos/functions';

describe.runIf(process.env.DX_TEST_TAGS?.includes('functions-e2e'))('Functions deployment', () => {
  test('bundle function', async () => {
    const artifact = await bundleFunction({
      entryPoint: new URL('./sync.ts', import.meta.url).pathname,
      verbose: true,
    });
    console.log(artifact);
  });

  test('deployes inbox sync function', { timeout: 120_000 }, async ({ expect }) => {
    const TRIGGER = true;
    const config = configPreset({ edge: 'dev' });

    await using client = await new Client({
      config,
      types: [Mailbox.Mailbox, AccessToken.AccessToken, Function.Function, Trigger.Trigger],
    }).initialize();
    await client.halo.createIdentity();

    const space = await client.spaces.create();
    await space.waitUntilReady();

    const mailbox = space.db.add(Mailbox.make({ name: 'test', space }));
    space.db.add(
      Obj.make(AccessToken.AccessToken, {
        note: 'Email read access.',
        source: 'google.com',
        token: process.env.GOOGLE_ACCESS_TOKEN ?? failedInvariant('GOOGLE_ACCESS_TOKEN is not set'),
      }),
    );
    await space.db.flush({ indexes: true });
    await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
    await space.internal.syncToEdge({ onProgress: (state) => console.log('sync', state ?? 'no connection to edge') });

    const functionsServiceClient = FunctionsServiceClient.fromClient(client);
    const artifact = await bundleFunction({
      entryPoint: new URL('./sync.ts', import.meta.url).pathname,
      verbose: true,
    });
    const func = await functionsServiceClient.deploy({
      version: '0.0.1',
      ownerPublicKey: space.key,
      entryPoint: artifact.entryPoint,
      assets: artifact.assets,
    });
    space.db.add(func);

    if (TRIGGER) {
      const trigger = space.db.add(
        Obj.make(Trigger.Trigger, {
          enabled: true,
          function: Ref.make(func),
          spec: { kind: 'timer', cron: '*/30 * * * * *' },
          input: { mailboxId: Obj.getDXN(mailbox).toString() },
        }),
      );
      await space.db.flush({ indexes: true });
      await space.internal.syncToEdge({ onProgress: (state) => console.log('sync', state ?? 'no connection to edge') });
      const result = await functionsServiceClient.forceRunCronTrigger(space.id, trigger.id);
      console.log(result);
    } else {
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
    }
  });
});
