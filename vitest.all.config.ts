//
// Copyright 2024 DXOS.org
//

import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vitest/config';

import { DxosLogPlugin } from '@dxos/vite-plugin-log';

/**
 * Config for the vitest vscode extension.
 */
export default defineConfig(async () => ({
  esbuild: {
    target: 'esnext',
  },
  test: {
    environment: 'node',
    include: [
      '**/src/**/*.test.{ts,tsx}',
      '**/test/**/*.test.{ts,tsx}',
      '!**/src/**/*.browser.test.{ts,tsx}',
      '!**/test/**/*.browser.test.{ts,tsx}',
    ],
    exclude: [
      '.moon/*',
      '**/node_modules/*',
      '**/dist/*',
      '**/build/*',
      '**/coverage/*',
      '**/dist/*',
      '**/build/*',
      '**/coverage/*',
    ],
  },
  plugins: [
    // Vitest extension for VSCode doesnt support ESM.
    await import('@dxos/vite-plugin-import-source').then((m) => m.default()),

    // Log-meta injection only — no dev file sink (vitest is a test runner, not a dev server).
    // Replaces the legacy `@dxos/swc-log-plugin` that used to run inside `react()` below.
    DxosLogPlugin({ logToFile: false }),

    // We don't care about react but we want the SWC transformers.
    react({
      tsDecorators: true,
    }),
  ],
}));
