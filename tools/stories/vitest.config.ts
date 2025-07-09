//
// Copyright 2025 DXOS.org
//

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { searchForWorkspaceRoot } from 'vite';
import { defineConfig, mergeConfig } from 'vitest/config';

import { join } from 'node:path';

const rootDir = searchForWorkspaceRoot(process.cwd());
export default defineConfig({
  test: {
    projects: [
      {
        // pnpm -w nx test stories --project=unit
        test: {
          name: 'unit',
          environment: 'node',
        },
      },
      mergeConfig(
        defineConfig({}),
        // baseConfig({ cwd: __dirname }),
        defineConfig({
          root: join(__dirname, '../../'),
          // pnpm vitest run --project browser
          test: {
            include: [
              //
              // '../../packages/*/*/src/**/*.test.tsx',
              'packages/devtools/*/src/**/*.test.tsx',
            ],
            // setupFiles: ['./.storybook/vitest.setup.ts'],
            // https://vitest.dev/guide/browser
            name: 'browser',
            browser: {
              enabled: true,
              instances: [{ browser: 'chromium' }],
            },
          },
          plugins: [
            ThemePlugin({
              root: __dirname,
              content: [
                join(__dirname, './index.html'),
                join(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
                join(rootDir, '/packages/devtools/*/src/**/*.{js,ts,jsx,tsx}'),
                join(rootDir, '/packages/experimental/*/src/**/*.{js,ts,jsx,tsx}'),
                join(rootDir, '/packages/plugins/*/src/**/*.{js,ts,jsx,tsx}'),
                join(rootDir, '/packages/sdk/*/src/**/*.{js,ts,jsx,tsx}'),
                join(rootDir, '/packages/ui/*/src/**/*.{js,ts,jsx,tsx}'),
              ],
            }),
          ],
        }),
      ),
    ],
  },
});
