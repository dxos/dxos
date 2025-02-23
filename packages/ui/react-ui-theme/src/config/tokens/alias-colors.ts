//
// Copyright 2025 DXOS.org
//

import { type AliasLayer } from '@ch-ui/tokens';

import { systemAliases } from './sememes-system';

export const aliasColors = {
  conditions: { root: [':root'], attention: ['[data-is-attention-source], .current-related[aria-current]'] },
  aliases: {
    ...systemAliases,
  },
  namespace: 'dx-',
} satisfies AliasLayer<string>;
