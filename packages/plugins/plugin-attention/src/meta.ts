//
// Copyright 2024 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/attention',
  name: 'Attention',
  description: trim`
    Track and manage focused attention on objects across your workspace.
    Highlight items requiring action and coordinate team focus on priority work.
  `,
};
