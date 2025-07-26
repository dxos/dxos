//
// Copyright 2024 DXOS.org
//

// import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

/**
 * Config for the vitest vscode extension.
 */
export default defineConfig({
  esbuild: {
    target: 'es2020',
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
    // TODO(dmaretskyi): Disabled due to an ESM error in the vscode extension.
    // tsconfigPaths({
    //   projects: [new URL('./tsconfig.paths.json', import.meta.url).pathname],
    // }),
  ],
});

// TODO(dmaretskyi): Migrate to https://vitest.dev/guide/projects once it is stable.
// eslint-disable-next-line no-console
console.log({
  proj: new URL('./tsconfig.paths.json', import.meta.url).pathname,
});
