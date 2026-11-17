#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Bundles the Cloudflare worker (`src/functions/_worker.ts`) to `out/composer/_worker.js`. Runs after `vite build`,
// which empties `out/composer`. The config plugin gives the worker the same `dx.yml`, `dx-env.yml` and (outside
// production) `dx-local.yml` the page is built with, so both reach the same EDGE.

import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ConfigPlugin } from '@dxos/config/esbuild-plugin';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');

await build({
  absWorkingDir: appDir,
  entryPoints: ['./src/functions/_worker.ts'],
  outfile: './out/composer/_worker.js',
  bundle: true,
  format: 'esm',
  loader: { '.wasm': 'copy', '.woff': 'binary' },
  assetNames: '_worker/[name]-[hash]',
  define: { __filename: JSON.stringify('/_worker.js') },
  logLevel: 'warning',
  plugins: [
    ConfigPlugin({
      configPath: join(appDir, 'dx.yml'),
      envPath: join(appDir, 'dx-env.yml'),
      devPath: join(appDir, 'dx-local.yml'),
    }),
  ],
});
