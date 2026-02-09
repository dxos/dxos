//
// Copyright 2025 DXOS.org
//

import { readFile } from 'node:fs/promises';

import * as Record from 'effect/Record';
import { describe, expect, test } from 'vitest';

import { bundleFunction } from '@dxos/functions-runtime/bundler';
import { FunctionWorker } from '@dxos/functions-simulator-cloudflare';
import { ErrorCodec } from '@dxos/protocols';

// Requires downloading assets from R2
describe.runIf(process.env.DX_TEST_TAGS?.includes('functions-e2e'))('Run script in sumulator', () => {
  test('forex-effect', { timeout: 120_000 }, async () => {
    const source = await readFile(new URL('../templates/forex-effect.ts', import.meta.url), 'utf-8');

    // Bundle and upload.
    const buildResult = await bundleFunction({ source });
    if ('error' in buildResult) {
      throw buildResult.error ?? new Error('Bundle creation failed');
    }

    const worker = new FunctionWorker({
      mainModule: buildResult.entryPoint,
      modules: Record.map(buildResult.assets, (contents, filename) => ({
        contents: contents as Uint8Array<ArrayBuffer>,
        contentType: filename.endsWith('.wasm') ? 'application/wasm' : 'application/javascript',
      })),
    });

    const result = await worker.invoke({ from: 'USD', to: 'EUR' });
    console.log(result);
    if (result._kind === 'error') {
      throw ErrorCodec.decode(result.error);
    }
    expect(Number(result.result)).toBeGreaterThan(0);
  });
});
