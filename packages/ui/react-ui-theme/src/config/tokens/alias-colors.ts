//
// Copyright 2025 DXOS.org
//

import { type AliasLayer } from '@ch-ui/tokens';

import { sheetAliases } from './sememes-sheet';
import { systemAliases } from './sememes-system';

export const aliasColors = {
  conditions: { root: [':root'], attention: ['[data-is-attention-source], .current-related[aria-current]'] },
  aliases: {
    // TODO(thure): Aliases should be merged more elegantly, this causes overwrites.
    ...sheetAliases,
    ...systemAliases,
  },
  namespace: 'dx-',
} satisfies AliasLayer<string>;
