//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability, useSettingsState } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';

import { SpacetimeSettings } from '../../components';
import { SpacetimeArticle } from '../../containers';
import { meta } from '../../meta';
import { Spacetime, SpacetimeCapabilities, type Settings } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.scene`,
        role: 'article',
        filter: (data): data is { subject: Spacetime.Scene } => Obj.instanceOf(Spacetime.Scene, data.subject),
        component: ({ data, role }) => {
          const settings = useAtomCapability(SpacetimeCapabilities.Settings);
          return <SpacetimeArticle role={role} subject={data.subject} settings={settings} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: AppCapabilities.Settings } =>
          AppCapabilities.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <SpacetimeSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
