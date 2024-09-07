//
// Copyright 2022 DXOS.org
//

import chTokens from '@ch-ui/tokens';
import autoprefixer from 'autoprefixer';
import { resolve } from 'node:path';
import tailwindcss from 'tailwindcss';
import nesting from 'tailwindcss/nesting';
import type { ThemeConfig } from 'tailwindcss/types/config';
import { type Plugin } from 'vite';

import { tailwindConfig, tokenSet } from './config';
import { resolveKnownPeers } from './config/resolveContent';

export interface VitePluginTailwindOptions {
  jit?: boolean;
  cssPath?: string;
  virtualFileId?: string;
  content?: string[];
  root?: string;
}

// TODO(zhenyasav): Make it easy to override the tailwind config.
// TODO(zhenyasav): Make it easy to add postcss plugins?
export const ThemePlugin = (
  options: Pick<VitePluginTailwindOptions, 'content' | 'root'> & { extensions?: Partial<ThemeConfig>[] },
) => {
  const config: VitePluginTailwindOptions & Pick<typeof options, 'extensions'> = {
    jit: true,
    cssPath: resolve(__dirname, './theme.css'),
    virtualFileId: '@dxos-theme',
    ...options,
  };

  return {
    name: 'vite-plugin-dxos-ui-theme',
    config: async ({ root }, env) => {
      const content = root ? await resolveKnownPeers(config.content ?? [], root) : config.content;
      return {
        css: {
          postcss: {
            plugins: [
              nesting,
              chTokens({ config: () => tokenSet }),
              tailwindcss(
                tailwindConfig({
                  env: env.mode,
                  content,
                  extensions: config.extensions,
                }),
              ),
              autoprefixer,
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
  } as Plugin;
};
