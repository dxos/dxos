//
// Copyright 2022 DXOS.org
//

// @ts-ignore
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';
import { assert, beforeAll, describe, expect, test } from 'vitest';

import { isNode } from '@dxos/util';

import { Bundler, initializeBundler } from './bundler';

describe('Bundler', () => {
  beforeAll(async () => {
    if (!isNode()) {
      await initializeBundler({ wasmUrl });
    }
  });

  test('Basic', async () => {
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const result = await bundler.bundle({ source: 'const x = 100' }); // TODO(burdon): Test import.
    assert(!('error' in result), 'error should not exist');
    expect(result.asset).toBeDefined();
  });

  test('Import', async () => {
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const result = await bundler.bundle({
      source: `
      import { Filter } from './runtime.js';

      const query = Filter.typename('dxos.org/type/Example');
    `,
    });
    assert(!('error' in result), 'error should not exist');
    expect(result.asset).toBeDefined();
  });

  // TODO(dmaretskyi): Flaky on CI.
  test.skip('HTTPS Import', async () => {
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const result = await bundler.bundle({
      source: `
      import { invariant } from 'https://esm.sh/@dxos/invariant';
      invariant(true);
    `,
    });
    assert(!('error' in result), 'error should not exist');
    expect(result.asset).toBeDefined();
  });

  test('Error', async () => {
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const result = await bundler.bundle({ source: "import missing from './module'; missing();" });
    assert('error' in result, 'error should exist');
  });
});
