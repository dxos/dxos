//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';

import { DiscordChannel } from '#types';

import { DiscordNamespace } from './namespace.ts';

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
      [DiscordNamespace.key]: {
        'plugin.name': 'Discord',
        'sync-now.label': 'Sync now',
        'sync-this-chat.label': 'Sync this chat',
        'sync-toast.success.label': 'Sync complete',
        'sync-toast.error.label': 'Sync failed',
        'discord-setup-error.label': 'Discord setup failed',
        'discord-setup.title': 'Discord',
        'discord-companion.label': 'Discord',
        'discord-setup-actions.label': 'Discord setup actions',
        'discord-setup-sign-out.label': 'Sign out of Discord',
        'discord-setup-connect.label': 'Connect Discord',
        'discord-setup-no-bot.message': 'This EDGE has no Kai app, so agents cannot join Discord here.',
        'discord-setup-servers.label': 'Servers',
        'discord-setup-servers-empty.label': 'Sign in to Discord to see the servers you administer.',
        'discord-setup-installed.label': 'Installed',
        'discord-setup-install.label': 'Install',
        'discord-setup-reinstall.label': 'Reinstall (update permissions)',
        'discord-setup-refresh.label': 'Refresh',
        'discord-setup-console.label': 'Open the EDGE console',
        'discord-setup-connected.label': 'Connected channels',
        'discord-setup-connected-empty.label': 'No channels connected yet.',
        'discord-setup-channels.label': 'Channels',
        'discord-setup-bound-other.label': 'Another agent',
        'discord-setup-connect-channel.label': 'Connect',
        'discord-setup-disconnect.label': 'Disconnect',
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
