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
    text: 'text-[--dx-redText]',
    textHover: 'hover:text-[--dx-redTextHover] focus-visible:text-[--dx-redTextHover]',
    fill: 'fill-[--dx-redFill]',
  },
  orange: {
    text: 'text-[--dx-orangeText]',
    textHover: 'hover:text-[--dx-orangeTextHover] focus-visible:text-[--dx-orangeTextHover]',
    fill: 'fill-[--dx-orangeFill]',
  },
  amber: {
    text: 'text-[--dx-amberText]',
    textHover: 'hover:text-[--dx-amberTextHover] focus-visible:text-[--dx-amberTextHover]',
    fill: 'fill-[--dx-amberFill]',
  },
  yellow: {
    text: 'text-[--dx-yellowText]',
    textHover: 'hover:text-[--dx-yellowTextHover] focus-visible:text-[--dx-yellowTextHover]',
    fill: 'fill-[--dx-yellowFill]',
  },
  lime: {
    text: 'text-[--dx-limeText]',
    textHover: 'hover:text-[--dx-limeTextHover] focus-visible:text-[--dx-limeTextHover]',
    fill: 'fill-[--dx-limeFill]',
  },
  green: {
    text: 'text-[--dx-greenText]',
    textHover: 'hover:text-[--dx-greenTextHover] focus-visible:text-[--dx-greenTextHover]',
    fill: 'fill-[--dx-greenFill]',
  },
  emerald: {
    text: 'text-[--dx-emeraldText]',
    textHover: 'hover:text-[--dx-emeraldTextHover] focus-visible:text-[--dx-emeraldTextHover]',
    fill: 'fill-[--dx-emeraldFill]',
  },
  teal: {
    text: 'text-[--dx-tealText]',
    textHover: 'hover:text-[--dx-tealTextHover] focus-visible:text-[--dx-tealTextHover]',
    fill: 'fill-[--dx-tealFill]',
  },
  cyan: {
    text: 'text-[--dx-cyanText]',
    textHover: 'hover:text-[--dx-cyanTextHover] focus-visible:text-[--dx-cyanTextHover]',
    fill: 'fill-[--dx-cyanFill]',
  },
  sky: {
    text: 'text-[--dx-skyText]',
    textHover: 'hover:text-[--dx-skyTextHover] focus-visible:text-[--dx-skyTextHover]',
    fill: 'fill-[--dx-skyFill]',
  },
  blue: {
    text: 'text-[--dx-blueText]',
    textHover: 'hover:text-[--dx-blueTextHover] focus-visible:text-[--dx-blueTextHover]',
    fill: 'fill-[--dx-blueFill]',
  },
  indigo: {
    text: 'text-[--dx-indigoText]',
    textHover: 'hover:text-[--dx-indigoTextHover] focus-visible:text-[--dx-indigoTextHover]',
    fill: 'fill-[--dx-indigoFill]',
  },
  violet: {
    text: 'text-[--dx-violetText]',
    textHover: 'hover:text-[--dx-violetTextHover] focus-visible:text-[--dx-violetTextHover]',
    fill: 'fill-[--dx-violetFill]',
  },
  purple: {
    text: 'text-[--dx-purpleText]',
    textHover: 'hover:text-[--dx-purpleTextHover] focus-visible:text-[--dx-purpleTextHover]',
    fill: 'fill-[--dx-purpleFill]',
  },
  fuchsia: {
    text: 'text-[--dx-fuchsiaText]',
    textHover: 'hover:text-[--dx-fuchsiaTextHover] focus-visible:text-[--dx-fuchsiaTextHover]',
    fill: 'fill-[--dx-fuchsiaFill]',
  },
  pink: {
    text: 'text-[--dx-pinkText]',
    textHover: 'hover:text-[--dx-pinkTextHover] focus-visible:text-[--dx-pinkTextHover]',
    fill: 'fill-[--dx-pinkFill]',
  },
  rose: {
    text: 'text-[--dx-roseText]',
    textHover: 'hover:text-[--dx-roseTextHover] focus-visible:text-[--dx-roseTextHover]',
    fill: 'fill-[--dx-roseFill]',
  },
};

export const hueTokens: Record<HuePalette, HueToken> = Object.keys(hueTokenThemes).reduce(
  (acc: Record<string, HueToken>, huePalette) => {
    acc[huePalette] = {
      ...hueTokenThemes[huePalette as HuePalette],
      cursorDarkValue: `var(--dx-${huePalette}Cursor)`,
      cursorLightValue: `var(--dx-${huePalette}Cursor)`,
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
