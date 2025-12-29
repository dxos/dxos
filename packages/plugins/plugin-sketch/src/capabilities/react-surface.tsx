//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { SettingsStore } from '@dxos/local-storage';

import { SketchContainer, SketchSettings } from '../components';
import { meta } from '../meta';
import { Diagram, type SketchSettingsProps } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(Common.Capability.ReactSurface, [
    Common.createSurface({
      id: `${meta.id}/sketch`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: Diagram.Diagram } => Diagram.isDiagram(data.subject, Diagram.TLDRAW_SCHEMA),
      component: ({ data, role }) => {
        const settings = useCapability(Common.Capability.SettingsStore).getStore<SketchSettingsProps>(meta.id)!.value;
        return <SketchContainer sketch={data.subject} role={role} settings={settings} />;
      },
    }),
    Common.createSurface({
      id: `${meta.id}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<SketchSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
      component: ({ data: { subject } }) => <SketchSettings settings={subject.value} />,
    }),
  ]),
);
