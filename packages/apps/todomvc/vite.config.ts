//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { dxosPlugin } from '@dxos/vite-plugin';

const env = (value?: string) => (value ? `"${value}"` : undefined);

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true
  },
  define: {
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
    dxosPlugin(),
    react()
  ]
});
