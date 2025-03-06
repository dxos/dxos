//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { SettingsStore } from '@dxos/local-storage';

import { LayoutSettings } from '../components';
import { Banner } from '../components/DeckLayout/Banner';
import { DECK_PLUGIN } from '../meta';
import { type DeckSettingsProps } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${DECK_PLUGIN}/settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<DeckSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === DECK_PLUGIN,
      component: ({ data: { subject } }) => <LayoutSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${DECK_PLUGIN}/banner`,
      role: 'banner',
      component: ({ data }) => {
        return <Banner variant={data.variant} />;
      },
    }),
  ]);
