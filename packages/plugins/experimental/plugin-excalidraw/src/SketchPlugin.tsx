//
// Copyright 2023 DXOS.org
//

import { CompassTool, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { parseIntentPlugin, type PluginDefinition, resolvePlugin, NavigationAction } from '@dxos/app-framework';
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

import { SketchComponent, SketchMain, SketchSettings } from './components';
import meta, { SKETCH_PLUGIN } from './meta';
import translations from './translations';
import { SketchAction, type SketchGridType, type SketchPluginProvides, type SketchSettingsProps } from './types';

export const SketchPlugin = (): PluginDefinition<SketchPluginProvides> => {
  const settings = new LocalStorageStore<SketchSettingsProps>(SKETCH_PLUGIN, {});

  return {
    meta,
    ready: async () => {
      settings
        .prop({
          key: 'autoHideControls',
          storageKey: 'auto-hide-controls',
          type: LocalStorageStore.bool({ allowUndefined: true }),
        })
        .prop({
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
      },
      stack: {
        creators: [
          {
            id: `${SKETCH_PLUGIN}/create-stack-section`,
            testId: 'sketchPlugin.createSectionSpaceSketch',
            type: ['plugin name', { ns: SKETCH_PLUGIN }],
            label: ['create stack section label', { ns: SKETCH_PLUGIN }],
            icon: (props: any) => <CompassTool {...props} />,
            intent: { plugin: SKETCH_PLUGIN, action: SketchAction.CREATE },
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isDiagramType(data.active, EXCALIDRAW_SCHEMA) ? (
                <SketchMain
                  sketch={data.active}
                  autoHideControls={settings.values.autoHideControls}
                  grid={settings.values.gridType}
                />
              ) : null;
            case 'slide':
              return isDiagramType(data.slide, EXCALIDRAW_SCHEMA) ? (
                <SketchComponent
                  key={fullyQualifiedId(data.slide)} // Force instance per sketch object. Otherwise, sketch shares the same instance.
                  sketch={data.slide}
                  readonly
                  autoZoom
                  maxZoom={1.5}
                  className='p-16'
                  autoHideControls={settings.values.autoHideControls}
                  grid={settings.values.gridType}
                />
              ) : null;
            case 'article':
            case 'section':
              // NOTE: Min 500px height (for tools palette).
              return isDiagramType(data.object, EXCALIDRAW_SCHEMA) ? (
                <SketchComponent
                  key={fullyQualifiedId(data.object)} // Force instance per sketch object. Otherwise, sketch shares the same instance.
                  sketch={data.object}
                  autoZoom={role === 'section'}
                  className={role === 'article' ? 'row-span-2' : 'aspect-square'}
                  autoHideControls={settings.values.autoHideControls}
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
