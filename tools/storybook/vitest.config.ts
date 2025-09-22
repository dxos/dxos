//
// Copyright 2025 DXOS.org
//

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// TODO(burdon): Factor out common components.

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

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
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
    setupFiles: ['./.storybook/vitest.setup.ts'],
  },
});
