//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.statusBar',
    name: 'Status Bar',
    author: 'DXOS',
    description: trim`
      Persistent bottom bar displaying workspace status information and quick actions.
      Access connection state, notifications, and common commands without leaving your current context.
    `,
    icon: { key: 'ph--info--regular' },
    tags: ['system'],
  },
});
