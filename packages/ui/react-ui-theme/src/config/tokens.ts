//
// Copyright 2024 DXOS.org
//

import { type TailwindAdapterConfig } from '@ch-ui/tailwind-tokens';
import adapter from '@ch-ui/tailwind-tokens';
import {
  type AccompanyingSeries,
  type ColorsPhysicalLayer,
  type Gamut,
  type HelicalArcSeries,
  type PhysicalSeries,
  type SemanticLayer,
  type TokenSet,
} from '@ch-ui/tokens';

const reflectiveRelation = {
  initial: 1000,
  slope: -1000,
  method: 'floor',
} satisfies AccompanyingSeries;

type PhysicalSeriesValue = Omit<HelicalArcSeries, 'physicalValueRelation'>;

const gamuts: Gamut[] = ['srgb', 'p3', 'rec2020'];

const huePalettes = {
  red: {
    keyPoint: [0.6, 0.241, 20.87],
    lowerCp: 1,
    upperCp: 0.13,
    torsion: 5.5,
  } satisfies PhysicalSeriesValue,
  orange: {
    keyPoint: [0.6969, 0.188, 40.39],
    lowerCp: 1,
    upperCp: 0.13,
    torsion: 5.5,
  } satisfies PhysicalSeriesValue,
  amber: {
    keyPoint: [0.7311, 0.167, 62.62],
    lowerCp: 1,
    upperCp: 1,
    torsion: 24,
  } satisfies PhysicalSeriesValue,
  yellow: {
    keyPoint: [0.8907, 0.183, 96.19],
    lowerCp: 1,
    upperCp: 1,
    torsion: 32,
  } satisfies PhysicalSeriesValue,
  lime: {
    keyPoint: [0.7613, 0.189, 124],
    lowerCp: 1,
    upperCp: 1,
    torsion: -3.5,
  } satisfies PhysicalSeriesValue,
  green: {
    keyPoint: [0.6431, 0.207, 140.48],
    lowerCp: 0.35,
    upperCp: 0.665,
    torsion: -10.5,
  } satisfies PhysicalSeriesValue,
  emerald: {
    keyPoint: [0.7931, 0.219, 149.22],
    lowerCp: 1,
    upperCp: 0.735,
    torsion: -7,
  } satisfies PhysicalSeriesValue,
  teal: {
    keyPoint: [0.6298, 0.1369, 162.58],
    lowerCp: 1,
    upperCp: 0.755,
    torsion: -12,
  } satisfies PhysicalSeriesValue,
  cyan: {
    keyPoint: [0.5743, 0.097, 203.01],
    lowerCp: 1,
    upperCp: 0.855,
    torsion: -15,
  } satisfies PhysicalSeriesValue,
  sky: {
    keyPoint: [0.5631, 0.141, 244.94],
    lowerCp: 1,
    upperCp: 0.64,
    torsion: 0,
  } satisfies PhysicalSeriesValue,
  blue: {
    keyPoint: [0.4914, 0.1927, 259.23],
    lowerCp: 1,
    upperCp: 0.495,
    torsion: -7,
  } satisfies PhysicalSeriesValue,
  indigo: {
    keyPoint: [0.4535, 0.204, 264.83],
    lowerCp: 0.495,
    upperCp: 0.55,
    torsion: 0,
  } satisfies PhysicalSeriesValue,
  violet: {
    keyPoint: [0.2896, 0.188, 266.22],
    lowerCp: 0.195,
    upperCp: 0.635,
    torsion: -5,
  } satisfies PhysicalSeriesValue,
  purple: {
    keyPoint: [0.2825, 0.1629, 287],
    lowerCp: 0,
    upperCp: 0.63,
    torsion: 0,
  } satisfies PhysicalSeriesValue,
  fuchsia: {
    keyPoint: [0.3931, 0.19, 318.19],
    lowerCp: 1,
    upperCp: 0.695,
    torsion: 0,
  } satisfies PhysicalSeriesValue,
  pink: {
    keyPoint: [0.4765, 0.199, 349.46],
    lowerCp: 1,
    upperCp: 0.775,
    torsion: 0,
  } satisfies PhysicalSeriesValue,
  rose: {
    keyPoint: [0.5483, 0.219, 9.68],
    lowerCp: 1,
    upperCp: 1,
    torsion: 0,
  } satisfies PhysicalSeriesValue,
};

const systemPalettes = {
  neutral: {
    keyPoint: [0.5472, 0.009, 286.09],
    lowerCp: 0.8,
    upperCp: 0.88,
    torsion: 0,
  } satisfies PhysicalSeriesValue,
  accent: {
    keyPoint: [0.5262, 0.196, 259.99],
    lowerCp: 0.86,
    upperCp: 1,
    torsion: -30,
  } satisfies PhysicalSeriesValue,
};

const physicalSeries = {
  ...systemPalettes,
  ...huePalettes,
};

export type HuePalette = keyof typeof huePalettes;

const physicalColors: ColorsPhysicalLayer = {
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

const peerSememes = Object.keys(huePalettes).reduce((acc: SemanticLayer['sememes'], palette) => {
  acc[`${palette}-cursor`] = {
    light: [palette, 400],
    dark: [palette, 300],
  };
  acc[`${palette}-text`] = {
    light: [palette, 550],
    dark: [palette, 300],
  };
  acc[`${palette}-text-hover`] = {
    light: [palette, 450],
    dark: [palette, 200],
  };
  acc[`${palette}-fill`] = {
    light: [palette, 500],
    dark: [palette, 500],
  };
  return acc;
}, {});

const semanticColors = {
  conditions: {
    light: [':root'],
    dark: ['.dark'],
  },
  sememes: {
    'bg-attention': {
      light: ['neutral', 0],
      dark: ['neutral', 900],
    },
    'bg-deck': {
      light: ['neutral', 75],
      dark: ['neutral', 875],
    },
    'bg-base': {
      light: ['neutral', 25],
      dark: ['neutral', 850],
    },
    'bg-input': {
      light: ['neutral', 50],
      dark: ['neutral', 825],
    },
    'bg-modal': {
      light: ['neutral', 0],
      dark: ['neutral', 750],
    },
    'bg-modal-selected': {
      light: ['neutral', 50],
      dark: ['neutral', 825],
    },
    'bg-hover': {
      light: ['neutral', 37],
      dark: ['neutral', 800],
    },
    'bg-unavailable': {
      light: ['neutral', 100],
      dark: ['neutral', 600],
    },
    'bg-accent': {
      light: ['accent', 550],
      dark: ['neutral', 550],
    },
    'bg-accent-hover': {
      light: ['accent', 600],
      dark: ['neutral', 500],
    },
    'bg-accent-focus-indicator': {
      light: ['accent', 350],
      dark: ['neutral', 450],
    },
    'bg-unaccent': {
      light: ['accent', 500],
      dark: ['neutral', 400],
    },
    'bg-unaccent-hover': {
      light: ['accent', 400],
      dark: ['neutral', 500],
    },
    separator: {
      light: ['accent', 50],
      dark: ['neutral', 700],
    },
    inverse: {
      light: ['accent', 0],
      dark: ['neutral', 0],
    },
    'fg-accent': {
      light: ['accent', 550],
      dark: ['neutral', 400],
    },
    'fg-base': {
      light: ['neutral', 1000],
      dark: ['neutral', 50],
    },
    'fg-hover': {
      light: ['neutral', 900],
      dark: ['neutral', 100],
    },
    'fg-description': {
      light: ['neutral', 500],
      dark: ['neutral', 400],
    },
    'fg-subdued': {
      light: ['neutral', 700],
      dark: ['neutral', 300],
    },
    error: {
      light: ['red', 700],
      dark: ['red', 300],
    },
    ...peerSememes,
  },
  namespace: 'dx-',
} satisfies SemanticLayer;

export const tokenSet = {
  colors: {
    physical: physicalColors,
    semantic: semanticColors,
  },
} satisfies TokenSet;

const adapterConfig: TailwindAdapterConfig = {
  colors: {
    facet: 'colors',
    disposition: 'overwrite',
  },
};

export const tokensTailwindConfig = adapter(tokenSet, adapterConfig);
