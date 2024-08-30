//
// Copyright 2023 DXOS.org
//

import { CompassTool, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { parseIntentPlugin, type PluginDefinition, resolvePlugin, NavigationAction } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';
import { CollectionType } from '@dxos/plugin-space/types';
import { isSpace, loadObjectReferences } from '@dxos/react-client/echo';

import { SketchContainer, SketchSettings } from './components';
import meta, { SKETCH_PLUGIN } from './meta';
import translations from './translations';
import { TLDRAW_SCHEMA, CanvasType, DiagramType, createDiagramType, isDiagramType } from './types';
import { SketchAction, type SketchGridType, type SketchPluginProvides, type SketchSettingsProps } from './types';
import { serializer } from './util';

export const SketchPlugin = (): PluginDefinition<SketchPluginProvides> => {
  const settings = new LocalStorageStore<SketchSettingsProps>(SKETCH_PLUGIN, {});

  return {
    meta,
    ready: async () => {
      settings.prop({
        key: 'gridType',
        storageKey: 'grid-type',
        type: LocalStorageStore.enum<SketchGridType>({ allowUndefined: true }),
      });
    },
    provides: {
      metadata: {
        records: {
          [DiagramType.typename]: {
            placeholder: ['object title placeholder', { ns: SKETCH_PLUGIN }],
            icon: (props: IconProps) => <CompassTool {...props} />,
            iconSymbol: 'ph--compass-tool--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: (diagram: DiagramType) => loadObjectReferences(diagram, (diagram) => [diagram.canvas]),
            serializer,
          },
        },
      },
      settings: settings.values,
      translations,
      echo: {
        schema: [DiagramType, CanvasType],
      },
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return [
            createExtension({
              id: SketchAction.CREATE,
              filter: (node): node is ActionGroup => isActionGroup(node) && node.id.startsWith(SpaceAction.ADD_OBJECT),
              actions: ({ node }) => {
                const id = node.id.split('/').at(-1);
                const [spaceId, objectId] = id?.split(':') ?? [];
                const space = client.spaces.get().find((space) => space.id === spaceId);
                const object = objectId && space?.db.getObjectById(objectId);
                const target = objectId ? object : space;
                if (!target) {
                  return;
                }

                return [
                  {
                    id: `${SKETCH_PLUGIN}/create/${node.id}`,
                    data: async () => {
                      await dispatch([
                        { plugin: SKETCH_PLUGIN, action: SketchAction.CREATE },
                        { action: SpaceAction.ADD_OBJECT, data: { target } },
                        { action: NavigationAction.OPEN },
                      ]);
                    },
                    properties: {
                      label: ['create object label', { ns: SKETCH_PLUGIN }],
                      icon: (props: IconProps) => <CompassTool {...props} />,
                      iconSymbol: 'ph--compass-tool--regular',
                      testId: 'sketchPlugin.createObject',
                    },
                  },
                ];
              },
            }),
          ];
        },
        serializer: (plugins) => {
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
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
                const canvas = await loadObjectReferences(diagram, (diagram) => diagram.canvas);
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
                  space?.properties[CollectionType.typename];
                if (!space || !target) {
                  return;
                }

                const { schema, content } = JSON.parse(data.data);

                const result = await dispatch([
                  {
                    plugin: SKETCH_PLUGIN,
                    action: SketchAction.CREATE,
                    data: { name: data.name, schema, content },
                  },
                  {
                    action: SpaceAction.ADD_OBJECT,
                    data: { target },
                  },
                ]);

                return result?.data.object;
              },
            },
          ];
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-sketch',
            testId: 'sketchPlugin.createSectionSpaceSketch',
            label: ['create stack section label', { ns: SKETCH_PLUGIN }],
            icon: (props: any) => <CompassTool {...props} />,
            intent: [
              {
                plugin: SKETCH_PLUGIN,
                action: SketchAction.CREATE,
              },
            ],
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'slide':
              return isDiagramType(data.slide, TLDRAW_SCHEMA) ? (
                <SketchContainer sketch={data.slide} readonly autoZoom maxZoom={1.5} classNames='p-16' />
              ) : null;
            case 'article':
            case 'section':
              return isDiagramType(data.object, TLDRAW_SCHEMA) ? (
                <SketchContainer
                  sketch={data.object}
                  autoZoom
                  classNames={role === 'article' ? 'row-span-2' : 'aspect-square'}
                  grid={settings.values.gridType}
                />
              ) : null;
            case 'settings': {
              return data.plugin === meta.id ? <SketchSettings settings={settings.values} /> : null;
            }
            default:
              return null;
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case SketchAction.CREATE: {
              const schema = intent.data?.schema ?? TLDRAW_SCHEMA;
              const content = intent.data?.content ?? {};
              return {
                data: createDiagramType(schema, content),
              };
            }
          }
        },
      },
    },
  };
};
