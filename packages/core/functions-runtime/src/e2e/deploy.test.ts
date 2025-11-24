//
// Copyright 2025 DXOS.org
//

import { readFile } from 'node:fs/promises';

import { describe, expect, test } from 'vitest';

import { Client, Config } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { bundleFunction } from '../bundler';
import { uploadWorkerFunction } from '../edge';

describe.runIf(process.env.DX_TEST_TAGS?.includes('functions-e2e'))('Functions deployment', () => {
  test('deploys FOREX (effect) function and invokes it via EDGE (main)', { timeout: 120_000 }, async () => {
    const LOCAL = false;
    const config = new Config({
      version: 1,
      runtime: {
        services: {
          edge: { url: LOCAL ? 'http://localhost:8787' : 'https://edge-main.dxos.workers.dev' },
        },
      },
    });

    await using client = await new Client({ config }).initialize();
    await client.halo.createIdentity();

    const space = await client.spaces.create();
    await space.waitUntilReady();

    // Inline echo function source.
    const source = await readFile(new URL('../example/forex-effect.ts', import.meta.url), 'utf-8');

    // Bundle and upload.
    const buildResult = await bundleFunction({
      skipWasmInitCheck: true,
      source,
    });
    if ('error' in buildResult) {
      throw buildResult.error ?? new Error('Bundle creation failed');
    }

    const { functionId } = await uploadWorkerFunction({
      client,
      ownerPublicKey: space.key,
      version: '0.0.1',
      entryPoint: buildResult.entryPoint,
      assets: { [buildResult.entryPoint]: buildResult.asset },
      name: 'e2e-echo',
    });

    expect(functionId).toBeDefined();

    // Invoke deployed function via EDGE directly.
    const edgeClient = client.edge;
    invariant(edgeClient, 'edgeClient is required');
    edgeClient.setIdentity(createEdgeIdentity(client));

    const input = { from: 'USD', to: 'EUR' };
    const result = await edgeClient.invokeFunction({ functionId }, input);
    log.info('>>> result', { result, functionId });
    const resultNumber = Number(result);
    expect(resultNumber).toBeGreaterThan(0);
    expect(resultNumber).toBeLessThan(100);
  });
});
