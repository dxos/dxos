//
// Copyright 2024 DXOS.org
//

import { type ColorSememes } from './types';

const surfaceCadence = {
  dark: [900, 800, 775, 710, 695, 680, 650],
  light: [25, 35, 70, 80, 90],
};

export const systemSememes = {
  // TODO(burdon): Organize by category (e.g., surface, text, etc.)

  //
  // Surfaces (bg-)
  //

  attention: {
    light: ['neutral', surfaceCadence.light[0]],
    dark: ['neutral', surfaceCadence.dark[0]],
  },
  deck: {
    light: ['neutral', surfaceCadence.light[4]],
    dark: ['neutral', surfaceCadence.dark[1]],
  },
  scrim: {
    light: ['neutral', `${surfaceCadence.light[4]}/.65`],
    dark: ['neutral', `${surfaceCadence.dark[1]}/.65`],
  },
  base: {
    light: ['neutral', surfaceCadence.light[1]],
    dark: ['neutral', surfaceCadence.dark[2]],
  },
  input: {
    light: ['neutral', surfaceCadence.light[2]],
    dark: ['neutral', surfaceCadence.dark[3]],
  },
  modalSelected: {
    light: ['neutral', surfaceCadence.light[2]],
    dark: ['neutral', surfaceCadence.dark[3]],
  },
  hoverSurface: {
    light: ['neutral', surfaceCadence.light[3]],
    dark: ['neutral', surfaceCadence.dark[4]],
  },
  modalSurface: {
    light: ['neutral', `${surfaceCadence.light[1]}/.88`],
    dark: ['neutral', `${surfaceCadence.dark[2]}/.88`],
    // light: ['neutral', surfaceCadence.light[0]],
    // dark: ['neutral', surfaceCadence.dark[5]],
  },
  accentSurface: {
    light: ['primary', 500],
    dark: ['primary', 500],
  },
  accentSurfaceHover: {
    light: ['primary', 600],
    dark: ['primary', 475],
  },
  hoverOverlay: {
    light: ['neutral', '450/.1'],
    dark: ['neutral', '450/.1'],
  },
  //
  // Borders (border-, divide-)
  //

  separator: {
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
