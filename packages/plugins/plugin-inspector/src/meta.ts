//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.inspector',
  name: 'Inspector',
  description: trim`
    Real-time AI agent execution inspector.
    Shows every step an agent takes with the ability to stop execution.
  `,
  icon: 'ph--heartbeat--regular',
};
