//
// Copyright 2025 DXOS.org
//

import { defineConfig, mergeConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { baseConfig } from '../../vitest.base.config';

export default mergeConfig(
  baseConfig({ cwd: __dirname }),
  defineConfig({
    plugins: [
      // https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        tags: {
          include: ['stable'],
          exclude: ['experimental'],
        },
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
            },
          },
        },
      ],
    },
  }),
);
