//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import PluginImportSource from '@dxos/vite-plugin-import-source';
import { defineConfig } from 'vitest/config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: dirname,
  plugins: [PluginImportSource()],
  test: {
    include: ['src/**/*.eval.ts'],
  },
});
