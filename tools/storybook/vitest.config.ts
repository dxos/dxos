//
// Copyright 2025 DXOS.org
//

import { join } from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

// TODO(burdon): Factor out common components.
import { baseConfig } from '../../vitest.storybook.config';

export default mergeConfig(
  baseConfig({ cwd: __dirname }),
  defineConfig({
    plugins: [
      // https://storybook.js.org/docs/writing-tests/in-ci
      // https://storybook.js.org/docs/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: join(__dirname, '.storybook'),
        storybookScript: 'moon run storybook:serve',
        tags: {
          include: ['test'],
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
          test: {
            // moon run storybook:test-ci -- --project=browser
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
