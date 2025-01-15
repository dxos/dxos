//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { EXCALIDRAW_SCHEMA, type DiagramType, isDiagramType } from '@dxos/plugin-sketch/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';

import { SketchContainer, SketchSettings } from '../components';
import { EXCALIDRAW_PLUGIN } from '../meta';
import { type SketchSettingsProps } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${EXCALIDRAW_PLUGIN}/sketch`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: DiagramType } => isDiagramType(data.subject, EXCALIDRAW_SCHEMA),
      component: ({ data, role }) => {
        const settings = useCapability(Capabilities.SettingsStore).getStore<SketchSettingsProps>(
          EXCALIDRAW_PLUGIN,
        )!.value;

        return (
          <SketchContainer
            key={fullyQualifiedId(data.subject)} // Force instance per sketch object. Otherwise, sketch shares the same instance.
            sketch={data.subject}
            role={role}
            settings={settings}
          />
        );
      },
    }),
    createSurface({
      id: `${EXCALIDRAW_PLUGIN}/settings`,
      role: 'settings',
      filter: (data): data is any => data.subject === EXCALIDRAW_PLUGIN,
      component: () => {
        const settings = useCapability(Capabilities.SettingsStore).getStore<SketchSettingsProps>(
          EXCALIDRAW_PLUGIN,
        )!.value;
        return <SketchSettings settings={settings} />;
      },
    }),
  ]);
