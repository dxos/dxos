//
// Copyright 2026 DXOS.org
//

import { defineConfig } from 'vite';

import { composerPlugin } from '@dxos/app-framework/vite-plugin';

// `vendor/` serves EDGE only; Composer resolves the shared packages through its import map.
export default defineConfig({
  plugins: composerPlugin({ vendor: false }),
  build: { outDir: 'dist', emptyOutDir: true },
});
