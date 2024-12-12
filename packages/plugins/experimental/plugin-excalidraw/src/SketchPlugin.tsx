//
// Copyright 2023 DXOS.org
//

import { CompassTool } from '@phosphor-icons/react';
import React from 'react';

import {
  parseIntentPlugin,
  type PluginDefinition,
  resolvePlugin,
  NavigationAction,
  createSurface,
} from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import {
  EXCALIDRAW_SCHEMA,
  CanvasType,
  DiagramType,
  createDiagramType,
  isDiagramType,
} from '@dxos/plugin-sketch/types';
import { SpaceAction } from '@dxos/plugin-space';
import { fullyQualifiedId } from '@dxos/react-client/echo';

import { SketchComponent, SketchSettings } from './components';
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
            createObject: SketchAction.CREATE,
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
                      icon: 'ph--compass-tool--regular',
                      testId: 'sketchPlugin.createObject',
                    },
                  },
                ];
              },
            }),
          ];
        },
      },
      stack: {
        creators: [
          {
            id: `${SKETCH_PLUGIN}/create-stack-section`,
            testId: 'sketchPlugin.createSection',
            type: ['plugin name', { ns: SKETCH_PLUGIN }],
            label: ['create stack section label', { ns: SKETCH_PLUGIN }],
            icon: (props: any) => <CompassTool {...props} />,
            intent: {
              plugin: SKETCH_PLUGIN,
              action: SketchAction.CREATE,
            },
          },
        ],
      },
      surface: {
        definitions: () => [
          createSurface({
            id: `${SKETCH_PLUGIN}/sketch`,
            role: ['article', 'section', 'slide'],
            filter: (data): data is { object: DiagramType } => isDiagramType(data.object, EXCALIDRAW_SCHEMA),
            component: ({ data, role }) => (
              <SketchComponent
                key={fullyQualifiedId(data.object)} // Force instance per sketch object. Otherwise, sketch shares the same instance.
                sketch={data.object}
                readonly={role === 'slide'}
                maxZoom={role === 'slide' ? 1.5 : undefined}
                autoZoom={role === 'section'}
                autoHideControls={settings.values.autoHideControls}
                className={role === 'article' ? 'row-span-2' : role === 'section' ? 'aspect-square' : 'p-16'}
                grid={settings.values.gridType}
              />
            ),
          }),
          createSurface({
            id: `${SKETCH_PLUGIN}/settings`,
            role: 'settings',
            filter: (data): data is any => data.plugin === SKETCH_PLUGIN,
            component: () => <SketchSettings settings={settings.values} />,
          }),
        ],
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case SketchAction.CREATE: {
              return {
                data: createDiagramType(EXCALIDRAW_SCHEMA),
              };
            }
          }
        },
      },
    },
  };
};
