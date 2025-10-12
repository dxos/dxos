//
// Copyright 2022 DXOS.org
//

import { crx as ChromeExtensionPlugin } from '@crxjs/vite-plugin';
import ReactPlugin from '@vitejs/plugin-react';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import SourceMapsPlugin from 'rollup-plugin-sourcemaps';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import TopLevelAwaitPlugin from 'vite-plugin-top-level-await';
import WasmPlugin from 'vite-plugin-wasm';

import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/react-ui-theme/plugin';
import { IconsPlugin } from '@dxos/vite-plugin-icons';

// import { createConfig as createTestConfig } from '../../../vitest.base.config';

// @ts-ignore
import packageJson from './package.json';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const rootDir = searchForWorkspaceRoot(process.cwd());
const phosphorIconsCore = path.join(rootDir, '/node_modules/@phosphor-icons/core/assets');

/**
 * https://vitejs.dev/config
 */
export default defineConfig({
  root: dirname,
  build: {
    rollupOptions: {
      // https://crxjs.dev/vite-plugin/concepts/pages
      input: {
        // Everything mentioned in manifest.json will be bundled.
        // We need to specify the 'panel' entry point here because it's not mentioned in manifest.json.
        panel: path.resolve(dirname, 'panel.html'),
      },
      output: {
        sourcemap: true,
      },
    },
  },
  resolve: {
    alias: {
      'node-fetch': 'isomorphic-fetch',
    },
  },
  worker: {
    format: 'es',
    plugins: () => [TopLevelAwaitPlugin(), WasmPlugin(), SourceMapsPlugin()],
  },
  plugins: [
    SourceMapsPlugin(),
    ConfigPlugin({
      root: dirname,
    }),
    ThemePlugin({
      root: dirname,
      content: [
        path.resolve(dirname, './index.html'),
        path.resolve(dirname, './src/**/*.{js,ts,jsx,tsx}'),
        path.join(rootDir, '/packages/ui/*/src/**/*.{js,ts,jsx,tsx}'),
      ],
    }),
    IconsPlugin({
      symbolPattern: 'ph--([a-z]+[a-z-]*)--(bold|duotone|fill|light|regular|thin)',
      assetPath: (name, variant) =>
        `${phosphorIconsCore}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`,
      spriteFile: 'icons.svg',
      contentPaths: [
        path.join(rootDir, '/{packages,tools}/**/dist/**/*.{mjs,html}'),
        path.join(rootDir, '/{packages,tools}/**/src/**/*.{ts,tsx,js,jsx,css,md,html}'),
      ],
    }),

    WasmPlugin(),

    // https://github.com/preactjs/signals/issues/269
    ReactPlugin({ jsxRuntime: 'classic' }),

    // https://crxjs.dev/vite-plugin
    // TODO(burdon): HMR works if installing from ./dist (via `p serve`) but styles don't work.
    ChromeExtensionPlugin({
      manifest: {
        manifest_version: 3,
        version: packageJson.version,
        author: { email: 'hello@dxos.org' },
        name: 'Composer',
        short_name: 'Composer',
        description: 'Composer browser extension.',
        icons: {
          '48': 'assets/img/icon-dxos-48.png',
          '128': 'assets/img/icon-dxos-128.png',
        },
        action: {
          default_icon: 'assets/img/icon-dxos-48.png',
          default_title: 'Composer',
          default_popup: 'popup.html',
        },
        content_security_policy: {
          extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
        },
        sandbox: {
          pages: ['sandbox.html'],
        },
        options_page: 'options.html',
        background: {
          service_worker: 'src/background.ts',
        },
        content_scripts: [
          {
            matches: ['http://*/*', 'https://*/*'],
            run_at: 'document_start',
            js: ['src/content.ts'],
          },
        ],
      },
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

        const outDir = path.join(dirname, 'out');
        if (!existsSync(outDir)) {
          mkdirSync(outDir);
        }
        writeFileSync(path.join(outDir, 'graph.json'), JSON.stringify(deps, null, 2));
      },
    },
  ],
  // TODO(wittjosiah): Tests failing.
  // ...createTestConfig({ dirname, node: true, storybook: true }),
});
