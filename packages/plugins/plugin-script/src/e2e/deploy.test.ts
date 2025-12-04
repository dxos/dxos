//
// Copyright 2025 DXOS.org
//

import { readFile } from 'node:fs/promises';

import { describe, expect, test } from 'vitest';

import { Client, type Config } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { configPreset } from '@dxos/config';
import { bundleFunction } from '@dxos/functions-runtime/bundler';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

describe.runIf(process.env.DX_TEST_TAGS?.includes('functions-e2e'))('Functions deployment', () => {
  test('deploys FOREX (effect) function and invokes it via EDGE (main)', { timeout: 120_000 }, async () => {
    const config = configPreset({ edge: 'main' });
    await testDeploy(config);
  });

  test('deploys FOREX (effect) function and invokes it via EDGE (production)', { timeout: 120_000 }, async () => {
    const config = configPreset({ edge: 'production' });
    await testDeploy(config);
  });

  const testDeploy = async (config: Config) => {
    await using client = await new Client({ config }).initialize();
    await client.halo.createIdentity();

    const space = await client.spaces.create();
    await space.waitUntilReady();

    // Inline echo function source.
    const source = await readFile(new URL('../templates/forex-effect.ts', import.meta.url), 'utf-8');

    // Bundle and upload.
    const buildResult = await bundleFunction({ source });
    if ('error' in buildResult) {
      throw buildResult.error ?? new Error('Bundle creation failed');
    }
    const functionsServiceClient = FunctionsServiceClient.fromClient(client);

    const func = await functionsServiceClient.deploy({
      ownerPublicKey: space.key,
      version: '0.0.1',
      entryPoint: buildResult.entryPoint,
      assets: buildResult.assets,
      name: 'e2e-echo',
    });

    // Invoke deployed function via EDGE directly.
    const edgeClient = client.edge;
    invariant(edgeClient, 'edgeClient is required');
    edgeClient.setIdentity(createEdgeIdentity(client));

    const input = { from: 'USD', to: 'EUR' };
    const result = await functionsServiceClient.invoke(func, input);
    log.info('>>> result', { result, func });
    const resultNumber = Number(result);
    expect(resultNumber).toBeGreaterThan(0);
    expect(resultNumber).toBeLessThan(100);
  };
});
