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
  type HelicalArcValue,
  type PhysicalSeries,
  type SemanticLayer,
  type TokenSet,
} from '@ch-ui/tokens';

const reflectiveRelation = {
  initial: 1000,
  slope: -1000,
  method: 'floor',
} satisfies AccompanyingSeries;

type PhysicalPalette = Omit<HelicalArcSeries, 'physicalValueRelation'>;

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

const systemPalettes = {
  neutral: {
    keyPoint: [0.47, 0.004, 86.52],
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
  ...systemPalettes,
  ...huePalettes,
};

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

const surfaceCadence = {
  dark: [900, 800, 775, 710, 695, 680, 650],
  light: [25, 35, 70, 80, 90],
};

const semanticColors = {
  conditions: {
    light: [':root'],
    dark: ['.dark'],
  },
  // TODO(burdon): Organize by category (e.g., surface, text, etc.)
  sememes: {
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
    baseGlass: {
      light: ['neutral', `${surfaceCadence.light[1]}/.88`],
      dark: ['neutral', `${surfaceCadence.dark[2]}/.88`],
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
    modal: {
      light: ['neutral', surfaceCadence.light[0]],
      dark: ['neutral', surfaceCadence.dark[5]],
    },
    separator: {
      light: ['neutral', surfaceCadence.light[4]],
      dark: ['neutral', surfaceCadence.dark[6]],
    },
    accentSurface: {
      light: ['primary', 500],
      dark: ['primary', 500],
    },
    accentSurfaceHover: {
      light: ['primary', 600],
      dark: ['primary', 475],
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
    accentText: {
      light: ['primary', 550],
      dark: ['primary', 400],
    },
    accentTextHover: {
      light: ['primary', 500],
      dark: ['primary', 350],
    },
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
    error: {
      light: ['red', 700],
      dark: ['red', 300],
    },

    //
    // Codemirror
    // NOTE: Background styles for the main content area must have transparency otherwise they will mask the selection.
    //

    cmSeparator: {
      light: ['primary', 500],
      dark: ['primary', 500],
    },
    cmCursor: {
      light: ['neutral', 900],
      dark: ['neutral', 100],
    },
    cmCodeblock: {
      light: ['neutral', '500/.1'],
      dark: ['neutral', '500/.1'],
    },
    cmSelection: {
      light: ['primary', 400],
      dark: ['primary', 600],
    },
    cmHighlight: {
      light: ['neutral', 950],
      dark: ['neutral', 50],
    },
    cmHighlightSurface: {
      light: ['sky', 200],
      dark: ['cyan', 600],
    },
    cmComment: {
      light: ['neutral', 950],
      dark: ['neutral', 50],
    },
    cmCommentSurface: {
      light: ['green', 200],
      dark: ['green', 600],
    },

    ...peerSememes,
  },
  namespace: 'dx-',
} satisfies SemanticLayer<string, string, HelicalArcValue>;

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
