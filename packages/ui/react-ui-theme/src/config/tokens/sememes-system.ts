//
// Copyright 2024 DXOS.org
//

import { type ColorAliases, type ColorSememes } from './types';

export const surfaceCadence = {
  dark: [900, 800, 775, 710, 695, 680, 650],
  light: [25, 35, 70, 80, 90],
};

export const systemSememes = {
  // TODO(burdon): Organize by category (e.g., surface, text, etc.)

  //
  // Surfaces (bg-)
  //

  'surface-0': {
    light: ['neutral', surfaceCadence.light[0]],
    dark: ['neutral', surfaceCadence.dark[0]],
  },
  'surface-10': {
    light: ['neutral', surfaceCadence.light[4]],
    dark: ['neutral', surfaceCadence.dark[1]],
  },
  'surface-10t': {
    light: ['neutral', `${surfaceCadence.light[4]}/.65`],
    dark: ['neutral', `${surfaceCadence.dark[1]}/.65`],
  },
  'surface-20': {
    light: ['neutral', surfaceCadence.light[1]],
    dark: ['neutral', surfaceCadence.dark[2]],
  },
  'surface-20t': {
    light: ['neutral', `${surfaceCadence.light[1]}/.88`],
    dark: ['neutral', `${surfaceCadence.dark[2]}/.88`],
  },
  'surface-30': {
    light: ['neutral', surfaceCadence.light[2]],
    dark: ['neutral', surfaceCadence.dark[3]],
  },
  'surface-40': {
    light: ['neutral', surfaceCadence.light[3]],
    dark: ['neutral', surfaceCadence.dark[4]],
  },
  'surface-90t': {
    light: ['neutral', '450/.1'],
    dark: ['neutral', '450/.1'],
  },

  'accentSurface-40': {
    light: ['primary', 600],
    dark: ['primary', 475],
  },
  'accentSurface-50': {
    light: ['primary', 500],
    dark: ['primary', 500],
  },

  //
  // Borders (border-, divide-)
  //

  'surface-50': {
    light: ['neutral', surfaceCadence.light[4]],
    dark: ['neutral', surfaceCadence.dark[6]],
  },

  //
  // Text (text-)
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
  unAccent: {
    light: ['neutral', 400],
    dark: ['neutral', 400],
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
  // neutral
  'surface-0': ['attention', 'currentRelated'],
  'surface-10': ['deck'],
  'surface-10t': ['scrim'],
  'surface-20': ['baseSurface'], // todo: rename uses of the `base` token to `baseSurface`
  'surface-20t': ['modalSurface'],
  'surface-30': ['input'],
  'surface-40': ['hoverSurface'],
  'surface-50': ['separator'],
  // accent
  'accentSurface-40': ['accentSurfaceHover'],
  'accentSurface-50': ['accentSurface'],
} satisfies ColorAliases;
