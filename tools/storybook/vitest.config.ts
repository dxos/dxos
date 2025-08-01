//
// Copyright 2025 DXOS.org
//

import { join } from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { baseConfig } from '../../vitest.storybook.config';

console.log(join(__dirname, './.storybook'));

export default mergeConfig(
  baseConfig({ cwd: __dirname }),
  defineConfig({
    plugins: [
      // https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: join(__dirname, './.storybook'),
        // tags: {
        // include: ['stable'],
        // exclude: ['experimental'],
        // },
      }),
    ],
    test: {
      setupFiles: ['./.storybook/vitest.setup.ts'],
      projects: [
        {
          // moon run storybook:test-ci
          test: {
            name: 'ci',
            environment: 'node',
          },
        },
        {
          // moon run storybook:test-browser
          test: {
            // https://vitest.dev/guide/browser
            name: 'browser',
            browser: {
              enabled: true,
              instances: [{ browser: 'chromium' }],
            },
          },
        },
      ],
    },
  }),
);
