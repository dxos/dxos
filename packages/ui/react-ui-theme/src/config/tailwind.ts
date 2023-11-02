//
// Copyright 2022 DXOS.org
//

import {
  curvePathFromPalette,
  paletteShadesFromCurve,
  Lab_to_hex as labToHex,
  hex_to_LCH as hexToLch,
} from '@fluent-blocks/colors';
import tailwindcssForms from '@tailwindcss/forms';
import merge from 'lodash.merge';
import tailwindColors from 'tailwindcss/colors';
import defaultConfig from 'tailwindcss/stubs/config.full.js';
import { type Config, type ThemeConfig } from 'tailwindcss/types/config';
import tailwindcssLogical from 'tailwindcss-logical';
import tailwindcssRadix from 'tailwindcss-radix';

export type TailwindConfig = Config;
export type TailwindThemeConfig = ThemeConfig;

export type PaletteConfig = {
  keyColor: string;
  darkCp: number;
  lightCp: number;
  hueTorsion: number;
};

const shadeNumbers: number[] = /* [...Array(19)].map((_, i) => 50 + i * 50); */ [
  50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950,
];

const broadShadeNumbers: number[] = [
  12, 25, 37, 50, 75, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 925,
  950, 975,
];

const dtor = Math.PI / 180;

export const paletteConfigs: Record<string, PaletteConfig> = {
  red: {
    keyColor: '#ee003b',
    darkCp: 1,
    lightCp: 0.13,
    hueTorsion: 5.5 * dtor,
  },
  orange: {
    keyColor: '#fa6b32',
    darkCp: 0.725,
    lightCp: 1,
    hueTorsion: 13 * dtor,
  },
  amber: {
    keyColor: '#f08c00',
    darkCp: 1,
    lightCp: 1,
    hueTorsion: 24 * dtor,
  },
  yellow: {
    keyColor: '#ffd900',
    darkCp: 1,
    lightCp: 1,
    hueTorsion: 32 * dtor,
  },
  lime: {
    keyColor: '#99c400',
    darkCp: 1,
    lightCp: 1,
    hueTorsion: -3.5 * dtor,
  },
  green: {
    keyColor: '#30a908',
    darkCp: 0.35,
    lightCp: 0.665,
    hueTorsion: -10.5 * dtor,
  },
  emerald: {
    keyColor: '#15e066',
    darkCp: 1,
    lightCp: 0.735,
    hueTorsion: -7 * dtor,
  },
  teal: {
    keyColor: '#00a270',
    darkCp: 1,
    lightCp: 0.755,
    hueTorsion: -12 * dtor,
  },
  cyan: {
    keyColor: '#048992',
    darkCp: 1,
    lightCp: 0.855,
    hueTorsion: -15 * dtor,
  },
  sky: {
    keyColor: '#007bc2',
    darkCp: 1,
    lightCp: 0.64,
    hueTorsion: 0,
  },
  blue: {
    keyColor: '#0058cb',
    darkCp: 1,
    lightCp: 0.495,
    hueTorsion: -7 * dtor,
  },
  indigo: {
    keyColor: '#1b45c5',
    darkCp: 0.495,
    lightCp: 0.55,
    hueTorsion: 0,
  },
  violet: {
    keyColor: '#080886',
    darkCp: 0.195,
    lightCp: 0.635,
    hueTorsion: -5 * dtor,
  },
  purple: {
    keyColor: '#2c0073',
    darkCp: 0,
    lightCp: 0.63,
    hueTorsion: 0,
  },
  fuchsia: {
    keyColor: '#6d0085',
    darkCp: 1,
    lightCp: 0.695,
    hueTorsion: 0,
  },
  pink: {
    keyColor: '#a5006d',
    darkCp: 1,
    lightCp: 0.775,
    hueTorsion: 0,
  },
  rose: {
    keyColor: '#d00054',
    darkCp: 1,
    lightCp: 1,
    hueTorsion: 0,
  },
  neutral: {
    keyColor: '#707076',
    darkCp: 0.8,
    lightCp: 0.88,
    hueTorsion: 0,
  },
  primary: {
    keyColor: '#00e0e0',
    darkCp: 1,
    lightCp: 1,
    hueTorsion: -73.5 * dtor,
  },
};

// TODO(burdon): Changed to neutral.
paletteConfigs.primary = paletteConfigs.neutral;

export const configColors = Object.keys(paletteConfigs).reduce(
  (acc: Record<string, Record<string, string>>, palette) => {
    const isBroad = palette === 'neutral' || palette === 'primary';
    const paletteConfig = paletteConfigs[palette] as PaletteConfig;
    const curve = curvePathFromPalette({
      ...paletteConfig,
      keyColor: hexToLch(paletteConfig.keyColor),
    });
    const defaultShades = paletteShadesFromCurve(curve, 21, [0, 100 * (22 / 21)], 1, 24).reverse();
    const renderCssValue = (shadeNumber: number) => {
      if (shadeNumber > 999) {
        return '#000000';
      } else if (shadeNumber < 1) {
        return '#ffffff';
      } else if (shadeNumber % 50 === 0) {
        return labToHex(defaultShades[shadeNumber / 50]);
      } else {
        const k2 = (shadeNumber % 50) / 50;
        const k1 = 1 - k2;
        const [l1, a1, b1] = defaultShades[Math.floor(shadeNumber / 50)];
        const [l2, a2, b2] = defaultShades[Math.ceil(shadeNumber / 50)];
        return labToHex([l1 * k1 + l2 * k2, a1 * k1 + a2 * k2, b1 * k1 + b2 * k2]);
      }
    };
    acc[palette] = (isBroad ? broadShadeNumbers : shadeNumbers).reduce((acc: Record<string, string>, shadeNumber) => {
      acc[`${shadeNumber}`] = renderCssValue(shadeNumber);
      return acc;
    }, {});

    return acc;
  },
  {},
);

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
    fontFamily: {
      body: ['Roboto FlexVariable', ...defaultConfig.theme.fontFamily.sans],
      display: ['Space GroteskVariable', 'Roboto FlexVariable', ...defaultConfig.theme.fontFamily.sans],
      mono: ['Fira CodeVariable', ...defaultConfig.theme.fontFamily.mono],
    },
    extend: merge(
      {
        screens: {
          'pointer-fine': { raw: '(pointer: fine)' },
          'hover-hover': { raw: '(hover: hover)' },
        },
        colors: {
          ...configColors,
          slate: tailwindColors.slate,
          gray: tailwindColors.gray,
          zinc: tailwindColors.zinc,
          stone: tailwindColors.stone,
          success: configColors.emerald,
          warning: configColors.amber,
          error: configColors.rose,
          info: configColors.cyan,
          transparent: 'transparent',
          current: 'currentColor',
          white: '#ffffff',
          black: '#000000',
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
        outlineWidth: {
          3: '3px',
        },
        boxShadow: {
          slider: '0 0 0 5px rgba(0, 0, 0, 0.3)',
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
            '50%': {
              left: 0,
              width: '100%',
            },
            '100%': {
              width: '0%',
              left: '100%',
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
          // Shimmer
          shimmer: 'shimmer-loop 2s infinite',
          // halo-pulse
          'halo-pulse': 'halo-pulse 2s ease-out infinite',
          // progress-indeterminate
          'progress-indeterminate': 'progress-indeterminate 2s ease-out infinite',
        },
      },
      ...extensions,
    ),
  },
  plugins: [tailwindcssLogical, tailwindcssForms, tailwindcssRadix()],
  ...(env === 'development' && { mode: 'jit' }),
  content,
  future: {
    hoverOnlyWhenSupported: true,
  },
});
