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
    server: {
      headers: {
        // Required for SharedArrayBuffer (used by wa-sqlite).
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
      fs: {
        // Allow serving WASM files from node_modules via /@fs/... URLs.
        allow: [searchForWorkspaceRoot(fileURLToPath(new URL('.', import.meta.url)))],
      },
    },
  }),
);
