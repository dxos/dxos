//
// Copyright 2024 DXOS.org
//

import type { Theme } from '@dxos/react-ui-types';

import { type HuePalette } from '../../types';

export type HueToken = {
  text: string;
  textHover: string;
  fill: string;
  cursorLightValue: string;
  cursorDarkValue: string;
};

export const hueTokenThemes: Record<HuePalette, Pick<HueToken, 'text' | 'textHover' | 'fill'>> = {
  red: {
    text: 'text-[--dx-red-text]',
    textHover: 'hover:text-[--dx-red-text-hover] focus-visible:text-[--dx-red-text-hover]',
    fill: 'fill-[--dx-red-fill]',
  },
  orange: {
    text: 'text-[--dx-orange-text]',
    textHover: 'hover:text-[--dx-orange-text-hover] focus-visible:text-[--dx-orange-text-hover]',
    fill: 'fill-[--dx-orange-fill]',
  },
  amber: {
    text: 'text-[--dx-amber-text]',
    textHover: 'hover:text-[--dx-amber-text-hover] focus-visible:text-[--dx-amber-text-hover]',
    fill: 'fill-[--dx-amber-fill]',
  },
  yellow: {
    text: 'text-[--dx-yellow-text]',
    textHover: 'hover:text-[--dx-yellow-text-hover] focus-visible:text-[--dx-yellow-text-hover]',
    fill: 'fill-[--dx-yellow-fill]',
  },
  lime: {
    text: 'text-[--dx-lime-text]',
    textHover: 'hover:text-[--dx-lime-text-hover] focus-visible:text-[--dx-lime-text-hover]',
    fill: 'fill-[--dx-lime-fill]',
  },
  green: {
    text: 'text-[--dx-green-text]',
    textHover: 'hover:text-[--dx-green-text-hover] focus-visible:text-[--dx-green-text-hover]',
    fill: 'fill-[--dx-green-fill]',
  },
  emerald: {
    text: 'text-[--dx-emerald-text]',
    textHover: 'hover:text-[--dx-emerald-text-hover] focus-visible:text-[--dx-emerald-text-hover]',
    fill: 'fill-[--dx-emerald-fill]',
  },
  teal: {
    text: 'text-[--dx-teal-text]',
    textHover: 'hover:text-[--dx-teal-text-hover] focus-visible:text-[--dx-teal-text-hover]',
    fill: 'fill-[--dx-teal-fill]',
  },
  cyan: {
    text: 'text-[--dx-cyan-text]',
    textHover: 'hover:text-[--dx-cyan-text-hover] focus-visible:text-[--dx-cyan-text-hover]',
    fill: 'fill-[--dx-cyan-fill]',
  },
  sky: {
    text: 'text-[--dx-sky-text]',
    textHover: 'hover:text-[--dx-sky-text-hover] focus-visible:text-[--dx-sky-text-hover]',
    fill: 'fill-[--dx-sky-fill]',
  },
  blue: {
    text: 'text-[--dx-blue-text]',
    textHover: 'hover:text-[--dx-blue-text-hover] focus-visible:text-[--dx-blue-text-hover]',
    fill: 'fill-[--dx-blue-fill]',
  },
  indigo: {
    text: 'text-[--dx-indigo-text]',
    textHover: 'hover:text-[--dx-indigo-text-hover] focus-visible:text-[--dx-indigo-text-hover]',
    fill: 'fill-[--dx-indigo-fill]',
  },
  violet: {
    text: 'text-[--dx-violet-text]',
    textHover: 'hover:text-[--dx-violet-text-hover] focus-visible:text-[--dx-violet-text-hover]',
    fill: 'fill-[--dx-violet-fill]',
  },
  purple: {
    text: 'text-[--dx-purple-text]',
    textHover: 'hover:text-[--dx-purple-text-hover] focus-visible:text-[--dx-purple-text-hover]',
    fill: 'fill-[--dx-purple-fill]',
  },
  fuchsia: {
    text: 'text-[--dx-fuchsia-text]',
    textHover: 'hover:text-[--dx-fuchsia-text-hover] focus-visible:text-[--dx-fuchsia-text-hover]',
    fill: 'fill-[--dx-fuchsia-fill]',
  },
  pink: {
    text: 'text-[--dx-pink-text]',
    textHover: 'hover:text-[--dx-pink-text-hover] focus-visible:text-[--dx-pink-text-hover]',
    fill: 'fill-[--dx-pink-fill]',
  },
  rose: {
    text: 'text-[--dx-rose-text]',
    textHover: 'hover:text-[--dx-rose-text-hover] focus-visible:text-[--dx-rose-text-hover]',
    fill: 'fill-[--dx-rose-fill]',
  },
};

export const hueTokens: Record<HuePalette, HueToken> = Object.keys(hueTokenThemes).reduce(
  (acc: Record<string, HueToken>, huePalette) => {
    acc[huePalette] = {
      ...hueTokenThemes[huePalette as HuePalette],
      cursorDarkValue: `var(--dx-${huePalette}-cursor)`,
      cursorLightValue: `var(--dx-${huePalette}-cursor)`,
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
