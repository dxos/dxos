//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, useCapability } from '@dxos/app-framework';

import { LayoutSettings } from '../../components';
import { DECK_PLUGIN } from '../../meta';
import { type DeckSettingsProps } from '../../types';

export default () =>
  contributes(Capabilities.ReactSurface, {
    id: DECK_PLUGIN,
    role: 'settings',
    filter: (data): data is any => data.subject === DECK_PLUGIN,
    component: () => {
      const store = useCapability(Capabilities.SettingsStore);
      const settings = store.getStore<DeckSettingsProps>(DECK_PLUGIN)!.value;
      return <LayoutSettings settings={settings} />;
    },
  });
