//
// Copyright 2024 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';
import { DXN } from '@dxos/keys';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.attention'),
  name: 'Attention',
  author: 'DXOS',
  description: trim`
    Track and manage focused attention on objects across your workspace.
    Highlight items requiring action and coordinate team focus on priority work.
  `,
  tags: ['system'],
};
