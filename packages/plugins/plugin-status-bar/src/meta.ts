//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.statusBar'),
  name: 'Status Bar',
  author: 'DXOS',
  description: trim`
    Persistent bottom bar displaying workspace status information and quick actions.
    Access connection state, notifications, and common commands without leaving your current context.
  `,
  icon: 'ph--info--regular',
  tags: ['system'],
});
