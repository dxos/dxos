import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

//
// Config for the vitest vscode extension.
//

// TODO(dmaretskyi): Migrate to https://vitest.dev/guide/projects once its stable.

console.log({
  proj: new URL('./tsconfig.paths.json', import.meta.url).pathname,
});

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
  },
  plugins: [
    tsconfigPaths({
      projects: [new URL('./tsconfig.paths.json', import.meta.url).pathname],
    }),
  ],
});
