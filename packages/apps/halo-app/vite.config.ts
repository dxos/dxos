//
// Copyright 2022 DXOS.org
//

import react from '@vitejs/plugin-react';
import { existsSync, mkdir, mkdirSync, rm, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { themePlugin } from '@dxos/react-ui/plugin';
import { dxosPlugin } from '@dxos/vite-plugin';

import packageJson from './package.json';

const env = (value?: string) => (value ? `"${value}"` : undefined);
const DX_RELEASE = process.env.NODE_ENV === 'production' ? `@dxos/halo-app@${packageJson.version}` : undefined;

const manualChunks = {
  vendor: ['react', 'react-router-dom', 'react-dom'],
  phosphor: ['phosphor-react']
};

// TODO(wittjosiah): Try again after ESM switch.
// From https://sambitsahoo.com/blog/vite-code-splitting-that-works.html
const _renderChunks = (deps: Record<string, string>) => {
  const chunks = {};
  const manual = Object.keys(manualChunks)
    .map((key) => manualChunks[key])
    .flat();

  Object.keys(deps).forEach((key) => {
    if (manual.includes(key)) return;
    chunks[key] = [key];
  });

  return chunks;
};

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensure relative path to assets.
  server: {
    host: true,
    port: 3967
  },
  define: {
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
      '@dxos/async',
      '@dxos/client',
      '@dxos/keys',
      '@dxos/log',
      '@dxos/config',
      '@dxos/metagraph',
      '@dxos/protocols',
      '@dxos/react-appkit',
      '@dxos/react-async',
      '@dxos/react-client',
      '@dxos/react-ui',
      '@dxos/react-uikit',
      '@dxos/rpc',
      '@dxos/network-manager',
      '@dxos/rpc-tunnel',
      '@dxos/sentry',
      '@dxos/telemetry',
      '@dxos/util'
    ]
  },
  build: {
    // TODO(wittjosiah): Remove.
    minify: false,
    commonjsOptions: {
      include: [/packages/, /node_modules/]
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        vault: resolve(__dirname, 'vault.html')
      },
      output: {
        manualChunks: {
          ...manualChunks
        }
      }
    }
  },
  plugins: [
    dxosPlugin(),
    themePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/react-ui/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-uikit/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-appkit/dist/**/*.mjs')
      ]
    }),
    react(),
    VitePWA({
      // TODO(wittjosiah): Bundle size is massive.
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'HALO',
        short_name: 'HALO',
        description: 'DXOS HALO Application',
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
    }),
    // https://www.bundle-buddy.com/rollup
    {
      name: 'bundle-buddy',
      buildEnd() {
        const deps: { source: string; target: string }[] = [];
        for (const id of this.getModuleIds()) {
          const m = this.getModuleInfo(id);
          if (m != null && !m.isExternal) {
            for (const target of m.importedIds) {
              deps.push({ source: m.id, target });
            }
          }
        }

        const outDir = join(__dirname, 'out');
        if (!existsSync(outDir)) {
          mkdirSync(outDir);
        }
        writeFileSync(join(outDir, 'graph.json'), JSON.stringify(deps, null, 2));
      }
    }
  ],
  worker: {
    format: 'es',
    plugins: [dxosPlugin()]
  }
});
