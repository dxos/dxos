//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition, createSurface, createIntent, createResolver } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { EXCALIDRAW_SCHEMA, CanvasType, DiagramType, isDiagramType } from '@dxos/plugin-sketch/types';
import { create, fullyQualifiedId, makeRef } from '@dxos/react-client/echo';

import { SketchContainer, SketchSettings } from './components';
import meta, { SKETCH_PLUGIN } from './meta';
import translations from './translations';
import { SketchAction, type SketchGridType, type SketchPluginProvides, type SketchSettingsProps } from './types';

export const SketchPlugin = (): PluginDefinition<SketchPluginProvides> => {
  const settings = new LocalStorageStore<Partial<SketchSettingsProps>>(SKETCH_PLUGIN);

  return {
    meta,
    ready: async () => {
      settings
        .prop({
          key: 'autoHideControls',
          type: LocalStorageStore.bool({ allowUndefined: true }),
        })
        .prop({
          key: 'gridType',
          type: LocalStorageStore.enum<SketchGridType>({ allowUndefined: true }),
        });
    },
    provides: {
      metadata: {
        records: {
          [DiagramType.typename]: {
            createObject: (props: { name?: string }) => createIntent(SketchAction.Create, props),
            placeholder: ['object title placeholder', { ns: SKETCH_PLUGIN }],
            icon: 'ph--compass-tool--regular',
          },
        },
      },
      settings: settings.values,
      translations,
      echo: {
        schema: [DiagramType],
        system: [CanvasType],
      },
      surface: {
        definitions: () => [
          createSurface({
            id: `${SKETCH_PLUGIN}/sketch`,
            role: ['article', 'section', 'slide'],
            filter: (data): data is { subject: DiagramType } => isDiagramType(data.subject, EXCALIDRAW_SCHEMA),
            component: ({ data, role }) => (
              <SketchContainer
                key={fullyQualifiedId(data.subject)} // Force instance per sketch object. Otherwise, sketch shares the same instance.
                sketch={data.subject}
                role={role}
                settings={settings.values}
              />
            ),
          }),
          createSurface({
            id: `${SKETCH_PLUGIN}/settings`,
            role: 'settings',
            filter: (data): data is any => data.subject === SKETCH_PLUGIN,
            component: () => <SketchSettings settings={settings.values} />,
          }),
        ],
      },
      intent: {
        resolvers: () =>
          createResolver(SketchAction.Create, ({ name, schema = EXCALIDRAW_SCHEMA, content = {} }) => ({
            data: {
              object: create(DiagramType, {
                name,
                canvas: makeRef(create(CanvasType, { schema, content })),
                threads: [],
              }),
            },
          })),
      },
    },
  };
};
