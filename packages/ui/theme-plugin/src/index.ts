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
                      'base-100': '#0c0e10',
                      'base-200': '#131517',
                      'base-300': '#191b1e',
                      'base-content': '#ebeff0',
                      neutral: '#191b1e',
                      'neutral-focus': '#ffffff',
                      'neutral-content': '#ebeff0',
                      primary: '#00b5e6',
                      'primary-focus': '#ffffff',
                      'primary-content': '#1d0200',
                      accent: '#00b5e6',
                      'accent-focus': '#ffffff',
                      'accent-content': '#1d0200',
                      secondary: '#00b5e6',
                      'secondary-focus': '#ffffff',
                      'secondary-content': '#1d0200',
                      info: '#00b5e6',
                      'info-content': '#1d0200',
                      success: '#53bb5d',
                      'success-content': '#1d0200',
                      warning: '#da9f00',
                      'warning-content': '#1d0200',
                      error: '#ff7f6f',
                      'error-content': '#1d0200'
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
