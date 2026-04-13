//
// Copyright 2022 DXOS.org
//

/* eslint-disable no-console */

import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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
 */
export const ThemePlugin = (options: ThemePluginOptions): Plugin => {
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

  // Derive project root from the source location so Tailwind scans all packages.
  const base = isMonorepo ? resolve(dirname(srcThemePath), ROOT) : undefined;

  if (process.env.DEBUG || options.verbose) {
    console.log('ThemePlugin:\n', JSON.stringify(config, null, 2));
  }

  return {
    name: 'vite-plugin-dxos-ui-theme',
    config: (): UserConfig => {
      return {
        css: {
          postcss: {
            plugins: [
              // Handles @import statements in CSS.
              postcssImport(),
              // Processes CSS nesting syntax.
              postcssNesting(),
              // Processes Tailwind directives and generates utilities from scanned content.
              // base points to project root so all packages are scanned (not just ui-theme).
              tailwindcss(base !== undefined ? { base } : {}),
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
};
