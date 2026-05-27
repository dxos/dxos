//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { GenerationArticle, GenerationProperties, GeneratorSettings } from '#containers';
import { meta } from '#meta';
import { Generation, type Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: DXN.make('org.dxos.plugin.generator.surface.generation'),
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Generation.Generation),
          AppSurface.object(AppSurface.Section, Generation.Generation),
        ),
        component: ({ data, role }) => (
          <GenerationArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.generator.surface.objectProperties'),
        position: 'first',
        filter: AppSurface.object(AppSurface.ObjectProperties, Generation.Generation),
        component: ({ data }) => <GenerationProperties subject={data.subject} />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.generator.surface.pluginSettings'),
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <GeneratorSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
