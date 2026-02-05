//
// Copyright 2024 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ThemePlugin } from '@dxos/ui-theme/plugin';

import { createConfig } from '../../../vitest.base.config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default createConfig({
  dirname,
  node: {
    environment: 'jsdom',
    setupFiles: ['./src/vitest-setup.ts'],
    plugins: [
      ThemePlugin({
        root: dirname,
        content: [path.resolve(dirname, './src')],
      }),
    ]
  },
  storybook: true,
});
