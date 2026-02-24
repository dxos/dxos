//
// Copyright 2022 DXOS.org
//

/* eslint-disable no-console */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import postcssImport from 'postcss-import';
import postcssNesting from 'postcss-nesting';
import { type HtmlTagDescriptor, type Plugin, type UserConfig } from 'vite';

/**
 * CSS cascade layer order. Must be established before any stylesheets load so that
 * Tailwind's own @layer declarations don't override our ordering. Exported so consuming
 * apps can reference the canonical list without duplicating it.
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
  const srcThemePath = resolve(import.meta.dirname, '../../../../src/theme.css');
  const distThemePath = resolve(import.meta.dirname, '../theme.css');
  const isMonorepo = existsSync(srcThemePath);

  const config: ThemePluginOptions = {
    srcCssPath: isMonorepo ? srcThemePath : distThemePath,
    virtualFileId: '@dxos-theme',
    ...options,
  };

  // In monorepo dev, derive project root from the source theme.css location so Tailwind
  // scans all packages (not just ui-theme). srcThemePath is always at
  // packages/ui/ui-theme/src/theme.css, so dirname + 4 levels up = project root.
  const base = isMonorepo ? resolve(dirname(srcThemePath), '../../../../') : undefined;

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
      const tag: HtmlTagDescriptor = {
        tag: 'style',
        attrs: { 'data-dxos-layers': '' },
        children: `@layer ${LAYER_ORDER.join(', ')};`,
        injectTo: 'head-prepend',
      };
      return [tag];
    },
  };
};
