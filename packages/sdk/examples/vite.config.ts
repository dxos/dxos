//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig, searchForWorkspaceRoot } from 'vite';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
    https:
      process.env.HTTPS === 'true'
        ? {
            key: './key.pem',
            cert: './cert.pem',
          }
        : false,
    fs: {
      allow: [
        // TODO(wittjosiah): Not detecting pnpm-workspace?
        //   https://vitejs.dev/config/server-options.html#server-fs-allow
        searchForWorkspaceRoot(process.cwd()),
      ],
    },
  },
  build: {
    sourcemap: true,
  },
  resolve: {
    alias: {
      'node-fetch': 'isomorphic-fetch',
    },
  },
  plugins: [
    ThemePlugin({
      root: __dirname,
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/react-ui/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui-theme/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-client/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-shell/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@braneframe/plugin-*/dist/lib/**/*.mjs'),
      ],
    }),
    // https://github.com/preactjs/signals/issues/269
    ReactPlugin({ jsxRuntime: 'classic' }),
  ],
});
