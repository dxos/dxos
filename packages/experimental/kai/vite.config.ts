//
// Copyright 2022 DXOS.org
//

import { Plugin } from 'vite'
import { sentryVitePlugin } from '@sentry/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { VitePluginFonts } from 'vite-plugin-fonts';
import mkcert from 'vite-plugin-mkcert';

import { ThemePlugin } from '@dxos/react-components/plugin';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

// @ts-ignore
// NOTE: Vite requires uncompiled JS.
import { osThemeExtension, kaiThemeExtension } from './theme-extensions';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { PluginContext } from 'rollup';

/**
 * https://vitejs.dev/config
 */
export default defineConfig({
  server: {
    host: true,
    https: process.env.HTTPS === 'true'
  },

  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          faker: ['faker'],
          highlighter: ['react-syntax-highlighter'],
          // monaco: ['monaco-editor', '@monaco-editor/react'],
          vendor: ['react-dom', 'react-router-dom']
        }
      }
    }
  },

  plugins: [
    importMaps({
      packages: {
        'react': { cjs: true, buildOnly: true },
        '@dxos/client': {},
        '@dxos/react-client': {},
        '@dxos/react-ui': {},
      }
    }),

    mkcert(),

    // TODO(burdon): Document.
    ConfigPlugin({
      env: ['DX_ENVIRONMENT', 'DX_IPDATA_API_KEY', 'DX_SENTRY_DESTINATION', 'DX_TELEMETRY_API_KEY', 'DX_VAULT']
    }),

    // Directories to scan for Tailwind classes.
    ThemePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/chess-app/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/kai-frames/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/mosaic/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/plexus/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-appkit/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-components/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-composer/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-list/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui/dist/**/*.mjs')
      ],
      extensions: [osThemeExtension, kaiThemeExtension]
    }),

    ReactPlugin(),

    // To reset, unregister service worker using devtools.
    VitePWA({
      // TODO(wittjosiah): Remove.
      selfDestroying: true,
      workbox: {
        maximumFileSizeToCacheInBytes: 30000000
      },
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'DXOS Kai',
        short_name: 'Kai',
        description: 'DXOS Kai Demo',
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

    /**
     * Bundle fonts.
     * https://fonts.google.com
     * https://www.npmjs.com/package/vite-plugin-fonts
     */
    VitePluginFonts({
      google: {
        injectTo: 'head-prepend',
        // prettier-ignore
        families: [
          'Roboto',
          'Roboto Mono',
          'DM Sans',
          'DM Mono',
          'Montserrat'
        ]
      },

      custom: {
        preload: false,
        injectTo: 'head-prepend',
        families: [
          {
            name: 'Sharp Sans',
            src: 'node_modules/@dxos/react-icons/assets/fonts/sharp-sans/*.ttf'
          }
        ]
      }
    }),

    // https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite
    // ...(process.env.NODE_ENV === 'production'
    //   ? [
    //       sentryVitePlugin({
    //         org: 'dxos',
    //         project: 'kai',
    //         include: './out/kai',
    //         authToken: process.env.SENTRY_RELEASE_AUTH_TOKEN
    //       })
    //     ]
    //   : []),

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
  ]
});

export type ImportMap = {
  imports?: Record<string, string>
  scope?: Record<string, string>
}

type Options = {
  packages: Record<string, {
    cjs?: boolean
    buildOnly?: boolean
  }>
}

export function importMaps({ packages }: Options): Plugin {
  // start with /node_modules/.vite/deps to fool the import compat plugin
  const prefix = '/@import-mapped/'
  const proxyModulePrefix = `/0${prefix}cjs-proxy/`

  let pluginCtx!: PluginContext;
  let commandRun!: 'build' | 'serve';
  return {
    name: 'vite-plugin-import-maps',
    enforce: 'pre',
    buildStart() {
      pluginCtx = this;
    },
    config(_, { command }) {
      commandRun = command;
      return {}
    },
    resolveId(id, importer) {
      if (packages[id] && (!packages[id].buildOnly || commandRun === 'build')) {
        if(!packages[id].cjs || importer?.startsWith(proxyModulePrefix)) {
          return {
            id: prefix + id,
            external: 'absolute',
          }
        } else {
          return {
            id: proxyModulePrefix + id,
            syntheticNamedExports: '__syntheticExports'
          }
        }
      }
    },
    load(id) {
      if(id.startsWith(proxyModulePrefix)) {
        const name = id.replace(proxyModulePrefix, '');
        return `import { default as __syntheticExports } from "${name}"; export { __syntheticExports, __syntheticExports as default };`
      }
    },
    transformIndexHtml: {
      enforce: 'pre',
      async transform(html) {
        const processedImportMap: Required<ImportMap> = {
          imports: {
            ...Object.fromEntries(await Promise.all(Object.entries(packages).map(async ([name, { }]) => {
              let resultingUrl: string;


              if (commandRun === 'build') {
                const { id } = (await pluginCtx.resolve(name, undefined, { skipSelf: true }))!
                const chunkId = pluginCtx.emitFile({
                  type: 'chunk',
                  fileName: `assets/import-map-${name.replace('/', '_')}.js`,
                  preserveSignature: 'allow-extension',
                  id,
                })
                resultingUrl = `/${pluginCtx.getFileName(chunkId)}`
              } else {
                const { id } = (await pluginCtx.resolve(name, undefined, { skipSelf: true }))!
                resultingUrl = id;
              }

              return [`${prefix}${name}`, resultingUrl]
            })))
          },
          scope: {},
        }

        return {
          html,
          tags: [
            {
              tag: 'script',
              attrs: {
                type: 'importmap',
              },
              children: JSON.stringify(processedImportMap, null, 2),
              injectTo: 'head-prepend',
            },
          ],
        }
      },
    },
  }
}
