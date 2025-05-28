//
// Copyright 2024 DXOS.org
//

import type { AccompanyingSeries, ColorsPhysicalLayer, Gamut, HelicalArcSeries, PhysicalSeries } from '@ch-ui/tokens';

import { type PhysicalPalette } from './types';

const reflectiveRelation = {
  initial: 1_000,
  slope: -1_000,
  method: 'floor',
} satisfies AccompanyingSeries;

const gamuts: (Gamut & string)[] = ['srgb', 'p3', 'rec2020'];

const DEG_RAD = Math.PI / 180;

/**
 * Creates a color palette configuration for a given hue value.
 *
 * @param hue - A number from 0-16 representing different hue angles
 * @returns A PhysicalPalette configuration with:
 * - keyPoint: [lightness, chroma, hue] in LCH color space
 *   - lightness: Fixed at 0.5 (50%)
 *   - chroma: Varies sinusoidally around 0.13 based on hue angle
 *   - hue: Calculated by mapping input 0-16 to 26-386 degrees
 * - Control points and torsion for color interpolation
 */
const hueKeyPoint = (hue: number): PhysicalPalette => {
  const hueDeg = (360 * (hue / 17) + 26) % 360;
  return {
    keyPoint: [0.5, 0.13 + 0.024 * Math.sin((hueDeg - 15) * DEG_RAD), hueDeg],
    lowerCp: 1,
    upperCp: 1,
    torsion: 0,
  };
};

export const huePalettes = {
  redPalette: hueKeyPoint(0),
  orangePalette: hueKeyPoint(1),
  amberPalette: hueKeyPoint(2),
  yellowPalette: hueKeyPoint(3),
  limePalette: hueKeyPoint(4),
  greenPalette: hueKeyPoint(5),
  emeraldPalette: hueKeyPoint(6),
  tealPalette: hueKeyPoint(7),
  cyanPalette: hueKeyPoint(8),
  skyPalette: hueKeyPoint(9),
  bluePalette: hueKeyPoint(10),
  indigoPalette: hueKeyPoint(11),
  violetPalette: hueKeyPoint(12),
  purplePalette: hueKeyPoint(13),
  fuchsiaPalette: hueKeyPoint(14),
  pinkPalette: hueKeyPoint(15),
  rosePalette: hueKeyPoint(16),
};

/**
 * The keyPoint represents the LCH value (Lightness: 0-1; Chroma: min 0, max 0.08–0.3 depending on hue; Hue: 0-360 [~26=Red, ~141=Green, ~262=Blue]).
 *
 * NOTE: Rebuild the theme and restart the dev server to see changes.
 *
 * Theme references:
 * https://oklch.com
 * https://colorsublime.github.io
 * https://github.com/microsoft/vscode-docs/blob/main/api/extension-guides/color-theme.md#create-a-new-color-theme
 * https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/services/themes/common/colorThemeSchema.ts
 * https://tailwindcss.com/docs/colors
 */
const systemPalettes = {
  neutralPalette: {
    keyPoint: [0, 0.01, 260],
    lowerCp: 0,
    upperCp: 0,
    torsion: 0,
    // Values used directly.
    // TODO(burdon): Audit.
    values: [25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 700, 750, 800, 850, 900],
  } satisfies PhysicalPalette,

  // https://oklch.com/#0.5,0.2,260,100 (#0559d2)
  primaryPalette: {
    keyPoint: [0.5, 0.2, 260],
    lowerCp: 0.86,
    upperCp: 1,
    torsion: -30,
    // Values used directly.
    // TODO(burdon): Audit.
    values: [100, 150, 200, 350, 400, 450, 500, 750, 800, 850],
  } satisfies PhysicalPalette,
};

const physicalSeries = {
  ...huePalettes,
  ...systemPalettes,
};

export const physicalColors: ColorsPhysicalLayer = {
  namespace: 'dx-',
  definitions: {
    // TODO(thure): Unclear how to fix types here, `extends` is definitely optional for this but TS errors anyway…
    // @ts-ignore
    series: physicalSeries,
    accompanyingSeries: {
      reflectiveRelation,
    },
  },
  conditions: {
    srgb: [':root'],
    p3: ['@media (color-gamut: p3)', ':root'],
    rec2020: ['@media (color-gamut: rec2020)', ':root'],
  },
  series: Object.entries(physicalSeries).reduce((acc: ColorsPhysicalLayer['series'], [paletteId]) => {
    const baseId = paletteId.replace('Palette', '');
    acc[baseId] = gamuts.reduce((acc: PhysicalSeries<Gamut & string, HelicalArcSeries>, gamut) => {
      acc[gamut] = {
        extends: paletteId,
        physicalValueRelation: { extends: 'reflectiveRelation' },
      };
      return acc;
    }, {});
    return acc;
  }, {}),
};
