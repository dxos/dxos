//
// Copyright 2025 DXOS.org
//

import { resolve } from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';

import { baseConfig } from '../../../vitest.base.config';

export default mergeConfig(
  baseConfig({ cwd: __dirname }),
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/vitest-setup.ts'],
    },
    plugins: [
      ThemePlugin({
        root: __dirname,
        content: [resolve(__dirname, './src')],
      }),
    ],
  }),
);
