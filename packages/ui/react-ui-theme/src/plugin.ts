//
// Copyright 2022 DXOS.org
//

import autoprefixer from 'autoprefixer';
import { resolve } from 'node:path';
import tailwindcss from 'tailwindcss';
import type { ThemeConfig } from 'tailwindcss/types/config';
import { type Plugin } from 'vite';

import { resolveKnownPeers, tailwindConfig } from './config';

export interface VitePluginTailwindOptions {
  jit?: boolean;
  cssPath?: string;
  virtualFileId?: string;
  content?: string[];
  root?: string;
}

// TODO(zhenyasav): make it easy to override the tailwind config
// TODO(zhenyasav): make it easy to add postcss plugins?
export const ThemePlugin = (
  options: Pick<VitePluginTailwindOptions, 'content' | 'root'> & { extensions?: Partial<ThemeConfig>[] },
) => {
  const config: VitePluginTailwindOptions & Pick<typeof options, 'extensions'> = {
    jit: true,
    cssPath: resolve(__dirname, './theme.css'),
    virtualFileId: '@dxosTheme',
    ...options,
  };

  return {
    name: 'vite-plugin-dxos-ui-theme',
    config: ({ root }, env) => {
      const content = root ? resolveKnownPeers(config.content ?? [], root) : config.content;
      return {
        css: {
          postcss: {
            plugins: [
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
