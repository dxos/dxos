//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Connections',
        'companion-label.label': 'Connections',
        'no-connections.message': 'No connections configured.',
        'add-connection.label': 'Add Connection',
        'status-connected.label': 'Connected',
        'status-disconnected.label': 'Not connected',
        'mcp-servers-title.label': 'MCP Servers',
        'channels-title.label': 'Channels',
        'credentials-title.label': 'Credentials',
      },
    },
  },
] as const satisfies Resource[];
