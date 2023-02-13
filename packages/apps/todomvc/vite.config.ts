//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { ConfigPlugin } from '@dxos/config/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true,
    https:
      process.env.HTTPS === 'true'
        ? {
            key: './key.pem',
            cert: './cert.pem'
          }
        : false
  },
  build: {
    sourcemap: true,
    outDir: 'out/todomvc',
    commonjsOptions: {
      include: [/packages/, /node_modules/]
    }
  },
  plugins: [
    ConfigPlugin({ env: ['DX_VAULT'] }),
    ReactPlugin()
  ]
});
