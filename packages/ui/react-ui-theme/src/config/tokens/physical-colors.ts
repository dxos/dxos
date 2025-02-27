//
// Copyright 2024 DXOS.org
//

import type { AccompanyingSeries, ColorsPhysicalLayer, Gamut, HelicalArcSeries, PhysicalSeries } from '@ch-ui/tokens';

import { type PhysicalPalette } from './types';

const reflectiveRelation = {
  initial: 1000,
  slope: -1000,
  method: 'floor',
} satisfies AccompanyingSeries;

const gamuts: (Gamut & string)[] = ['srgb', 'p3', 'rec2020'];

const DEG_RAD = Math.PI / 180;

const hueKeyPoint = (hue: number, values?: PhysicalPalette['values']): PhysicalPalette => {
  const hueDeg = (360 * (hue / 17) + 26) % 360;
  return {
    keyPoint: [0.5, 0.165 + 0.04 * Math.cos((hueDeg - 15) * DEG_RAD), hueDeg],
    lowerCp: 1,
    upperCp: 1,
    torsion: 0,
    ...(values && { values }),
  };
};

export const huePalettes = {
  red: hueKeyPoint(0),
  orange: hueKeyPoint(1),
  amber: hueKeyPoint(2, [50, 100, 150, 200, 250, 300, 350, 400, 500, 550, 600, 700, 800, 900]),
  yellow: hueKeyPoint(3),
  lime: hueKeyPoint(4),
  green: hueKeyPoint(5),
  emerald: hueKeyPoint(6, [50, 100, 150, 200, 250, 300, 350, 400, 500, 550, 600, 700, 800, 900]),
  teal: hueKeyPoint(7),
  cyan: hueKeyPoint(8, [50, 100, 150, 200, 250, 300, 350, 400, 500, 550, 600, 700, 800, 900]),
  sky: hueKeyPoint(9),
  blue: hueKeyPoint(10),
  indigo: hueKeyPoint(11),
  violet: hueKeyPoint(12),
  purple: hueKeyPoint(13),
  fuchsia: hueKeyPoint(14),
  pink: hueKeyPoint(15),
  rose: hueKeyPoint(16, [50, 100, 150, 200, 250, 300, 350, 400, 500, 550, 600, 700, 800, 900]),
};

/**
 * The keyPoint represents the LCH value (Lightness: 0-1, Chroma: 0-1, Hue: 0-360 [0=Red, 120=Green, 240=Blue]).
 * https://oklch.com/#47,0,86.52,100
 *
 * NOTE: Rebuild the theme and restart the dev server to see changes.
 *
 * Theme references
 * https://colorsublime.github.io
 * https://github.com/microsoft/vscode-docs/blob/main/api/extension-guides/color-theme.md#create-a-new-color-theme
 * https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/services/themes/common/colorThemeSchema.ts
 */
const systemPalettes = {
  neutral: {
    keyPoint: [0, 0.01, 259.99], // Cold
    // keyPoint: [0.47, 0.004, 86.52], // Warm
    lowerCp: 0,
    upperCp: 0,
    torsion: 0,
    // Values used directly which were found in the audit.
    values: [25, 75, 100, 150, 250, 300, 500, 700, 750, 800, 850, 900],
  } satisfies PhysicalPalette,
  primary: {
    keyPoint: [0.5262, 0.196, 259.99],
    lowerCp: 0.86,
    upperCp: 1,
    torsion: -30,
    // Values used directly which were found in the audit.
    values: [100, 150, 200, 350, 400, 450, 500, 750, 800, 850],
  } satisfies PhysicalPalette,
};

const physicalSeries = {
  ...huePalettes,
  ...systemPalettes,
};

export const physicalColors: ColorsPhysicalLayer = {
  conditions: {
    srgb: [':root'],
    p3: ['@media (color-gamut: p3)', ':root'],
    rec2020: ['@media (color-gamut: rec2020)', ':root'],
  },
  series: Object.entries(physicalSeries).reduce((acc: ColorsPhysicalLayer['series'], [id, arc]) => {
    acc[id] = gamuts.reduce((acc: PhysicalSeries<Gamut & string, HelicalArcSeries>, gamut) => {
      acc[gamut] = { ...arc, physicalValueRelation: reflectiveRelation };
      return acc;
    }, {});
    return acc;
  }, {}),
  namespace: 'dx-',
};
