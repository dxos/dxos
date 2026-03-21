//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';

import { DailySummarySettings } from '../../containers';
import { type DailySummarySettingsProps } from '../../types';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: AppCapabilities.Settings } =>
          AppCapabilities.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<DailySummarySettingsProps>(subject.atom);
          return <DailySummarySettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
