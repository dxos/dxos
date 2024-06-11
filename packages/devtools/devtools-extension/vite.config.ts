//
// Copyright 2022 DXOS.org
//

// import { sentryVitePlugin } from '@sentry/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';
// import { VitePluginFonts } from 'vite-plugin-fonts';
import { crx as ChromeExtensionPlugin } from '@crxjs/vite-plugin';
import TopLevelAwaitPlugin from 'vite-plugin-top-level-await';
import WasmPlugin from 'vite-plugin-wasm';

import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/react-ui-theme/plugin';

import packageJson from './package.json';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // Everything mentioned in manifest.json will be bundled.
        // We need to specify the 'panel' entry point here because it's not mentioned in manifest.json.
        panel: resolve(__dirname, 'panel.html'),
      },
      output: {
        sourcemap: true,
      },
    },
  },
  worker: {
    format: 'es',
    plugins: () => [TopLevelAwaitPlugin(), WasmPlugin()],
  },
  plugins: [
    ConfigPlugin(),

    ThemePlugin({
      root: __dirname,
      content: [resolve(__dirname, './*.html'), resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}')],
    }),

    TopLevelAwaitPlugin(),
    WasmPlugin(),

    // https://github.com/preactjs/signals/issues/269
    ReactPlugin({ jsxRuntime: 'classic' }),

    ChromeExtensionPlugin({
      manifest: {
        manifest_version: 3,
        version: packageJson.version,
        author: 'DXOS.org',
        name: 'DXOS Client Developer Tools',
        short_name: 'DXOS DevTools',
        description: 'Debugging tools for DXOS Client in the Chrome developer console.',
        icons: {
          '48': 'assets/img/icon-dxos-48.png',
          '128': 'assets/img/icon-dxos-128.png',
        },
        action: {
          default_icon: 'assets/img/icon-dxos-48.png',
          default_title: 'DXOS',
          default_popup: '/popup.html',
        },
        content_security_policy: {
          extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
        },
        sandbox: {
          pages: ['/sandbox.html'],
        },
        devtools_page: '/main.html',
        background: {
          service_worker: '/src/background.ts',
        },
        content_scripts: [
          {
            matches: ['http://*/*', 'https://*/*'],
            js: ['/src/content.ts'],
            run_at: 'document_start',
          },
        ],
      },
    }),

    // https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite
    // https://www.npmjs.com/package/@sentry/vite-plugin
    // TODO(wittjosiah): Seems to have some conflict with the chrome extension plugin.
    //   If only one is included it builds but fails with both.
    // sentryVitePlugin({
    //   org: 'dxos',
    //   project: 'devtools-extension',
    //   sourcemaps: {
    //     assets: './packages/devtools/devtools-extension/out/devtools-extension/**'
    //   },
    //   authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN,
    //   disable: process.env.DX_ENVIRONMENT !== 'production'
    // })

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
    //         src: 'node_modules/@dxos/brand/assets/fonts/sharp-sans/*.ttf'
    //       }
    //     ]
    //   }
    // })

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
      },
    },
  ],
});
