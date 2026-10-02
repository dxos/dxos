//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { StatusBar } from '@dxos/plugin-status-bar/StatusBar';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';

import { meta } from '#meta';

export type StreamDeckStatusProps = {
  model?: string;
};

/**
 * Shown only while a device is attached. Most users have no device plugin installed, so an indicator
 * that rendered a disconnected state would be permanent noise in the rail.
 *
 * `StatusBar.Item` rather than a bare element: the rail's alignment comes from it, so anything else
 * sits off-centre next to its neighbours.
 */
export const StreamDeckStatus = ({ model }: StreamDeckStatusProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  // Always says what it is; the model only qualifies it, since "Stream Deck +" alone reads as a
  // label rather than a status.
  const label = model ? `${t('device-connected.label')} (${model})` : t('device-connected.label');
  return (
    <StatusBar.Item>
      <span role='status' aria-label={label} title={label} data-testid='stream-deck.status'>
        {/* Default colour: the indicator's presence is the signal, so colour is reserved for a state
            that needs attention. */}
        <Icon.Root icon='ph--squares-four--regular' size={5} />
      </span>
    </StatusBar.Item>
  );
};

StreamDeckStatus.displayName = 'StreamDeckStatus';
