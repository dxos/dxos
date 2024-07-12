//
// Copyright 2023 DXOS.org
//

import { Compass, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { type ActionGroup, createExtension, isActionGroup } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { MapType } from '@braneframe/types';
import { parseIntentPlugin, type PluginDefinition, resolvePlugin, NavigationAction } from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';

import { MapArticle, MapMain, MapSection } from './components';
import meta, { MAP_PLUGIN } from './meta';
import translations from './translations';
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
        component: ({ data, role }) => {
          switch (role) {
            case 'main': {
              return data.active instanceof MapType ? <MapMain map={data.active} /> : null;
            }
            case 'section': {
              return data.object instanceof MapType ? <MapSection map={data.object} /> : null;
            }
            case 'article': {
              return data.object instanceof MapType ? <MapArticle map={data.object} /> : null;
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
