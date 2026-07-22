//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ObservabilitySettings } from '#containers';
import { meta } from '#meta';
import { ObservabilityOperation } from '#types';
import { type Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.provide(Capabilities.ReactSurface, [
      Surface.create({
        id: 'root',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: ({ data: { subject } }) => {
          const { settings } = useSettingsState<Settings.Settings>(subject.atom);
          const { invokePromise } = useOperationInvoker();
          const handleSettingsChange = (cb: (current: Settings.Settings) => Settings.Settings) => {
            const next = cb(settings);
            void invokePromise(ObservabilityOperation.Toggle, { state: next.enabled });
          };
          return <ObservabilitySettings settings={settings} onSettingsChange={handleSettingsChange} />;
        },
      }),
    ]),
  ),
);
