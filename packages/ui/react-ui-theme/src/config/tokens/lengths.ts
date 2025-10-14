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
      // TODO(burdon): Can/should these be hyphenated?
      trimXs: { root: ['lacuna', 3] },
      trimSm: { root: ['lacuna', 6] },
      trimMd: { root: ['lacuna', 9] },
      trimLg: { root: ['lacuna', 12] },
      inputFine: { root: ['lacuna', 2] },
      inputCoarse: { root: ['lacuna', 4] },
    },
  },

  alias: {
    namespace: 'dx-',
    conditions: {
      fine: [':root, .density-fine'],
      coarse: ['.density-coarse'],
      flush: ['.density-flush'],
      gridFocusStack: ['[data-grid-focus-indicator-variant="stack"]'],
    },
    aliases: {
      noLine: { fine: ['focusOffset'] },
      hairLine: { fine: ['modalLine', 'landmarkLine', 'positionedLine', 'gridGap', 'gridFocusIndicatorWidth'] },
      thickLine: { fine: ['focusLine'], gridFocusStack: ['gridFocusIndicatorWidth'] },
      trimXs: { fine: ['cardSpacingChrome', 'labelSpacingBlock'] },
      trimSm: { fine: ['cardSpacingInline', 'cardSpacingBlock', 'inputSpacingBlock'] },
      trimMd: { coarse: ['cardSpacingInline', 'cardSpacingBlock'] },
      inputFine: { fine: ['iconButtonPadding'] },
      inputCoarse: { coarse: ['iconButtonPadding'] },
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
      prose: { root: ['size', 5 /* = 50rem */] },
      containerMaxWidth: { root: ['size', 5 /* = 50rem */] },
      popoverMaxWidth: { root: ['size', 2 /* = 20rem; this should align with cardDefaultInlineSize */] },
    },
  },
} satisfies Facet;
