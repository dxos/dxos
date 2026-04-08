//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Sketch } from '@dxos/plugin-sketch/types';

import { SketchSettings } from '#components';
import { SketchContainer } from '#containers';
import { meta } from '#meta';
import { EXCALIDRAW_SCHEMA, ExcalidrawCapabilities, type Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.sketch`,
        role: ['article', 'section', 'slide'],
        filter: (data): data is { subject: Sketch.Sketch; attendableId: string } =>
          typeof data.attendableId === 'string' && Sketch.isSketch(data.subject, EXCALIDRAW_SCHEMA),
        component: ({ data: { subject, attendableId }, role }) => {
          const settings = useAtomCapability(ExcalidrawCapabilities.Settings);
          return <SketchContainer role={role} subject={subject} attendableId={attendableId} settings={settings} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.plugin-settings`,
        role: 'article',
        filter: AppSurface.settings(meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <SketchSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
