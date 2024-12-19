//
// Copyright 2022 DXOS.org
//

import chTokens from '@ch-ui/tokens';
import autoprefixer from 'autoprefixer';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import tailwindcss from 'tailwindcss';
import nesting from 'tailwindcss/nesting';
import { type ThemeConfig } from 'tailwindcss/types/config';
import { type UserConfig, type Plugin } from 'vite';

import { resolveKnownPeers } from './resolveContent';
import { tailwindConfig, tokenSet } from '../config';

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

/**
 * Vite plugin to configure theme.
 */
export const ThemePlugin = (options: ThemePluginOptions): Plugin => {
  const config: ThemePluginOptions = {
    jit: true,
    cssPath: resolve(__dirname, '../theme.css'),
    srcCssPath: resolve(__dirname, '../../../../src/theme.css'),
    virtualFileId: '@dxos-theme',
    ...options,
  };

  return {
    name: 'vite-plugin-dxos-ui-theme',

    // Initial load configuration
    config: async ({ root }, env): Promise<UserConfig> => {
      const content = root ? await resolveKnownPeers(config.content ?? [], root) : config.content;
      if (options.verbose) {
        console.log('content', content);
      }

      return {
        css: {
          postcss: {
            plugins: [
              postcssImport(),
              nesting,
              chTokens({ config: () => tokenSet }),
              tailwindcss(
                tailwindConfig({
                  env: env.mode,
                  content,
                  extensions: config.extensions,
                }),
              ),
              autoprefixer as any,
            ],
          },
        },
      };
    },

    // Virtual file resolution
    resolveId: (id) => {
      if (id === config.virtualFileId) {
        return config.cssPath;
      }
    },
    handleHotUpdate: async ({ file, server }) => {
      if (file.endsWith('.css') && file !== config.cssPath) {
        try {
          const module = server.moduleGraph.getModuleById(config.cssPath!);

          if (module) {
            const css = await readFile(config.srcCssPath!, 'utf8');

            const processor = postcss([
              postcssImport(),
              nesting,
              chTokens({ config: () => tokenSet }),
              tailwindcss(
                tailwindConfig({
                  env: 'development',
                  content: config.content,
                  extensions: config.extensions,
                }),
              ),
              autoprefixer as any,
            ]);

            const result = await processor.process(css, {
              from: config.srcCssPath,
              to: config.cssPath,
            });

            if (result.css) {
              await writeFile(config.cssPath!, result.css);
              return [module];
            }
          }
        } catch (err) {
          console.error('[theme-plugin] Error:', err);
        }
      }
    },
  };
};
