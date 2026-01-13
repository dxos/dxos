//

// Copyright 2025 DXOS.org
//

import { type Facet, type LinearPhysicalLayer } from '@ch-ui/tokens';

import { cardDefaultInlineSize, cardMaxInlineSize, cardMinInlineSize } from './sizes';

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
      // "gap"
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
      trimSm: { root: ['lacuna', 4] },
      trimMd: { root: ['lacuna', 6] },
      trimLg: { root: ['lacuna', 12] },
      inputFine: { root: ['lacuna', 3] },
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
      trimXs: { fine: ['cardSpacingChrome', 'labelSpacingBlock', 'inputSpacingBlock'] }, // TODO(burdon): Remove need for this.
      trimSm: { fine: ['cardSpacingInline', 'cardSpacingBlock', 'cardSpacingGap'] },
      trimMd: { coarse: ['cardSpacingInline', 'cardSpacingBlock', 'cardSpacingGap'] },
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
          slope: 1,
        },
      },
    },
  } satisfies LinearPhysicalLayer,

  semantic: {
    namespace: 'dx-',
    conditions: { root: [':root'] },
    sememes: {
      prose: { root: ['size', 50] },
      containerMaxWidth: { root: ['size', 50] },
      popoverMaxWidth: { root: ['size', cardDefaultInlineSize] },
      cardWidth: { root: ['size', cardDefaultInlineSize] },
      cardMinWidth: { root: ['size', cardMinInlineSize] },
      cardMaxWidth: { root: ['size', cardMaxInlineSize] },
    },
  },
} satisfies Facet;
