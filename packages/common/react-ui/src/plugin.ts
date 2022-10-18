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
                darkMode: 'class',
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
                      success: tailwindColors.emerald,
                      warning: tailwindColors.amber,
                      error: tailwindColors.red,
                      info: tailwindColors.cyan,
                      neutral: {
                        // Key color #707076
                        // Hue torsion 0.0º
                        // C*CP black 0.80, C*CP white 0.88
                        950: '#101012',
                        900: '#1b1b1e',
                        850: '#252529',
                        800: '#303034',
                        750: '#3b3b3f',
                        700: '#46464b',
                        650: '#525257',
                        600: '#5e5e64',
                        550: '#6a6a70',
                        500: '#77767d',
                        450: '#838389',
                        400: '#909096',
                        350: '#9d9da4',
                        300: '#ababb1',
                        250: '#b8b8be',
                        200: '#c6c6cc',
                        150: '#d4d4d9',
                        100: '#e2e2e7',
                        50: '#f1f1f4'
                      },
                      primary: {
                        // Key color #00e0e0
                        // Hue torsion -73.5º
                        // C*CP black 1.0, C*CP white 1.0
                        950: '#110c2a',
                        900: '#101940',
                        850: '#0b2453',
                        800: '#003164',
                        750: '#003e70',
                        700: '#004b7c',
                        650: '#005887',
                        600: '#006693',
                        550: '#00749e',
                        500: '#0082a9',
                        450: '#0091b3',
                        400: '#00a0be',
                        350: '#00afc7',
                        300: '#00bed0',
                        250: '#00ced8',
                        200: '#00dedf',
                        150: '#3cede4',
                        100: '#69fae8',
                        50: '#b9ffee'
                      },
                      transparent: 'transparent',
                      current: 'currentColor',
                      white: '#ffffff',
                      black: '#000000'
                    },
                    fontSize: {
                      // Base size 16px
                      // Scale 1.125
                      xs: ['0.79rem', { lineHeight: '1rem' }],
                      sm: ['0.889rem', { lineHeight: '1.25rem' }],
                      base: ['1rem', { lineHeight: '1.5rem' }],
                      lg: ['1.125rem', { lineHeight: '1.75rem' }],
                      xl: ['1.266rem', { lineHeight: '1.75rem' }],
                      '2xl': ['1.424rem', { lineHeight: '2rem' }],
                      '3xl': ['1.602rem', { lineHeight: '2.25rem' }],
                      '4xl': ['1.802rem', { lineHeight: '2.5rem' }],
                      '5xl': ['2.027rem', { lineHeight: '1' }],
                      '6xl': ['2.281rem', { lineHeight: '1' }],
                      '7xl': ['2.566rem', { lineHeight: '1' }],
                      '8xl': ['2.887rem', { lineHeight: '1' }],
                      '9xl': ['3.247rem', { lineHeight: '1' }]
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
