//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';

import { HelpContainer, ObservabilitySettings, type ObservabilitySettingsProps } from '../../components';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: meta.id,
        role: 'article',
        filter: (data): data is { subject: AppCapabilities.Settings } =>
          AppCapabilities.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<ObservabilitySettingsProps>(subject.atom);
          return <ObservabilitySettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/help`,
        role: 'deck-companion--help',
        component: () => <HelpContainer />,
      }),
    ]),
  ),
);
