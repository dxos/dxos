//
// Copyright 2022 DXOS.org
//

import { plate } from '@dxos/plate';
import template from './template.t';
// import { uiDeps } from './package.json.t';

export default template.define.script({
  content: ({ input, imports }) => {
    const { react, name, dxosUi, pwa, monorepo } = input;
    const reactPlugin = imports.use('react', '@vitejs/plugin-react', { isDefault: true });
    const ThemePlugin = imports.use('ThemePlugin', '@dxos/aurora-theme/plugin');
    const VitePWA = imports.use('VitePWA', 'vite-plugin-pwa');
    const resolve = imports.use('resolve', monorepo ? 'node:path' : 'path');

    const monorepoConfig = plate`
    optimizeDeps: {
      force: true,
      include: [
        '@dxos/client',
        ${react ? "'@dxos/react-client', '@dxos/react-appkit', '@dxos/aurora', '@dxos/aurora-theme'," : ''}
        '@dxos/config'
      ],
      esbuildOptions: {
        // TODO(wittjosiah): Remove.
        plugins: [
          {
            name: 'yjs',
            setup: ({ onResolve }) => {
              onResolve({ filter: /yjs/ }, () => {
                return { path: require.resolve('yjs').replace('.cjs', '.mjs') }
              })
            }
          }
        ]
      }
    },
    build: {
      outDir: 'out/${name}',
      commonjsOptions: {
        include: [
          /packages/,
          /node_modules/
        ]
      }
    },
    `;
    const basicConfig = plate`
    build: {
      outDir: 'out/${name}'
    },
    `;
    return /* javascript */ plate`
  import { defineConfig } from 'vite';
  import { ConfigPlugin } from '@dxos/config/vite-plugin';
  import { VaultPlugin } from '@dxos/vault/vite-plugin';
  ${imports}

  // https://vitejs.dev/config/
  export default defineConfig({
    server: {
      host: true
    },
    ${input.monorepo ? monorepoConfig : basicConfig}
    plugins: [
      VaultPlugin(),
      ConfigPlugin(),
      ${react
        // https://github.com/preactjs/signals/issues/269
        ?`${reactPlugin()}({ jsxRuntime: 'classic' }),`
        : ''}
      ${
        dxosUi
          ? plate`${ThemePlugin}({
        content: [
          ${resolve}(__dirname, './index.html'),
          ${resolve}(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
          ${
            dxosUi &&
            plate`
          ${resolve}(__dirname, 'node_modules/@dxos/aurora/dist/**/*.mjs'),
          ${resolve}(__dirname, 'node_modules/@dxos/aurora-theme/dist/**/*.mjs'),
          ${resolve}(__dirname, 'node_modules/@dxos/react-appkit/dist/**/*.mjs')`
          }
        ]
      }),`
          : ''
      }
      ${
        pwa
          ? plate`${VitePWA}({
        registerType: 'prompt',
        workbox: {
          maximumFileSizeToCacheInBytes: 30000000
        },
        includeAssets: ['favicon.ico'],
        manifest: {
          name: '${name}',
          short_name: '${name}',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'icons/icon-32.png',
              sizes: '32x32',
              type: 'image/png'
            },
            {
              src: 'icons/icon-256.png',
              sizes: '256x256',
              type: 'image/png'
            }
          ]
        }
      })`
          : ''
      }
    ]
  });
  `;
  },
});
