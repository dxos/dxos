//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { SpacetimeSettings } from '#components';
import { SpacetimeArticle } from '#containers';
import { meta } from '#meta';
import { Scene, type Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.scene`,
        role: 'article',
        filter: AppSurface.objectArticle(Scene.Scene),
        component: ({ data, role }) => {
          return <SpacetimeArticle role={role} subject={data.subject} attendableId={data.attendableId} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.plugin-settings`,
        role: 'article',
        filter: AppSurface.settingsArticle(meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <SpacetimeSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
