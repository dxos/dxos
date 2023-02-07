import { defineConfig } from 'vite';
import { ConfigPlugin } from '@dxos/config/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react';
import { ThemePlugin } from '@dxos/react-components/plugin';
import { resolve } from 'node:path';
import { VitePWA } from 'vite-plugin-pwa';

import packageJson from './package.json';

const env = (value?: string) => (value ? `"${value}"` : undefined);
const DX_RELEASE = process.env.NODE_ENV === 'production' ? `@dxos/braneframe-app@${packageJson.version}` : undefined;

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  server: {
    host: true,
    https:
      process.env.HTTPS === 'true'
        ? {
            key: './key.pem',
            cert: './cert.pem'
          }
        : false
  },
  define: {
    'process.env.LOG_FILTER': env(process.env.LOG_FILTER),
    'process.env.LOG_BROWSER_PREFIX': env(process.env.LOG_BROWSER_PREFIX),
    'process.env.DX_VAULT': env(process.env.DX_VAULT),
    'process.env.DX_ENVIRONMENT': env(process.env.DX_ENVIRONMENT),
    'process.env.DX_RELEASE': env(DX_RELEASE),
    'process.env.SENTRY_DESTINATION': env(process.env.SENTRY_DESTINATION),
    'process.env.TELEMETRY_API_KEY': env(process.env.TELEMETRY_API_KEY),
    'process.env.IPDATA_API_KEY': env(process.env.IPDATA_API_KEY)
  },
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/config',
      '@dxos/keys',
      '@dxos/log',
      '@dxos/protocols',
      '@dxos/protocols/proto/dxos/client',
      '@dxos/protocols/proto/dxos/client/services',
      '@dxos/protocols/proto/dxos/config',
      '@dxos/protocols/proto/dxos/echo/feed',
      '@dxos/protocols/proto/dxos/echo/model/document',
      '@dxos/protocols/proto/dxos/echo/object',
      '@dxos/protocols/proto/dxos/halo/credentials',
      '@dxos/protocols/proto/dxos/halo/invitations',
      '@dxos/protocols/proto/dxos/halo/keys',
      '@dxos/protocols/proto/dxos/mesh/bridge',
      '@dxos/protocols/proto/dxos/rpc'
    ],
    esbuildOptions: {
      // TODO(wittjosiah): Remove.
      plugins: [
        {
          name: 'yjs',
          setup: ({ onResolve }) => {
            onResolve({ filter: /yjs/ }, () => {
              return { path: require.resolve('yjs').replace('.cjs', '.mjs') };
            });
          }
        }
      ]
    }
  },
  build: {
    commonjsOptions: {
      include: [/packages/, /node_modules/]
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-router-dom', 'react-dom']
        }
      }
    }
  },
  plugins: [
    ConfigPlugin(),
    ReactPlugin(),
    ThemePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, 'node_modules/@dxos/react-appkit/dist/**/*.mjs')
      ]
    }),
    VitePWA({
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000
      },
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Braneframe',
        short_name: 'Braneframe',
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
    })
  ]
});
