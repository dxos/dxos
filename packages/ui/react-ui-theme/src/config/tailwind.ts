//
// Copyright 2022 DXOS.org
//

import tailwindcssContainerQueries from '@tailwindcss/container-queries';
import tailwindcssForms from '@tailwindcss/forms';
import merge from 'lodash.merge';
import tailwindScrollbar from 'tailwind-scrollbar';
import defaultConfig from 'tailwindcss/stubs/config.full.js';
import { type Config, type ThemeConfig } from 'tailwindcss/types/config';
import tailwindcssLogical from 'tailwindcss-logical';
import tailwindcssRadix from 'tailwindcss-radix';

import { tokensTailwindConfig } from './tokens';

export type TailwindConfig = Config;
export type TailwindThemeConfig = ThemeConfig;

const { extend: extendTokens, ...overrideTokens } = tokensTailwindConfig;

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
        spacing: {
          prose: 'var(--dx-prose)',
          containerMaxWidth: 'var(--dx-containerMaxWidth)',
          cardMinWidth: 'var(--dx-cardMinWidth)',
          cardMaxWidth: 'var(--dx-cardMaxWidth)',
          popoverMaxWidth: 'var(--dx-popoverMaxWidth)',
        },
        borderRadius: {
          none: '0',
          sm: '0.25rem',
          DEFAULT: '0.5rem',
          md: '.75rem',
          lg: '1rem',
        },
        screens: {
          'pointer-fine': { raw: '(pointer: fine)' },
          'hover-hover': { raw: '(hover: hover)' },
          md: '768px',
          lg: '1024px',
        },
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
        boxShadow: {
          slider: '0 0 0 5px rgba(0, 0, 0, 0.3)',
        },
        transitionProperty: {
          'max-height': 'max-height',
        },
        transitionTimingFunction: {
          'in-out-symmetric': 'cubic-bezier(0.5,0,0.5,1)',
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
          fadeIn: {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
          // Accordion
          slideDown: {
            from: { height: '0px' },
            to: { height: 'var(--radix-accordion-content-height)' },
          },
          slideUp: {
            from: { height: 'var(--radix-accordion-content-height)' },
            to: { height: '0px' },
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

          'progress-linear': {
            '0%': {
              transform: 'translateX(-100%)',
            },
            '85%, 100%': {
              transform: `translateX(${(100 / 28) * 100}%)`,
            },
          },
        },
        animation: {
          'fade-in': 'fadeIn 100ms ease-in forwards',

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

          // Accordion
          slideDown: 'slideDown 300ms cubic-bezier(0.87, 0, 0.13, 1)',
          slideUp: 'slideUp 300ms cubic-bezier(0.87, 0, 0.13, 1)',

          spin: 'spin 1.5s linear infinite',
          'spin-slow': 'spin 3s linear infinite',

          shimmer: 'shimmer-loop 2s infinite',
          'halo-pulse': 'halo-pulse 2s ease-out infinite',
          'progress-indeterminate': 'progress-indeterminate 2s ease-out infinite',
          'progress-linear': 'progress-linear 2s ease-out infinite',
        },
      },
      extendTokens,
      ...extensions,
    ),
    ...overrideTokens,
    colors: {
      ...overrideTokens.colors,
      inherit: 'inherit',
      current: 'currentColor',
      transparent: 'transparent',
      black: 'black',
      white: 'white',
    },
  },
  plugins: [
    tailwindcssContainerQueries,
    tailwindcssForms,
    tailwindcssLogical,
    tailwindcssRadix(),
    // https://adoxography.github.io/tailwind-scrollbar/utilities
    tailwindScrollbar,
  ],
  ...(env === 'development' && { mode: 'jit' }),
  content,
  future: {
    hoverOnlyWhenSupported: true,
  },
});
