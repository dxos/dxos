//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.client',
    name: 'Client',
    description: trim`
      Core client connectivity and peer-to-peer networking infrastructure.
      Manages identity, authentication, and real-time synchronization across devices.
    `,
    tags: ['system'],
  },
});
