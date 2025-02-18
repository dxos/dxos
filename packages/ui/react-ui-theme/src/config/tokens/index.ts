//
// Copyright 2024 DXOS.org
//

import { type TailwindAdapterConfig } from '@ch-ui/tailwind-tokens';
import adapter from '@ch-ui/tailwind-tokens';
import { type TokenSet } from '@ch-ui/tokens';

import { aliasColors } from './alias-colors';
import { lengthsFacet } from './lengths';
import { physicalColors } from './physical-colors';
import { semanticColors } from './semantic-colors';
import { systemAliases, systemSememes } from './sememes-system';

export const tokenSet = {
  colors: {
    physical: physicalColors,
    semantic: semanticColors,
    alias: aliasColors,
  },
  lengths: lengthsFacet,
} satisfies TokenSet;

const adapterConfig: TailwindAdapterConfig = {
  colors: {
    facet: 'colors',
    disposition: 'overwrite',
  },
  borderWidth: {
    facet: 'lengths',
    disposition: 'extend',
  },
  ringWidth: {
    facet: 'lengths',
    disposition: 'extend',
  },
  outlineWidth: {
    facet: 'lengths',
    disposition: 'extend',
  },
};

export const userDefaultTokenSet = {
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
      statements: aliasColors.statements,
      aliases: systemAliases,
      namespace: aliasColors.namespace,
    },
  },
  lengths: lengthsFacet,
} satisfies TokenSet;

export const tokensTailwindConfig = adapter(tokenSet, adapterConfig);
