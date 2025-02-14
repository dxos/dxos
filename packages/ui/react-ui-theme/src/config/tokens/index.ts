//
// Copyright 2024 DXOS.org
//

import { type TailwindAdapterConfig } from '@ch-ui/tailwind-tokens';
import adapter from '@ch-ui/tailwind-tokens';
import { type TokenSet } from '@ch-ui/tokens';

import { physicalColors } from './physical-colors';
import { semanticColors } from './semantic-colors';
import { systemSememes } from './sememes-system';

export const tokenSet = {
  colors: {
    physical: physicalColors,
    semantic: semanticColors,
  },
} satisfies TokenSet;

const adapterConfig: TailwindAdapterConfig = {
  colors: {
    facet: 'colors',
    disposition: 'overwrite',
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
  },
} satisfies TokenSet;

export const tokensTailwindConfig = adapter(tokenSet, adapterConfig);
