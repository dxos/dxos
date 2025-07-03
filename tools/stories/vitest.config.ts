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
 */
export default defineConfig({
  plugins: [
    react(), 
    storybookTest({
      configDir: path.join(dirname, 'config/all'),
      storybookScript: 'pnpm -w nx storybook stories --ci',
    }),
  ],
  test: {
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
      provider: 'v8',
    },
    include: ['**/*.test.{js,jsx,ts,tsx}'],
    setupFiles: ['./.storybook/vitest.setup.ts'],
    environment: 'jsdom',
    browser: {
      provider: 'playwright',
      headless: true,
      instances: [{ 
        browser: 'chromium',
      }],
    }
  },
});
