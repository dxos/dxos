//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ExcalidrawArticle, ExcalidrawSettings } from '#containers';
import { meta } from '#meta';
import { Excalidraw, ExcalidrawCapabilities, type Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'excalidraw',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Excalidraw.Excalidraw),
          AppSurface.object(AppSurface.Section, Excalidraw.Excalidraw),
          AppSurface.object(AppSurface.Slide, Excalidraw.Excalidraw),
        ),
        component: ({ data: { subject, attendableId }, role }) => {
          const settings = useAtomCapability(ExcalidrawCapabilities.Settings);
          return <ExcalidrawArticle role={role} subject={subject} attendableId={attendableId} settings={settings} />;
        },
      }),
      Surface.create({
        id: 'plugin-settings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <ExcalidrawSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
