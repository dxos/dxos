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
      noLine: { root: ['line', 0] },
      hairLine: { root: ['line', 1] },
      thickLine: { root: ['line', 2] },
      prose: { root: ['size', 5] },
      containerMaxWidth: { root: ['size', 5] },
    },
  },

  alias: {
    namespace: 'dx-',
    conditions: { root: [':root'] },
    aliases: {
      noLine: { root: ['focusOffset'] },
      hairLine: { root: ['modalLine', 'landmarkLine', 'positionedLine', 'gridGap'] },
      thickLine: { root: ['focusLine'] },
    },
  },
} satisfies Facet;
