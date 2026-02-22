//
// Copyright 2022 DXOS.org
//

/* eslint-disable no-console */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import postcssImport from 'postcss-import';
import postcssNesting from 'postcss-nesting';
import { type Plugin, type UserConfig } from 'vite';

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

  const config: ThemePluginOptions = {
    srcCssPath: existsSync(srcThemePath) ? srcThemePath : distThemePath,
    virtualFileId: '@dxos-theme',
    ...options,
  };

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
              tailwindcss({
                base: resolve(import.meta.dirname, '../../../..'),
              }),
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
  };
};
