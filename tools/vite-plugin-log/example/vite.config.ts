//
// Copyright 2026 DXOS.org
//

import { defineConfig } from 'vite';

import { DxosLogPlugin } from '@dxos/vite-plugin-log';

export default defineConfig({
  root: __dirname,
  plugins: [DxosLogPlugin()],
  server: {
    port: 3000,
  },
});
