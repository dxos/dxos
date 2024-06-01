//
// Copyright 2022 DXOS.org
//

import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';

// https://vitejs.dev/config
export default defineConfig({
  // Top level await plugin is not working in Stackblitz.
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
  },
  plugins: [
    react(),
    ThemePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
      ],
    }),
  ],
});
