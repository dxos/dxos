//
// Copyright 2025 DXOS.org
//

import { type AliasLayer } from '@ch-ui/tokens';

import { systemAliases } from './sememes-system';

export const aliasColors = {
  statements: [':root'],
  aliases: {
    ...systemAliases,
  },
  namespace: 'dx-',
} satisfies AliasLayer<string>;
