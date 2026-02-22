//
// Copyright 2022 DXOS.org
//

/* eslint-disable no-console */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import postcssNesting from 'postcss-nesting';
import type { ThemeConfig } from 'tailwindcss/plugin';
import { type Plugin, type UserConfig } from 'vite';

import { resolveKnownPeers } from './resolveContent';

export type ThemePluginOptions = {
  jit?: boolean;
  cssPath?: string;
  srcCssPath?: string;
  virtualFileId?: string;
  content?: string[];
  root?: string;
  verbose?: boolean;
  extensions?: Partial<ThemeConfig>[];
};

let environment!: string;

/**
 * Configures PostCSS pipeline for theme.css processing.
 * @param environment - The current environment (development/production).
 * @param config - Theme plugin configuration options.
 * @param content - Resolved content paths for Tailwind scanning.
 * @returns Array of PostCSS plugins.
 */
const createPostCSSPipeline = (
  environment: string,
  config: ThemePluginOptions,
  content?: string[],
): postcss.Transformer[] => [
  // Handles @import statements in CSS.
  postcssImport(),
  // Processes CSS nesting syntax.
  postcssNesting(),
  // Processes Tailwind directives and utilities.
  // Pass content paths to Tailwind for utility class generation.
  tailwindcss({
    base: resolve(import.meta.dirname, '../../../..'),
    ...(content ? { content } : {}),
  }),
  // Adds vendor prefixes.
  autoprefixer as any,
];

/**
 * Vite plugin to configure theme.
 */
export const ThemePlugin = (options: ThemePluginOptions): Plugin => {
  // Prefer source CSS if available (monorepo dev), fall back to dist for installed package.
  const srcThemePath = resolve(import.meta.dirname, '../../../../src/theme.css');
  const distThemePath = resolve(import.meta.dirname, '../theme.css');

  const config: ThemePluginOptions = {
    jit: true,
    cssPath: resolve(import.meta.dirname, '../theme.css'),
    srcCssPath: existsSync(srcThemePath) ? srcThemePath : distThemePath,
    virtualFileId: '@dxos-theme',
    ...options,
  };

  if (process.env.DEBUG) {
    console.log('ThemePlugin config:\n', JSON.stringify(config, null, 2));
  }

  let resolvedContent: string[] | undefined;

  return {
    name: 'vite-plugin-dxos-ui-theme',
    config: async ({ root }, env): Promise<UserConfig> => {
      environment = env.mode;
      resolvedContent = root ? await resolveKnownPeers(config.content ?? [], root) : config.content;
      if (options.verbose) {
        console.log('content', resolvedContent);
      }

      return {
        css: {
          postcss: {
            plugins: createPostCSSPipeline(environment, config, resolvedContent),
          },
        },
      };
    },
    resolveId: (id) => {
      if (id === config.virtualFileId) {
        // Return source CSS path so Vite processes it through PostCSS pipeline (including chTokens)
        return config.srcCssPath;
      }
    },
    handleHotUpdate: async ({ file, server }) => {
      // NOTE(ZaymonFC): Changes to *any* CSS file triggers this step. We might want to refine this.
      //   Ignore the output file to prevent infinite loops.
      if (file.endsWith('.css') && file !== config.cssPath) {
        try {
          // Get reference to the theme virtual module.
          const module = server.moduleGraph.getModuleById(config.cssPath!);
          if (module) {
            // Read the source theme file that imports all other CSS files.
            const css = await readFile(config.srcCssPath!, 'utf8');
            const processor = postcss(createPostCSSPipeline(environment, config, resolvedContent));
            console.log('[theme-plugin] Reprocessing CSS with PostCSS.');
            const result = await processor.process(css, {
              from: config.srcCssPath,
              to: config.cssPath,
            });

            if (result.css) {
              await writeFile(config.cssPath!, result.css);
              // Return the module to trigger HMR update.
              return [];
            }
          }
        } catch (err) {
          console.error('[theme-plugin] Error:', err);
        }
      }
    },
  };
};
