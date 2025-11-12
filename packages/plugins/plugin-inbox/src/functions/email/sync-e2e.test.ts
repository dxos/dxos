//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Client } from '@dxos/client';
import { configPreset } from '@dxos/config';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { bundleFunction } from '@dxos/functions-runtime/native';
import { Mailbox } from '../../types';

describe.runIf(process.env.DX_TEST_TAGS?.includes('functions-e2e'))('Functions deployment', () => {
  test('deployes inbox sync function', { timeout: 120_000 }, async () => {
    const config = configPreset({ edge: 'dev' });

    await using client = await new Client({ config, types: [Mailbox.Mailbox] }).initialize();
    await client.halo.createIdentity();

    const space = await client.spaces.create();
    await space.waitUntilReady();

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

    const mailbox = space.db.add(Mailbox.make({ name: 'test', space }));

    const result = await functionsServiceClient.invoke(func, {
      mailboxId: mailbox.id,
    });

    console.log(result);

    // // Invoke deployed function via EDGE directly.
    // const edgeClient = client.edge;
    // invariant(edgeClient, 'edgeClient is required');
    // edgeClient.setIdentity(createEdgeIdentity(client));

    // const input = { from: 'USD', to: 'EUR' };
    // const result = await edgeClient.invokeFunction({ functionId }, input);
    // log.info('>>> result', { result, functionId });
    // const resultNumber = Number(result);
    // expect(resultNumber).toBeGreaterThan(0);
    // expect(resultNumber).toBeLessThan(100);
  });
});
