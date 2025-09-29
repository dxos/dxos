//
// Copyright 2025 DXOS.org
//

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { resolveReporterConfig } from '../../vitest.base.config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// NOTE: This config is merged with the storybook vite final config.
// TODO(wittjosiah): Consider moving this into a project if other packages start to run tests in browser as well.
export default defineConfig({
  plugins: [
    storybookTest({
      configDir: path.join(dirname, '.storybook'),
      // The --ci flag will skip prompts and not open a browser.
      storybookScript: 'storybook dev --ci',
      tags: {
        include: ['test'],
        exclude: ['experimental'],
      },
    }),
  ],
  test: {
    ...resolveReporterConfig({ browserMode: true, cwd: dirname }),
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
    poolOptions: {
      threads: {
        isolate: true,
      },
    },
    setupFiles: ['./.storybook/vitest.setup.ts'],
  },
});
