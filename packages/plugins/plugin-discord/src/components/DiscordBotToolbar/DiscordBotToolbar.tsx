//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { DiscordNamespace } from '../../namespace.ts';

export type DiscordBotToolbarProps = {
  /** Scopes the toolbar to the host plank's attention; without one it is always enabled. */
  attendableId?: string;
  running?: boolean;
  busy?: boolean;
  onStart?: () => void;
  onStop?: () => void;
  onRefresh?: () => void;
};

/** Start, stop and refresh for a Discord channel's bot on EDGE. */
export const DiscordBotToolbar = ({
  attendableId,
  running = false,
  busy = false,
  onStart,
  onStop,
  onRefresh,
}: DiscordBotToolbarProps) => {
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['discord-bot-actions.label', { ns: DiscordNamespace.key }] })
        .action(
          'start',
          {
            // Reconfigures a running bot, so the label follows the state.
            label: [running ? 'discord-bot-restart.label' : 'discord-bot-start.label', { ns: DiscordNamespace.key }],
            icon: running ? 'ph--arrow-clockwise--regular' : 'ph--play--regular',
            disabled: busy,
          },
          () => onStart?.(),
        )
        .action(
          'stop',
          {
            label: ['discord-bot-stop.label', { ns: DiscordNamespace.key }],
            icon: 'ph--stop--regular',
            disabled: busy || !running,
          },
          () => onStop?.(),
        )
        .action(
          'refresh',
          {
            label: ['discord-bot-refresh.label', { ns: DiscordNamespace.key }],
            icon: 'ph--arrows-counter-clockwise--regular',
            disabled: busy,
          },
          () => onRefresh?.(),
        )
        .build(),
    [running, busy, onStart, onStop, onRefresh],
  );

  return <ActionToolbar {...menuActions} attendableId={attendableId} alwaysActive={attendableId === undefined} />;
};

DiscordBotToolbar.displayName = 'DiscordBotToolbar';
