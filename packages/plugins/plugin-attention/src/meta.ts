//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.attention'),
  name: 'Attention',
  author: 'DXOS',
  description: trim`
    Track and manage focused attention on objects across your workspace.
    Highlight items requiring action and coordinate team focus on priority work.
  `,
  tags: ['system'],
});
