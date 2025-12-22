//
// Copyright 2022 DXOS.org
//

import { resolve } from 'node:path';
import { defineConfig } from 'vite';

import { ThemePlugin } from '@dxos/ui-theme/plugin';

export default defineConfig({
  plugins: [
    ThemePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
      ],
    }),
  ],
});
