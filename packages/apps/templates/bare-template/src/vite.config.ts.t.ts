//
// Copyright 2022 DXOS.org
//

import { defineTemplate, Imports, text } from '@dxos/plate';
import config from './config.t';
// import { uiDeps } from './package.json.t';

export default defineTemplate<typeof config>(({ input, defaultOutputFile }) => {
  const { react, name, dxosUi, pwa, monorepo } = input;
  const imports = new Imports();
  const reactPlugin = imports.lazy('react', '@vitejs/plugin-react', { isDefault: true });
  const ThemePlugin = imports.lazy('ThemePlugin', '@dxos/react-components/plugin');
  const VitePWA = imports.lazy('VitePWA', 'vite-plugin-pwa');
  const resolve = imports.lazy('resolve', monorepo ? 'node:path' : 'path');

  const monorepoConfig = text`
    optimizeDeps: {
      force: true,
      include: [
        '@dxos/client',
        ${react ? "'@dxos/react-client'," : ''}
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
      outDir: 'out/app/${name}',
      commonjsOptions: {
        include: [
          /packages/,
          /node_modules/
        ]
      }
    },
    `;
  const basicConfig = text`
    build: {
      outDir: 'out/app/${name}'
    },
    `;
  return /* javascript */ text`
  import { defineConfig } from 'vite';
  import { ConfigPlugin } from '@dxos/config/vite-plugin';
  ${() => imports.render(defaultOutputFile)}

  // https://vitejs.dev/config/
  export default defineConfig({
    base: '', // Ensures relative path to assets.
    server: {
      host: true
    },
    ${input.monorepo ? monorepoConfig : basicConfig}
    plugins: [
      ConfigPlugin(),
      ${react ? `${reactPlugin()}(),` : ''}
      ${
        dxosUi
          ? `${ThemePlugin()}({
        content: [
          ${resolve()}(__dirname, './index.html'),
          ${resolve()}(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
          ${dxosUi && text`
          ${resolve()}(__dirname, 'node_modules/@dxos/react-appkit/dist/**/*.mjs')`}
        ]
      }),`
          : ''
      }
      ${
        pwa
          ? `${VitePWA()}({
        registerType: 'autoUpdate',
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
});
