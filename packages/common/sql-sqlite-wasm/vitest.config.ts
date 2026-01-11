//
// Copyright 2024 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import { searchForWorkspaceRoot } from 'vite';


import { createConfig } from '../../../vitest.base.config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const baseConfig = createConfig({
  dirname,
  node: {
    // TODO(dmaretskyi): Enabled because client tests were flaky. Remove when that's not the case.
    retry: 2,
  },
  browser: 'chromium',
});

export default mergeConfig(
  baseConfig,
  defineConfig({
    optimizeDeps: {
      // Exclude wa-sqlite from optimization to preserve WASM loading behavior.
      exclude: ['@dxos/wa-sqlite', '@effect/wa-sqlite'],
    },
    server: {
        headers: {
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
        },
        fs: {
          // Ensure Vite can serve wasm assets from the monorepo root `node_modules` via `/@fs/...`.
          // Without this, the browser runner can 404 when fetching `wa-sqlite.wasm`.
          allow: [searchForWorkspaceRoot(fileURLToPath(new URL('.', import.meta.url)))],
        },
    },
    assetsInclude: ['**/*.wasm'],
  }),
);
