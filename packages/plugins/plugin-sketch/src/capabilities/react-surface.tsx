//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, defineCapabilityModule } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { SettingsStore } from '@dxos/local-storage';

import { SketchContainer, SketchSettings } from '../components';
import { meta } from '../meta';
import { Diagram, type SketchSettingsProps } from '../types';

export default defineCapabilityModule(() =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/sketch`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: Diagram.Diagram } => Diagram.isDiagram(data.subject, Diagram.TLDRAW_SCHEMA),
      component: ({ data, role }) => {
        const settings = useCapability(Capabilities.SettingsStore).getStore<SketchSettingsProps>(meta.id)!.value;
        return <SketchContainer sketch={data.subject} role={role} settings={settings} />;
      },
    }),
    createSurface({
      id: `${meta.id}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<SketchSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
      component: ({ data: { subject } }) => <SketchSettings settings={subject.value} />,
    }),
  ]),
);
