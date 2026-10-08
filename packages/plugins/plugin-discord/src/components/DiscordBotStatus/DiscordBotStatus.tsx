//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';
import * as Banner from '@dxos/react-ui/Banner';
import * as Hooks from '@dxos/react-ui/Hooks';
import { type MessageValence } from '@dxos/ui-types';

import { meta } from '#meta';
import { DiscordChannel } from '#types';

const GATEWAY_VALENCE: Record<string, MessageValence> = {
  idle: 'neutral',
  connecting: 'info',
  ready: 'success',
  closed: 'neutral',
  failed: 'error',
};

export type DiscordBotStatusProps = {
  /** Undefined until the first status arrives. */
  status?: ThreadOperation.ConnectionStatus;
  /** A failure to reach EDGE, as distinct from the gateway's own `error`. */
  error?: string;
};

/** Reports the EDGE gateway state of a Discord channel's bot. */
export const DiscordBotStatus = ({ status, error }: DiscordBotStatusProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  // The last status read stays visible beside a failed refresh, so a transient EDGE outage does not hide it.
  const unreachable = error && (
    <Banner.Root valence='error'>
      <Banner.Title>{t('discord-bot-unreachable.label')}</Banner.Title>
      <Banner.Body>{error}</Banner.Body>
    </Banner.Root>
  );

  if (!status) {
    return (
      unreachable || (
        <Banner.Root valence='neutral' icon='ph--circle-notch--regular'>
          <Banner.Title>{t('discord-gateway-checking.label')}</Banner.Title>
        </Banner.Root>
      )
    );
  }

  if (status.state === DiscordChannel.OTHER_CONFIG_STATE) {
    return (
      <>
        {unreachable}
        <Banner.Root valence='warning'>
          <Banner.Title>{t('discord-bot-other-config.label')}</Banner.Title>
          <Banner.Body>{t('discord-bot-other-config.message')}</Banner.Body>
        </Banner.Root>
      </>
    );
  }

  const state = status.state ?? (status.running ? 'ready' : 'idle');
  return (
    <>
      {unreachable}
      <Banner.Root valence={status.error ? 'warning' : (GATEWAY_VALENCE[state] ?? 'neutral')}>
        <Banner.Title>{t(`discord-gateway-${state}.label`)}</Banner.Title>
        {status.detail && <Banner.Body>{status.detail}</Banner.Body>}
        {status.error && <Banner.Body>{status.error}</Banner.Body>}
      </Banner.Root>
    </>
  );
};

DiscordBotStatus.displayName = 'DiscordBotStatus';
