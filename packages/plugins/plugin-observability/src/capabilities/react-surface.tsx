//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, defineCapabilityModule } from '@dxos/app-framework';
import { SettingsStore } from '@dxos/local-storage';

import { HelpContainer, ObservabilitySettings, type ObservabilitySettingsProps } from '../components';
import { meta } from '../meta';

export default defineCapabilityModule(() =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<ObservabilitySettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
      component: ({ data: { subject } }) => <ObservabilitySettings settings={subject.value} />,
    }),
    createSurface({
      id: `${meta.id}/help`,
      role: 'deck-companion--help',
      component: () => <HelpContainer />,
    }),
  ]));
