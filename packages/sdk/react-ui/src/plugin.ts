//
// Copyright 2022 DXOS.org
//

import autoprefixer from 'autoprefixer';
import { resolve } from 'path';
import tailwindcss from 'tailwindcss';
import tailwindColors from 'tailwindcss/colors';
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
    virtualFileId: '@dxosTheme',
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
                  },
                  colors: {
                    neutral: tailwindColors.zinc,
                    success: tailwindColors.emerald,
                    warning: tailwindColors.amber,
                    error: tailwindColors.red,
                    info: tailwindColors.cyan,
                    primary: {
                      100: '#3a1d60',
                      200: '#373885',
                      300: '#2555a5',
                      400: '#0071bb',
                      500: '#008dc9',
                      600: '#00a9d8',
                      700: '#00c5e6',
                      800: '#55dfec',
                      900: '#96f7f0'
                    }
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
