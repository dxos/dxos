//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.brain',
    name: 'Brain',
    author: 'DXOS',
    description: trim`
      A per-space semantic index of facts extracted from your content.
      Provides fact storage, assistant tools for querying and summarizing facts, and a fact viewer.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-brain',
    icon: { key: 'ph--brain--regular', hue: 'purple' },
    spec: 'PLUGIN.mdl',
    tags: ['assistant'],
  },
});
