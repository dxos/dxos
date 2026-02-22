//
// Copyright 2024 DXOS.org
//

import { type TokenSet } from '@ch-ui/tokens';

import { aliasColors, huePalettes, physicalColors, semanticColors, systemAliases, systemSememes } from './colors';
import { lengthsFacet, maxSizesFacet } from './lengths';

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
