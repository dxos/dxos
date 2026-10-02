//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Banner, useTranslation } from '@dxos/react-ui';
import { type MessageValence } from '@dxos/ui-types';

import { meta } from '#meta';
import { type DiscordOperation } from '#types';

const GATEWAY_VALENCE: Record<DiscordOperation.GatewayState, MessageValence> = {
  idle: 'neutral',
  connecting: 'info',
  ready: 'success',
  closed: 'neutral',
  failed: 'error',
};

export type DiscordBotStatusProps = {
  /** Undefined until the first status arrives. */
  status?: DiscordOperation.BotStatus;
  /** A failure to reach EDGE, as distinct from the gateway's own `lastError`. */
  error?: string;
};

/** Reports the EDGE gateway state of an agent's Discord bot. */
export const DiscordBotStatus = ({ status, error }: DiscordBotStatusProps) => {
  const { t } = useTranslation(meta.profile.key);
  if (error) {
    return (
      <Banner.Root valence='error'>
        <Banner.Content>
          <Banner.Title>{t('discord-bot-unreachable.label')}</Banner.Title>
          <Banner.Body>{error}</Banner.Body>
        </Banner.Content>
      </Banner.Root>
    );
  }

  if (!status) {
    return (
      <Banner.Root valence='neutral' icon='ph--circle-notch--regular'>
        <Banner.Content>
          <Banner.Title>{t('discord-gateway-checking.label')}</Banner.Title>
        </Banner.Content>
      </Banner.Root>
    );
  }

  return (
    <Banner.Root valence={status.lastError ? 'warning' : GATEWAY_VALENCE[status.gateway]}>
      <Banner.Content>
        <Banner.Title>{t(`discord-gateway-${status.gateway}.label`)}</Banner.Title>
        <Banner.Body>{t('discord-bot-threads.label', { count: status.threads })}</Banner.Body>
        {status.lastError && <Banner.Body>{status.lastError}</Banner.Body>}
      </Banner.Content>
    </Banner.Root>
  );
};

DiscordBotStatus.displayName = 'DiscordBotStatus';
