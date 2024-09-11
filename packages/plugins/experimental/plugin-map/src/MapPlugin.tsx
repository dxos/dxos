//
// Copyright 2023 DXOS.org
//

import { Compass, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { parseIntentPlugin, type PluginDefinition, resolvePlugin, NavigationAction } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { parseClientPlugin } from '@dxos/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';

import { MapContainer } from './components';
import meta, { MAP_PLUGIN } from './meta';
import translations from './translations';
import { MapType } from './types';
import { MapAction, type MapPluginProvides } from './types';

export const MapPlugin = (): PluginDefinition<MapPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [MapType.typename]: {
            placeholder: ['object title placeholder', { ns: MAP_PLUGIN }],
            icon: (props: IconProps) => <Compass {...props} />,
            iconSymbol: 'ph--compass--regular',
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

          return createExtension({
            id: MapAction.CREATE,
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
                    icon: (props: IconProps) => <Compass {...props} />,
                    iconSymbol: 'ph--compass--regular',
                    testId: 'mapPlugin.createObject',
                  },
                },
              ];
            },
          });
        },
      },
      stack: {
        creators: [
          {
            id: 'create-stack-section-map',
            testId: 'mapPlugin.createSectionSpaceMap',
            type: ['plugin name', { ns: MAP_PLUGIN }],
            label: ['create stack section label', { ns: MAP_PLUGIN }],
            icon: (props: any) => <Compass {...props} />,
            intent: { plugin: MAP_PLUGIN, action: MapAction.CREATE },
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          if (data.object instanceof MapType) {
            switch (role) {
              case 'section':
              case 'article': {
                return <MapContainer role={role} map={data.object} />;
              }
            }
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case MapAction.CREATE: {
              return { data: create(MapType, {}) };
            }
          }
        },
      },
    },
  };
};
