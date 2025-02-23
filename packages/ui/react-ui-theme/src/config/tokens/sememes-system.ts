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

const surface0: Sememe = {
  light: ['neutral', 25],
  dark: ['neutral', 875],
};
const surface10: Sememe = {
  light: ['neutral', 35],
  dark: ['neutral', 850],
};
const surface20: Sememe = {
  light: ['neutral', 45],
  dark: ['neutral', 825],
};
const surface30: Sememe = {
  light: ['neutral', 55],
  dark: ['neutral', 800],
};
const surface40: Sememe = {
  light: ['neutral', 65],
  dark: ['neutral', 775],
};
const surface50: Sememe = {
  light: ['neutral', 80],
  dark: ['neutral', 750],
};
const surface60: Sememe = {
  light: ['neutral', 100],
  dark: ['neutral', 725],
};
const surface90: Sememe = {
  light: ['neutral', 400],
  dark: ['neutral', 400],
};
const surface95: Sememe = {
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
  'surface-90': surface90,
  'surface-95': surface95,
  'surface-95t': applyAlpha(surface95, 0.1),

  'accentSurface-40': {
    light: ['primary', 600],
    dark: ['primary', 475],
  },
  'accentSurface-50': {
    light: ['primary', 500],
    dark: ['primary', 500],
  },

  // Special surfaces (intentionally not part of contrast-order cadence)

  deck: {
    light: surface50.light,
    dark: surface30.dark,
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
  'surface-10': { root: ['attention', 'attentionRelated'], attention: ['baseSurface'] },
  'surface-20': { root: ['baseSurface'], attention: ['groupSurface'] },
  'surface-30': { root: ['groupSurface', 'modalSurface'], attention: ['input'] },
  'surface-40': { root: ['input'], attention: ['hoverSurface'] },
  'surface-50': { root: ['hoverSurface'], attention: ['separator'] },
  'surface-60': { root: ['separator', 'tooltipSurface'] },

  // special surfaces
  'surface-10t': { root: ['scrim'] },
  'surface-90': { root: ['unAccent'] },
  'surface-95': { root: ['unAccentHover'] },
  'surface-95t': { root: ['hoverOverlay'] },
  // accent
  'accentSurface-40': { root: ['accentSurfaceHover'] },
  'accentSurface-50': { root: ['accentSurface'] },
} satisfies ColorAliases;
