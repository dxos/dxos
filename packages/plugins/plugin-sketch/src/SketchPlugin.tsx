//
// Copyright 2023 DXOS.org
//

import { pipe } from 'effect';
import React from 'react';

import {
  parseIntentPlugin,
  type PluginDefinition,
  resolvePlugin,
  createSurface,
  createResolver,
  createIntent,
  chain,
} from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { SpaceAction } from '@dxos/plugin-space';
import { CollectionType } from '@dxos/plugin-space/types';
import { create, isSpace, makeRef, RefArray } from '@dxos/react-client/echo';

import { SketchContainer, SketchSettings } from './components';
import meta, { SKETCH_PLUGIN } from './meta';
import translations from './translations';
import { TLDRAW_SCHEMA, CanvasType, DiagramType, isDiagramType } from './types';
import { SketchAction, type SketchGridType, type SketchPluginProvides, type SketchSettingsProps } from './types';
import { serializer } from './util';

export const SketchPlugin = (): PluginDefinition<SketchPluginProvides> => {
  const settings = new LocalStorageStore<SketchSettingsProps>(SKETCH_PLUGIN);

  return {
    meta,
    ready: async () => {
      settings.prop({ key: 'gridType', type: LocalStorageStore.enum<SketchGridType>({ allowUndefined: true }) });
    },
    provides: {
      metadata: {
        records: {
          [DiagramType.typename]: {
            createObject: (props: { name?: string }) => createIntent(SketchAction.Create, props),
            placeholder: ['object title placeholder', { ns: SKETCH_PLUGIN }],
            icon: 'ph--compass-tool--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (diagram: DiagramType) => await RefArray.loadAll([diagram.canvas]),
            serializer,
          },
        },
      },
      settings: settings.values,
      translations,
      echo: {
        schema: [DiagramType],
        system: [CanvasType],
      },
      graph: {
        serializer: (plugins) => {
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatchPromise;
          if (!dispatch) {
            return [];
          }

          return [
            {
              inputType: DiagramType.typename,
              outputType: 'application/tldraw',
              // Reconcile with metadata serializers.
              serialize: async (node) => {
                const diagram = node.data;
                const canvas = await diagram.canvas.load();
                return {
                  name: diagram.name || translations[0]['en-US'][SKETCH_PLUGIN]['object title placeholder'],
                  data: JSON.stringify({ schema: canvas.schema, content: canvas.content }),
                  type: 'application/tldraw',
                };
              },
              deserialize: async (data, ancestors) => {
                const space = ancestors.find(isSpace);
                const target =
                  ancestors.findLast((ancestor) => ancestor instanceof CollectionType) ??
                  space?.properties[CollectionType.typename]?.target;
                if (!space || !target) {
                  return;
                }

                const { schema, content } = JSON.parse(data.data);

                const result = await dispatch(
                  pipe(
                    createIntent(SketchAction.Create, { name: data.name, schema, content }),
                    chain(SpaceAction.AddObject, { target }),
                  ),
                );

                return result.data?.object;
              },
            },
          ];
        },
      },
      surface: {
        definitions: () => [
          createSurface({
            id: `${SKETCH_PLUGIN}/sketch`,
            role: ['article', 'section', 'slide'],
            filter: (data): data is { subject: DiagramType } => isDiagramType(data.subject, TLDRAW_SCHEMA),
            component: ({ data, role }) => (
              <SketchContainer
                sketch={data.subject}
                readonly={role === 'slide'}
                maxZoom={role === 'slide' ? 1.5 : undefined}
                autoZoom={role === 'section'}
                classNames={role === 'article' ? 'row-span-2' : role === 'section' ? 'aspect-square' : 'p-16'}
                grid={settings.values.gridType}
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
          createResolver(SketchAction.Create, ({ name, schema = TLDRAW_SCHEMA, content = {} }) => ({
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
