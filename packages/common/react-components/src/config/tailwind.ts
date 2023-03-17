//
// Copyright 2022 DXOS.org
//

import tailwindcssForms from '@tailwindcss/forms';
import merge from 'lodash.merge';
import tailwindcssLogical from 'tailwindcss-logical';
import tailwindcssRadix from 'tailwindcss-radix';
import tailwindColors from 'tailwindcss/colors';
import defaultConfig from 'tailwindcss/stubs/defaultConfig.stub.js';
import { Config, ThemeConfig } from 'tailwindcss/types/config';

export type TailwindConfig = Config;
export type TailwindThemeConfig = ThemeConfig;

export const configPalettes = {
  red: {
    50: '#ffedea',
    100: '#ffdad4',
    150: '#ffc7bf',
    200: '#ffb2a9',
    250: '#ff9d94',
    300: '#ff877f',
    350: '#ff6d69',
    400: '#fe4e55',
    450: '#f72d45',
    500: '#ea003a',
    550: '#d20034',
    600: '#bb002e',
    650: '#a50029',
    700: '#8f0023',
    750: '#7a001d',
    800: '#660017',
    850: '#520010',
    900: '#3f0006',
    950: '#280300'
  },
  orange: {
    50: '#ffede3',
    100: '#ffdbc7',
    150: '#ffc8ab',
    200: '#ffb48e',
    250: '#ffa072',
    300: '#ff8954',
    350: '#ff7035',
    400: '#f0612c',
    450: '#e15222',
    500: '#d2441b',
    550: '#c13514',
    600: '#b1270e',
    650: '#9f1a09',
    700: '#8d0c05',
    750: '#7b0101',
    800: '#650300',
    850: '#4f0800',
    900: '#380b00',
    950: '#220800'
  },
  amber: {
    50: '#ffeed7',
    100: '#ffddae',
    150: '#ffca84',
    200: '#ffb758',
    250: '#ffa222',
    300: '#f59209',
    350: '#e78300',
    400: '#d97500',
    450: '#ca6700',
    500: '#bc5a00',
    550: '#ad4d00',
    600: '#9d4000',
    650: '#8e3400',
    700: '#7e2900',
    750: '#6d2000',
    800: '#5a1800',
    850: '#471300',
    900: '#340f00',
    950: '#200a00'
  },
  yellow: {
    50: '#fff1b3',
    100: '#ffe055',
    150: '#fad000',
    200: '#f0bf00',
    250: '#e6af00',
    300: '#dba000',
    350: '#cf9100',
    400: '#c38200',
    450: '#b77400',
    500: '#aa6600',
    550: '#9d5800',
    600: '#904b00',
    650: '#823f00',
    700: '#743300',
    750: '#652800',
    800: '#541f00',
    850: '#431700',
    900: '#311200',
    950: '#1f0b00'
  },
  lime: {
    50: '#e4fb8c',
    100: '#cfef63',
    150: '#bde243',
    200: '#acd528',
    250: '#9cc70a',
    300: '#8fb900',
    350: '#83ab00',
    400: '#779d00',
    450: '#6c8f00',
    500: '#608100',
    550: '#557400',
    600: '#4b6700',
    650: '#405a00',
    700: '#364d00',
    750: '#2d4100',
    800: '#253500',
    850: '#1e2900',
    900: '#171e00',
    950: '#0e1200'
  },
  green: {
    50: '#e0f9c8',
    100: '#c2f09d',
    150: '#a6e67b',
    200: '#8bda5e',
    250: '#72ce45',
    300: '#5bc130',
    350: '#44b41b',
    400: '#2ca704',
    450: '#1b9900',
    500: '#0a8a00',
    550: '#007c04',
    600: '#006e0a',
    650: '#00600c',
    700: '#00530d',
    750: '#00460c',
    800: '#003909',
    850: '#022d07',
    900: '#072005',
    950: '#031402'
  },
  emerald: {
    50: '#c5ffc9',
    100: '#7dfd93',
    150: '#4ff17a',
    200: '#24e469',
    250: '#00d561',
    300: '#00c55b',
    350: '#00b656',
    400: '#00a750',
    450: '#00984a',
    500: '#008a44',
    550: '#007b3e',
    600: '#006d37',
    650: '#005f30',
    700: '#00522a',
    750: '#004523',
    800: '#00391c',
    850: '#002c15',
    900: '#00210e',
    950: '#001507'
  },
  teal: {
    50: '#d4fae1',
    100: '#b2f1ca',
    150: '#95e6b7',
    200: '#7adaa6',
    250: '#61cd98',
    300: '#49c08a',
    350: '#30b37e',
    400: '#0fa573',
    450: '#009769',
    500: '#008860',
    550: '#007a57',
    600: '#006c4e',
    650: '#005e45',
    700: '#00513c',
    750: '#004433',
    800: '#00382a',
    850: '#002c21',
    900: '#002018',
    950: '#00140e'
  },
  cyan: {
    50: '#d4f9f7',
    100: '#b5eeec',
    150: '#9be2e1',
    200: '#84d5d5',
    250: '#6fc8ca',
    300: '#5bbabe',
    350: '#47adb2',
    400: '#34a0a6',
    450: '#1d929a',
    500: '#00858e',
    550: '#007780',
    600: '#006973',
    650: '#005c65',
    700: '#004f58',
    750: '#00424b',
    800: '#00363e',
    850: '#002a31',
    900: '#001f25',
    950: '#001417'
  },
  sky: {
    50: '#e9f2ff',
    100: '#d1e5ff',
    150: '#b9d8ff',
    200: '#9fccff',
    250: '#85bffd',
    300: '#6fb2f4',
    350: '#5aa5ea',
    400: '#4498df',
    450: '#2d8bd3',
    500: '#0d7ec5',
    550: '#0071b3',
    600: '#00649f',
    650: '#00578c',
    700: '#004b79',
    750: '#003f67',
    800: '#003355',
    850: '#002844',
    900: '#001d34',
    950: '#001222'
  },
  blue: {
    50: '#edf1ff',
    100: '#dbe2ff',
    150: '#c9d4ff',
    200: '#b6c6ff',
    250: '#a3b8ff',
    300: '#8faaff',
    350: '#799cff',
    400: '#658efb',
    450: '#5281f2',
    500: '#3e74e7',
    550: '#2967dc',
    600: '#0b5ace',
    650: '#004eb9',
    700: '#0043a3',
    750: '#00378d',
    800: '#002d77',
    850: '#002261',
    900: '#00184c',
    950: '#000d39'
  },
  indigo: {
    50: '#f1f0ff',
    100: '#e3e0ff',
    150: '#d4d1ff',
    200: '#c5c1ff',
    250: '#b5b2ff',
    300: '#a5a3ff',
    350: '#9495ff',
    400: '#8186ff',
    450: '#7079f7',
    500: '#5e6ced',
    550: '#4c5fe2',
    600: '#3953d6',
    650: '#2248c9',
    700: '#003cb9',
    750: '#00329e',
    800: '#002984',
    850: '#001f6b',
    900: '#08174d',
    950: '#0e0d2b'
  },
  violet: {
    50: '#f2efff',
    100: '#e5dfff',
    150: '#d8cfff',
    200: '#cbbfff',
    250: '#beafff',
    300: '#b0a0ff',
    350: '#a391f9',
    400: '#9582f2',
    450: '#8874e9',
    500: '#7a66df',
    550: '#6d59d5',
    600: '#5f4cca',
    650: '#513fbe',
    700: '#4332b1',
    750: '#3425a5',
    800: '#251997',
    850: '#100b8a',
    900: '#0e066a',
    950: '#150638'
  },
  purple: {
    50: '#f7eeff',
    100: '#eedcff',
    150: '#e4cbfe',
    200: '#d9bbfa',
    250: '#cdabf4',
    300: '#c29cee',
    350: '#b58de6',
    400: '#a97ede',
    450: '#9c70d4',
    500: '#8f62cb',
    550: '#8254c0',
    600: '#7547b5',
    650: '#683aa9',
    700: '#5a2d9d',
    750: '#4d2091',
    800: '#3f1384',
    850: '#310477',
    900: '#250656',
    950: '#19072d'
  },
  fuchsia: {
    50: '#fdecff',
    100: '#fad8ff',
    150: '#f6c4ff',
    200: '#efb2fa',
    250: '#e6a1f3',
    300: '#db90eb',
    350: '#d080e1',
    400: '#c570d7',
    450: '#b961cc',
    500: '#ac52c1',
    550: '#9f43b5',
    600: '#9234a9',
    650: '#85249c',
    700: '#77128f',
    750: '#680080',
    800: '#57006a',
    850: '#450056',
    900: '#350042',
    950: '#24002c'
  },
  pink: {
    50: '#ffecf5',
    100: '#ffd8ea',
    150: '#ffc4e0',
    200: '#ffaed5',
    250: '#ff98cc',
    300: '#fc82c1',
    350: '#f170b5',
    400: '#e560a8',
    450: '#d94f9c',
    500: '#cb3e8f',
    550: '#bd2c82',
    600: '#af1776',
    650: '#9f0068',
    700: '#8a005a',
    750: '#75004c',
    800: '#61003e',
    850: '#4e0031',
    900: '#3c0025',
    950: '#290018'
  },
  rose: {
    50: '#ffedee',
    100: '#ffd9dd',
    150: '#ffc5cc',
    200: '#ffb1bb',
    250: '#ff9baa',
    300: '#ff8499',
    350: '#ff6a89',
    400: '#fd4c79',
    450: '#ef396c',
    500: '#e02360',
    550: '#d00054',
    600: '#ba004a',
    650: '#a30040',
    700: '#8e0037',
    750: '#79002d',
    800: '#650024',
    850: '#51001c',
    900: '#3e0013',
    950: '#2b0007'
  },
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
    75: '#eaeaee',
    50: '#f1f1f4',
    25: '#f8f8fa'
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
  }
};

export const tailwindConfig = ({
  env = 'production',
  root = './',
  content = [],
  extensions = []
}: {
  env?: string;
  root?: string;
  content?: string[];
  extensions?: Partial<TailwindThemeConfig>[];
}): TailwindConfig => ({
  darkMode: 'class',
  theme: {
    fontFamily: {
      body: ['Roboto FlexVariable', ...defaultConfig.theme.fontFamily.sans],
      display: ['Space GroteskVariable', 'Roboto FlexVariable', ...defaultConfig.theme.fontFamily.sans],
      mono: ['Fira CodeVariable', ...defaultConfig.theme.fontFamily.mono]
    },
    extend: merge(
      {
        colors: {
          ...configPalettes,
          slate: tailwindColors.slate,
          gray: tailwindColors.gray,
          zinc: tailwindColors.zinc,
          stone: tailwindColors.stone,
          success: configPalettes.emerald,
          warning: configPalettes.amber,
          error: configPalettes.rose,
          info: configPalettes.cyan,
          transparent: 'transparent',
          current: 'currentColor',
          white: '#ffffff',
          black: '#000000'
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
          '9xl': ['3.247rem', { lineHeight: '3.25rem' }]
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
            '100%': {
              transform: 'translateX(-200px)',
              opacity: '0'
            }
          },
          'scale-in-content': {
            '0%': {
              transform: 'rotateX(-30deg) scale(0.9)',
              opacity: '0'
            },
            '100%': {
              transform: 'rotateX(0deg) scale(1)',
              opacity: '1'
            }
          },
          'scale-out-content': {
            '0%': {
              transform: 'rotateX(0deg) scale(1)',
              opacity: '1'
            },
            '100%': {
              transform: 'rotateX(-10deg) scale(0.95)',
              opacity: '0'
            }
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
            '0%': {
              transform: 'translateX(var(--radix-toast-swipe-end-x))'
            },
            '100%': {
              transform: 'translateX(calc(100% + 1rem))'
            }
          },
          // Shimmer
          'shimmer-loop': {
            '100%': {
              transform: 'translateX(100%)'
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
          'slide-right-fade': 'slide-right-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
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
          'toast-slide-in-right': 'toast-slide-in-right 150ms cubic-bezier(0.16, 1, 0.3, 1)',
          'toast-slide-in-bottom': 'toast-slide-in-bottom 150ms cubic-bezier(0.16, 1, 0.3, 1)',
          'toast-swipe-out': 'toast-swipe-out 100ms ease-out forwards',
          // Shimmer
          shimmer: 'shimmer-loop 2s infinite'
        }
      },
      ...extensions
    )
  },
  plugins: [tailwindcssLogical, tailwindcssForms, tailwindcssRadix()],
  ...(env === 'development' && { mode: 'jit' }),
  content,
  future: {
    hoverOnlyWhenSupported: true
  }
});
