//
// Copyright 2022 DXOS.org
//

import autoprefixer from 'autoprefixer';
import daisyui from 'daisyui';
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
                content: [
                  resolve(__dirname, '../node_modules/daisyui/dist/**/*.js'),
                  ...config.content
                ],
                plugins: [daisyui],
                daisyui: {
                  themes: [{
                    light: {
                      primary: '#570df8',
                      'primary-content': '#ffffff',
                      secondary: '#f000b8',
                      'secondary-content': '#ffffff',
                      accent: '#37cdbe',
                      'accent-content': '#163835',
                      neutral: '#3d4451',
                      'neutral-content': '#ffffff',
                      'neutral-focus': '#000000',
                      'base-100': '#ffffff',
                      'base-200': '#F2F2F2',
                      'base-300': '#E5E6E6',
                      'base-content': '#1f2937'
                    }
                  }, {
                    dark: {
                      primary: '#661AE6',
                      'primary-content': '#ffffff',
                      secondary: '#D926AA',
                      'secondary-content': '#ffffff',
                      accent: '#1FB2A5',
                      'accent-content': '#ffffff',
                      neutral: '#191D24',
                      'neutral-content': '#dddddd',
                      'neutral-focus': '#ffffff',
                      'base-100': '#2A303C',
                      'base-200': '#242933',
                      'base-300': '#20252E',
                      'base-content': '#dddddd'
                    }
                  }]
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
