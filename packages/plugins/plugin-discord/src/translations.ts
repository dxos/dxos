//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';

import { meta } from '#meta';
import { DiscordChannel } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(DiscordChannel.DiscordChannel)]: {
        'typename.label': 'Discord channel',
        'typename.label_zero': 'Discord channels',
        'typename.label_one': 'Discord channel',
        'typename.label_other': 'Discord channels',
        'object-name.placeholder': 'New Discord channel',
      },
      [meta.profile.key]: {
        'plugin.name': 'Discord',
        'sync-now.label': 'Sync now',
        'sync-this-chat.label': 'Sync this chat',
        'sync-toast.success.label': 'Sync complete',
        'sync-toast.error.label': 'Sync failed',
        'discord-channel.label': 'Discord',
        'discord-channel.description': 'The bot that posts here and the Discord channels it listens in.',
        'discord-bot-actions.label': 'Discord bot',
        'discord-bot-start.label': 'Start bot',
        'discord-bot-restart.label': 'Restart bot',
        'discord-bot-stop.label': 'Stop bot',
        'discord-bot-refresh.label': 'Refresh status',
        'discord-bot-unreachable.label': 'Could not reach EDGE',
        'discord-bot-other-config.label': 'Running another channel',
        'discord-bot-other-config.message': 'This bot is running a different channel. Press Start to apply this one.',
        'discord-gateway-checking.label': 'Checking bot status',
        'discord-gateway-idle.label': 'Stopped',
        'discord-gateway-connecting.label': 'Connecting',
        'discord-gateway-ready.label': 'Connected',
        'discord-gateway-closed.label': 'Disconnected',
        'discord-gateway-failed.label': 'Failed',
      },
    },
  },
];
