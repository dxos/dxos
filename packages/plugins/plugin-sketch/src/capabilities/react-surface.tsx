//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { SettingsStore } from '@dxos/local-storage';

import { SketchContainer, SketchSettings } from '../components';
import { SKETCH_PLUGIN } from '../meta';
import { type DiagramType, type SketchSettingsProps, TLDRAW_SCHEMA, isDiagramType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${SKETCH_PLUGIN}/sketch`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: DiagramType } => isDiagramType(data.subject, TLDRAW_SCHEMA),
      component: ({ data, role }) => {
        const settings = useCapability(Capabilities.SettingsStore).getStore<SketchSettingsProps>(SKETCH_PLUGIN)!.value;
        return <SketchContainer sketch={data.subject} role={role} settings={settings} />;
      },
    }),
    createSurface({
      id: `${SKETCH_PLUGIN}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<SketchSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === SKETCH_PLUGIN,
      component: ({ data: { subject } }) => <SketchSettings settings={subject.value} />,
    }),
  ]);
