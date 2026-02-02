//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useAtomCapability, useSettingsState } from '@dxos/app-framework/react';

import { SketchContainer, SketchSettings } from '../../components';
import { meta } from '../../meta';
import { Diagram, SketchCapabilities, type SketchSettingsProps } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: `${meta.id}/sketch`,
        role: ['article', 'section', 'slide'],
        filter: (data): data is { subject: Diagram.Diagram } => Diagram.isDiagram(data.subject, Diagram.TLDRAW_SCHEMA),
        component: ({ data, role }) => {
          const settings = useAtomCapability(SketchCapabilities.Settings);
          return <SketchContainer role={role} subject={data.subject} settings={settings} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: Common.Capability.Settings } =>
          Common.Capability.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<SketchSettingsProps>(subject.atom);
          return <SketchSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
