//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.connections',
  name: 'Connections',
  description: trim`
    Visual connections panel for managing channel integrations and MCP servers.
  `,
  icon: 'ph--globe-simple--regular',
};
