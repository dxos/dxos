//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { ConfigPlugin } from '@dxos/config/vite-plugin';

const env = (value?: string) => (value ? `"${value}"` : undefined);

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true,
    https: process.env.HTTPS === 'true' ? {
      key: './key.pem',
      cert: './cert.pem'
    } : false
  },
  define: {
    'process.env.LOG_FILTER': env(process.env.LOG_FILTER),
    'process.env.LOG_BROWSER_PREFIX': env(process.env.LOG_BROWSER_PREFIX),
    'process.env.DX_VAULT': env(process.env.DX_VAULT),
  },
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/client',
      '@dxos/config',
      '@dxos/log',
      '@dxos/react-client',
      '@dxos/util'
    ]
  },
  build: {
    outDir: 'out/todomvc',
    commonjsOptions: {
      include: [/packages/, /node_modules/]
    }
  },
  plugins: [
    ConfigPlugin(),
    ReactPlugin()
  ]
});
