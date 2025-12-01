//
// Copyright 2025 DXOS.org
//

import { readFile, writeFile } from 'node:fs/promises';

import { describe, expect, test } from 'vitest';

import { Client, Config } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { bundleFunction } from '@dxos/functions-runtime/bundler';
import { FunctionsServiceClient, incrementSemverPatch } from '@dxos/functions-runtime/edge';
import { Runtime } from '@dxos/protocols';
import { configPreset } from '@dxos/config';
import { resolve } from 'node:path';

describe.runIf(process.env.DX_TEST_TAGS?.includes('functions-e2e'))('Functions deployment', () => {
  test('deploys FOREX (effect) function and invokes it via EDGE (main)', { timeout: 120_000 }, async () => {
    const config = configPreset({
      edge: 'dev',
    });
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
    // for (const [key, value] of Object.entries(buildResult.assets)) {
    //   await writeFile(key, value);
    //   console.log(resolve(key));
    // }
    const functionsServiceClient = FunctionsServiceClient.fromClient(client);
    const newFunction = await functionsServiceClient.deploy({
      // TODO(dmaretskyi): Space key or identity key.
      ownerPublicKey: space.key,
      version: '0.0.1',
      entryPoint: buildResult.entryPoint,
      assets: buildResult.assets,
      runtime: Runtime.WORKER_LOADER,
    });
    console.log(newFunction);

    expect(newFunction.id).toBeDefined();

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
