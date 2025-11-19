//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Client } from '@dxos/client';
import { configPreset } from '@dxos/config';
import { Obj } from '@dxos/echo';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { bundleFunction } from '@dxos/functions-runtime/native';
import { failedInvariant } from '@dxos/invariant';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { AccessToken } from '@dxos/types';

import { Mailbox } from '../../../types';

describe.runIf(process.env.DX_TEST_TAGS?.includes('functions-e2e'))('Functions deployment', () => {
  test('bundle function', async () => {
    const artifact = await bundleFunction({
      entryPoint: new URL('./sync.ts', import.meta.url).pathname,
      verbose: true,
    });
    console.log(artifact);
  });

  test('deployes inbox sync function', { timeout: 120_000 }, async ({ expect }) => {
    const config = configPreset({ edge: 'dev' });

    await using client = await new Client({ config, types: [Mailbox.Mailbox, AccessToken.AccessToken] }).initialize();
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
    console.log(func);

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
  });
});
