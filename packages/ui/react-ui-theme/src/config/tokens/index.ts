//
// Copyright 2024 DXOS.org
//

import { type TailwindAdapterConfig } from '@ch-ui/tailwind-tokens';
import adapter from '@ch-ui/tailwind-tokens';
import { type TokenSet } from '@ch-ui/tokens';

import { aliasColors } from './alias-colors';
import { lengthsFacet } from './lengths';
import { huePalettes, physicalColors } from './physical-colors';
import { semanticColors } from './semantic-colors';

export const tokenSet = {
  colors: {
    physical: physicalColors,
    semantic: semanticColors,
    alias: aliasColors,
  },
  lengths: lengthsFacet,
} satisfies TokenSet;

export const hues = Object.keys(huePalettes);

const adapterConfig: TailwindAdapterConfig = {
  colors: {
    facet: 'colors',
    disposition: 'overwrite',
    tokenization: 'recursive',
  },
  borderWidth: {
    facet: 'lengths',
    disposition: 'extend',
    tokenization: 'omit-series',
  },
  ringWidth: {
    facet: 'lengths',
    disposition: 'extend',
    tokenization: 'omit-series',
  },
  ringOffsetWidth: {
    facet: 'lengths',
    disposition: 'extend',
    tokenization: 'omit-series',
  },
  outlineWidth: {
    facet: 'lengths',
    disposition: 'extend',
    tokenization: 'omit-series',
  },
};

export const userDefaultTokenSet = /* {
  colors: {
    physical: {
      conditions: physicalColors.conditions,
      series: {
        neutral: physicalColors.series.neutral,
        primary: physicalColors.series.primary,
      },
      namespace: physicalColors.namespace,
    },
    semantic: {
      conditions: semanticColors.conditions,
      sememes: systemSememes,
      namespace: semanticColors.namespace,
    },
    alias: {
      conditions: aliasColors.conditions,
      aliases: systemAliases,
      namespace: aliasColors.namespace,
    },
  },
  lengths: lengthsFacet,
} satisfies TokenSet; */ tokenSet;

export const tokensTailwindConfig = adapter(tokenSet, adapterConfig);
