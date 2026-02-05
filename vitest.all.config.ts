//
// Copyright 2024 DXOS.org
//

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
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

    // We don't care about react but we want the SWC transforers.
    react({
      tsDecorators: true,
      plugins: [
        [
          '@dxos/swc-log-plugin',
          {
            to_transform: [
              {
                name: 'log',
                package: '@dxos/log',
                param_index: 2,
                include_args: false,
                include_call_site: true,
                include_scope: true,
              },
              {
                name: 'invariant',
                package: '@dxos/invariant',
                param_index: 2,
                include_args: true,
                include_call_site: false,
                include_scope: true,
              },
              {
                name: 'Context',
                package: '@dxos/context',
                param_index: 1,
                include_args: false,
                include_call_site: false,
                include_scope: false,
              },
            ],
          },
        ],
      ],
    }),
  ],
}));
