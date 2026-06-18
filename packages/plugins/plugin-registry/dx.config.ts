//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.registry',
    name: 'Plugins',
    author: 'DXOS',
    description: trim`
      Plugin management system for discovering, installing, and configuring workspace extensions.
      Browse available plugins and customize your workspace capabilities.
    `,
    icon: { key: 'ph--squares-four--regular' },
    tags: ['system'],
  },
});
