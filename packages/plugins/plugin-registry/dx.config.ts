//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.registry',
    name: 'Plugins',
    description: trim`
      Plugin management system for discovering, installing, and configuring workspace extensions.
      Browse available plugins and customize your workspace capabilities.
    `,
    icon: { key: 'ph--squares-four--regular' },
    tags: ['system'],
  },
});
