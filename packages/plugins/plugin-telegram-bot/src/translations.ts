//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Telegram',
        'settings-title.label': 'Telegram Integration',
        'bot-token.label': 'Bot Token',
        'bot-token.placeholder': '123456:ABC-DEF1234...',
        'test-connection.label': 'Test Connection',
        'disconnect.label': 'Disconnect',
        'chats-title.label': 'Monitored Chats',
        'respond-mentions.label': 'Respond to @mentions in groups',
        'respond-dms.label': 'Respond to direct messages',
        'status-connected.label': 'Connected',
        'status-disconnected.label': 'Not connected',
        'status-error.label': 'Connection error',
        'no-chats.message': 'Send a message to the bot to discover chats',
      },
    },
  },
] as const satisfies Resource[];
