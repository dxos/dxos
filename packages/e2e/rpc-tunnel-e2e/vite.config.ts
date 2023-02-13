//
// Copyright 2022 DXOS.org
//

import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true
  },
  build: {
    commonjsOptions: {
      include: [
        /packages/,
        /node_modules/
      ]
    }
  }
});
