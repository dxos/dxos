//
// Copyright 2025 DXOS.org
//

import { readFile } from 'node:fs/promises';
import { Record } from 'effect';

import { describe, expect, test } from 'vitest';

import { bundleFunction } from '@dxos/functions-runtime/bundler';
import { FunctionWorker } from '@dxos/functions-simulator-cloudflare';

describe('Run script in sumulator', () => {
  test('deploys FOREX (effect) function and invokes it via EDGE (main)', { timeout: 120_000 }, async () => {
    const source = await readFile(new URL('../templates/forex-effect.ts', import.meta.url), 'utf-8');

    // Bundle and upload.
    const buildResult = await bundleFunction({ source });
    if ('error' in buildResult) {
      throw buildResult.error ?? new Error('Bundle creation failed');
    }

    const worker = new FunctionWorker({
      mainModule: buildResult.entryPoint,
      modules: Record.map(buildResult.assets, (contents) => ({
        contents: contents as Uint8Array<ArrayBuffer>,
        contentType: 'application/javascript',
      })),
    });

    const result = await worker.invoke({ from: 'USD', to: 'EUR' });
    console.log(result);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(100);
  });
});
