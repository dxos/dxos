//
// Copyright 2024 DXOS.org
//

import { type TailwindAdapterConfig } from '@ch-ui/tailwind-tokens';
import adapter from '@ch-ui/tailwind-tokens';
import { type TokenSet } from '@ch-ui/tokens';

import { physicalColors } from './physical-colors';
import { semanticColors } from './semantic-colors';

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

export const tokensTailwindConfig = adapter(tokenSet, adapterConfig);
