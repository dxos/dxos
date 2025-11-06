//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Client } from '@dxos/client';
import { configPreset } from '@dxos/config';
import { uploadWorkerFunction } from '@dxos/functions/edge';
import { bundleFunction } from '@dxos/functions/native';

describe.runIf(process.env.DX_TEST_TAGS?.includes('functions-e2e'))('Functions deployment', () => {
  test('deployes inbox sync function', { timeout: 120_000 }, async () => {
    const LOCAL = false;
    const config = configPreset({ edge: LOCAL ? 'local' : 'main' });

    await using client = await new Client({ config }).initialize();
    await client.halo.createIdentity();

    const space = await client.spaces.create();
    await space.waitUntilReady();

    // Inline echo function source.

    // Bundle and upload.
    const artifact = await bundleFunction({
      entryPoint: new URL('./sync.ts', import.meta.url).pathname,
      verbose: true,
    });

    const { functionId } = await uploadWorkerFunction({
      client,
      ownerPublicKey: space.key,
      version: '0.0.1',
      entryPoint: artifact.entryPoint,
      assets: artifact.assets,
      name: 'e2e-sync',
    });

    expect(functionId).toBeDefined();

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
