//
// Copyright 2022 DXOS.org
//

import tailwindcssForms from '@tailwindcss/forms';
import autoprefixer from 'autoprefixer';
import { resolve } from 'path';
import tailwindcss from 'tailwindcss';
import tailwindcssRadix from 'tailwindcss-radix';
import tailwindColors from 'tailwindcss/colors';
import defaultConfig from 'tailwindcss/stubs/defaultConfig.stub.js';
import { Plugin } from 'vite';

export interface VitePluginTailwindOptions {
  jit?: boolean
  cssPath?: string
  virtualFileId?: string
  content: string[]
}

export const themePlugin = (options: VitePluginTailwindOptions) => {
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
            plugins: [
              tailwindcss({
                theme: {
                  fontFamily: {
                    body: [
                      'Roboto FlexVariable',
                      ...defaultConfig.theme.fontFamily.sans
                    ],
                    display: [
                      'Space GroteskVariable',
                      'Roboto FlexVariable',
                      ...defaultConfig.theme.fontFamily.sans
                    ],
                    mono: [
                      'Fira CodeVariable',
                      ...defaultConfig.theme.fontFamily.mono
                    ]
                  },
                  extend: {
                    colors: {
                      neutral: tailwindColors.zinc,
                      success: tailwindColors.emerald,
                      warning: tailwindColors.amber,
                      error: tailwindColors.red,
                      info: tailwindColors.cyan,
                      primary: {
                        // Key color #00e0e0
                        // Hue torsion -73.5º
                        // C*CP black 1.0, C*CP white 1.0
                        50: '#110c2a',
                        100: '#101940',
                        150: '#0b2453',
                        200: '#003164',
                        250: '#003e70',
                        300: '#004b7c',
                        350: '#005887',
                        400: '#006693',
                        450: '#00749e',
                        500: '#0082a9',
                        550: '#0091b3',
                        600: '#00a0be',
                        650: '#00afc7',
                        700: '#00bed0',
                        750: '#00ced8',
                        800: '#00dedf',
                        850: '#3cede4',
                        900: '#69fae8',
                        950: '#b9ffee'
                      },
                      transparent: 'transparent',
                      current: 'currentColor',
                      white: '#ffffff',
                      black: '#000000'
                    }
                  }
                },
                plugins: [tailwindcssForms, tailwindcssRadix()],
                ...(env.mode === 'development' && { mode: 'jit' }),
                content: [
                  resolve(root || './', 'node_modules/@dxos/react-ui/dist/**/*.js'),
                  ...config.content
                ]
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
