//
// Copyright 2023 DXOS.org
//

import { Compass } from '@phosphor-icons/react';
import { type LatLngLiteral } from 'leaflet';
import React from 'react';

import {
  parseIntentPlugin,
  type PluginDefinition,
  resolvePlugin,
  NavigationAction,
  createSurface,
} from '@dxos/app-framework';
import { create } from '@dxos/live-object';
import { LocalStorageStore } from '@dxos/local-storage';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, type Node, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';

import { MapContainer, type MapControlType, type MapContainerProps } from './components';
import meta, { MAP_PLUGIN } from './meta';
import translations from './translations';
import { MapType } from './types';
import { MapAction, type MapPluginProvides, type MapSettingsProps } from './types';

export const MapPlugin = (): PluginDefinition<MapPluginProvides> => {
  const settings = new LocalStorageStore<MapSettingsProps>(MAP_PLUGIN, {
    type: 'map',
  });

  const handleChange: MapContainerProps['onChange'] = ({ center, zoom }) => {
    settings.values.center = center;
    settings.values.zoom = zoom;
  };

  return {
    meta,
    ready: async ({ plugins }) => {
      settings
        .prop({ key: 'type', type: LocalStorageStore.enum<MapControlType>() })
        .prop({ key: 'zoom', type: LocalStorageStore.number({ allowUndefined: true }) })
        .prop({ key: 'center', type: LocalStorageStore.json<LatLngLiteral | undefined>() });
    },
    provides: {
      metadata: {
        records: {
          [MapType.typename]: {
            createObject: MapAction.CREATE,
            placeholder: ['object title placeholder', { ns: MAP_PLUGIN }],
            icon: 'ph--compass--regular',
          },
        },
      },
      translations,
      echo: {
        schema: [MapType],
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
              id: MapAction.CREATE,
              filter: (node): node is ActionGroup => isActionGroup(node) && node.id.startsWith(SpaceAction.ADD_OBJECT),
              actions: ({ node }) => {
                const id = node.id.split('/').at(-1);
                const [spaceId, objectId] = id?.split(':') ?? []; // TODO(burdon): Factor out.
                const space = client.spaces.get().find((space) => space.id === spaceId);
                const object = objectId && space?.db.getObjectById(objectId);
                const target = objectId ? object : space;
                if (!target) {
                  return;
                }

                return [
                  {
                    id: `${MAP_PLUGIN}/create/${node.id}`,
                    data: async () => {
                      await dispatch([
                        { plugin: MAP_PLUGIN, action: MapAction.CREATE },
                        { action: SpaceAction.ADD_OBJECT, data: { target } },
                        { action: NavigationAction.OPEN },
                      ]);
                    },
                    properties: {
                      label: ['create object label', { ns: MAP_PLUGIN }],
                      icon: 'ph--compass--regular',
                      testId: 'mapPlugin.createObject',
                    },
                  },
                ];
              },
            }),
            createExtension({
              id: MapAction.TOGGLE,
              filter: (node): node is Node<MapType> => node.data instanceof MapType,
              actions: ({ node }) => {
                return [
                  {
                    id: `${MAP_PLUGIN}/toggle`,
                    data: async () => {
                      await dispatch([{ plugin: MAP_PLUGIN, action: MapAction.TOGGLE, data: { object: node.data } }]);
                    },
                    properties: {
                      label: ['toggle type label', { ns: MAP_PLUGIN }],
                      icon: 'ph--compass--regular',
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
            id: 'create-stack-section-map',
            testId: 'mapPlugin.createSection',
            type: ['plugin name', { ns: MAP_PLUGIN }],
            label: ['create stack section label', { ns: MAP_PLUGIN }],
            icon: (props: any) => <Compass {...props} />,
            intent: {
              plugin: MAP_PLUGIN,
              action: MapAction.CREATE,
            },
          },
        ],
      },
      surface: {
        definitions: () =>
          createSurface({
            id: `${MAP_PLUGIN}/map`,
            role: ['article', 'section'],
            filter: (data): data is { subject: MapType } => data.subject instanceof MapType,
            component: ({ data, role }) => (
              <MapContainer
                role={role}
                type={settings.values.type}
                map={data.subject}
                center={settings.values.center}
                zoom={settings.values.zoom}
                onChange={handleChange}
              />
            ),
          }),
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case MapAction.TOGGLE: {
              settings.values.type = settings.values.type === 'globe' ? 'map' : 'globe';
              break;
            }
            case MapAction.CREATE: {
              return { data: create(MapType, {}) };
            }
          }
        },
      },
    },
  };
};
