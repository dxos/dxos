import { defineConfig } from 'vite';

import { ConfigPlugin } from '@dxos/config/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true
  },
  
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/client',
      '@dxos/config'
    ]
  },
  build: {
    outDir: 'out/example/app/bare',
    commonjsOptions: {
      include: [
        /packages/,
        /node_modules/
      ]
    }
  },

  plugins: [
    ConfigPlugin()
  ]
});