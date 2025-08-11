//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { SettingsStore } from '@dxos/local-storage';

import { HelpContainer, ObservabilitySettings, type ObservabilitySettingsProps } from '../components';
import { OBSERVABILITY_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: OBSERVABILITY_PLUGIN,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<ObservabilitySettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === OBSERVABILITY_PLUGIN,
      component: ({ data: { subject } }) => <ObservabilitySettings settings={subject.value} />,
    }),
    createSurface({
      id: `${OBSERVABILITY_PLUGIN}/help`,
      role: 'deck-companion--help',
      component: () => <HelpContainer />,
    }),
  ]);
