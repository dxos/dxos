//
// Copyright 2022 DXOS.org
//

// @ts-ignore
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';
import { assert, beforeAll, describe, expect, test } from 'vitest';

import { isNode } from '@dxos/util';

import { bundleFunction, initializeBundler } from './bundler';

describe('Bundler', () => {
  beforeAll(async () => {
    if (!isNode()) {
      await initializeBundler({ wasmUrl });
    }
  });

  test('Basic', async () => {
    const result = await bundleFunction({
      skipWasmInitCheck: true,
      source: `
      export default function handler () {
        return 100;
      }
    `,
    });
    assert(!('error' in result), 'error should not exist');
    expect(result.asset).toBeDefined();
  });

  test('Import', async () => {
    const result = await bundleFunction({
      skipWasmInitCheck: true,
      source: `
      import { Filter } from './runtime.js';

      export default function handler () {
        return Filter.typename('dxos.org/type/Example');
      }
    `,
    });
    assert(!('error' in result), 'error should not exist');
    expect(result.asset).toBeDefined();
  });

  // TODO(dmaretskyi): Flaky on CI.
  test.skip('HTTPS Import', async () => {
    const result = await bundleFunction({
      skipWasmInitCheck: true,
      source: `
      import { invariant } from 'https://esm.sh/@dxos/invariant';
      invariant(true);
    `,
    });
    assert(!('error' in result), 'error should not exist');
    expect(result.asset).toBeDefined();
  });

  test('Error', async () => {
    const result = await bundleFunction({
      skipWasmInitCheck: true,
      source: "import missing from './module'; export default () => missing();",
    });
    assert('error' in result, 'error should exist');
  });
});
