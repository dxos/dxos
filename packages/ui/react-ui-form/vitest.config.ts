//
// Copyright 2024 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';

import { baseConfig } from '../../../vitest.shared';
import { resolve } from 'node:path';

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
    ]
  }),
);
