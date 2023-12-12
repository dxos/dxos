import { defineConfig } from 'vite';
import { ConfigPlugin } from '@dxos/config/vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
    fs: {
      strict: false,
    },
  },
  build: {
    outDir: 'out/tasks',
    rollupOptions: {
      input: {
        main: resolve(__dirname, './index.html'),
        shell: resolve(__dirname, './shell.html'),
      },
    },
  },
  worker: {
    format: 'es',
  },
  plugins: [ConfigPlugin(), react({ jsxRuntime: 'classic' })],
});
