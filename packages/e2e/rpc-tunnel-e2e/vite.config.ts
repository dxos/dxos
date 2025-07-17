//
// Copyright 2022 DXOS.org
//

import { join } from 'node:path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  root: __dirname,
  base: '', // Ensures relative path to assets.
  build: {
    outDir: 'out',
  },
  server: {
    host: true
  }
});
