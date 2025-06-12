//
// Copyright 2025 DXOS.org
//

import { type AliasLayer } from '@ch-ui/tokens';

import { valenceAliases } from './sememes-hue';
import { sheetAliases } from './sememes-sheet';
import { systemAliases } from './sememes-system';

export const aliasColors = {
  conditions: { root: [':root, .dark'], attention: ['[data-is-attention-source], .current-related[aria-current]'] },
  aliases: {
    // TODO(thure): Aliases should be merged more elegantly, this causes overwrites.
    ...sheetAliases,
    ...systemAliases,
    ...valenceAliases,
  },
  namespace: 'dx-',
} satisfies AliasLayer<string>;
