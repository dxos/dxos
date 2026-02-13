//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability, useSettingsState } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { Diagram } from '@dxos/plugin-sketch/types';

import { SketchContainer, SketchSettings } from '../../components';
import { meta } from '../../meta';
import { EXCALIDRAW_SCHEMA, ExcalidrawCapabilities, type SketchSettingsProps } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}/sketch`,
        role: ['article', 'section', 'slide'],
        filter: (data): data is { subject: Diagram.Diagram } => Diagram.isDiagram(data.subject, EXCALIDRAW_SCHEMA),
        component: ({ data, role }) => {
          const settings = useAtomCapability(ExcalidrawCapabilities.Settings);

          return (
            <SketchContainer
              key={Obj.getDXN(data.subject).toString()} // Force instance per sketch object. Otherwise, sketch shares the same instance.
              role={role}
              subject={data.subject}
              settings={settings}
            />
          );
        },
      }),
      Surface.create({
        id: `${meta.id}/plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: AppCapabilities.Settings } =>
          AppCapabilities.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<SketchSettingsProps>(subject.atom);
          return <SketchSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
