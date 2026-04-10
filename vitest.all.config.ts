//
// Copyright 2024 DXOS.org
//

import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vitest/config';

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

    react(),
  ],
}));
