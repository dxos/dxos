//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.simpleLayout',
    name: 'Simple Layout',
    description: trim`
      Minimal layout plugin for simplified UI contexts like popover windows.
      Provides basic content rendering without sidebars or complex navigation.
    `,
    icon: { key: 'ph--layout--regular' },
    tags: ['system'],
  },
});
