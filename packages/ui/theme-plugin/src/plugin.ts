//
// Copyright 2022 DXOS.org
//

import autoprefixer from 'autoprefixer';
// import daisyui from 'daisyui';
import { resolve } from 'path';
import tailwindcss from 'tailwindcss';
import { Plugin } from 'vite';

export interface VitePluginTailwindOptions {
  jit?: boolean
  cssPath?: string
  virtualFileId?: string
  content: string[]
}

export const dxosUiPlugin = (options: VitePluginTailwindOptions) => {
  const config: VitePluginTailwindOptions = {
    jit: true,
    cssPath: resolve(__dirname, './theme.css'),
    virtualFileId: '@dxosUiTheme',
    ...options
  };

  return {
    name: 'vite-plugin-dxos-ui-theme',
    config: (_, env) => {
      return {
        css: {
          postcss: {
            plugins: [
              tailwindcss({
                ...(config.jit && { mode: 'jit' }),
                content: config.content
                // plugins: [daisyui],
                // daisyui: {
                //   themes: ['light', 'dark']
                // }
              }),
              autoprefixer
            ]
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
