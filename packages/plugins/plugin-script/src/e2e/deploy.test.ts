//
// Copyright 2025 DXOS.org
//

import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

import { Client, type Config } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { configPreset } from '@dxos/config';
import { Context } from '@dxos/context';
import { bundleFunction } from '@dxos/edge-compute/bundler';
import { FunctionsServiceClient } from '@dxos/edge-compute';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

// TODO(wittjosiah): Re-enable once @dxos/compute.js is available at the R2 dev bucket
// (https://pub-5745ae82e450484aa28f75fc6a175935.r2.dev/dev/@dxos/compute.js currently 404s).
describe.skip('Functions deployment', { tags: ['functions-e2e'] }, () => {
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

    const identity = client.halo.identity.get();
    if (!identity) {
      throw new Error('Identity not available.');
    }
    const func = await functionsServiceClient.deploy(Context.default(), {
      ownerUri: identity.did,
      version: '0.0.1',
      entryPoint: buildResult.entryPoint,
      assets: buildResult.assets,
    });

    // Invoke deployed function via EDGE directly.
    const edgeClient = client.edge.http;
    invariant(edgeClient, 'edgeClient is required');
    edgeClient.setIdentity(createEdgeIdentity(client));

    const input = { from: 'USD', to: 'EUR' };
    const result = await functionsServiceClient.invoke(Context.default(), func, input);
    log.info('>>> result', { result, func });
    const resultNumber = Number(result);
    expect(resultNumber).toBeGreaterThan(0);
    expect(resultNumber).toBeLessThan(100);
  };
});
