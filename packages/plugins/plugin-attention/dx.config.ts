//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.attention',
    name: 'Attention',
    description: trim`
      Track and manage focused attention on objects across your workspace.
      Highlight items requiring action and coordinate team focus on priority work.
    `,
    tags: ['system'],
  },
});
