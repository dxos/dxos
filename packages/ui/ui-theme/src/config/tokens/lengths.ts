//

// Copyright 2025 DXOS.org
//

import { type Facet, type LinearPhysicalLayer } from '@ch-ui/tokens';

import {
  cardDefaultInlineSize,
  cardMaxBlockSize,
  cardMaxInlineSize,
  cardMinBlockSize,
  cardMinInlineSize,
} from './sizes';

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

  /**
   *
   */
  semantic: {
    namespace: 'dx-',
    conditions: { root: [':root'] },
    sememes: {
      // Unit: px
      noLine: { root: ['line', 0] },
      hairLine: { root: ['line', 1] },
      thickLine: { root: ['line', 2] },
      // Unit: 0.125rem (2px)
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
      noLine: {
        fine: ['focusOffset'],
      },
      hairLine: {
        fine: ['modalLine', 'landmarkLine', 'positionedLine', 'gridGap', 'gridFocusIndicatorWidth'],
      },
      thickLine: {
        fine: ['focusLine'],
        gridFocusStack: ['gridFocusIndicatorWidth'],
      },
      inputFine: {
        fine: ['iconButtonPadding'],
      },
      inputCoarse: {
        coarse: ['iconButtonPadding'],
      },
      trimXs: {
        fine: ['cardChrome'],
      },
      trimSm: {
        fine: ['cardPadding'],
      },
      trimMd: {
        coarse: ['cardPadding'],
      },
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
      'prose-max-width': { root: ['size', 50] },
      'container-max-width': { root: ['size', 50] },
      'card-default-width': { root: ['size', cardDefaultInlineSize] },
      'card-min-width': { root: ['size', cardMinInlineSize] },
      'card-max-width': { root: ['size', cardMaxInlineSize] },
      'card-min-height': { root: ['size', cardMinBlockSize] },
      'card-max-height': { root: ['size', cardMaxBlockSize] },
    },
  },
} satisfies Facet;
