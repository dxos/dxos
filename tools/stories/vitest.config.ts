//
// Copyright 2025 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { baseConfig } from '../../vitest.shared';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

/** 
 * https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#example-configuration-files
 */
export default mergeConfig(
  baseConfig({ cwd: __dirname }),
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      projects: [
        {
          plugins: [
            storybookTest({
              configDir: path.join(dirname, '.storybook'),
              storybookScript: 'pnpm -w nx storybook stories --ci',
            })
          ],
          test: {
            name: 'storybook',
            browser: {
              enabled: true,
              provider: 'playwright',
              headless: true,
              instances: [{ browser: 'chromium' }],
            },
            setupFiles: [
              './.storybook/vitest.setup.ts',
            ],
          },
        },
      ],
    },
  }),
);
