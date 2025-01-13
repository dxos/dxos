//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';

import { SketchContainer, SketchSettings } from '../components';
import { SKETCH_PLUGIN } from '../meta';
import { type DiagramType, isDiagramType, type SketchSettingsProps, TLDRAW_SCHEMA } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${SKETCH_PLUGIN}/sketch`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: DiagramType } => isDiagramType(data.subject, TLDRAW_SCHEMA),
      component: ({ data, role }) => {
        const settings = useCapability(Capabilities.SettingsStore).getStore<SketchSettingsProps>(SKETCH_PLUGIN)!.value;

        return (
          <SketchContainer
            sketch={data.subject}
            readonly={role === 'slide'}
            maxZoom={role === 'slide' ? 1.5 : undefined}
            autoZoom={role === 'section'}
            classNames={role === 'article' ? 'row-span-2' : role === 'section' ? 'aspect-square' : 'p-16'}
            grid={settings.gridType}
          />
        );
      },
    }),
    createSurface({
      id: `${SKETCH_PLUGIN}/settings`,
      role: 'settings',
      filter: (data): data is any => data.subject === SKETCH_PLUGIN,
      component: () => {
        const settings = useCapability(Capabilities.SettingsStore).getStore<SketchSettingsProps>(SKETCH_PLUGIN)!.value;

        return <SketchSettings settings={settings} />;
      },
    }),
  ]);
