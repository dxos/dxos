//
// Copyright 2022 DXOS.org
//

import ReactPlugin from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { VitePluginFonts } from 'vite-plugin-fonts';
import { crx as chromeExtensionPlugin } from '@crxjs/vite-plugin';

import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/react-components/plugin';
import { kaiThemeExtension } from '@dxos/kai/theme-extensions';
import { osThemeExtension } from '@dxos/react-ui/theme-extensions';

import manifest from './manifest.json';

const env = (value?: string) => (value ? `"${value}"` : undefined);

// https://vitejs.dev/config/
export default defineConfig({
  base: '', // Ensures relative path to assets.
  optimizeDeps: {
    force: true,
    include: [
      '@dxos/async',
      '@dxos/client',
      '@dxos/client-services',
      '@dxos/codec-protobuf',
      '@dxos/config',
      '@dxos/credentials',
      '@dxos/debug',
      '@dxos/devtools',
      '@dxos/kai',
      '@dxos/log',
      '@dxos/network-manager',
      '@dxos/protocols',
      '@dxos/react-async',
      '@dxos/react-client',
      '@dxos/react-components',
      '@dxos/react-toolkit',
      '@dxos/react-ui',
      '@dxos/rpc'
    ]
  },
  build: {
    commonjsOptions: {
      include: [/packages/, /node_modules/]
    },
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'panel.html')
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-router-dom', 'react-dom']
        }
      }
    }
  },
  plugins: [
    ReactPlugin(),

    ConfigPlugin(),

    ThemePlugin({
      content: [
        resolve(__dirname, './*.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/devtools/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/kai/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-components/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui/dist/**/*.mjs')
      ],
      extensions: [osThemeExtension, kaiThemeExtension]
    }),

    chromeExtensionPlugin({ manifest })

    // Add "style-src 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'unsafe-inline' https://fonts.googleapis.com" in content_security_policy in manifest.json when uncommenting this.
    /**
     * Bundle fonts.
     * https://fonts.google.com
     * https://www.npmjs.com/package/vite-plugin-fonts
     */
    // VitePluginFonts({
    //   google: {
    //     injectTo: 'head-prepend',
    //     // prettier-ignore
    //     families: [
    //       'Roboto',
    //       'Roboto Mono',
    //       'DM Sans',
    //       'DM Mono',
    //       'Montserrat'
    //     ]
    //   },

    //   custom: {
    //     preload: false,
    //     injectTo: 'head-prepend',
    //     families: [
    //       {
    //         name: 'Sharp Sans',
    //         src: 'node_modules/@dxos/assets/assets/fonts/sharp-sans/*.ttf'
    //       }
    //     ]
    //   }
    // })
  ]
});
