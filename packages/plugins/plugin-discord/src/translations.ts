//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Discord } from '#types';

export const translations = [
  {
    'en-US': {
      [Discord.Bot.typename]: {
        'typename.label': 'Discord Bot',
        'typename.label_zero': 'Discord Bots',
        'typename.label_one': 'Discord Bot',
        'typename.label_other': 'Discord Bots',
        'object-name.placeholder': 'New bot',
        'add-object.label': 'Add bot',
        'rename-object.label': 'Rename bot',
        'delete-object.label': 'Delete bot',
        'object-deleted.label': 'Bot deleted',
      },
      [meta.id]: {
        'plugin.name': 'Discord',
        'status-connected.label': 'Connected',
        'status-disconnected.label': 'Disconnected',
        'status-error.label': 'Error',
        'application-id.label': 'Application ID',
        'bot-token.label': 'Bot Token',
        'invite-url.label': 'Invite URL',
        'guild.label': 'Guild',
        'channels.label': 'Channels',
        'copy-invite.button': 'Copy',
        'disconnect.button': 'Disconnect',
        'token-show.label': 'Show',
        'token-hide.label': 'Hide',
        'token-hidden.label': 'Token hidden',
        'token-copied.label': 'Copied',
        'no-channels.label': 'No channels tracked',
      },
    },
  },
] as const satisfies Resource[];
