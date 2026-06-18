//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.statusBar',
    name: 'Status Bar',
    description: trim`
      Persistent bottom bar displaying workspace status information and quick actions.
      Access connection state, notifications, and common commands without leaving your current context.
    `,
    icon: { key: 'ph--info--regular' },
    tags: ['system'],
  },
});
