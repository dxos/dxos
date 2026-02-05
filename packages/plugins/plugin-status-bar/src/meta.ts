//
// Copyright 2024 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/status-bar',
  name: 'Status Bar',
  description: trim`
    Persistent bottom bar displaying workspace status information and quick actions.
    Access connection state, notifications, and common commands without leaving your current context.
  `,
  icon: 'ph--info--regular',
};
