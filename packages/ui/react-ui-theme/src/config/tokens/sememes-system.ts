//
// Copyright 2024 DXOS.org
//

// TODO(thure): TS2742 at it again
/* eslint-disable unused-imports/no-unused-imports */
import * as _colors from '@ch-ui/colors';

import { type ColorAliases, type ColorSememes } from './types';

type Sememe = ColorSememes[string];

const applyAlpha = (sememe: Sememe, alpha: number): Sememe => {
  return {
    light: [sememe.light![0], `${sememe.light![1]}/${alpha}`],
    dark: [sememe.dark![0], `${sememe.dark![1]}/${alpha}`],
  };
};

// Surface cadence sememes (in contrast-order)

const STEPS = 9;
const DARK_MIN = 875;
const DARK_MAX = 700;
const darkCadence = (step: number) => {
  return DARK_MIN + (DARK_MAX - DARK_MIN) * (step / STEPS);
};
const LIGHT_MIN = 25;
const LIGHT_MAX = 150;
const lightCadence = (step: number) => {
  return LIGHT_MIN + (LIGHT_MAX - LIGHT_MIN) * (step / STEPS);
};

const surface0: Sememe = {
  light: ['neutral', lightCadence(0)],
  dark: ['neutral', darkCadence(0)],
};
const surface10: Sememe = {
  light: ['neutral', lightCadence(1)],
  dark: ['neutral', darkCadence(1)],
};
const surface20: Sememe = {
  light: ['neutral', lightCadence(2)],
  dark: ['neutral', darkCadence(2)],
};
const surface30: Sememe = {
  light: ['neutral', lightCadence(3)],
  dark: ['neutral', darkCadence(3)],
};
const surface40: Sememe = {
  light: ['neutral', lightCadence(4)],
  dark: ['neutral', darkCadence(4)],
};
const surface50: Sememe = {
  light: ['neutral', lightCadence(5)],
  dark: ['neutral', darkCadence(5)],
};
const surface60: Sememe = {
  light: ['neutral', lightCadence(6)],
  dark: ['neutral', darkCadence(6)],
};
const surface70: Sememe = {
  light: ['neutral', lightCadence(7)],
  dark: ['neutral', darkCadence(7)],
};
const surface80: Sememe = {
  light: ['neutral', lightCadence(8)],
  dark: ['neutral', darkCadence(8)],
};
const surface90: Sememe = {
  light: ['neutral', lightCadence(9)],
  dark: ['neutral', darkCadence(9)],
};
const surface100: Sememe = {
  light: ['neutral', lightCadence(10)],
  dark: ['neutral', darkCadence(10)],
};
const surface400: Sememe = {
  light: ['neutral', 400],
  dark: ['neutral', 400],
};
const surface450: Sememe = {
  light: ['neutral', 450],
  dark: ['neutral', 450],
};

export const systemSememes = {
  // TODO(burdon): Organize by category (e.g., surface, text, etc.)

  //
  // Surfaces (bg-)
  //

  'surface-0': surface0,
  'surface-0t': applyAlpha(surface0, 0.88),
  'surface-10': surface10,
  'surface-10t': applyAlpha(surface10, 0.65),
  'surface-20': surface20,
  'surface-30': surface30,
  'surface-40': surface40,
  'surface-50': surface50,
  'surface-60': surface60,
  'surface-70': surface70,
  'surface-80': surface80,
  'surface-90': surface90,
  'surface-100': surface100,
  'surface-400': surface400,
  'surface-450': surface450,
  'surface-450t': applyAlpha(surface450, 0.1),

  'accentSurface-400': {
    light: ['primary', 600],
    dark: ['primary', 475],
  },
  'accentSurface-500': {
    light: ['primary', 500],
    dark: ['primary', 500],
  },

  // Special surfaces (intentionally not part of contrast-order cadence)

  deck: {
    light: surface60.light,
    dark: surface10.dark,
  },

  //
  // Text (text-)
  // TODO(thure): Establish contrast-order cadence for text
  //

  baseText: {
    light: ['neutral', 1000],
    dark: ['neutral', 50],
  },
  description: {
    light: ['neutral', 500],
    dark: ['neutral', 400],
  },
  subdued: {
    light: ['neutral', 700],
    dark: ['neutral', 300],
  },
  accentText: {
    light: ['primary', 550],
    dark: ['primary', 400],
  },
  accentTextHover: {
    light: ['primary', 500],
    dark: ['primary', 350],
  },
  accentFocusIndicator: {
    light: ['primary', 350],
    dark: ['primary', 450],
  },
  unAccentHover: {
    light: ['neutral', 400],
    dark: ['neutral', 500],
  },
  inverse: {
    light: ['neutral', 0],
    dark: ['neutral', 0],
  },
} satisfies ColorSememes;

export const systemAliases = {
  // surface cadence
  'surface-10': { root: ['modalSurface', 'tooltipSurface'] },
  'surface-20': { root: ['attention', 'currentRelated'], attention: ['baseSurface'] },
  'surface-30': { root: ['baseSurface'], attention: ['input'] },
  'surface-40': { root: ['input'], attention: ['groupSurface'] },
  'surface-50': { root: ['groupSurface'], attention: ['hoverSurface'] },
  'surface-60': { root: ['hoverSurface'], attention: ['cardSurface'] },
  'surface-70': { root: ['cardSurface'], attention: ['separator'] },
  'surface-80': { root: ['separator'] },
  // 'surface-80': { root: ['separator'] },
  // 'surface-90': { attention: ['separator'] },
  // 'surface-100': { root: ['separator'] },

  // special surfaces
  'surface-10t': { root: ['scrim'] },
  'surface-400': { root: ['unAccent'] },
  'surface-450': { root: ['unAccentHover'] },
  'surface-450t': { root: ['hoverOverlay'] },
  // accent
  'accentSurface-400': { root: ['accentSurfaceHover'] },
  'accentSurface-500': { root: ['accentSurface'] },
} satisfies ColorAliases;
