import { defineConfig } from 'vite';
import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { VaultPlugin } from '@dxos/vault/vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
  },
  build: {
    outDir: 'out/arena-app',
  },

  plugins: [
    VaultPlugin(),
    ConfigPlugin(),
    react({ jsxRuntime: 'classic' }),
    ThemePlugin({
      root: __dirname,
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@braneframe/plugin-*/dist/lib/**/*.mjs'),

        // TODO(burdon): Reconcile vs. direct deps.
        resolve(
          __dirname,
          './node_modules/@braneframe/plugin-grid/node_modules/@dxos/react-ui-mosaic/dist/lib/**/*.mjs',
        ),
        resolve(
          __dirname,
          './node_modules/@braneframe/plugin-stack/node_modules/@dxos/react-ui-stack/dist/lib/**/*.mjs',
        ),
        resolve(
          __dirname,
          './node_modules/@braneframe/plugin-navtree/node_modules/@dxos/react-ui-navtree/dist/lib/**/*.mjs',
        ),

        // TODO(burdon): Hoisted as direct dependencies.
        resolve(__dirname, './node_modules/@dxos/devtools/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui-mosaic/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui-table/dist/lib/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/vault/dist/lib/**/*.mjs'),
      ],
    }),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000,
      },
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'arena-app',
        short_name: 'arena-app',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'icons/icon-32.png',
            sizes: '32x32',
            type: 'image/png',
          },
          {
            src: 'icons/icon-256.png',
            sizes: '256x256',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
