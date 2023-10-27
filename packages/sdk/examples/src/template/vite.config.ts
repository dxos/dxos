//
// Copyright 2022 DXOS.org
//

import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ThemePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/react-ui/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui-theme/dist/**/*.mjs'),
      ],
    }),
  ],
});
