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
                    },
                    outlineWidth: {
                      3: '3px'
                    },
                    boxShadow: {
                      slider: '0 0 0 5px rgba(0, 0, 0, 0.3)'
                    },
                    keyframes: {
                      // Dropdown menu
                      'scale-in': {
                        '0%': { opacity: '0', transform: 'scale(0)' },
                        '100%': { opacity: '1', transform: 'scale(1)' }
                      },
                      'slide-down': {
                        '0%': { opacity: '0', transform: 'translateY(-10px)' },
                        '100%': { opacity: '1', transform: 'translateY(0)' }
                      },
                      'slide-up': {
                        '0%': { opacity: '0', transform: 'translateY(10px)' },
                        '100%': { opacity: '1', transform: 'translateY(0)' }
                      },
                      // Tooltip
                      'slide-up-fade': {
                        '0%': { opacity: '0', transform: 'translateY(2px)' },
                        '100%': { opacity: '1', transform: 'translateY(0)' }
                      },
                      'slide-right-fade': {
                        '0%': { opacity: '0', transform: 'translateX(-2px)' },
                        '100%': { opacity: '1', transform: 'translateX(0)' }
                      },
                      'slide-down-fade': {
                        '0%': { opacity: '0', transform: 'translateY(-2px)' },
                        '100%': { opacity: '1', transform: 'translateY(0)' }
                      },
                      'slide-left-fade': {
                        '0%': { opacity: '0', transform: 'translateX(2px)' },
                        '100%': { opacity: '1', transform: 'translateX(0)' }
                      },
                      // Navigation menu
                      'enter-from-right': {
                        '0%': { transform: 'translateX(200px)', opacity: '0' },
                        '100%': { transform: 'translateX(0)', opacity: '1' }
                      },
                      'enter-from-left': {
                        '0%': { transform: 'translateX(-200px)', opacity: '0' },
                        '100%': { transform: 'translateX(0)', opacity: '1' }
                      },
                      'exit-to-right': {
                        '0%': { transform: 'translateX(0)', opacity: '1' },
                        '100%': { transform: 'translateX(200px)', opacity: '0' }
                      },
                      'exit-to-left': {
                        '0%': { transform: 'translateX(0)', opacity: '1' },
                        '100%': { transform: 'translateX(-200px)', opacity: '0' }
                      },
                      'scale-in-content': {
                        '0%': { transform: 'rotateX(-30deg) scale(0.9)', opacity: '0' },
                        '100%': { transform: 'rotateX(0deg) scale(1)', opacity: '1' }
                      },
                      'scale-out-content': {
                        '0%': { transform: 'rotateX(0deg) scale(1)', opacity: '1' },
                        '100%': { transform: 'rotateX(-10deg) scale(0.95)', opacity: '0' }
                      },
                      'fade-in': {
                        '0%': { opacity: '0' },
                        '100%': { opacity: '1' }
                      },
                      'fade-out': {
                        '0%': { opacity: '1' },
                        '100%': { opacity: '0' }
                      },
                      // Toast
                      'toast-hide': {
                        '0%': { opacity: '1' },
                        '100%': { opacity: '0' }
                      },
                      'toast-slide-in-right': {
                        '0%': { transform: 'translateX(calc(100% + 1rem))' },
                        '100%': { transform: 'translateX(0)' }
                      },
                      'toast-slide-in-bottom': {
                        '0%': { transform: 'translateY(calc(100% + 1rem))' },
                        '100%': { transform: 'translateY(0)' }
                      },
                      'toast-swipe-out': {
                        '0%': { transform: 'translateX(var(--radix-toast-swipe-end-x))' },
                        '100%': {
                          transform: 'translateX(calc(100% + 1rem))'
                        }
                      }
                    },
                    animation: {
                      // Dropdown menu
                      'scale-in': 'scale-in 0.2s ease-in-out',
                      'slide-down': 'slide-down 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                      'slide-up': 'slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                      // Tooltip
                      'slide-up-fade': 'slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      'slide-right-fade':
                        'slide-right-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      'slide-down-fade': 'slide-down-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      'slide-left-fade': 'slide-left-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      // Navigation menu
                      'enter-from-right': 'enter-from-right 0.25s ease',
                      'enter-from-left': 'enter-from-left 0.25s ease',
                      'exit-to-right': 'exit-to-right 0.25s ease',
                      'exit-to-left': 'exit-to-left 0.25s ease',
                      'scale-in-content': 'scale-in-content 0.2s ease',
                      'scale-out-content': 'scale-out-content 0.2s ease',
                      'fade-in': 'fade-in 0.2s ease',
                      'fade-out': 'fade-out 0.2s ease',
                      // Toast
                      'toast-hide': 'toast-hide 100ms ease-in forwards',
                      'toast-slide-in-right':
                        'toast-slide-in-right 150ms cubic-bezier(0.16, 1, 0.3, 1)',
                      'toast-slide-in-bottom':
                        'toast-slide-in-bottom 150ms cubic-bezier(0.16, 1, 0.3, 1)',
                      'toast-swipe-out': 'toast-swipe-out 100ms ease-out forwards'
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
