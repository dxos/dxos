//
// Copyright 2022 DXOS.org
//

import autoprefixer from 'autoprefixer';
import { resolve } from 'path';
import tailwindcss from 'tailwindcss';
import defaultConfig from 'tailwindcss/stubs/defaultConfig.stub.js';
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
                theme: {
                  fontFamily: {
                    sans: [
                      'Roboto FlexVariable',
                      ...defaultConfig.theme.fontFamily.sans
                    ],
                    mono: [
                      'Fira CodeVariable',
                      ...defaultConfig.theme.fontFamily.mono
                    ]
                  }
                },
                ...(env.mode === 'development' && { mode: 'jit' }),
                content: config.content
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
