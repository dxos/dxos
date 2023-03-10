//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

import { ThemePlugin } from '@dxos/react-components/plugin';

import { osThemeExtension } from './theme-extensions';

/**
 * https://vitejs.dev/config
 */
export default defineConfig({
  base: '', // Ensures relative path to assets.

  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-router-dom', 'react-dom']
        }
      }
    }
  },

  plugins: [
    ThemePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/react-components/dist/**/*.mjs')
      ],
      extensions: [osThemeExtension]
    }),

    ReactPlugin()
  ]
});
