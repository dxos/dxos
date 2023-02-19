//
// Copyright 2022 DXOS.org
//

import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { ThemePlugin } from '@dxos/react-components/plugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    ThemePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/react-components/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-appkit/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-list/dist/**/*.mjs')
      ]
    })
  ]
})