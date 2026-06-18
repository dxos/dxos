//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
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
