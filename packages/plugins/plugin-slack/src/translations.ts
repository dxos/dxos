//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Slack',
        'settings-title.label': 'Slack Integration',
        'bot-token.label': 'Bot Token',
        'bot-token.placeholder': 'xoxb-...',
        'test-connection.label': 'Test Connection',
        'disconnect.label': 'Disconnect',
        'channels-title.label': 'Monitored Channels',
        'respond-mentions.label': 'Respond to @mentions',
        'respond-dms.label': 'Respond to DMs',
        'status-connected.label': 'Connected',
        'status-disconnected.label': 'Not connected',
        'status-error.label': 'Connection error',
        'no-channels.message': 'Connect to load channels',
      },
    },
  },
] as const satisfies Resource[];
