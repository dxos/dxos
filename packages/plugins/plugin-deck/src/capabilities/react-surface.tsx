//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { SettingsStore } from '@dxos/local-storage';

import { Banner, DeckSettings } from '../components';
import { meta } from '../meta';
import { type DeckSettingsProps } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(Common.Capability.ReactSurface, [
    Common.createSurface({
      id: `${meta.id}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<DeckSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
      component: ({ data: { subject } }) => <DeckSettings settings={subject.value} />,
    }),
    Common.createSurface({
      id: `${meta.id}/banner`,
      role: 'banner',
      component: ({ data }: { data: { variant?: 'topbar' | 'sidebar' } }) => {
        return <Banner variant={data.variant} />;
      },
    }),
  ]),
);
