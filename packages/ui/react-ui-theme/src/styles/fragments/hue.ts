//
// Copyright 2024 DXOS.org
//

import type { Theme } from '@dxos/react-ui-types';

import { type HuePalette, physicalColors } from '../../config';

export type HueToken = {
  text: string;
  textHover: string;
  fill: string;
  cursorLightValue: string;
  cursorDarkValue: string;
  // highlightLightValue: string;
  // highlightDarkValue: string;
};

const hueTokenValueShades = {
  cursorLightValue: 400,
  cursorDarkValue: 300,
  // highlightLightValue: 50,
  // highlightDarkValue: 900,
};

export const hueTokenThemes: Record<HuePalette, Pick<HueToken, 'text' | 'textHover' | 'fill'>> = {
  red: {
    text: 'text-red-550 dark:text-red-300',
    textHover: 'hover:text-red-450 focus-visible:text-red-450 dark:hover:text-red-200 dark:focus-visible:text-red-200',
    fill: 'fill-red-500/60',
  },
  orange: {
    text: 'text-orange-550 dark:text-orange-300',
    textHover:
      'hover:text-orange-450 focus-visible:text-orange-450 dark:hover:text-orange-200 dark:focus-visible:text-orange-200',
    fill: 'fill-orange-500/60',
  },
  amber: {
    text: 'text-amber-550 dark:text-amber-300',
    textHover:
      'hover:text-amber-450 focus-visible:text-amber-450 dark:hover:text-amber-200 dark:focus-visible:text-amber-200',
    fill: 'fill-amber-500/60',
  },
  yellow: {
    text: 'text-yellow-550 dark:text-yellow-300',
    textHover:
      'hover:text-yellow-450 focus-visible:text-yellow-450 dark:hover:text-yellow-200 dark:focus-visible:text-yellow-200',
    fill: 'fill-yellow-500/60',
  },
  lime: {
    text: 'text-lime-550 dark:text-lime-300',
    textHover:
      'hover:text-lime-450 focus-visible:text-lime-450 dark:hover:text-lime-200 dark:focus-visible:text-lime-200',
    fill: 'fill-lime-500/60',
  },
  green: {
    text: 'text-green-550 dark:text-green-300',
    textHover:
      'hover:text-green-450 focus-visible:text-green-450 dark:hover:text-green-200 dark:focus-visible:text-green-200',
    fill: 'fill-green-500/60',
  },
  emerald: {
    text: 'text-emerald-550 dark:text-emerald-300',
    textHover:
      'hover:text-emerald-450 focus-visible:text-emerald-450 dark:hover:text-emerald-200 dark:focus-visible:text-emerald-200',
    fill: 'fill-emerald-500/60',
  },
  teal: {
    text: 'text-teal-550 dark:text-teal-300',
    textHover:
      'hover:text-teal-450 focus-visible:text-teal-450 dark:hover:text-teal-200 dark:focus-visible:text-teal-200',
    fill: 'fill-teal-500/60',
  },
  cyan: {
    text: 'text-cyan-550 dark:text-cyan-300',
    textHover:
      'hover:text-cyan-450 focus-visible:text-cyan-450 dark:hover:text-cyan-200 dark:focus-visible:text-cyan-200',
    fill: 'fill-cyan-500/60',
  },
  sky: {
    text: 'text-sky-550 dark:text-sky-300',
    textHover: 'hover:text-sky-450 focus-visible:text-sky-450 dark:hover:text-sky-200 dark:focus-visible:text-sky-200',
    fill: 'fill-sky-500/60',
  },
  blue: {
    text: 'text-blue-550 dark:text-blue-300',
    textHover:
      'hover:text-blue-450 focus-visible:text-blue-450 dark:hover:text-blue-200 dark:focus-visible:text-blue-200',
    fill: 'fill-blue-500/60',
  },
  indigo: {
    text: 'text-indigo-550 dark:text-indigo-300',
    textHover:
      'hover:text-indigo-450 focus-visible:text-indigo-450 dark:hover:text-indigo-200 dark:focus-visible:text-indigo-200',
    fill: 'fill-indigo-500/60',
  },
  violet: {
    text: 'text-violet-550 dark:text-violet-300',
    textHover:
      'hover:text-violet-450 focus-visible:text-violet-450 dark:hover:text-violet-200 dark:focus-visible:text-violet-200',
    fill: 'fill-violet-500/60',
  },
  purple: {
    text: 'text-purple-550 dark:text-purple-300',
    textHover:
      'hover:text-purple-450 focus-visible:text-purple-450 dark:hover:text-purple-200 dark:focus-visible:text-purple-200',
    fill: 'fill-purple-500/60',
  },
  fuchsia: {
    text: 'text-fuchsia-550 dark:text-fuchsia-300',
    textHover:
      'hover:text-fuchsia-450 focus-visible:text-fuchsia-450 dark:hover:text-fuchsia-200 dark:focus-visible:text-fuchsia-200',
    fill: 'fill-fuchsia-500/60',
  },
  pink: {
    text: 'text-pink-550 dark:text-pink-300',
    textHover:
      'hover:text-pink-450 focus-visible:text-pink-450 dark:hover:text-pink-200 dark:focus-visible:text-pink-200',
    fill: 'fill-pink-500/60',
  },
  rose: {
    text: 'text-rose-550 dark:text-rose-300',
    textHover:
      'hover:text-rose-450 focus-visible:text-rose-450 dark:hover:text-rose-200 dark:focus-visible:text-rose-200',
    fill: 'fill-rose-500/60',
  },
};

export const hueTokens: Record<HuePalette, HueToken> = Object.keys(hueTokenThemes).reduce(
  (acc: Record<string, HueToken>, huePalette) => {
    acc[huePalette] = {
      ...hueTokenThemes[huePalette as HuePalette],
      cursorDarkValue: `${physicalColors[huePalette][hueTokenValueShades.cursorDarkValue]}88`,
      cursorLightValue: physicalColors[huePalette][hueTokenValueShades.cursorLightValue],
      // highlightDarkValue: physicalColors[huePalette][hueTokenValueShades.highlightDarkValue],
      // highlightLightValue: physicalColors[huePalette][hueTokenValueShades.highlightLightValue],
    };
    return acc;
  },
  {},
);

export type HueStyleProps = {
  hue: HuePalette;
};

export const hueTheme: Theme<Record<string, any>> = {
  text: ({ hue }) => hueTokenThemes[hue as HuePalette].text,
  textHover: ({ hue }) => hueTokenThemes[hue as HuePalette].textHover,
  fill: ({ hue }) => hueTokenThemes[hue as HuePalette].fill,
};
