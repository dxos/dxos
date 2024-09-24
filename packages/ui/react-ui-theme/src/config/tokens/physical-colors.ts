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

const gamuts: Gamut[] = ['srgb', 'p3', 'rec2020'];

export const huePalettes = {
  red: {
    keyPoint: [0.6, 0.241, 20.87],
    lowerCp: 1,
    upperCp: 0.13,
    torsion: 5.5,
  } satisfies PhysicalPalette,
  orange: {
    keyPoint: [0.6969, 0.188, 40.39],
    lowerCp: 1,
    upperCp: 0.13,
    torsion: 5.5,
  } satisfies PhysicalPalette,
  amber: {
    keyPoint: [0.7311, 0.167, 62.62],
    lowerCp: 1,
    upperCp: 1,
    torsion: 24,
    // Warning values used directly
    values: [50, 100, 150, 200, 250, 300, 350, 400, 500, 550, 600, 700, 800, 900],
  } satisfies PhysicalPalette,
  yellow: {
    keyPoint: [0.8907, 0.183, 96.19],
    lowerCp: 1,
    upperCp: 1,
    torsion: 32,
  } satisfies PhysicalPalette,
  lime: {
    keyPoint: [0.7613, 0.189, 124],
    lowerCp: 1,
    upperCp: 1,
    torsion: -3.5,
  } satisfies PhysicalPalette,
  green: {
    keyPoint: [0.6431, 0.207, 140.48],
    lowerCp: 0.35,
    upperCp: 0.665,
    torsion: -10.5,
  } satisfies PhysicalPalette,
  emerald: {
    keyPoint: [0.7931, 0.219, 149.22],
    lowerCp: 1,
    upperCp: 0.735,
    torsion: -7,
    // Success values used directly.
    values: [50, 100, 150, 200, 250, 300, 350, 400, 500, 550, 600, 700, 800, 900],
  } satisfies PhysicalPalette,
  teal: {
    keyPoint: [0.6298, 0.1369, 162.58],
    lowerCp: 1,
    upperCp: 0.755,
    torsion: -12,
  } satisfies PhysicalPalette,
  cyan: {
    keyPoint: [0.5743, 0.097, 203.01],
    lowerCp: 1,
    upperCp: 0.855,
    torsion: -15,
    // Info values used directly.
    values: [50, 100, 150, 200, 250, 300, 350, 400, 500, 550, 600, 700, 800, 900],
  } satisfies PhysicalPalette,
  sky: {
    keyPoint: [0.5631, 0.141, 244.94],
    lowerCp: 1,
    upperCp: 0.64,
    torsion: 0,
  } satisfies PhysicalPalette,
  blue: {
    keyPoint: [0.4914, 0.1927, 259.23],
    lowerCp: 1,
    upperCp: 0.495,
    torsion: -7,
  } satisfies PhysicalPalette,
  indigo: {
    keyPoint: [0.4535, 0.204, 264.83],
    lowerCp: 0.495,
    upperCp: 0.55,
    torsion: 0,
  } satisfies PhysicalPalette,
  violet: {
    keyPoint: [0.2896, 0.188, 266.22],
    lowerCp: 0.195,
    upperCp: 0.635,
    torsion: -5,
  } satisfies PhysicalPalette,
  purple: {
    keyPoint: [0.2825, 0.1629, 287],
    lowerCp: 0,
    upperCp: 0.63,
    torsion: 0,
  } satisfies PhysicalPalette,
  fuchsia: {
    keyPoint: [0.3931, 0.19, 318.19],
    lowerCp: 1,
    upperCp: 0.695,
    torsion: 0,
  } satisfies PhysicalPalette,
  pink: {
    keyPoint: [0.4765, 0.199, 349.46],
    lowerCp: 1,
    upperCp: 0.775,
    torsion: 0,
  } satisfies PhysicalPalette,
  rose: {
    keyPoint: [0.5483, 0.219, 9.68],
    lowerCp: 1,
    upperCp: 1,
    torsion: 0,
    // Error values used directly.
    values: [50, 100, 150, 200, 250, 300, 350, 400, 500, 550, 600, 700, 800, 900],
  } satisfies PhysicalPalette,
};

/**
 * LCH
 * https://oklch.com/#47,0,86.52,100
 */
const systemPalettes = {
  neutral: {
    keyPoint: [0, 0, 0],
    // keyPoint: [0.47, 0.004, 86.52],
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
    acc[id] = gamuts.reduce((acc: PhysicalSeries<Gamut, HelicalArcSeries>, gamut) => {
      acc[gamut] = { ...arc, physicalValueRelation: reflectiveRelation };
      return acc;
    }, {});
    return acc;
  }, {}),
  namespace: 'dx-',
};
