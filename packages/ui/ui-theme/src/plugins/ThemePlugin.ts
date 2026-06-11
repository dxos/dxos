//
// Copyright 2022 DXOS.org
//

/* eslint-disable no-console */

import tailwindcssPostcss from '@tailwindcss/postcss';
import tailwindcssVite from '@tailwindcss/vite';
import autoprefixer from 'autoprefixer';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcssImport from 'postcss-import';
import postcssNesting from 'postcss-nesting';
import { type HtmlTagDescriptor, type Plugin, type UserConfig } from 'vite';

/**
 * CSS cascade layer order.
 * Must be established before any stylesheets load so that Tailwind's own @layer declarations don't override our ordering. Exported so consuming
 */
export const LAYER_ORDER = [
  'properties',
  'theme',
  'dx-tokens',
  'user-tokens',
  'base',
  'tw-base',
  'dx-base',
  'components',
  'tw-components',
  'dx-components',
  'utilities',
] as const;

const ROOT = '../../../../';

export type ThemePluginOptions = {
  srcCssPath?: string;
  virtualFileId?: string;
  verbose?: boolean;
};

/**
 * Vite plugin to configure theme.
 * Returns the official Tailwind Vite plugin (persistent incremental scanner) alongside the theme plugin.
 */
export const ThemePlugin = (options: ThemePluginOptions): Plugin[] => {
  // Prefer source CSS if available (monorepo dev), fall back to dist for installed package.
  const srcThemePath = resolve(import.meta.dirname, ROOT, 'src/main.css');
  const distThemePath = resolve(import.meta.dirname, '../main.css');
  const isMonorepo = existsSync(srcThemePath);

  // Static assets shipped via "files": ["src"] in package.json.
  // Both monorepo and installed package resolve to the same src/plugins/ directory.
  const pluginsDir = resolve(import.meta.dirname, ROOT, 'src/plugins');
  const darkModeScriptPath = resolve(pluginsDir, 'dark-mode.ts');
  const mainCssPath = resolve(pluginsDir, 'main.css');

  const config: ThemePluginOptions = {
    srcCssPath: isMonorepo ? srcThemePath : distThemePath,
    virtualFileId: '@dxos-theme',
    ...options,
  };

  if (process.env.DEBUG || options.verbose) {
    console.log('ThemePlugin:\n', JSON.stringify(config, null, 2));
  }

  const themePlugin: Plugin = {
    name: 'vite-plugin-dxos-ui-theme',
    config: (): UserConfig => {
      return {
        server: {
          watch: {
            // Stop build outputs from driving HMR — they are the root of the
            // `main.css` HMR storm.
            //
            // Tailwind's `@source` scanning (see `src/main.css`) registers its
            // scanned source files as Vite watch dependencies of the compiled
            // theme CSS. Tailwind's own scanner respects `.gitignore` (and the
            // `@source not` directives), so it never *scans* `dist/`. BUT the
            // scanner hands Vite a coarse `dir-dependency` glob — e.g.
            // `{**/*.html,**/*.ts,**/*.tsx}` — and Vite re-expands that glob
            // itself, ignoring only `node_modules` (not `.gitignore`, not the
            // `@source not` negations). The re-expansion therefore sweeps in
            // every `packages/*/dist/**/*.d.ts` (`.d.ts` matches `**/*.ts`),
            // making each emitted declaration file a watch-dependency of
            // `main.css`. A single package rebuild emits dozens of `.d.ts` in a
            // tight burst, and each write re-invalidates the theme — 40+ HMR
            // pings for `main.css` in one second, repeating on every rebuild.
            //
            // Ignoring build outputs in the watcher is also semantically
            // correct: in dev the workspace resolves `@dxos/*` via the `source`
            // export condition (see `vite-plugin-import-source`), so `dist/`
            // is never consumed at runtime and its churn should never trigger
            // HMR. Vite concatenates these patterns with its built-in ignores
            // (`**/node_modules/**`, `**/.git/**`, …), so this is purely
            // additive.
            ignored: ['**/dist/**', '**/out/**'],
          },
        },
        css: {
          postcss: {
            plugins: [
              // Handles @import statements in CSS.
              postcssImport(),
              // Processes CSS nesting syntax.
              postcssNesting(),
              // Resolves @reference/@apply in `.pcss` files (e.g. lit-grid, lit-ui), which the
              // @tailwindcss/vite plugin skips — its transform filter only matches `.css`.
              // Theme `.css` files are compiled by @tailwindcss/vite first (enforce: 'pre'),
              // so this plugin's quick-bail check passes them through untouched.
              tailwindcssPostcss(),
              // Adds vendor prefixes.
              autoprefixer,
            ],
          },
        },
      };
    },
    resolveId: (id) => {
      if (id === config.virtualFileId) {
        return config.srcCssPath;
      }
    },
    transformIndexHtml: () => {
      // Apply .dark class to <html> synchronously before any scripts run, so that
      // the critical CSS html.dark rules apply on the very first paint.
      const darkModeTag: HtmlTagDescriptor = {
        tag: 'script',
        attrs: { 'data-dxos-theme': '' },
        injectTo: 'head-prepend',
        children: readFileSync(darkModeScriptPath, 'utf-8'),
      };

      // Establish cascade layer order before any stylesheet loads.
      const layersTag: HtmlTagDescriptor = {
        tag: 'style',
        attrs: { 'data-dxos-layers': '' },
        children: `@layer ${LAYER_ORDER.join(', ')};`,
        injectTo: 'head-prepend',
      };

      // Critical styles: font sizing, overscroll, color fallbacks.
      // Loaded from critical.css to keep styles maintainable and out of index.html.
      const criticalTag: HtmlTagDescriptor = {
        tag: 'style',
        attrs: { 'data-dxos-critical': '' },
        injectTo: 'head-prepend',
        children: readFileSync(mainCssPath, 'utf-8'),
      };

      return [darkModeTag, layersTag, criticalTag];
    },
  };

  // The Tailwind Vite plugins are `enforce: 'pre'`, so they compile theme CSS (resolving
  // `@import 'tailwindcss'`, @source, @plugin, @theme) before the postcss chain runs —
  // postcss-import never sees the raw Tailwind directives. Scan roots come from the @source
  // directives in main.css (relative to that file); no project-root base is needed.
  return [...tailwindcssVite(), themePlugin];
};
