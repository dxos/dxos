//
// Copyright 2023 DXOS.org
//

import { type LatLngLiteral } from 'leaflet';
import React from 'react';

import {
  parseIntentPlugin,
  type PluginDefinition,
  resolvePlugin,
  createSurface,
  createIntent,
  createResolver,
} from '@dxos/app-framework';
import { create } from '@dxos/live-object';
import { LocalStorageStore } from '@dxos/local-storage';
import { type Node, createExtension } from '@dxos/plugin-graph';

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
    ready: async () => {
      settings
        .prop({ key: 'type', type: LocalStorageStore.enum<MapControlType>() })
        .prop({ key: 'zoom', type: LocalStorageStore.number({ allowUndefined: true }) })
        .prop({ key: 'center', type: LocalStorageStore.json<LatLngLiteral | undefined>() });
    },
    provides: {
      metadata: {
        records: {
          [MapType.typename]: {
            createObject: (props: { name?: string }) => createIntent(MapAction.Create, props),
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
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatchPromise;
          if (!dispatch) {
            return [];
          }

          return [
            createExtension({
              id: MapAction.Toggle._tag,
              filter: (node): node is Node<MapType> => node.data instanceof MapType,
              actions: () => {
                return [
                  {
                    id: `${MAP_PLUGIN}/toggle`,
                    data: async () => {
                      await dispatch(createIntent(MapAction.Toggle));
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
        resolvers: () => [
          createResolver(MapAction.Create, ({ name }) => ({
            data: { object: create(MapType, { name }) },
          })),
          createResolver(MapAction.Toggle, () => {
            settings.values.type = settings.values.type === 'globe' ? 'map' : 'globe';
          }),
        ],
      },
    },
  };
};
