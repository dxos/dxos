//
// Copyright 2024 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';

import { createNodeProject, createStorybookProject, resolveReporterConfig } from '../../../vitest.base.config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    ...resolveReporterConfig({ cwd: dirname }),
    projects: [
      createNodeProject({
        environment: 'jsdom',
        setupFiles: ['./src/vitest-setup.ts'],
        plugins: [
          ThemePlugin({
            root: dirname,
            content: [path.resolve(dirname, './src')],
          }),
        ],
      }),
      createStorybookProject(dirname),
    ]
  },
});
