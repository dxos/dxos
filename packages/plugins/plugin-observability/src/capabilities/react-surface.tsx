//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { contributes, useCapability, Capabilities, createSurface } from '@dxos/app-framework';

import { ObservabilitySettings, type ObservabilitySettingsProps } from '../components';
import { OBSERVABILITY_PLUGIN } from '../meta';

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: OBSERVABILITY_PLUGIN,
      role: 'settings',
      filter: (data): data is any => data.subject === OBSERVABILITY_PLUGIN,
      component: () => {
        const settings = useCapability(Capabilities.SettingsStore).getStore<ObservabilitySettingsProps>(
          OBSERVABILITY_PLUGIN,
        )!.value;
        return <ObservabilitySettings settings={settings} />;
      },
    }),
  );
