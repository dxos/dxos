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
  red: hueKeyPoint(0),
  orange: hueKeyPoint(1),
  amber: hueKeyPoint(2),
  yellow: hueKeyPoint(3),
  lime: hueKeyPoint(4),
  green: hueKeyPoint(5),
  emerald: hueKeyPoint(6),
  teal: hueKeyPoint(7),
  cyan: hueKeyPoint(8),
  sky: hueKeyPoint(9),
  blue: hueKeyPoint(10),
  indigo: hueKeyPoint(11),
  violet: hueKeyPoint(12),
  purple: hueKeyPoint(13),
  fuchsia: hueKeyPoint(14),
  pink: hueKeyPoint(15),
  rose: hueKeyPoint(16),
};

/**
 * The keyPoint represents the LCH value:
 * - Lightness: 0-1, should usually set the keyPoint at or near 0.5
 * - Chroma: min 0, max 0.08–0.5 depending on hue and gamut, theme will clamp final value to within gamut’s range
 * - Hue: 0-360 (~26 “red”, ~141 “green”, ~262 “blue”)
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
  neutral: {
    keyPoint: [0.5, 0.001, 260],
    lowerCp: 0,
    upperCp: 0,
    torsion: 0,
    // Values used directly.
    // TODO(burdon): Audit.
    values: [25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 700, 750, 800, 850, 900],
  } satisfies PhysicalPalette,

  // https://oklch.com/#0.5,0.2,260,100 (#0559d2)
  primary: {
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
    // @ts-ignore
    series: physicalSeries,
    accompanyingSeries: { reflectiveRelation },
  },
  conditions: {
    srgb: [':root, .dark'],
    p3: ['@media (color-gamut: p3)', ':root, .dark'],
    rec2020: ['@media (color-gamut: rec2020)', ':root, .dark'],
  },
  series: Object.entries(physicalSeries).reduce((acc: ColorsPhysicalLayer['series'], [id]) => {
    acc[id] = gamuts.reduce((acc: PhysicalSeries<Gamut & string, HelicalArcSeries>, gamut) => {
      acc[gamut] = {
        extends: id,
        physicalValueRelation: { extends: 'reflectiveRelation' },
      };
      return acc;
    }, {});
    return acc;
  }, {}),
};
