//
// Copyright 2025 DXOS.org
//

import storybookTest from '@storybook/addon-vitest/vitest-plugin';
import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.base.config';

export default mergeConfig(
  baseConfig({ cwd: __dirname, env: 'chromium' }),
  // @ts-ignore
  defineConfig({
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
          storybookTest({
            tags: { include: ['test'] },
          }),
        ],
      }],
    },
  }));
