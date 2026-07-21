//
// Copyright 2022 DXOS.org
//

import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { type Plugin, defineConfig, searchForWorkspaceRoot } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

import { ConfigPlugin } from '@dxos/config/vite-plugin';
import { ThemePlugin } from '@dxos/ui-theme/plugin';
import { IconsPlugin } from '@dxos/vite-plugin-icons';
import { ShutdownPlugin } from '@dxos/vite-plugin-shutdown';
// import { createConfig as createTestConfig } from '../../../vitest.base.config';

// @ts-ignore
import packageJson from './package.json';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const { prepareCanonicalDist } = await import(pathToFileURL(path.join(dirname, 'scripts/canonical-dist.mjs')).href);

const rootDir = searchForWorkspaceRoot(process.cwd());
const phosphorIconsCore = path.join(rootDir, '/node_modules/@phosphor-icons/core/assets');
const dxosIcons = path.join(rootDir, '/packages/ui/brand/assets/icons');
const outDir = prepareCanonicalDist(dirname);

/**
 * Remove the inline dark-mode `<script>` that ThemePlugin injects into every
 * page's `<head>`. The MV3 extension CSP (`script-src 'self'`) forbids inline
 * scripts, and `extension_pages` — unlike a web build — cannot whitelist a hash
 * or nonce to permit one. The extension is dark-only (Container forces
 * `themeMode='dark'`), so `class="dark"` on each page covers first paint. The
 * injected `<style>` tags are left intact (inline styles are allowed).
 */
const stripInlineThemeScript = (): Plugin => ({
  name: 'dxos-crx-strip-inline-theme-script',
  transformIndexHtml: {
    order: 'post',
    handler: (html) => {
      // Match by the `data-dxos-theme` marker attribute regardless of attribute
      // order or any additional attributes, so a change to ThemePlugin's markup
      // does not silently stop stripping (which would reintroduce the CSP
      // violation). Warn at build time if nothing matched so the regression is
      // visible rather than shipped.
      const stripped = html.replace(/\s*<script\b[^>]*\bdata-dxos-theme\b[^>]*>[\s\S]*?<\/script>/g, '');
      if (stripped === html) {
        // eslint-disable-next-line no-console
        console.warn(
          '[composer-crx] stripInlineThemeScript: no inline theme script found — ThemePlugin output may have changed; verify extension pages stay CSP-clean.',
        );
      }
      return stripped;
    },
  },
});

/**
 * https://vitejs.dev/config
 */
export default defineConfig({
  root: dirname,
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      // https://crxjs.dev/vite-plugin/concepts/pages
      // The side panel (panel.html) is referenced by the manifest `side_panel`
      // key below, so crxjs discovers and bundles it automatically.
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
    plugins: () => [sourcemaps(), topLevelAwait(), wasm()],
  },
  plugins: [
    ShutdownPlugin(),
    sourcemaps(),

    // DXOS plugins.
    ConfigPlugin({
      root: dirname,
    }),
    ThemePlugin({}),
    IconsPlugin({
      // The leading negative lookahead restricts the `dx` set to the `regular` weight only (custom
      // brand SVGs have no weight variants); the `ph` set retains all Phosphor weights.
      symbolPattern:
        '(?!dx--[a-z]+[a-z-]*--(?:bold|duotone|fill|light|thin))(ph|dx)--([a-z]+[a-z-]*)--(bold|duotone|fill|light|regular|thin)',
      assetPath: (iconSet, name, variant) => {
        switch (iconSet) {
          case 'dx':
            return `${dxosIcons}/${name}.svg`;
          default:
            return `${phosphorIconsCore}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`;
        }
      },
      spriteFile: 'icons.svg',
      contentPaths: [
        path.join(rootDir, '/{packages,tools}/**/dist/**/*.{mjs,html}'),
        path.join(rootDir, '/{packages,tools}/**/src/**/*.{ts,tsx,js,jsx,css,md,html}'),
        path.join(rootDir, '/{packages,tools}/**/dx.config.{ts,tsx,js,jsx}'),
      ],
      // Page-action descriptor icons are contributed by Composer plugins at
      // runtime; those sources are never imported by the extension bundle, so
      // they are scanned eagerly by convention (capabilities/page-action*.ts).
      scanPaths: [path.join(rootDir, '/packages/plugins/*/src/capabilities/page-action*.ts')],
    }),

    // TODO(burdon): Document.
    wasm(),

    // https://github.com/preactjs/signals/issues/269
    react({
      jsxRuntime: 'classic',
    }),

    // https://crxjs.dev/vite-plugin
    crx({
      manifest: {
        manifest_version: 3,
        version: packageJson.version,
        author: { email: 'hello@dxos.org' },
        name: 'Composer',
        short_name: 'Composer',
        description: 'Composer browser extension.',
        icons: {
          '48': 'assets/img/icon-48.png',
          '128': 'assets/img/icon-128.png',
        },
        // NOTE: Rename file to break cache.
        // No `default_popup`: clicking the toolbar icon opens the side panel
        // (see `openPanelOnActionClick` in background.ts). A popup and an
        // action-click side panel are mutually exclusive.
        action: {
          default_icon: 'assets/img/icon-48.png',
          default_title: 'Composer',
        },
        side_panel: {
          default_path: 'side_panel.html',
        },
        permissions: ['contextMenus', 'activeTab', 'tabs', 'scripting', 'storage', 'notifications', 'sidePanel'],
        // TODO(review): broad host permissions for arbitrary search providers — scope/curate before publishing.
        // Broad host access is required so the popup and background can fetch cross-origin
        // (chat-agent, image-service) without CORS — extensions bypass CORS for hosts they
        // hold permissions for — and so the content script can be injected on any page.
        host_permissions: ['http://*/*', 'https://*/*'],
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
        // Expose the icon sprite to pages so the picker's SVG `<use href=...>`
        // references resolve when it's injected into arbitrary sites.
        web_accessible_resources: [
          {
            resources: ['icons.svg'],
            matches: ['http://*/*', 'https://*/*'],
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
          const module = this.getModuleInfo(id);
          if (module != null && !module.isExternal) {
            for (const target of module.importedIds) {
              deps.push({ source: module.id, target });
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

    // Must come last: its post `transformIndexHtml` runs after ThemePlugin has
    // injected the inline dark-mode script.
    stripInlineThemeScript(),
  ],

  // TODO(wittjosiah): Tests failing.
  // ...createTestConfig({ dirname, node: true, storybook: true }),
});
