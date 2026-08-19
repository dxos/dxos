//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type StreamDeckStatusProps = {
  model?: string;
};

/**
 * Shown only while a device is attached. Most users have no device plugin installed, so an indicator
 * that rendered a disconnected state would be permanent noise in the rail.
 */
export const StreamDeckStatus = ({ model }: StreamDeckStatusProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <span title={model ?? t('device-connected.label')} data-testid='stream-deck.status'>
      <Icon icon='ph--squares-four--regular' size={5} classNames='text-cyan-400' />
    </span>
  );
};

StreamDeckStatus.displayName = 'StreamDeckStatus';
