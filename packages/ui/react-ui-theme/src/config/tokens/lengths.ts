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
        },
      },
      lacuna: {
        root: {
          unit: 'rem',
          initial: 0,
          slope: 0.125,
        },
      },
    },
  } satisfies LinearPhysicalLayer,

  semantic: {
    namespace: 'dx-',
    conditions: { root: [':root'] },
    sememes: {
      noLine: { root: ['line', 0] },
      hairLine: { root: ['line', 1] },
      thickLine: { root: ['line', 2] },
      trimXs: { root: ['lacuna', 3] },
      trimSm: { root: ['lacuna', 6] },
      trimMd: { root: ['lacuna', 9] },
    },
  },

  alias: {
    namespace: 'dx-',
    conditions: {
      fine: [':root, .density-fine, [data-density="fine"]'],
      coarse: ['.density-coarse, [data-density="coarse"]'],
      flush: ['.density-flush, [data-density="flush"]'],
    },
    aliases: {
      noLine: { root: ['focusOffset'] },
      hairLine: { root: ['modalLine', 'landmarkLine', 'positionedLine', 'gridGap'] },
      thickLine: { root: ['focusLine'] },
      trimXs: { root: ['cardSpacingChrome'] },
      trimSm: { root: ['cardSpacingInline', 'cardSpacingBlock'] },
      trimMd: { coarse: ['cardSpacingInline', 'cardSpacingBlock'] },
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
