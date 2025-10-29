//
// Copyright 2022 DXOS.org
//

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import chTokens from '@ch-ui/tokens/postcss';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import tailwindcss from 'tailwindcss';
import nesting from 'tailwindcss/nesting/index.js';
import { type ThemeConfig } from 'tailwindcss/types/config';
import { type Plugin, type UserConfig } from 'vite';

import { tailwindConfig, tokenSet } from '../config';

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
 * @returns Array of PostCSS plugins.
 */
const createPostCSSPipeline = (environment: string, config: ThemePluginOptions): postcss.Transformer[] => [
  // Handles @import statements in CSS.
  postcssImport(),
  // Processes CSS nesting syntax.
  nesting,
  // Processes custom design tokens.
  chTokens({ config: () => tokenSet }),
  // Processes Tailwind directives and utilities.
  tailwindcss(
    tailwindConfig({
      env: environment,
      content: config.content,
      extensions: config.extensions,
    }),
  ),
  // Adds vendor prefixes.
  autoprefixer as any,
];

/**
 * Vite plugin to configure theme.
 */
export const ThemePlugin = (options: ThemePluginOptions): Plugin => {
  const config: ThemePluginOptions = {
    jit: true,
    cssPath: resolve(import.meta.dirname, '../theme.css'),
    srcCssPath: resolve(import.meta.dirname, '../../../../src/theme.css'),
    virtualFileId: '@dxos-theme',
    ...options,
  };

  if (process.env.DEBUG) {
    console.log('ThemePlugin config:\n', JSON.stringify(config, null, 2));
  }

  return {
    name: 'vite-plugin-dxos-ui-theme',
    config: async ({ root }, env): Promise<UserConfig> => {
      environment = env.mode;
      const content = root ? await resolveKnownPeers(config.content ?? [], root) : config.content;
      if (options.verbose) {
        console.log('content', content);
      }

      return {
        css: {
          postcss: {
            plugins: createPostCSSPipeline(environment, config),
          },
        },
      };
    },
    resolveId: (id) => {
      if (id === config.virtualFileId) {
        return config.cssPath;
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
            const processor = postcss(createPostCSSPipeline(environment, config));
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

ThemePlugin.foo = 'bar';
