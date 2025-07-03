//
// Copyright 2025 DXOS.org
//

import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react-swc';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

/** 
 * Storybook Vitest configuration
 * https://vitest.dev/config
 */
export default defineConfig({
  plugins: [
    react(), 
    storybookTest({
      configDir: path.join(dirname, '.storybook'),
      storybookScript: 'pnpm -w nx storybook stories --ci',
    }),
  ],
  test: {
    browser: {
      headless: true,
      instances: [{ 
        browser: 'chromium',
      }],
      provider: 'playwright',
    },
    coverage: {
      reporter: ['text', 'html'],
      provider: 'v8',
    },
    environment: 'jsdom',
    globals: true,
    setupFiles: [
      './.storybook/vitest.setup.ts',
    ],
  },
});
