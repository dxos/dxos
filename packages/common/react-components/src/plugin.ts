//
// Copyright 2022 DXOS.org
//

import autoprefixer from 'autoprefixer';
import { resolve } from 'node:path';
import tailwindcss from 'tailwindcss';
import { Plugin } from 'vite';

import { tailwindConfig } from './config';

export interface VitePluginTailwindOptions {
  jit?: boolean;
  cssPath?: string;
  virtualFileId?: string;
  content: string[];
}

export const ThemePlugin = (options: Pick<VitePluginTailwindOptions, 'content'>) => {
  const config: VitePluginTailwindOptions = {
    jit: true,
    cssPath: resolve(__dirname, './theme.css'),
    virtualFileId: '@dxosTheme',
    ...options
  };

  return {
    name: 'vite-plugin-dxos-ui-theme',
    config: ({ root }, env) => {
      return {
        css: {
          postcss: {
            plugins: [tailwindcss(tailwindConfig({ env: env.mode, root, content: options.content })), autoprefixer]
          }
        }
      };
    },
    resolveId: (id) => {
      if (id === config.virtualFileId) {
        return config.cssPath;
      }
    }
  } as Plugin;
};
