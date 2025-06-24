//

// Copyright 2025 DXOS.org
//

import { type Facet, type LinearPhysicalLayer } from '@ch-ui/tokens';

export const lengthsFacet = {
  physical: {
    namespace: 'dx-',
    conditions: { root: [':root'] },
    series: {
      line: {
        root: {
          unit: 'px',
          initial: 0,
          slope: 1,
          naming: {
            noLine: 0,
            hairLine: 1,
            thickLine: 2,
          },
        },
      },
      trim: {
        root: {
          unit: 'rem',
          initial: 0,
          slope: 0.125,
          naming: {
            trimXs: 3,
            trimSm: 6,
            trimMd: 9,
            trimLg: 12,
          },
        },
      },
    },
  } satisfies LinearPhysicalLayer,

  semantic: {
    namespace: 'dx-',
    conditions: { root: [':root'] },
    sememes: {},
  },

  alias: {
    namespace: 'dx-',
    conditions: {
      fine: [':root, .density-fine, [data-density="fine"]'],
      coarse: ['.density-coarse, [data-density="coarse"]'],
    },
    aliases: {
      // lines
      noLine: { fine: ['focusOffset'] },
      hairLine: { fine: ['modalLine', 'landmarkLine', 'positionedLine', 'gridGap'] },
      thickLine: { fine: ['focusLine'] },
      // spacings
      trimXs: { fine: ['card-spacing-chrome'] },
      trimSm: { fine: ['card-spacing-inline', 'card-spacing-block'] },
    },
  },
} satisfies Facet;

export const maxSizesFacet = {
  physical: {
    namespace: 'dx-',
    conditions: { root: [':root'] },
    series: {
      size: {
        root: {
          unit: 'rem',
          initial: 0,
          slope: 10,
        },
      },
    },
  } satisfies LinearPhysicalLayer,

  semantic: {
    namespace: 'dx-',
    conditions: { root: [':root'] },
    sememes: {
      prose: { root: ['size', 5] },
      containerMaxWidth: { root: ['size', 5] },
      popoverMaxWidth: { root: ['size', 2] },
    },
  },
} satisfies Facet;
