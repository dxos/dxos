//
// Copyright 2023 DXOS.org
//

import { Compass, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space';
import { Folder, Map as MapType } from '@braneframe/types';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, NavigationAction } from '@dxos/app-framework';
import { SpaceProxy } from '@dxos/react-client/echo';

import { MapMain, MapSection } from './components';
import meta, { MAP_PLUGIN } from './meta';
import translations from './translations';
import { MapAction, type MapPluginProvides, isMap } from './types';

export const MapPlugin = (): PluginDefinition<MapPluginProvides> => {
  return {
    meta,
    provides: {
      metadata: {
        records: {
          [MapType.schema.typename]: {
            placeholder: ['object title placeholder', { ns: MAP_PLUGIN }],
            icon: (props: IconProps) => <Compass {...props} />,
          },
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          if (!(parent.data instanceof Folder || parent.data instanceof SpaceProxy)) {
            return;
          }

          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          parent.actionsMap[`${SPACE_PLUGIN}/create`]?.addAction({
            id: `${MAP_PLUGIN}/create`,
            label: ['create object label', { ns: MAP_PLUGIN }],
            icon: (props) => <Compass {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: MAP_PLUGIN,
                  action: MapAction.CREATE,
                },
                {
                  action: SpaceAction.ADD_OBJECT,
                  data: { target: parent.data },
                },
                {
                  action: NavigationAction.ACTIVATE,
                },
              ]),
            properties: {
              testId: 'mapPlugin.createObject',
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
            intent: [
              {
                plugin: MAP_PLUGIN,
                action: MapAction.CREATE,
              },
            ],
          },
        ],
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main': {
              return isMap(data.active) ? <MapMain map={data.active} /> : null;
            }
            case 'section': {
              return isMap(data.object) ? <MapSection map={data.object} /> : null;
            }
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case MapAction.CREATE: {
              return { data: new MapType() };
            }
          }
        },
      },
    },
  };
};
