//
// Copyright 2022 DXOS.org
//

import tailwindcssForms from '@tailwindcss/forms';
import merge from 'lodash.merge';
import tailwindColors from 'tailwindcss/colors';
import defaultConfig from 'tailwindcss/stubs/config.full.js';
import { type Config, type ThemeConfig } from 'tailwindcss/types/config';
import tailwindcssLogical from 'tailwindcss-logical';
import tailwindcssRadix from 'tailwindcss-radix';

import { physicalColors, semanticColors } from './colors';
import { semanticColors as semanticColorsPlugin } from '../util/semanticColors';
// TODO(burdon): from '../util'?

export type TailwindConfig = Config;
export type TailwindThemeConfig = ThemeConfig;

export const tailwindConfig = ({
  env = 'production',
  content = [],
  extensions = [],
}: {
  env?: string;
  content?: string[];
  extensions?: Partial<TailwindThemeConfig>[];
}): TailwindConfig => ({
  darkMode: 'class',
  theme: {
    // Configure fonts in theme.css and package.json.
    fontFamily: {
      body: ['Inter Variable', ...defaultConfig.theme.fontFamily.sans],
      mono: ['JetBrains Mono Variable', ...defaultConfig.theme.fontFamily.mono],
    },
    extend: merge(
      {
        screens: {
          'pointer-fine': { raw: '(pointer: fine)' },
          'hover-hover': { raw: '(hover: hover)' },
        },
        colors: {
          ...physicalColors,
          slate: tailwindColors.slate,
          gray: tailwindColors.gray,
          zinc: tailwindColors.zinc,
          stone: tailwindColors.stone,
          success: physicalColors.emerald,
          warning: physicalColors.amber,
          error: physicalColors.rose,
          info: physicalColors.cyan,
          transparent: 'transparent',
          current: 'currentColor',
          white: '#ffffff',
          black: '#000000',
        },
        semanticColors,
        fontSize: {
          // Base size 16px
          // Scale 1.125
          xs: ['0.790rem', { lineHeight: '1rem' }],
          sm: ['0.889rem', { lineHeight: '1.25rem' }],
          base: ['1rem', { lineHeight: '1.5rem' }],
          lg: ['1.125rem', { lineHeight: '1.75rem' }],
          xl: ['1.266rem', { lineHeight: '1.75rem' }],
          '2xl': ['1.424rem', { lineHeight: '2rem' }],
          '3xl': ['1.602rem', { lineHeight: '2.25rem' }],
          '4xl': ['1.802rem', { lineHeight: '2.5rem' }],
          '5xl': ['2.027rem', { lineHeight: '2.5rem' }],
          '6xl': ['2.281rem', { lineHeight: '2.5rem' }],
          '7xl': ['2.566rem', { lineHeight: '2.75rem' }],
          '8xl': ['2.887rem', { lineHeight: '3rem' }],
          '9xl': ['3.247rem', { lineHeight: '3.25rem' }],
        },
        outlineWidth: {
          3: '3px',
        },
        boxShadow: {
          slider: '0 0 0 5px rgba(0, 0, 0, 0.3)',
        },
        transitionProperty: {
          'max-height': 'max-height',
        },
        keyframes: {
          // Popper chrome
          slideDownAndFade: {
            from: { opacity: 0, transform: 'translateY(-2px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          slideLeftAndFade: {
            from: { opacity: 0, transform: 'translateX(2px)' },
            to: { opacity: 1, transform: 'translateX(0)' },
          },
          slideUpAndFade: {
            from: { opacity: 0, transform: 'translateY(2px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          slideRightAndFade: {
            from: { opacity: 0, transform: 'translateX(-2px)' },
            to: { opacity: 1, transform: 'translateX(0)' },
          },

          // Toast
          'toast-hide': {
            '0%': { opacity: '1' },
            '100%': { opacity: '0' },
          },
          'toast-slide-in-right': {
            '0%': { transform: 'translateX(calc(100% + 1rem))' },
            '100%': { transform: 'translateX(0)' },
          },
          'toast-slide-in-bottom': {
            '0%': { transform: 'translateY(calc(100% + 1rem))' },
            '100%': { transform: 'translateY(0)' },
          },
          'toast-swipe-out': {
            '0%': {
              transform: 'translateX(var(--radix-toast-swipe-end-x))',
            },
            '100%': {
              transform: 'translateX(calc(100% + 1rem))',
            },
          },

          // Shimmer
          'shimmer-loop': {
            '100%': {
              transform: 'translateX(100%)',
            },
          },

          'halo-pulse': {
            '0%': {
              opacity: 0.3,
            },
            '5%': {
              opacity: 1,
            },
            '100%': {
              opacity: 0.3,
            },
          },

          'progress-indeterminate': {
            '0%': {
              left: 0,
              width: '0%',
            },
            '25%': {
              left: '25%',
              width: '50%',
            },
            '75%': {
              left: '50%',
              width: '100%',
            },
            '100%': {
              left: '100%',
              width: '0%',
            },
          },
        },
        animation: {
          // Popper chrome
          slideDownAndFade: 'slideDownAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
          slideLeftAndFade: 'slideLeftAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
          slideUpAndFade: 'slideUpAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
          slideRightAndFade: 'slideRightAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',

          // Toast
          'toast-hide': 'toast-hide 100ms ease-in forwards',
          'toast-slide-in-right': 'toast-slide-in-right 150ms cubic-bezier(0.16, 1, 0.3, 1)',
          'toast-slide-in-bottom': 'toast-slide-in-bottom 150ms cubic-bezier(0.16, 1, 0.3, 1)',
          'toast-swipe-out': 'toast-swipe-out 100ms ease-out forwards',

          spin: 'spin 1.5s linear infinite',
          'spin-slow': 'spin 3s linear infinite',

          shimmer: 'shimmer-loop 2s infinite',
          'halo-pulse': 'halo-pulse 2s ease-out infinite',
          'progress-indeterminate': 'progress-indeterminate 2s ease-out infinite',
        },
      },
      ...extensions,
    ),
  },
  plugins: [semanticColorsPlugin, tailwindcssLogical, tailwindcssForms, tailwindcssRadix()],
  ...(env === 'development' && { mode: 'jit' }),
  content,
  future: {
    hoverOnlyWhenSupported: true,
  },
});
