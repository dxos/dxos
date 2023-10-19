//
// Copyright 2022 DXOS.org
//

// import { sentryVitePlugin } from '@sentry/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react';
import { join, resolve } from 'node:path';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { VitePluginFonts } from 'vite-plugin-fonts';
import mkcert from 'vite-plugin-mkcert';

import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

// @ts-ignore
// NOTE: Vite requires uncompiled JS.
import { osThemeExtension, consoleThemeExtension } from './theme-extensions';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

/**
 * https://vitejs.dev/config
 */
export default defineConfig({
  server: {
    host: true,
    https: process.env.HTTPS === 'true',
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

  plugins: [
    mkcert(),

    ConfigPlugin({
      env: ['DX_ENVIRONMENT', 'DX_IPDATA_API_KEY', 'DX_SENTRY_DESTINATION', 'DX_TELEMETRY_API_KEY', 'DX_VAULT'],
    }),

    // Directories to scan for Tailwind classes.
    ThemePlugin({
      root: __dirname,
      content: [resolve(__dirname, './index.html'), resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}')],
      extensions: [osThemeExtension, consoleThemeExtension],
    }),

    // https://github.com/preactjs/signals/issues/269
    ReactPlugin({ jsxRuntime: 'classic' }),

    /**
     * Bundle fonts.
     * https://fonts.google.com
     * https://www.npmjs.com/package/vite-plugin-fonts
     */
    VitePluginFonts({
      google: {
        injectTo: 'head-prepend',
        families: ['DM Sans', 'DM Mono'],
      },

      custom: {
        preload: true,
        injectTo: 'head-prepend',
        families: [
          {
            name: 'Sharp Sans',
            src: './node_modules/@dxos/react-icons/assets/fonts/sharp-sans/*.ttf',
          },
        ],
      },
    }),

    // https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite
    // https://www.npmjs.com/package/@sentry/vite-plugin
    // TODO(wittjosiah): Create sentry project.
    // sentryVitePlugin({
    //   org: 'dxos',
    //   project: 'kube-console',
    //   sourcemaps: {
    //     assets: './packages/experimental/kube-console/out/console/**'
    //   },
    //   authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN,
    //   dryRun: process.env.DX_ENVIRONMENT !== 'production'
    // }),

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
