//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';

import { LayoutSettings } from '../components';
import { Banner } from '../components/DeckLayout/Banner';
import { DECK_PLUGIN } from '../meta';
import { type DeckSettingsProps } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${DECK_PLUGIN}/settings`,
      role: 'settings',
      filter: (data): data is any => data.subject === DECK_PLUGIN,
      component: () => {
        const store = useCapability(Capabilities.SettingsStore);
        const settings = store.getStore<DeckSettingsProps>(DECK_PLUGIN)!.value;
        return <LayoutSettings settings={settings} />;
      },
    }),
    createSurface({
      id: `${DECK_PLUGIN}/banner`,
      role: 'banner',
      component: ({ data }) => {
        return <Banner variant={data.variant} />;
      },
    }),
  ]);
