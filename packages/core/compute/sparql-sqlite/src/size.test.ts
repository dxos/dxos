//
// Copyright 2026 DXOS.org
//

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { describe, test } from 'vitest';

/** gzip budget for the bundled public entry; docs/SIZE.md has the breakdown and `scripts/size.mjs` the report. */
const GZIP_BUDGET = 40_000;

describe('bundle size', () => {
  test('the minified public entry stays within its gzip budget', async ({ expect }) => {
    const result = await build({
      entryPoints: [fileURLToPath(new URL('./index.ts', import.meta.url))],
      bundle: true,
      minify: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2022',
      conditions: ['source'],
      write: false,
      logLevel: 'silent',
    });
    const [output] = result.outputFiles;
    expect(gzipSync(output.contents, { level: 9 }).length).toBeLessThan(GZIP_BUDGET);
  });
});
