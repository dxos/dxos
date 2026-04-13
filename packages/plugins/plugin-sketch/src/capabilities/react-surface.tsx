//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { SketchSettings } from '#components';
import { SketchContainer } from '#containers';
import { meta } from '#meta';
import { Sketch, SketchCapabilities, type Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'sketch',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        role: ['article', 'section', 'slide'],
        filter: (data): data is { subject: Sketch.Sketch; attendableId: string } =>
          typeof data.attendableId === 'string' && Sketch.isSketch(data.subject, Sketch.TLDRAW_SCHEMA),
        component: ({ data: { subject, attendableId }, role }) => {
          const settings = useAtomCapability(SketchCapabilities.Settings);
          return <SketchContainer role={role} attendableId={attendableId} subject={subject} settings={settings} />;
        },
      }),
      Surface.create({
        id: 'plugin-settings',
        role: 'article',
        filter: AppSurface.settingsArticle(meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <SketchSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
