//
// Copyright 2022 DXOS.org
//

import autoprefixer from 'autoprefixer';
import daisyui from 'daisyui';
import { resolve } from 'path';
import tailwindcss from 'tailwindcss';
import { Plugin } from 'vite';

export interface VitePluginTailwindOptions {
  jit?: boolean
  cssPath?: string
  virtualFileId?: string
  content: string[]
}

const themePlugin = (options: VitePluginTailwindOptions) => {
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
                ...(env.mode === 'development' && { mode: 'jit' }),
                content: [
                  resolve(__dirname, '../node_modules/daisyui/dist/**/*.js'),
                  // 'node_modules/react-daisyui/dist/**/*.js',
                  ...config.content
                ],
                plugins: [daisyui],
                daisyui: {
                  themes: ['light', 'dark']
                }
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

export default themePlugin;
