//
// Copyright 2022 DXOS.org
//

/* eslint-disable no-console */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import type postcss from 'postcss';
import postcssImport from 'postcss-import';
import postcssNesting from 'postcss-nesting';
import { type Plugin, type UserConfig } from 'vite';

import { resolveKnownPeers } from './resolveContent';

export type ThemePluginOptions = {
  srcCssPath?: string;
  virtualFileId?: string;
  root?: string;
  content?: string[];
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

  let resolvedContent: string[] | undefined;

  return {
    name: 'vite-plugin-dxos-ui-theme',
    config: async ({ root }): Promise<UserConfig> => {
      resolvedContent = root ? await resolveKnownPeers(config.content ?? [], root) : config.content;
      if (options.verbose) {
        console.log('[theme-plugin] content', resolvedContent);
      }

      return {
        css: {
          postcss: {
            plugins: createPostCSSPipeline(config, resolvedContent),
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

/**
 * Configures PostCSS pipeline for theme.css processing.
 */
const createPostCSSPipeline = (config: ThemePluginOptions, content?: string[]): postcss.AcceptedPlugin[] => [
  // Handles @import statements in CSS.
  postcssImport(),
  // Processes CSS nesting syntax.
  postcssNesting(),
  // Processes Tailwind directives and generates utilities from scanned content.
  tailwindcss({
    base: resolve(import.meta.dirname, '../../../..'),
    ...(content ? { content } : {}),
  }),
  // Adds vendor prefixes.
  autoprefixer,
];
