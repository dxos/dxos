//
// Copyright 2022 DXOS.org
//

// @ts-ignore
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';
import { beforeAll, describe, expect, test } from 'vitest';

import { isNode, trim } from '@dxos/util';

import { Bundler, initializeBundler } from './bundler';

describe('Bundler', () => {
  beforeAll(async () => {
    if (!isNode()) {
      await initializeBundler({ wasmUrl });
    }
  });

  test('Basic', async () => {
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const result = await bundler.bundle({ source: 'const x = 100' });
    expect(result.bundle).to.exist;
    expect(result.error).to.not.exist;
  });

  test('Import', async () => {
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const result = await bundler.bundle({
      source: trim`
        import { Filter } from './runtime.js';
        const query = Filter.typename('dxos.org/type/Example');
      `,
    });
    expect(result.bundle).to.exist;
    expect(result.error).to.not.exist;
  });

  // TODO(dmaretskyi): Flaky on CI.
  test.skip('HTTPS Import', async () => {
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const result = await bundler.bundle({
      source: trim`
        import { invariant } from 'https://esm.sh/@dxos/invariant';
        invariant(true);
      `,
    });
    expect(result.bundle).to.exist;
    expect(result.error).to.not.exist;
  });

  test('Error', async () => {
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const result = await bundler.bundle({ source: "import missing from './module'; missing();" });
    expect(result.bundle).to.not.exist;
    expect(result.error).to.exist;
  });
});
