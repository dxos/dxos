//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { SettingsStore } from '@dxos/local-storage';
import { type DiagramType, isDiagramType } from '@dxos/plugin-sketch/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';

import { SketchContainer, SketchSettings } from '../components';
import { EXCALIDRAW_PLUGIN } from '../meta';
import { EXCALIDRAW_SCHEMA, type SketchSettingsProps } from '../types';

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
      id: `${EXCALIDRAW_PLUGIN}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<SketchSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === EXCALIDRAW_PLUGIN,
      component: ({ data: { subject } }) => <SketchSettings settings={subject.value} />,
    }),
  ]);
