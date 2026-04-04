//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';

import { ObservabilitySettings } from '../../components';
import { HelpContainer } from '../../containers';
import { meta } from '../../meta';
import { ObservabilityOperation } from '../../operations';
import { type Settings } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: meta.id,
        role: 'article',
        filter: (data): data is { subject: AppCapabilities.Settings } =>
          AppCapabilities.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          const { invokePromise } = useOperationInvoker();
          return (
            <ObservabilitySettings
              settings={settings}
              onSettingsChange={updateSettings}
              onToggle={(state: boolean) => invokePromise(ObservabilityOperation.Toggle, { state })}
            />
          );
        },
      }),
      Surface.create({
        id: `${meta.id}.help`,
        role: 'deck-companion--help',
        component: () => <HelpContainer />,
      }),
    ]),
  ),
);
