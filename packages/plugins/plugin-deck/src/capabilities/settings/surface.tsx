//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, useCapabilities } from '@dxos/app-framework/next';

import { LayoutSettings } from '../../components';
import { DECK_PLUGIN } from '../../meta';
import { type DeckSettingsProps } from '../../types';

export default () =>
  contributes(Capabilities.ReactSurface, {
    id: DECK_PLUGIN,
    role: 'settings',
    filter: (data): data is any => data.subject === DECK_PLUGIN,
    component: () => {
      const [{ settings }] = useCapabilities(
        Capabilities.Settings,
        (c): c is { plugin: typeof DECK_PLUGIN; settings: DeckSettingsProps } => c.plugin === DECK_PLUGIN,
      );
      return <LayoutSettings settings={settings as DeckSettingsProps} />;
    },
  });
