//
// Copyright 2022 DXOS.org
//

import chTokens from '@ch-ui/tokens';
import autoprefixer from 'autoprefixer';
import { resolve } from 'node:path';
import tailwindcss from 'tailwindcss';
import nesting from 'tailwindcss/nesting';
import { type ThemeConfig } from 'tailwindcss/types/config';
import { type UserConfig, type Plugin } from 'vite';

import { resolveKnownPeers } from './resolveContent';
import { tailwindConfig, tokenSet } from '../config';

export type ThemePluginOptions = {
  jit?: boolean;
  cssPath?: string;
  virtualFileId?: string;
  content?: string[];
  root?: string;
  verbose?: boolean;
  extensions?: Partial<ThemeConfig>[];
};

export const ThemePlugin = (options: ThemePluginOptions): Plugin => {
  const config: ThemePluginOptions = {
    jit: true,
    cssPath: resolve(__dirname, '../theme.css'),
    virtualFileId: '@dxos-theme',
    ...options,
  };

  return {
    name: 'vite-plugin-dxos-ui-theme',
    config: async ({ root }, env): Promise<UserConfig> => {
      const content = root ? await resolveKnownPeers(config.content ?? [], root) : config.content;
      if (options.verbose) {
        // eslint-disable-next-line no-console
        console.log('content', content);
      }

      return {
        css: {
          postcss: {
            plugins: [
              nesting,
              // TODO(burdon): Make configurable.
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
    resolveId: (id) => {
      if (id === config.virtualFileId) {
        return config.cssPath;
      }
    },
  } satisfies Plugin;
};
