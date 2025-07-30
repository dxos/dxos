//
// Copyright 2025 DXOS.org
//

import storybookTest from '@storybook/addon-vitest/vitest-plugin';
import { defineConfig } from 'vitest/config';
import { stories } from './.storybook/paths';

export default defineConfig({
  test: {
    projects: [{
      test: {
        name: 'storybook',
        // Enable browser mode
        browser: {
          enabled: true,
          // Make sure to install Playwright
          provider: 'playwright',
          headless: true,
          instances: [{ browser: 'chromium' }],
        },
        setupFiles: ['./.storybook/vitest.setup.ts'],
      },
      plugins: [
        // @ts-ignore
        storybookTest(),
        {
          name: 'vite-plugin-storybook-test-dxos-imports',
          config: () => ({
            test: {
              include: stories,
              exclude: [],
            },
          })
        }
      ],
    }],
  },
});
