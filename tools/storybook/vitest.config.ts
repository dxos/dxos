//
// Copyright 2025 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

// TODO(burdon): Factor out common components.
import { baseConfig } from '../../vitest.storybook.config';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  baseConfig({ cwd: dirname }),
  defineConfig({
    optimizeDeps: {
      noDiscovery: true,
      include: [],
    },
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
  }),
);
