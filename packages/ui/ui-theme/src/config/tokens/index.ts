//
// Copyright 2024 DXOS.org
//

import { type TailwindAdapterConfig } from '@ch-ui/tailwind-tokens';
import adapter from '@ch-ui/tailwind-tokens';
import { type TokenSet } from '@ch-ui/tokens';

import { aliasColors } from './alias-colors';
import { lengthsFacet, maxSizesFacet } from './lengths';
import { huePalettes, physicalColors } from './physical-colors';
import { semanticColors } from './semantic-colors';
import { systemAliases, systemSememes } from './sememes-system';

export * from './sizes';

export const hues = Object.keys(huePalettes);

export const tokenSet = {
  colors: {
    physical: physicalColors,
    semantic: semanticColors,
    alias: aliasColors,
  },
  lengths: lengthsFacet,
  maxSizes: maxSizesFacet,
} satisfies TokenSet;

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
  spacing: {
    facet: 'lengths',
    disposition: 'extend',
    tokenization: 'keep-series',
  },
};

export const userDefaultTokenSet = {
  colors: {
    physical: {
      definitions: {
        series: {
          neutral: physicalColors.definitions!.series!.neutral,
          primary: physicalColors.definitions!.series!.primary,
        },
        accompanyingSeries: physicalColors.definitions!.accompanyingSeries,
      },
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
} satisfies TokenSet;

export const tokensTailwindConfig = adapter(tokenSet, adapterConfig);
